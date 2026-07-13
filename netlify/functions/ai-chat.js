/**
 * AI Clinic Chat enqueue endpoint.
 *
 * This endpoint creates a queued async job and returns immediately. The
 * background worker does the expensive model/tool reasoning and writes the
 * assistant message once complete.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MAX_MESSAGE_LENGTH = 4000;

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

const getAuthHeader = (event) => event.headers.authorization || event.headers.Authorization || '';

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

const resolveOrCreateConversation = async (clinicId, userId) => {
  const { data: existing } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('ai_conversations')
    .insert({ clinic_id: clinicId, user_id: userId })
    .select('id')
    .single();
  if (error) throw new Error('Failed to create conversation');
  return created;
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

const findActiveJob = async (conversationId) => {
  const { data } = await supabase
    .from('ai_chat_jobs')
    .select('id, status')
    .eq('conversation_id', conversationId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
};

const enqueueJob = async ({ conversationId, clinicId, userId, requestMessageId }) => {
  const { data, error } = await supabase
    .from('ai_chat_jobs')
    .insert({
      conversation_id: conversationId,
      clinic_id: clinicId,
      user_id: userId,
      request_message_id: requestMessageId,
      status: 'queued',
      updated_at: new Date().toISOString(),
    })
    .select('id, status')
    .single();

  if (error) throw new Error('Failed to enqueue AI chat job');
  return data;
};

const getRequestBaseUrl = (event) => {
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  if (host) {
    const proto = event.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || null;
};

const triggerBackgroundProcessor = async (event, jobId) => {
  const baseUrl = getRequestBaseUrl(event);
  const authHeader = getAuthHeader(event);
  if (!baseUrl || !authHeader) return;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 1200);
  try {
    await fetch(`${baseUrl}/.netlify/functions/ai-chat-process-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ jobId }),
      signal: ac.signal,
    });
  } catch (error) {
    console.warn('ai-chat enqueue: background trigger failed', error?.message || error);
  } finally {
    clearTimeout(timeout);
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = await getUser(event);
  if (!user) return jsonResponse(401, { error: 'Unauthorized' });

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid request body' });
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(400, { error: 'Invalid message' });
  }

  try {
    const clinicId = await getClinicIdForUser(user.id);
    if (!clinicId) return jsonResponse(403, { error: 'No clinic found for user' });

    const conversation = await resolveOrCreateConversation(clinicId, user.id);
    const existingActiveJob = await findActiveJob(conversation.id);
    if (existingActiveJob) {
      return jsonResponse(409, {
        error: 'AI is still processing the previous request. Please wait a moment.',
        conversationId: conversation.id,
        jobId: existingActiveJob.id,
        status: existingActiveJob.status,
      });
    }

    const userMessage = await insertMessage(conversation.id, clinicId, user.id, 'user', message);
    const job = await enqueueJob({
      conversationId: conversation.id,
      clinicId,
      userId: user.id,
      requestMessageId: userMessage.id,
    });
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    await triggerBackgroundProcessor(event, job.id);

    return jsonResponse(202, {
      conversationId: conversation.id,
      jobId: job.id,
      status: job.status,
    });
  } catch (error) {
    console.error('ai-chat enqueue error:', error);
    return jsonResponse(500, { error: error.message || 'AI chat enqueue failed' });
  }
};
