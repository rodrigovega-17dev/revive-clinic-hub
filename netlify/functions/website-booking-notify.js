// Emails the patient after the clinic approves or rejects a web booking request.
// Requires the staff member's Supabase JWT; the appointment must belong to their clinic.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const titleCase = (s) => String(s || '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: 'server_not_configured' });

  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'unauthorized' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'invalid_json' }); }
  const { appointmentId, decision } = body;
  if (!appointmentId || !['approved', 'rejected'].includes(decision)) return json(400, { error: 'invalid_request' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' });

  const { data: profile } = await supabase.from('profiles').select('clinic_id').eq('id', userData.user.id).single();
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, clinic_id, start_time, booking_status, booking_contact, treatments(name), therapists(first_name, last_name), clinics(name, phone, timezone, address)')
    .eq('id', appointmentId)
    .single();

  if (!appt || !profile || appt.clinic_id !== profile.clinic_id) return json(404, { error: 'not_found' });
  if (appt.booking_status !== decision) return json(409, { error: 'status_mismatch' });

  const email = appt.booking_contact?.email;
  if (!email) return json(200, { status: 'no_email' });
  if (!RESEND_API_KEY) return json(200, { status: 'noop', reason: 'RESEND_API_KEY not configured' });

  const clinic = appt.clinics || {};
  const when = new Intl.DateTimeFormat('es-MX', {
    timeZone: clinic.timezone || 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(appt.start_time));
  const name = escapeHtml(appt.booking_contact?.first_name || '');
  const treatment = escapeHtml(appt.treatments?.name || '');
  const therapist = appt.therapists ? escapeHtml(titleCase(`${appt.therapists.first_name || ''} ${appt.therapists.last_name || ''}`.trim())) : '';

  const subject = decision === 'approved'
    ? `Tu cita en ${clinic.name} está confirmada`
    : `Tu solicitud de cita en ${clinic.name}`;
  const html = decision === 'approved'
    ? `<p>Hola ${name},</p><p>Tu cita de <b>${treatment}</b> quedó confirmada para el <b>${escapeHtml(when)}</b>${therapist ? ` con ${therapist}` : ''}.</p>
       ${clinic.address ? `<p>${escapeHtml(clinic.address)}</p>` : ''}
       <p>Si necesitas cambiarla${clinic.phone ? `, llama al ${escapeHtml(clinic.phone)}` : ', contáctanos'}.</p>`
    : `<p>Hola ${name},</p><p>No pudimos confirmar tu solicitud de <b>${treatment}</b> para el ${escapeHtml(when)}.</p>
       <p>Puedes elegir otro horario en nuestro sitio${clinic.phone ? ` o llamar al ${escapeHtml(clinic.phone)}` : ''}.</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [email], subject, html }),
  });
  return json(200, { status: res.ok ? 'sent' : 'email_failed' });
};
