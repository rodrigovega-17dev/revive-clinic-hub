/**
 * AI Chat job status endpoint (polling).
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

const getRequestBaseUrl = (event) => {
  const host = event.headers['x-forwarded-host'] || event.headers.host;
  if (host) {
    const proto = event.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || null;
};

// If a job is still queued with no started_at this long after it was created, the
// enqueue function's own background-trigger fetch likely never landed — re-fire it
// here so most stalls self-heal within a poll cycle or two, before the enqueue
// endpoint's own (slower) staleness check would otherwise have to fail the job outright.
const RETRIGGER_AFTER_MS = 8000;

const maybeRetriggerStalledJob = async (event, row) => {
  if (!row || row.status !== 'queued' || row.started_at) return;
  if (Date.now() - new Date(row.created_at).getTime() < RETRIGGER_AFTER_MS) return;

  const baseUrl = getRequestBaseUrl(event);
  const authHeader = getAuthHeader(event);
  if (!baseUrl || !authHeader) return;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 3000);
  try {
    await fetch(`${baseUrl}/.netlify/functions/ai-chat-process-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ jobId: row.id }),
      signal: ac.signal,
    });
  } catch (error) {
    console.warn('ai-chat-job-status: re-trigger attempt failed (non-fatal)', error?.message || error);
  } finally {
    clearTimeout(timeout);
  }
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

const mapJob = (row) => (row
  ? {
    id: row.id,
    conversationId: row.conversation_id,
    status: row.status,
    error: row.error,
    responseMessageId: row.response_message_id,
    currentTool: row.current_tool,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
  }
  : null);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return jsonResponse(401, { error: 'Unauthorized' });

  const params = event.queryStringParameters || {};
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';
  const conversationId = typeof params.conversationId === 'string' ? params.conversationId : '';
  if (!jobId && !conversationId) {
    return jsonResponse(400, { error: 'jobId or conversationId is required' });
  }

  try {
    const clinicId = await getClinicIdForUser(user.id);
    if (!clinicId) return jsonResponse(403, { error: 'No clinic found for user' });

    let query = supabase
      .from('ai_chat_jobs')
      .select('id, conversation_id, status, error, response_message_id, current_tool, created_at, started_at, updated_at, finished_at')
      .eq('clinic_id', clinicId)
      .eq('user_id', user.id);

    if (jobId) {
      query = query.eq('id', jobId).limit(1);
    } else {
      query = query
        .eq('conversation_id', conversationId)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Failed to load AI job status');

    const row = Array.isArray(data) ? data[0] : null;
    await maybeRetriggerStalledJob(event, row);
    return jsonResponse(200, { job: mapJob(row) });
  } catch (error) {
    console.error('ai-chat-job-status error:', error);
    return jsonResponse(500, { error: error.message || 'AI job status request failed' });
  }
};
