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
const clientCount = Number(getArgValue('--clients', '30'));
const therapistCount = Number(getArgValue('--therapists', '5'));
const appointmentCount = Number(getArgValue('--appointments', '90'));
const monthsBack = Number(getArgValue('--months', '3'));
const force = args.has('--force');
const seedId = `seed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const firstNames = [
  'Sebastian', 'Valeria', 'Mateo', 'Camila', 'Diego', 'Sofia', 'Luis', 'Ana',
  'Daniel', 'Maria', 'Jorge', 'Lucia', 'Carlos', 'Elena', 'Miguel', 'Paula',
  'Fernando', 'Isabella', 'Andres', 'Gabriela', 'Raul', 'Adriana', 'Pablo',
  'Natalia', 'Ricardo', 'Mariana', 'Hector', 'Claudia', 'Rafael', 'Patricia',
];
const lastNames = [
  'Garcia', 'Hernandez', 'Lopez', 'Martinez', 'Gonzalez', 'Perez', 'Rodriguez',
  'Sanchez', 'Ramirez', 'Flores', 'Torres', 'Gomez', 'Diaz', 'Vargas', 'Castro',
  'Ruiz', 'Ortega', 'Morales', 'Gutierrez', 'Mendoza',
];
const specialties = ['Physio', 'Sports Rehab', 'Massage', 'Post-Op', 'Neuro'];
const paymentMethods = ['cash', 'card', 'transfer', 'insurance'];
const durations = [30, 60, 90, 120];
const slotMinutesOptions = [30, 60, 90];

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (probability) => Math.random() < probability;

const buildName = () => ({
  first: randomFrom(firstNames),
  last: randomFrom(lastNames),
});

const buildEmail = (prefix, index) =>
  `${prefix}.${index + 1}.${seedId}@arcus.mx`.toLowerCase();

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const toIso = (date) => new Date(date).toISOString();

const buildAppointmentStatus = () => {
  if (chance(0.45)) return 'completed';
  if (chance(0.15)) return 'cancelled';
  if (chance(0.10)) return 'no_show';
  return 'scheduled';
};

const createTherapistRules = (clinicId, therapistId, index) => {
  return Array.from({ length: 7 }).map((_, weekday) => {
    const baseStart = 8 + (index % 2); // stagger a bit
    const startTime = `${String(baseStart).padStart(2, '0')}:00`;
    const endTime = `${String(baseStart + 8).padStart(2, '0')}:00`;
    return {
      clinic_id: clinicId,
      therapist_id: therapistId,
      weekday,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: randomFrom(slotMinutesOptions),
      buffer_minutes: index % 2 === 0 ? 0 : 10,
      is_active: true,
    };
  });
};

const buildAppointment = ({ clinicId, therapistId, clientId, treatmentId, start }) => {
  const durationMinutes = randomFrom(durations);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const status = buildAppointmentStatus();
  const isCompleted = status === 'completed';

  return {
    clinic_id: clinicId,
    therapist_id: therapistId,
    client_id: clientId,
    treatment_id: treatmentId || null,
    start_time: toIso(start),
    end_time: toIso(end),
    status,
    notes: 'Seeded appointment for testing',
    payment_amount: isCompleted ? randomInt(300, 1200) : null,
    payment_method: isCompleted ? randomFrom(paymentMethods) : null,
    payment_status: isCompleted ? 'paid' : null,
    payment_date: isCompleted ? toIso(end) : null,
  };
};

const tableExists = async (tableName) => {
  const { error } = await supabase.from(tableName).select('id').limit(1);
  if (!error) return true;
  return !String(error.message || '').toLowerCase().includes('does not exist');
};

const ensureTreatments = async (clinicId) => {
  const treatmentsTableExists = await tableExists('treatments');
  if (!treatmentsTableExists) return [];

  const { data: existing, error } = await supabase
    .from('treatments')
    .select('id, name')
    .eq('clinic_id', clinicId);

  if (error) throw error;

  const treatmentCatalog = [
    { name: 'Initial Evaluation', duration_minutes: 60, price: 800 },
    { name: 'Physio Session', duration_minutes: 60, price: 650 },
    { name: 'Sports Rehab', duration_minutes: 90, price: 950 },
  ];

  const missing = treatmentCatalog.filter(
    (treatment) => !existing?.some((row) => row.name === treatment.name)
  );

  if (!missing.length) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from('treatments')
    .insert(missing.map((treatment) => ({
      ...treatment,
      clinic_id: clinicId,
      is_active: true,
    })))
    .select('id, name');

  if (insertError) throw insertError;

  return [...(existing || []), ...(inserted || [])];
};

const ensureNoExistingSeed = async (clinicId) => {
  const { count, error } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', clinicId)
    .ilike('medical_notes', '%[seed:%');

  if (error) return;
  if (!force && count && count > 0) {
    throw new Error('Seed data already exists. Re-run with --force to add more.');
  }
};

const main = async () => {
  // 1) Find the target user and clinic.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, clinic_id, email')
    .eq('email', targetEmail)
    .single();

  if (profileError) throw profileError;
  if (!profile?.clinic_id) throw new Error('User has no clinic_id.');

  const clinicId = profile.clinic_id;
  const userId = profile.id;

  await ensureNoExistingSeed(clinicId);

  // 2) Create therapists.
  const therapistPayload = Array.from({ length: therapistCount }).map((_, index) => {
    const name = buildName();
    return {
      clinic_id: clinicId,
      first_name: name.first,
      last_name: name.last,
      email: buildEmail('therapist', index),
      is_active: true,
    };
  });

  const { data: therapists, error: therapistError } = await supabase
    .from('therapists')
    .insert(therapistPayload)
    .select('id');

  if (therapistError) throw therapistError;

  // 3) Create schedule rules for each therapist if the table exists.
  const rulesTableExists = await tableExists('therapist_schedule_rules');
  if (rulesTableExists) {
    const allRules = therapists.flatMap((therapist, index) =>
      createTherapistRules(clinicId, therapist.id, index)
    );

    // Insert fresh rules for new therapists. We avoid upsert because the
    // partial unique index on therapist rules is not compatible with onConflict.
    const { error: rulesError } = await supabase
      .from('therapist_schedule_rules')
      .insert(allRules);

    if (rulesError) throw rulesError;
  }

  // 4) Create clients.
  const clientPayload = Array.from({ length: clientCount }).map((_, index) => {
    const name = buildName();
    return {
      clinic_id: clinicId,
      first_name: name.first,
      last_name: name.last,
      email: buildEmail('client', index),
      phone: `+52${randomInt(1000000000, 9999999999)}`,
      is_active: true,
      medical_notes: `Seeded client for testing [seed:${seedId}]`,
    };
  });

  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .insert(clientPayload)
    .select('id');

  if (clientError) throw clientError;

  // 5) Ensure treatments exist and collect ids.
  const treatments = await ensureTreatments(clinicId);
  const treatmentIds = treatments.map((treatment) => treatment.id);

  // 6) Create appointments over the last X months.
  const now = new Date();
  const startWindow = new Date(now);
  const endWindow = new Date(now);
  startWindow.setMonth(startWindow.getMonth() - monthsBack);

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

  console.log('✅ Seed complete.');
  console.log(`Therapists: ${therapists.length}`);
  console.log(`Clients: ${clients.length}`);
  console.log(`Appointments: ${appointments.length}`);
};

main().catch((error) => {
  console.error('❌ Seed failed:', error.message || error);
  process.exit(1);
});
