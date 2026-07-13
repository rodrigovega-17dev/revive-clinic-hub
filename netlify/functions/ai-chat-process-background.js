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
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey, timeout: 10000, maxRetries: 1 }) : null;

const HISTORY_REPLAY_LIMIT = 8;
const MAX_HISTORY_MESSAGE_CHARS = 1500;

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
  return (data || []).reverse().map((m) => ({
    role: m.role,
    content: String(m.content || '').slice(0, MAX_HISTORY_MESSAGE_CHARS),
  }));
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
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) throw new Error('Failed to finalize job');
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

    const [{ data: clinic }, { data: therapists, error: therapistsError }] = await Promise.all([
      supabase.from('clinics').select('name, timezone, currency, settings').eq('id', clinicId).single(),
      supabase
        .from('therapists')
        .select('id, archived, is_active, compensation_type, retention_enabled, retention_rate, incentive_enabled')
        .eq('clinic_id', clinicId)
        .limit(200),
    ]);
    if (therapistsError) {
      console.warn('ai-chat worker: therapists config snapshot unavailable:', therapistsError.message);
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
          const fallbackText = 'I couldn\'t finish processing this request in time. Please narrow the date range or split the question into parts.';
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
