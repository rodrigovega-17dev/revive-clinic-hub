/**
 * Facturapi (CFDI) Netlify function.
 * Actions: createCustomer, issueIndividualInvoice, getInvoice, issueGlobalInvoice, issueCreditNote.
 * All Facturapi API keys stay server-side. Auth via Supabase JWT.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const facturapiTest = process.env.FACTURAPI_TEST_SECRET;
const facturapiLive = process.env.FACTURAPI_LIVE_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const FACTURAPI_BASE = 'https://api.facturapi.io/v2';

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

/** Resolve Facturapi API key for clinic. Prefer clinic keys; fallback to env. */
async function getFacturapiKeyForClinic(clinicId) {
  const { data: row, error } = await supabase
    .from('clinics')
    .select('facturapi_test_secret, facturapi_live_secret, facturapi_use_live')
    .eq('id', clinicId)
    .single();
  if (error) throw new Error('Clinic not found');
  const test = (row?.facturapi_test_secret || '').trim();
  const live = (row?.facturapi_live_secret || '').trim();
  const useLive = !!row?.facturapi_use_live;
  if (useLive && live) return live;
  if (test) return test;
  if (live) return live;
  const useLiveEnv = process.env.NODE_ENV === 'production' && facturapiLive;
  const key = useLiveEnv ? facturapiLive : facturapiTest;
  if (!key) throw new Error('Facturapi API key not configured (clinic or FACTURAPI_* env)');
  return key;
}

async function facturapiFetch(clinicId, path, options = {}) {
  const key = await getFacturapiKeyForClinic(clinicId);
  const url = `${FACTURAPI_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Facturapi API error: ${res.status} ${text}`);
  }
  if (!res.ok) {
    const msg = data?.message || data?.error_description || text || 'Facturapi request failed';
    throw new Error(msg);
  }
  return data;
}

/** Create or get Facturapi customer for client; update client.facturapi_customer_id */
async function ensureFacturapiCustomer(clinicId, client) {
  if (client.facturapi_customer_id) {
    try {
      await facturapiFetch(clinicId, `/customers/${client.facturapi_customer_id}`);
      return client.facturapi_customer_id;
    } catch {
      /* fall through to create */
    }
  }
  if (!client.rfc || !client.tax_regime || !client.cfdi_use) {
    throw new Error('Client missing RFC, tax regime or CFDI use');
  }
  const email = client.cfdi_email || client.email;
  if (!email) throw new Error('Client CFDI email or email required');

  const body = {
    legal_name: `${client.first_name} ${client.last_name}`.trim(),
    tax_id: client.rfc.trim(),
    tax_system: client.tax_regime.trim(),
    email: email.trim(),
    use: client.cfdi_use.trim(),
  };
  if (client.address) body.address = { address: client.address };

  const created = await facturapiFetch(clinicId, '/customers', { method: 'POST', body: JSON.stringify(body) });
  const customerId = created.id;
  await supabase
    .from('clients')
    .update({ facturapi_customer_id: customerId })
    .eq('id', client.id);

  return customerId;
}

/** Map our payment method to SAT payment form */
function satPaymentForm(method) {
  switch (method) {
    case 'cash': return '01';
    case 'card': return '04';
    case 'transfer': return '03';
    case 'insurance': return '28';
    case 'balance': return '99';
    default: return '99';
  }
}

/** issueIndividualInvoice: payload { clinicId, clientId, paymentIds } */
async function issueIndividualInvoice(payload) {
  const { clinicId, clientId, paymentIds } = payload;
  if (!clinicId || !clientId || !paymentIds?.length) {
    throw new Error('clinicId, clientId and paymentIds required');
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('clinic_id', clinicId)
    .single();
  if (clientErr || !client) throw new Error('Client not found');

  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, amount, method, appointment_id, invoice_state, facturado')
    .in('id', paymentIds)
    .eq('clinic_id', clinicId)
    .eq('client_id', clientId);
  if (payErr) throw new Error('Failed to fetch payments');
  if (!payments?.length) throw new Error('No payments found');

  for (const p of payments) {
    if (p.invoice_state !== 'non_invoiced') throw new Error('Payment already invoiced');
  }

  const appointmentIds = [...new Set(payments.map((p) => p.appointment_id).filter(Boolean))];
  let appointments = [];
  let treatments = [];
  if (appointmentIds.length) {
    const { data: apts } = await supabase
      .from('appointments')
      .select('id, treatment_id, status')
      .in('id', appointmentIds)
      .eq('clinic_id', clinicId);
    appointments = apts || [];
    for (const a of appointments) {
      if (a.status !== 'completed') throw new Error('Only completed appointments can be invoiced');
    }
    const treatmentIds = [...new Set(appointments.map((a) => a.treatment_id).filter(Boolean))];
    if (treatmentIds.length) {
      const { data: tr } = await supabase
        .from('treatments')
        .select('id, name, price, sat_product_service_code, sat_unit_code, vat_exempt')
        .in('id', treatmentIds);
      treatments = tr || [];
    }
  }

  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t]));
  const getTreatment = (apt) => (apt?.treatment_id && treatmentMap[apt.treatment_id]) || null;

  const items = [];
  const paymentMethod = payments[0]?.method || 'cash';
  for (const pay of payments) {
    const apt = appointments.find((a) => a.id === pay.appointment_id);
    const t = getTreatment(apt);
    const code = t?.sat_product_service_code || '85121608';
    const unit = t?.sat_unit_code || 'E48';
    const description = t ? t.name : 'Servicio';
    const unitPrice = Number(pay.amount);
    const quantity = 1;
    const item = {
      product: code,
      description,
      quantity,
      unit,
      unit_price: unitPrice,
    };
    if (!t?.vat_exempt) {
      item.taxes = [{ type: 'IVA', rate: 0.16 }];
    }
    items.push(item);
  }

  const customerId = await ensureFacturapiCustomer(clinicId, client);
  const use = client.cfdi_use || 'G03';
  const invoiceBody = {
    customer: customerId,
    items,
    use,
    payment_form: 'PUE',
    payment_method: satPaymentForm(paymentMethod),
  };

  const inv = await facturapiFetch(clinicId, '/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceBody),
  });

  const total = Number(inv.total);
  const subtotal = Number(inv.subtotal);
  const tax = Number(inv.tax || 0);

  const { data: inserted, error: insErr } = await supabase
    .from('cfdi_invoices')
    .insert({
      clinic_id: clinicId,
      facturapi_id: inv.id,
      uuid: inv.uuid || null,
      type: 'ingreso',
      status: inv.status === 'active' ? 'issued' : 'draft',
      folio: inv.folio_number?.toString() || null,
      total,
      subtotal,
      tax,
      currency: inv.currency || 'MXN',
      emitted_at: inv.created_at || new Date().toISOString(),
      pdf_url: inv.cfdi?.pdf || null,
      xml_url: inv.cfdi?.xml || null,
      raw_response: inv,
    })
    .select('id')
    .single();
  if (insErr) throw new Error('Failed to store CFDI record: ' + insErr.message);

  for (const p of payments) {
    await supabase.from('cfdi_invoice_payments').insert({
      cfdi_invoice_id: inserted.id,
      payment_id: p.id,
      amount: Number(p.amount),
    });
    await supabase
      .from('payments')
      .update({ invoice_state: 'individually_invoiced' })
      .eq('id', p.id);
  }

  return {
    id: inserted.id,
    facturapi_id: inv.id,
    uuid: inv.uuid,
    status: inv.status,
    pdf_url: inv.cfdi?.pdf,
    xml_url: inv.cfdi?.xml,
    total,
  };
}

/** getInvoice: payload { invoiceId, clinicId } — our cfdi_invoices.id */
async function getInvoice(payload) {
  const { invoiceId, clinicId } = payload;
  if (!invoiceId) throw new Error('invoiceId required');

  let q = supabase.from('cfdi_invoices').select('*').eq('id', invoiceId);
  if (clinicId) q = q.eq('clinic_id', clinicId);
  const { data: row, error } = await q.single();
  if (error || !row) throw new Error('Invoice not found');
  return row;
}

/** issueGlobalInvoice: payload { clinicId, periodStart, periodEnd } */
async function issueGlobalInvoice(payload) {
  const { clinicId, periodStart, periodEnd } = payload;
  if (!clinicId || !periodStart || !periodEnd) {
    throw new Error('clinicId, periodStart and periodEnd required');
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, amount, method, appointment_id, refunded_at')
    .eq('clinic_id', clinicId)
    .eq('invoice_state', 'non_invoiced')
    .gte('payment_date', start.toISOString())
    .lte('payment_date', end.toISOString())
    .is('refunded_at', null);
  if (payErr) throw new Error('Failed to fetch payments');
  if (!payments?.length) throw new Error('No non-invoiced payments in period');

  const appointmentIds = [...new Set(payments.map((p) => p.appointment_id).filter(Boolean))];
  let allowed = new Set();
  if (appointmentIds.length) {
    const { data: apts } = await supabase
      .from('appointments')
      .select('id')
      .in('id', appointmentIds)
      .eq('clinic_id', clinicId)
      .or('status.eq.scheduled,status.eq.completed,status.eq.confirmed,status.eq.in_progress');
    allowed = new Set((apts || []).map((a) => a.id));
  }
  const filtered = payments.filter((p) => !p.appointment_id || allowed.has(p.appointment_id));
  if (!filtered.length) throw new Error('No eligible payments after excluding cancelled');

  const total = filtered.reduce((s, p) => s + Number(p.amount), 0);
  const invoiceBody = {
    customer: {
      legal_name: 'PUBLICO EN GENERAL',
      tax_id: 'XAXX010101000',
      tax_system: '616',
      email: 'publico@general.local',
      use: 'P01',
    },
    items: [{
      product: '85121608',
      description: `Servicios ${periodStart} a ${periodEnd}`,
      quantity: 1,
      unit: 'E48',
      unit_price: total,
    }],
    use: 'P01',
    payment_form: '99',
    payment_method: 'PUE',
  };

  const inv = await facturapiFetch(clinicId, '/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceBody),
  });

  const { data: inserted, error: insErr } = await supabase
    .from('cfdi_invoices')
    .insert({
      clinic_id: clinicId,
      facturapi_id: inv.id,
      uuid: inv.uuid || null,
      type: 'ingreso',
      status: inv.status === 'active' ? 'issued' : 'draft',
      folio: inv.folio_number?.toString() || null,
      total: Number(inv.total),
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax || 0),
      currency: inv.currency || 'MXN',
      emitted_at: inv.created_at || new Date().toISOString(),
      global_period_start: periodStart,
      global_period_end: periodEnd,
      pdf_url: inv.cfdi?.pdf || null,
      xml_url: inv.cfdi?.xml || null,
      raw_response: inv,
    })
    .select('id')
    .single();
  if (insErr) throw new Error('Failed to store global CFDI: ' + insErr.message);

  for (const p of filtered) {
    await supabase.from('cfdi_invoice_payments').insert({
      cfdi_invoice_id: inserted.id,
      payment_id: p.id,
      amount: Number(p.amount),
    });
    await supabase
      .from('payments')
      .update({ invoice_state: 'globally_invoiced' })
      .eq('id', p.id);
  }

  return {
    id: inserted.id,
    facturapi_id: inv.id,
    uuid: inv.uuid,
    pdf_url: inv.cfdi?.pdf,
    xml_url: inv.cfdi?.xml,
    total: Number(inv.total),
  };
}

/** issueLateInvoice: payment was globally_invoiced; credit note against global then individual CFDI. Payload { clinicId, paymentId } */
async function issueLateInvoice(payload) {
  const { clinicId, paymentId } = payload;
  if (!clinicId || !paymentId) throw new Error('clinicId and paymentId required');

  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('id, amount, client_id, invoice_state')
    .eq('id', paymentId)
    .eq('clinic_id', clinicId)
    .single();
  if (payErr || !payment) throw new Error('Payment not found');
  if (payment.invoice_state !== 'globally_invoiced') {
    throw new Error('Payment is not globally invoiced; use issueIndividualInvoice instead');
  }

  const { data: link } = await supabase
    .from('cfdi_invoice_payments')
    .select('cfdi_invoice_id, amount')
    .eq('payment_id', paymentId)
    .single();
  if (!link) throw new Error('No CFDI link found for this payment');

  const creditAmount = Number(link.amount || payment.amount);
  const { data: globalInv } = await supabase
    .from('cfdi_invoices')
    .select('id, uuid')
    .eq('id', link.cfdi_invoice_id)
    .eq('clinic_id', clinicId)
    .single();
  if (!globalInv) throw new Error('Global invoice not found');

  await issueCreditNote({
    clinicId,
    originalInvoiceId: globalInv.id,
    reason: 'Facturación individual posterior',
    amount: creditAmount,
  });

  await supabase
    .from('payments')
    .update({ invoice_state: 'non_invoiced' })
    .eq('id', paymentId);

  return issueIndividualInvoice({
    clinicId,
    clientId: payment.client_id,
    paymentIds: [paymentId],
  });
}

/** issueCreditNote: payload { clinicId, originalInvoiceId, reason, amount } */
async function issueCreditNote(payload) {
  const { clinicId, originalInvoiceId, reason, amount } = payload;
  if (!clinicId || !originalInvoiceId) throw new Error('clinicId and originalInvoiceId required');

  const { data: orig, error: origErr } = await supabase
    .from('cfdi_invoices')
    .select('id, facturapi_id, uuid, type, total')
    .eq('id', originalInvoiceId)
    .eq('clinic_id', clinicId)
    .single();
  if (origErr || !orig) throw new Error('Original invoice not found');
  if (orig.type !== 'ingreso') throw new Error('Credit note must reference an ingreso invoice');

  const creditBody = {
    type: 'egreso',
    related_documents: [{
      type: '01',
      uuid: orig.uuid,
    }],
    items: [{
      product: '85121608',
      description: reason || 'Devolución',
      quantity: 1,
      unit: 'E48',
      unit_price: amount ?? Number(orig.total),
    }],
    use: 'G02',
    payment_form: '99',
    payment_method: 'PUE',
  };

  const inv = await facturapiFetch(clinicId, '/invoices', {
    method: 'POST',
    body: JSON.stringify(creditBody),
  });

  const { data: inserted, error: insErr } = await supabase
    .from('cfdi_invoices')
    .insert({
      clinic_id: clinicId,
      facturapi_id: inv.id,
      uuid: inv.uuid || null,
      type: 'egreso',
      status: inv.status === 'active' ? 'issued' : 'draft',
      related_cfdi_id: orig.id,
      total: Math.abs(Number(inv.total)),
      subtotal: Math.abs(Number(inv.subtotal)),
      tax: Math.abs(Number(inv.tax || 0)),
      currency: inv.currency || 'MXN',
      emitted_at: inv.created_at || new Date().toISOString(),
      pdf_url: inv.cfdi?.pdf || null,
      xml_url: inv.cfdi?.xml || null,
      raw_response: inv,
    })
    .select('id')
    .single();
  if (insErr) throw new Error('Failed to store credit note: ' + insErr.message);

  return {
    id: inserted.id,
    facturapi_id: inv.id,
    uuid: inv.uuid,
    pdf_url: inv.cfdi?.pdf,
    xml_url: inv.cfdi?.xml,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = await getUser(event);
  if (!user) return jsonResponse(401, { error: 'Unauthorized' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }
  const { action, payload } = body || {};
  if (!action) return jsonResponse(400, { error: 'Missing action' });

  try {
    let result;
    switch (action) {
      case 'createCustomer': {
        await assertClinicAccess(user.id, payload.clinicId);
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', payload.clientId)
          .eq('clinic_id', payload.clinicId)
          .single();
        if (!client) throw new Error('Client not found');
        result = { customer_id: await ensureFacturapiCustomer(payload.clinicId, client) };
        break;
      }
      case 'issueIndividualInvoice':
        await assertClinicAccess(user.id, payload.clinicId);
        result = await issueIndividualInvoice(payload);
        break;
      case 'getInvoice':
        if (payload.clinicId) await assertClinicAccess(user.id, payload.clinicId);
        result = await getInvoice(payload);
        break;
      case 'issueGlobalInvoice':
        await assertClinicAccess(user.id, payload.clinicId);
        result = await issueGlobalInvoice(payload);
        break;
      case 'issueCreditNote':
        await assertClinicAccess(user.id, payload.clinicId);
        result = await issueCreditNote(payload);
        break;
      case 'issueLateInvoice':
        await assertClinicAccess(user.id, payload.clinicId);
        result = await issueLateInvoice(payload);
        break;
      default:
        return jsonResponse(400, { error: 'Unknown action' });
    }
    return jsonResponse(200, result);
  } catch (e) {
    return jsonResponse(500, { error: e.message || 'Facturapi request failed' });
  }
};
