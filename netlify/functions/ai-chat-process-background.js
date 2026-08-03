/**
 * AI Clinic Chat background worker.
 *
 * Triggered by ai-chat enqueue endpoint. Claims a queued job, runs the agent
 * loop, stores the assistant message, and marks the job as succeeded/failed.
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const { runAgentLoop, buildDynamicBusinessRulesSnapshot } = require('./_shared/ai-chat-agent');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey, timeout: 120000, maxRetries: 2 }) : null;

const HISTORY_REPLAY_LIMIT = 24;
// Was 4000, which silently cut a long report down to ~40% of itself when replayed as context,
// so the assistant "forgot" most of its own answer on the very next follow-up question.
const MAX_HISTORY_MESSAGE_CHARS = 12000;
// Per-message headroom alone isn't enough: 24 messages at the cap above would be a huge, slow,
// expensive prompt. This bounds the whole replayed history, dropping oldest turns first.
const MAX_HISTORY_TOTAL_CHARS = 60000;

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const getAuthToken = (event) => {
  const h = event.headers.authorization || event.headers.Authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
};

const getUser = async (event) => {
  const token = getAuthToken(event);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
};

const getClinicIdForUser = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('clinic_id').eq('id', userId).single();
  if (error) throw new Error('Failed to resolve clinic for user');
  return data?.clinic_id || null;
};

const loadRecentMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_REPLAY_LIMIT);
  if (error) throw new Error('Failed to load conversation history');

  // Rows arrive newest-first. Spend the budget in that order so the most recent turns always
  // survive, then flip back to chronological order for the model.
  const kept = [];
  let remaining = MAX_HISTORY_TOTAL_CHARS;
  for (const m of data || []) {
    const content = String(m.content || '').slice(0, MAX_HISTORY_MESSAGE_CHARS);
    // The newest row is the message being answered right now — keep it even if it alone
    // exceeds the budget, or there'd be nothing to respond to.
    if (kept.length > 0 && content.length > remaining) break;
    kept.push({ role: m.role, content });
    remaining -= content.length;
  }
  kept.reverse();

  // The API rejects a history that opens on an assistant turn. Trimming — by message count or
  // by the budget above — can land exactly there mid-conversation, so drop any leading
  // assistant turns. The newest row is always the just-inserted user message, so this always
  // terminates with a valid user-first history.
  while (kept.length > 1 && kept[0].role !== 'user') kept.shift();

  return kept;
};

const insertMessage = async (conversationId, clinicId, userId, role, content, toolCalls) => {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      conversation_id: conversationId,
      clinic_id: clinicId,
      user_id: userId,
      role,
      content,
      tool_calls: toolCalls || [],
    })
    .select('*')
    .single();
  if (error) throw new Error('Failed to save message');
  return data;
};

const claimQueuedJob = async ({ jobId, clinicId, userId }) => {
  const { data, error } = await supabase
    .from('ai_chat_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: null,
    })
    .eq('id', jobId)
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();

  if (error) throw new Error('Failed to claim job');
  return data || null;
};

const completeJob = async ({ jobId, status, errorMessage, responseMessageId, toolCalls }) => {
  const { error } = await supabase
    .from('ai_chat_jobs')
    .update({
      status,
      error: errorMessage || null,
      response_message_id: responseMessageId || null,
      tool_calls: toolCalls || [],
      current_tool: null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) throw new Error('Failed to finalize job');
};

/** Reports which tool the agent loop is about to call, for the frontend's live progress poll. */
const updateJobProgress = async (jobId, toolName) => {
  const { error } = await supabase
    .from('ai_chat_jobs')
    .update({ current_tool: toolName, updated_at: new Date().toISOString() })
    .eq('id', jobId);
  if (error) console.warn('ai-chat worker: failed to report progress (non-fatal)', error.message);
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });
  if (!anthropic) return jsonResponse(500, { error: 'AI chat is not configured (missing ANTHROPIC_API_KEY)' });

  const user = await getUser(event);
  if (!user) return jsonResponse(401, { error: 'Unauthorized' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid request body' });
  }
  const jobId = typeof payload.jobId === 'string' ? payload.jobId : '';
  if (!jobId) return jsonResponse(400, { error: 'jobId is required' });

  try {
    const clinicId = await getClinicIdForUser(user.id);
    if (!clinicId) return jsonResponse(403, { error: 'No clinic found for user' });

    const job = await claimQueuedJob({ jobId, clinicId, userId: user.id });
    if (!job) {
      return jsonResponse(200, { ok: true, skipped: 'Job already claimed or not queued' });
    }

    const [{ data: clinic }, { data: therapists, error: therapistsError }, { data: rememberedFacts, error: memoryError }] = await Promise.all([
      supabase.from('clinics').select('name, timezone, currency, settings').eq('id', clinicId).single(),
      supabase
        .from('therapists')
        .select('id, archived, is_active, compensation_type, retention_enabled, retention_rate, incentive_enabled')
        .eq('clinic_id', clinicId)
        .limit(200),
      supabase
        .from('ai_clinic_memory')
        .select('id, fact, created_at')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: true })
        .limit(100),
    ]);
    if (therapistsError) {
      console.warn('ai-chat worker: therapists config snapshot unavailable:', therapistsError.message);
    }
    if (memoryError) {
      console.warn('ai-chat worker: remembered facts unavailable:', memoryError.message);
    }
    const clinicName = clinic?.name || 'the clinic';
    const clinicTimezone = clinic?.timezone || 'UTC';
    const dynamicRulesSnapshot = buildDynamicBusinessRulesSnapshot(clinic, therapists || []);

    const history = await loadRecentMessages(job.conversation_id);
    const { text, toolCallLog } = await runAgentLoop({
      anthropic,
      supabase,
      clinicId,
      clinicName,
      clinicTimezone,
      historyMessages: history,
      dynamicRulesSnapshot,
      rememberedFacts: rememberedFacts || [],
      userId: user.id,
      model: job.ai_model,
      effort: job.ai_effort,
      onProgress: (toolName) => updateJobProgress(job.id, toolName),
    });

    const assistantMessage = await insertMessage(job.conversation_id, clinicId, user.id, 'assistant', text, toolCallLog);
    await completeJob({
      jobId: job.id,
      status: 'succeeded',
      responseMessageId: assistantMessage.id,
      toolCalls: toolCallLog,
    });
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', job.conversation_id);

    return jsonResponse(200, { ok: true, jobId: job.id, status: 'succeeded' });
  } catch (error) {
    console.error('ai-chat worker error:', error);

    // Best-effort fallback: if we can safely read job id from payload, mark it failed.
    try {
      if (jobId) {
        const clinicId = await getClinicIdForUser(user.id);
        if (clinicId) {
          const fallbackText = 'I hit a processing error while analyzing this request. Please retry once; if it persists, try splitting the question by area (operations, finance, therapists).';
          const { data: failedJob } = await supabase
            .from('ai_chat_jobs')
            .select('id, conversation_id, clinic_id, user_id')
            .eq('id', jobId)
            .eq('clinic_id', clinicId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (failedJob?.conversation_id) {
            const assistantMessage = await insertMessage(
              failedJob.conversation_id,
              failedJob.clinic_id,
              failedJob.user_id,
              'assistant',
              fallbackText,
              [],
            );
            await completeJob({
              jobId: failedJob.id,
              status: 'failed',
              errorMessage: error.message || 'AI chat processing failed',
              responseMessageId: assistantMessage.id,
              toolCalls: [],
            });
          }
        }
      }
    } catch (fallbackError) {
      console.error('ai-chat worker fallback error:', fallbackError);
    }

    return jsonResponse(500, { error: error.message || 'AI chat processing failed' });
  }
};
