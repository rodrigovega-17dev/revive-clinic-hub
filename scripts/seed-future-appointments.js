import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Simple CLI args parsing without extra deps.
const args = new Set(process.argv.slice(2));
const getArgValue = (name, fallback) => {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return fallback;
  return arg.split('=').slice(1).join('=').trim() || fallback;
};

const targetEmail = getArgValue('--email', 'rodrigo.medina+sebastian1@arcus.mx');
const appointmentCount = Number(getArgValue('--appointments', '60'));
const futureWeeks = Number(getArgValue('--weeks', '2'));
const seedId = `seed-future-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const durations = [30, 60, 90, 120];

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (probability) => Math.random() < probability;

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const toIso = (date) => new Date(date).toISOString();

const tableExists = async (tableName) => {
  const { error } = await supabase.from(tableName).select('id').limit(1);
  if (!error) return true;
  return !String(error.message || '').toLowerCase().includes('does not exist');
};

const getTreatments = async (clinicId) => {
  const treatmentsTableExists = await tableExists('treatments');
  if (!treatmentsTableExists) return [];

  const { data, error } = await supabase
    .from('treatments')
    .select('id')
    .eq('clinic_id', clinicId);

  if (error) throw error;
  return data || [];
};

const buildAppointment = ({ clinicId, therapistId, clientId, treatmentId, start }) => {
  const durationMinutes = randomFrom(durations);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const status = chance(0.9) ? 'scheduled' : 'cancelled';

  return {
    clinic_id: clinicId,
    therapist_id: therapistId,
    client_id: clientId,
    treatment_id: treatmentId || null,
    start_time: toIso(start),
    end_time: toIso(end),
    status,
    notes: `Seeded future appointment [${seedId}]`,
  };
};

const main = async () => {
  if (!futureWeeks || futureWeeks <= 0) {
    throw new Error('Provide --weeks with a value greater than 0.');
  }

  // 1) Find the target user and clinic.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, clinic_id, email')
    .eq('email', targetEmail)
    .single();

  if (profileError) throw profileError;
  if (!profile?.clinic_id) throw new Error('User has no clinic_id.');

  const clinicId = profile.clinic_id;

  // 2) Load existing therapists and clients for the clinic.
  const { data: therapists, error: therapistError } = await supabase
    .from('therapists')
    .select('id')
    .eq('clinic_id', clinicId);

  if (therapistError) throw therapistError;
  if (!therapists?.length) {
    throw new Error('No therapists found for this clinic.');
  }

  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('clinic_id', clinicId);

  if (clientError) throw clientError;
  if (!clients?.length) {
    throw new Error('No clients found for this clinic.');
  }

  // 3) Fetch treatments if available.
  const treatments = await getTreatments(clinicId);
  const treatmentIds = treatments.map((treatment) => treatment.id);

  // 4) Create appointments in the next X weeks.
  const startWindow = new Date();
  const endWindow = new Date();
  endWindow.setDate(endWindow.getDate() + futureWeeks * 7);

  const appointments = Array.from({ length: appointmentCount }).map(() => {
    const start = randomDateBetween(startWindow, endWindow);
    start.setHours(randomInt(8, 17), chance(0.4) ? 30 : 0, 0, 0);

    return buildAppointment({
      clinicId,
      therapistId: randomFrom(therapists).id,
      clientId: randomFrom(clients).id,
      treatmentId: treatmentIds.length ? randomFrom(treatmentIds) : null,
      start,
    });
  });

  const { error: appointmentError } = await supabase
    .from('appointments')
    .insert(appointments);

  if (appointmentError) throw appointmentError;

  console.log('✅ Future appointments seeded.');
  console.log(`Appointments: ${appointments.length}`);
  console.log(`Weeks: ${futureWeeks}`);
  console.log(`Seed: ${seedId}`);
};

main().catch((error) => {
  console.error('❌ Seed failed:', error.message || error);
  process.exit(1);
});
