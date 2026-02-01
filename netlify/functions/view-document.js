const { createClient } = require('@supabase/supabase-js');
const { renderDocumentHtml } = require('./_shared/document-render');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers: { 'Content-Type': 'text/plain' }, body: 'Server not configured' };
  }

  const params = event.queryStringParameters || {};
  const id = params.id;
  const t = params.t;

  if (!id || !t) {
    return { statusCode: 400, headers: { 'Content-Type': 'text/plain' }, body: 'Missing id or t' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: instance, error } = await supabase
    .from('document_instances')
    .select('id, data, created_at, share_token')
    .eq('id', id)
    .single();

  if (error || !instance) {
    return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Document not found' };
  }

  if (instance.share_token !== t) {
    return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'Document not found' };
  }

  const html = renderDocumentHtml(instance, { includeFullPage: true });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: html,
  };
};
