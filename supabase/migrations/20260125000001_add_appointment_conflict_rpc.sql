-- RPC to detect overlapping appointments for a therapist
CREATE OR REPLACE FUNCTION public.has_appointment_conflict(
  therapist_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  exclude_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments AS a
    WHERE a.therapist_id = has_appointment_conflict.therapist_id
      AND a.status <> 'cancelled'
      AND (exclude_appointment_id IS NULL OR a.id <> exclude_appointment_id)
      AND a.start_time < has_appointment_conflict.end_time
      AND a.end_time > has_appointment_conflict.start_time
  );
$$;
