// Public booking requests from clinic websites (/s/:slug).
// Validates input, applies a honeypot and per-IP rate limit, then calls the
// request_public_booking RPC (service role only), which picks a therapist by
// round-robin and stores the appointment as a pending request.
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const RATE_LIMIT_PER_HOUR = 8;

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const KNOWN_ERRORS = ['invalid_name', 'invalid_phone', 'site_not_found', 'treatment_not_found', 'slot_unavailable', 'too_many_pending'];

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY || !to) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
  } catch (e) {
    console.warn('website-booking: email failed', e && e.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: 'server_not_configured' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  // Honeypot: bots fill the hidden "website" field. Pretend success.
  if (clean(body.website, 200)) return json(200, { ok: true });

  const slug = clean(body.slug, 60).toLowerCase();
  const treatmentId = clean(body.treatmentId, 40);
  const start = clean(body.start, 40);
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 120).toLowerCase();
  const notes = clean(body.notes, 500);

  if (!slug || !/^[0-9a-f-]{36}$/i.test(treatmentId) || Number.isNaN(Date.parse(start))) return json(400, { error: 'invalid_request' });
  if (!firstName || !lastName) return json(400, { error: 'invalid_name' });
  if (phone.replace(/\D/g, '').length < 10) return json(400, { error: 'invalid_phone' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'invalid_email' });
  if (body.consent !== true) return json(400, { error: 'consent_required' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Rate limit by hashed IP (never store the raw address).
  const ip = (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ipHash = crypto.createHash('sha256').update(`${ip}|${SUPABASE_URL}`).digest('hex').slice(0, 32);
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await supabase
    .from('website_booking_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);
  if ((count || 0) >= RATE_LIMIT_PER_HOUR) return json(429, { error: 'rate_limited' });
  await supabase.from('website_booking_attempts').insert({ ip_hash: ipHash });

  const { data, error } = await supabase.rpc('request_public_booking', {
    p_slug: slug,
    p_treatment_id: treatmentId,
    p_start: new Date(start).toISOString(),
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_email: email || null,
    p_notes: notes || null,
  });

  if (error) {
    const code = KNOWN_ERRORS.find((k) => (error.message || '').includes(k));
    if (!code) console.error('website-booking: rpc error', error.message);
    const status = code === 'site_not_found' || code === 'treatment_not_found' ? 404 : code ? 409 : 500;
    return json(status, { error: code || 'booking_failed' });
  }

  const when = new Intl.DateTimeFormat('es-MX', {
    timeZone: data.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(data.start_time));

  // Clinic notification and patient receipt (best effort; the request is already stored).
  await Promise.all([
    sendEmail(
      data.clinic_email,
      `Nueva solicitud de cita web: ${firstName} ${lastName}`,
      `<p>Hay una nueva solicitud de cita desde el sitio web.</p>
       <p><b>${escapeHtml(firstName)} ${escapeHtml(lastName)}</b><br>${escapeHtml(phone)}${email ? `<br>${escapeHtml(email)}` : ''}</p>
       <p>${escapeHtml(data.treatment_name)} · ${escapeHtml(when)}</p>
       ${notes ? `<p><i>${escapeHtml(notes)}</i></p>` : ''}
       <p>Apruébala o cámbiala de terapeuta en Cliniker → Sitio web → Solicitudes.</p>`,
    ),
    email
      ? sendEmail(
          email,
          `Recibimos tu solicitud de cita en ${data.clinic_name}`,
          `<p>Hola ${escapeHtml(firstName)},</p>
           <p>Recibimos tu solicitud para <b>${escapeHtml(data.treatment_name)}</b> el <b>${escapeHtml(when)}</b>.</p>
           <p>${escapeHtml(data.clinic_name)} la revisará y te confirmará pronto.${data.clinic_phone ? ` Si necesitas algo, llama al ${escapeHtml(data.clinic_phone)}.` : ''}</p>`,
        )
      : Promise.resolve(),
  ]);

  return json(200, { ok: true, start: data.start_time, end: data.end_time });
};
