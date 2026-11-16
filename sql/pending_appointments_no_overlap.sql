-- PENDIENTE DE APROBACIÓN: no está en supabase/migrations a propósito.
-- Impide en la base de datos que un terapeuta tenga dos citas activas traslapadas.
-- Revisión en producción (15 nov 2026): 0 traslapes entre citas no canceladas.
-- Si se aprueba, moverlo a supabase/migrations con un timestamp nuevo.
-- Efecto colateral: cualquier insert/update que hoy cree un traslape (incluida la
-- sincronización desde Google Calendar) fallará con un error 23P01.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_therapist_overlap
  EXCLUDE USING gist (
    therapist_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status <> 'cancelled');
