const { createClient } = require('@supabase/supabase-js');
const { renderDocumentHtml } = require('./_shared/document-render');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Use onboarding@resend.dev for testing (sends only to your Resend account email)
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Supabase environment not configured' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { documentInstanceId, to, subject } = payload;
  if (!documentInstanceId || !to) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'documentInstanceId and to are required' }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: instance, error } = await supabase
    .from('document_instances')
    .select('*')
    .eq('id', documentInstanceId)
    .single();

  if (error || !instance) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Document instance not found' }),
    };
  }

  // Same layout as print/view; body-only for email (inline styles for client compatibility)
  const html = renderDocumentHtml(instance, { includeFullPage: false });
  const emailSubject =
    subject ||
    `Documento clínico - ${instance.id}`;

  if (!RESEND_API_KEY) {
    // If no email provider configured, return the HTML so the caller can handle it.
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'noop',
        reason: 'RESEND_API_KEY not configured',
        html,
      }),
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject: emailSubject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Failed to send email', details: text }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'sent' }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email send error', details: String(e) }),
    };
  }
};

