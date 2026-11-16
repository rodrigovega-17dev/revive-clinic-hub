-- Daily break (e.g. lunch) per schedule rule. Web availability and round-robin
-- assignment skip any slot that overlaps the break.
-- Also: a therapist's own rule now wins even when that day is turned off, so a
-- therapist's day off no longer falls back to the clinic default on the website.

ALTER TABLE public.therapist_schedule_rules
  ADD COLUMN IF NOT EXISTS break_start TIME,
  ADD COLUMN IF NOT EXISTS break_end TIME;

DO $$ BEGIN
  ALTER TABLE public.therapist_schedule_rules ADD CONSTRAINT therapist_schedule_rules_break_window CHECK (
    (break_start IS NULL AND break_end IS NULL)
    OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_start < break_end)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Therapist-specific rule first (active or not), clinic default otherwise; only active rules count.
CREATE OR REPLACE FUNCTION public.website_rule_for(p_clinic_id UUID, p_therapist_id UUID, p_weekday INT)
RETURNS public.therapist_schedule_rules
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.* FROM (
    SELECT r.*
    FROM public.therapist_schedule_rules r
    WHERE r.clinic_id = p_clinic_id
      AND r.weekday = p_weekday
      AND (r.therapist_id = p_therapist_id OR r.therapist_id IS NULL)
    ORDER BY (r.therapist_id IS NULL) ASC
    LIMIT 1
  ) x
  WHERE x.is_active;
$$;

CREATE OR REPLACE FUNCTION public.website_therapist_slot_ok(
  p_clinic_id UUID, p_therapist_id UUID, p_start TIMESTAMPTZ, p_end TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tz TEXT;
  v_local_start TIMESTAMP;
  v_local_end TIMESTAMP;
  v_rule public.therapist_schedule_rules;
  v_offset_min NUMERIC;
BEGIN
  SELECT COALESCE(NULLIF(timezone, ''), 'America/Mexico_City') INTO v_tz FROM public.clinics WHERE id = p_clinic_id;
  v_local_start := p_start AT TIME ZONE v_tz;
  v_local_end := p_end AT TIME ZONE v_tz;
  IF v_local_start::date <> v_local_end::date AND v_local_end::time <> TIME '00:00' THEN
    RETURN false;
  END IF;

  v_rule := public.website_rule_for(p_clinic_id, p_therapist_id, EXTRACT(DOW FROM v_local_start)::int);
  IF v_rule.id IS NULL THEN RETURN false; END IF;
  IF v_local_start::time < v_rule.start_time OR v_local_end::time > v_rule.end_time THEN
    RETURN false;
  END IF;
  v_offset_min := EXTRACT(EPOCH FROM (v_local_start::time - v_rule.start_time)) / 60;
  IF mod(v_offset_min, v_rule.slot_minutes) <> 0 THEN RETURN false; END IF;

  -- Break (lunch): the slot may not overlap it.
  IF v_rule.break_start IS NOT NULL
     AND v_local_start::time < v_rule.break_end
     AND v_local_end::time > v_rule.break_start THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.therapist_id = p_therapist_id
      AND a.status NOT IN ('cancelled')
      AND a.start_time < p_end + make_interval(mins => v_rule.buffer_minutes)
      AND a.end_time > p_start - make_interval(mins => v_rule.buffer_minutes)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.website_rule_for(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_therapist_slot_ok(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
