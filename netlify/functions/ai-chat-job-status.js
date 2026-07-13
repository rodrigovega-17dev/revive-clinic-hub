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
      .select('id, conversation_id, status, error, response_message_id, created_at, updated_at, finished_at')
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
    return jsonResponse(200, { job: mapJob(row) });
  } catch (error) {
    console.error('ai-chat-job-status error:', error);
    return jsonResponse(500, { error: error.message || 'AI job status request failed' });
  }
};
