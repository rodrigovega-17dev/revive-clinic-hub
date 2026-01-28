/**
 * Facturapi per-clinic config API. GET: { configured, useLive } (no secrets).
 * POST: save test/live keys, useLive, webhook secret. Auth via Supabase JWT.
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
  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();
  if (error) throw new Error('Failed to resolve clinic for user');
  return data?.clinic_id || null;
};

const assertClinicAccess = async (userId, clinicId) => {
  const userClinic = await getClinicIdForUser(userId);
  if (!userClinic || userClinic !== clinicId) throw new Error('Unauthorized clinic access');
};

exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return jsonResponse(401, { error: 'Unauthorized' });

  const clinicId = await getClinicIdForUser(user.id);
  if (!clinicId) return jsonResponse(403, { error: 'No clinic for user' });

  if (event.httpMethod === 'GET') {
    try {
      const { data: row, error } = await supabase
        .from('clinics')
        .select('facturapi_test_secret, facturapi_live_secret, facturapi_use_live')
        .eq('id', clinicId)
        .single();
      if (error) throw new Error('Clinic not found');
      const test = (row?.facturapi_test_secret || '').trim();
      const live = (row?.facturapi_live_secret || '').trim();
      const configured = !!(test || live);
      return jsonResponse(200, { configured, useLive: !!row?.facturapi_use_live });
    } catch (e) {
      return jsonResponse(500, { error: e.message || 'Failed to fetch config' });
    }
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const updates = {};
  if (typeof body.facturapiUseLive === 'boolean') updates.facturapi_use_live = body.facturapiUseLive;
  if (typeof body.facturapiTestSecret === 'string') updates.facturapi_test_secret = body.facturapiTestSecret.trim() || null;
  if (typeof body.facturapiLiveSecret === 'string') updates.facturapi_live_secret = body.facturapiLiveSecret.trim() || null;
  if (typeof body.facturapiWebhookSecret === 'string') updates.facturapi_webhook_secret = body.facturapiWebhookSecret.trim() || null;

  if (Object.keys(updates).length === 0) {
    return jsonResponse(400, { error: 'No updates provided' });
  }

  try {
    const { error } = await supabase
      .from('clinics')
      .update(updates)
      .eq('id', clinicId);
    if (error) throw error;
    return jsonResponse(200, { ok: true });
  } catch (e) {
    return jsonResponse(500, { error: e.message || 'Failed to save config' });
  }
};
