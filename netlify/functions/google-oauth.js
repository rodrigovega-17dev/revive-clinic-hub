const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

if (!googleClientSecret) {
  throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const jsonResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
});

const getAuthToken = (event) => {
  const header = event.headers.authorization || event.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
};

const ensureUser = async (event) => {
  const token = getAuthToken(event);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
};

const requestToken = async (params) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth error: ${errorText}`);
  }

  return response.json();
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = await ensureUser(event);
  if (!user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const { action, payload } = body || {};
  if (!action) {
    return jsonResponse(400, { error: 'Missing action' });
  }

  try {
    if (action === 'exchange_code') {
      const clientId = googleClientId || payload.clientId;
      const redirectUri = googleRedirectUri || payload.redirectUri;

      if (!clientId || !redirectUri) {
        return jsonResponse(400, { error: 'Missing Google OAuth configuration' });
      }

      const data = await requestToken({
        client_id: clientId,
        client_secret: googleClientSecret,
        code: payload.code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });

      return jsonResponse(200, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      });
    }

    if (action === 'refresh_token') {
      const clientId = googleClientId || payload.clientId;

      if (!clientId) {
        return jsonResponse(400, { error: 'Missing Google client id' });
      }

      const data = await requestToken({
        client_id: clientId,
        client_secret: googleClientSecret,
        refresh_token: payload.refreshToken,
        grant_type: 'refresh_token',
      });

      return jsonResponse(200, {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      });
    }

    return jsonResponse(400, { error: 'Unknown action' });
  } catch (error) {
    return jsonResponse(500, { error: error.message || 'Google OAuth request failed' });
  }
};
