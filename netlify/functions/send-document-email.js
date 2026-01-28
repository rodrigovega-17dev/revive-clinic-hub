const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'clinic@example.com';

/** Build a simple HTML representation of the document for email. */
function renderDocumentHtml(instance) {
  const data = (instance.data || {});
  const schema = data.schema || {};
  const sections = Array.isArray(schema.sections) ? schema.sections : [];
  const values = data.values || {};
  const variables = data.variables || {};

  const title = data.templateName || data.templateSlug || 'Documento';
  const clientName = variables.clientFullName || '';
  const appointmentDate = variables.appointmentDateFormatted || variables.appointmentDate || '';

  const bodySections = sections
    .map((section) => {
      if (section.type === 'group' && Array.isArray(section.fields)) {
        const fieldsHtml = section.fields
          .map((field) => {
            const v = values[field.id] ?? '';
            return `
              <div style="margin-bottom: 8px;">
                <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px;">${field.label}</div>
                <div style="border: 1px solid #ddd; padding: 6px; min-height: 32px; white-space: pre-wrap; font-size: 13px;">
                  ${String(v || '')}
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <section style="margin-bottom: 16px;">
            ${
              section.label
                ? `<h3 style="margin: 0 0 6px; font-size: 14px;">${section.label}</h3>`
                : ''
            }
            ${fieldsHtml}
          </section>
        `;
      }

      const label = section.label || section.id;
      const value = values[section.id] ?? '';
      return `
        <section style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 4px; font-size: 14px;">${label}</h3>
          <div style="border: 1px solid #ddd; padding: 8px; min-height: 40px; white-space: pre-wrap; font-size: 13px;">
            ${String(value || '')}
          </div>
        </section>
      `;
    })
    .join('');

  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
      <h1 style="font-size: 20px; margin-bottom: 4px;">${title}</h1>
      <h2 style="font-size: 16px; margin-top: 0; margin-bottom: 16px; color: #6b7280;">
        ${clientName}${appointmentDate ? ' · ' + appointmentDate : ''}
      </h2>
      ${bodySections}
    </div>
  `;
}

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

  const html = renderDocumentHtml(instance);
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

