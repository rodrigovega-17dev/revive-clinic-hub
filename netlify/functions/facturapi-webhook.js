/**
 * Facturapi webhook handler. Updates cfdi_invoices status from PAC lifecycle events.
 * Configure webhook URL in Facturapi dashboard to point to /.netlify/functions/facturapi-webhook
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const eventType = payload.event || payload.type || payload.action;
  const invoice = payload.data?.invoice || payload.data?.object || payload.invoice || payload;

  if (!invoice?.id) {
    return jsonResponse(200, { received: true });
  }

  const facturapiId = typeof invoice.id === 'string' ? invoice.id : invoice.id?.id;

  try {
    const { data: rows } = await supabase
      .from('cfdi_invoices')
      .select('id, status')
      .eq('facturapi_id', facturapiId);

    if (!rows?.length) {
      return jsonResponse(200, { received: true });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (eventType === 'invoice.canceled' || eventType === 'invoice.cancelled' || invoice.status === 'canceled' || invoice.status === 'cancelled') {
      updates.status = 'canceled';
      updates.canceled_at = new Date().toISOString();
    } else if (invoice.status === 'active' || eventType === 'invoice.issued') {
      updates.status = 'issued';
      if (invoice.cfdi) {
        if (invoice.cfdi.pdf) updates.pdf_url = invoice.cfdi.pdf;
        if (invoice.cfdi.xml) updates.xml_url = invoice.cfdi.xml;
      }
    }

    await supabase
      .from('cfdi_invoices')
      .update(updates)
      .eq('facturapi_id', facturapiId);

    return jsonResponse(200, { received: true });
  } catch (e) {
    return jsonResponse(500, { error: e.message || 'Webhook processing failed' });
  }
};
