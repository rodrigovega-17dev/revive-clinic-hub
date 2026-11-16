-- Fix: generate_series has no (interval, interval, interval) form; build slots from date + time timestamps.

CREATE OR REPLACE FUNCTION public.get_public_availability(
  p_slug TEXT, p_treatment_id UUID, p_from DATE, p_days INT DEFAULT 7
) RETURNS TABLE (slot_start TIMESTAMPTZ, slot_end TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_site public.clinic_sites;
  v_tz TEXT;
  v_duration INT;
  v_min_notice INT;
  v_horizon INT;
  v_days INT := LEAST(GREATEST(COALESCE(p_days, 7), 1), 14);
BEGIN
  SELECT * INTO v_site FROM public.clinic_sites WHERE slug = lower(p_slug) AND is_enabled;
  IF v_site.id IS NULL OR NOT COALESCE((v_site.booking_settings->>'enabled')::boolean, true) THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(timezone, ''), 'America/Mexico_City') INTO v_tz FROM public.clinics WHERE id = v_site.clinic_id;
  SELECT t.duration_minutes INTO v_duration FROM public.treatments t
    WHERE t.id = p_treatment_id AND t.clinic_id = v_site.clinic_id
      AND COALESCE(t.is_active, true) AND t.bookable_online AND t.show_on_site;
  IF NOT FOUND THEN RETURN; END IF;

  v_min_notice := COALESCE((v_site.booking_settings->>'min_notice_hours')::int, 12);
  v_horizon := COALESCE((v_site.booking_settings->>'horizon_days')::int, 30);

  RETURN QUERY
  WITH days AS (
    SELECT d::date AS day
    FROM generate_series(p_from, p_from + (v_days - 1), INTERVAL '1 day') d
    WHERE d::date <= ((NOW() AT TIME ZONE v_tz)::date + v_horizon)
  ),
  therapists AS (
    SELECT th.id FROM public.therapists th
    WHERE th.clinic_id = v_site.clinic_id AND COALESCE(th.is_active, true) AND NOT th.archived AND th.bookable_online
  ),
  candidates AS (
    SELECT DISTINCT
      (gs.ts AT TIME ZONE v_tz) AS s,
      (gs.ts AT TIME ZONE v_tz) + make_interval(mins => COALESCE(v_duration, r.slot_minutes)) AS e,
      th.id AS therapist_id
    FROM days
    CROSS JOIN therapists th
    CROSS JOIN LATERAL (SELECT * FROM public.website_rule_for(v_site.clinic_id, th.id, EXTRACT(DOW FROM days.day)::int)) r
    CROSS JOIN LATERAL generate_series(
      days.day + r.start_time,
      days.day + r.end_time - make_interval(mins => COALESCE(v_duration, r.slot_minutes)),
      make_interval(mins => r.slot_minutes)
    ) AS gs(ts)
    WHERE r.id IS NOT NULL
  )
  SELECT DISTINCT c.s, c.e
  FROM candidates c
  WHERE c.s >= NOW() + make_interval(hours => v_min_notice)
    AND public.website_therapist_slot_ok(v_site.clinic_id, c.therapist_id, c.s, c.e)
  ORDER BY c.s;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_availability(TEXT, UUID, DATE, INT) TO anon, authenticated;
