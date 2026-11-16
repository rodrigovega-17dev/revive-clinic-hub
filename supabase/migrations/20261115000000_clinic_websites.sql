-- Clinic public websites: CMS content, theme, and online booking requests.
-- Additive only: new tables, new nullable/defaulted columns, new functions.
-- Public (anon) access goes exclusively through SECURITY DEFINER functions that
-- return public fields; no anon policies are added on clinical tables.

-- ---------------------------------------------------------------------------
-- 1. Site per clinic
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$'),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  theme_key TEXT NOT NULL DEFAULT 'atelier',
  theme_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,            -- draft edited in the ERP
  published_theme_key TEXT,
  published_theme_overrides JSONB,
  published_content JSONB,                               -- what visitors see
  published_at TIMESTAMPTZ,
  booking_settings JSONB NOT NULL DEFAULT
    '{"enabled": true, "min_notice_hours": 12, "horizon_days": 30}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_clinic_sites_updated_at ON public.clinic_sites;
CREATE TRIGGER update_clinic_sites_updated_at
  BEFORE UPDATE ON public.clinic_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clinic_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic_sites_staff_all" ON public.clinic_sites;
CREATE POLICY "clinic_sites_staff_all" ON public.clinic_sites
  FOR ALL TO authenticated
  USING (clinic_id = get_user_clinic_id())
  WITH CHECK (clinic_id = get_user_clinic_id());

-- ---------------------------------------------------------------------------
-- 2. Public fields on existing tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bookable_online BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_description TEXT;

ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bookable_online BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_bio TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS last_online_assigned_at TIMESTAMPTZ;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS booking_status TEXT,
  ADD COLUMN IF NOT EXISTS booking_contact JSONB,
  ADD COLUMN IF NOT EXISTS manage_token UUID DEFAULT gen_random_uuid();

DO $$ BEGIN
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_source_check
    CHECK (source IN ('staff', 'website', 'google'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_booking_status_check
    CHECK (booking_status IS NULL OR booking_status IN ('pending', 'approved', 'rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_website_pending
  ON public.appointments (clinic_id, start_time)
  WHERE source = 'website' AND booking_status = 'pending';

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'staff';

-- ---------------------------------------------------------------------------
-- 3. Rate-limit log for public booking (service role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_booking_attempts (
  id BIGSERIAL PRIMARY KEY,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_website_booking_attempts_ip
  ON public.website_booking_attempts (ip_hash, created_at);
ALTER TABLE public.website_booking_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (Netlify function) reads/writes.

-- ---------------------------------------------------------------------------
-- 4. Public media bucket (hero images, team photos)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-media', 'site-media', true, 5242880,
        ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_media_staff_insert" ON storage.objects;
CREATE POLICY "site_media_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND (storage.foldername(name))[1] = get_user_clinic_id()::text);
DROP POLICY IF EXISTS "site_media_staff_update" ON storage.objects;
CREATE POLICY "site_media_staff_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND (storage.foldername(name))[1] = get_user_clinic_id()::text);
DROP POLICY IF EXISTS "site_media_staff_delete" ON storage.objects;
CREATE POLICY "site_media_staff_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND (storage.foldername(name))[1] = get_user_clinic_id()::text);

-- ---------------------------------------------------------------------------
-- 5. Availability helpers
-- ---------------------------------------------------------------------------

-- Active rule for a therapist on a weekday: therapist-specific first, clinic default otherwise
-- (same precedence as buildRulesByWeekday in src/hooks/useAppointments.ts).
CREATE OR REPLACE FUNCTION public.website_rule_for(p_clinic_id UUID, p_therapist_id UUID, p_weekday INT)
RETURNS public.therapist_schedule_rules
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.*
  FROM public.therapist_schedule_rules r
  WHERE r.clinic_id = p_clinic_id
    AND r.weekday = p_weekday
    AND r.is_active
    AND (r.therapist_id = p_therapist_id OR r.therapist_id IS NULL)
  ORDER BY (r.therapist_id IS NULL) ASC
  LIMIT 1;
$$;

-- True when the therapist's rule covers [start, end) on the grid and nothing overlaps (with buffer).
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

  RETURN NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.therapist_id = p_therapist_id
      AND a.status NOT IN ('cancelled')
      AND a.start_time < p_end + make_interval(mins => v_rule.buffer_minutes)
      AND a.end_time > p_start - make_interval(mins => v_rule.buffer_minutes)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Public read: site + live public catalog
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_site(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', s.slug,
    'theme_key', s.published_theme_key,
    'theme_overrides', COALESCE(s.published_theme_overrides, '{}'::jsonb),
    'content', s.published_content,
    'published_at', s.published_at,
    'booking', jsonb_build_object(
      'enabled', COALESCE((s.booking_settings->>'enabled')::boolean, true),
      'horizon_days', COALESCE((s.booking_settings->>'horizon_days')::int, 30)
    ),
    'clinic', jsonb_build_object(
      'name', c.name, 'logo_url', c.logo_url, 'phone', c.phone, 'email', c.email,
      'address', c.address, 'timezone', COALESCE(NULLIF(c.timezone, ''), 'America/Mexico_City'),
      'currency', COALESCE(c.currency, 'MXN')
    ),
    'treatments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'description', COALESCE(t.public_description, t.description),
        'duration_minutes', t.duration_minutes, 'price', t.price, 'bookable', t.bookable_online
      ) ORDER BY t.name)
      FROM public.treatments t
      WHERE t.clinic_id = c.id AND COALESCE(t.is_active, true) AND t.show_on_site
    ), '[]'::jsonb),
    'therapists', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', th.id, 'first_name', th.first_name, 'last_name', th.last_name,
        'specialties', th.specialties, 'bio', th.public_bio, 'photo_url', th.photo_url
      ) ORDER BY th.first_name)
      FROM public.therapists th
      WHERE th.clinic_id = c.id AND COALESCE(th.is_active, true) AND NOT th.archived AND th.show_on_site
    ), '[]'::jsonb),
    'hours', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('weekday', r.weekday, 'start', r.start_time, 'end', r.end_time) ORDER BY r.weekday)
      FROM public.therapist_schedule_rules r
      WHERE r.clinic_id = c.id AND r.therapist_id IS NULL AND r.is_active
    ), '[]'::jsonb)
  )
  FROM public.clinic_sites s
  JOIN public.clinics c ON c.id = s.clinic_id
  WHERE s.slug = lower(p_slug) AND s.is_enabled AND s.published_content IS NOT NULL AND c.is_active;
$$;

-- Free slots for a treatment: a slot is offered when at least one bookable therapist is free.
-- Returns times only, never who is booked.
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

-- ---------------------------------------------------------------------------
-- 7. Booking request (called only by the Netlify function with the service role)
--    Round-robin: among free bookable therapists, the one assigned least recently.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_public_booking(
  p_slug TEXT, p_treatment_id UUID, p_start TIMESTAMPTZ,
  p_first_name TEXT, p_last_name TEXT, p_phone TEXT, p_email TEXT, p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_site public.clinic_sites;
  v_clinic public.clinics;
  v_treatment public.treatments;
  v_end TIMESTAMPTZ;
  v_therapist_id UUID;
  v_client_id UUID;
  v_phone TEXT := right(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), 10);
  v_email TEXT := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  v_appt public.appointments;
  v_pending INT;
BEGIN
  IF length(trim(COALESCE(p_first_name, ''))) = 0 OR length(trim(COALESCE(p_last_name, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF length(v_phone) < 10 THEN RAISE EXCEPTION 'invalid_phone'; END IF;

  SELECT * INTO v_site FROM public.clinic_sites WHERE slug = lower(p_slug) AND is_enabled;
  IF v_site.id IS NULL OR NOT COALESCE((v_site.booking_settings->>'enabled')::boolean, true) THEN
    RAISE EXCEPTION 'site_not_found';
  END IF;
  SELECT * INTO v_clinic FROM public.clinics WHERE id = v_site.clinic_id;

  SELECT * INTO v_treatment FROM public.treatments
    WHERE id = p_treatment_id AND clinic_id = v_site.clinic_id
      AND COALESCE(is_active, true) AND bookable_online AND show_on_site;
  IF v_treatment.id IS NULL THEN RAISE EXCEPTION 'treatment_not_found'; END IF;

  IF p_start < NOW() + make_interval(hours => COALESCE((v_site.booking_settings->>'min_notice_hours')::int, 12)) THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  -- Serialize bookings per clinic so two visitors cannot take the same therapist/slot.
  PERFORM pg_advisory_xact_lock(hashtext('website_booking:' || v_site.clinic_id::text));

  -- Find a free therapist; the grid length comes from the therapist's rule when the treatment has no duration.
  SELECT th.id,
         p_start + make_interval(mins => COALESCE(v_treatment.duration_minutes,
           (public.website_rule_for(v_site.clinic_id, th.id, EXTRACT(DOW FROM p_start AT TIME ZONE COALESCE(NULLIF(v_clinic.timezone, ''), 'America/Mexico_City'))::int)).slot_minutes, 60))
    INTO v_therapist_id, v_end
  FROM public.therapists th
  WHERE th.clinic_id = v_site.clinic_id AND COALESCE(th.is_active, true) AND NOT th.archived AND th.bookable_online
    AND public.website_therapist_slot_ok(
      v_site.clinic_id, th.id, p_start,
      p_start + make_interval(mins => COALESCE(v_treatment.duration_minutes,
        (public.website_rule_for(v_site.clinic_id, th.id, EXTRACT(DOW FROM p_start AT TIME ZONE COALESCE(NULLIF(v_clinic.timezone, ''), 'America/Mexico_City'))::int)).slot_minutes, 60)))
  ORDER BY th.last_online_assigned_at ASC NULLS FIRST, th.created_at ASC, th.id
  LIMIT 1;

  IF v_therapist_id IS NULL THEN RAISE EXCEPTION 'slot_unavailable'; END IF;

  -- Match an existing patient by phone, then email; otherwise create one marked as coming from the website.
  SELECT id INTO v_client_id FROM public.clients
    WHERE clinic_id = v_site.clinic_id AND NOT archived
      AND right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 10) = v_phone
    ORDER BY created_at LIMIT 1;
  IF v_client_id IS NULL AND v_email IS NOT NULL THEN
    SELECT id INTO v_client_id FROM public.clients
      WHERE clinic_id = v_site.clinic_id AND NOT archived AND lower(email) = v_email
      ORDER BY created_at LIMIT 1;
  END IF;
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (clinic_id, first_name, last_name, phone, email, source)
    VALUES (v_site.clinic_id, trim(p_first_name), trim(p_last_name), p_phone, v_email, 'website')
    RETURNING id INTO v_client_id;
  END IF;

  SELECT count(*) INTO v_pending FROM public.appointments
    WHERE client_id = v_client_id AND source = 'website' AND booking_status = 'pending' AND start_time > NOW();
  IF v_pending >= 3 THEN RAISE EXCEPTION 'too_many_pending'; END IF;

  INSERT INTO public.appointments (
    clinic_id, client_id, therapist_id, treatment_id, start_time, end_time,
    status, source, booking_status, booking_contact, notes
  ) VALUES (
    v_site.clinic_id, v_client_id, v_therapist_id, v_treatment.id, p_start, v_end,
    'scheduled', 'website', 'pending',
    jsonb_build_object('first_name', trim(p_first_name), 'last_name', trim(p_last_name),
                       'phone', p_phone, 'email', v_email, 'notes', NULLIF(trim(COALESCE(p_notes, '')), '')),
    NULLIF(trim(COALESCE(p_notes, '')), '')
  ) RETURNING * INTO v_appt;

  UPDATE public.therapists SET last_online_assigned_at = NOW() WHERE id = v_therapist_id;

  RETURN jsonb_build_object(
    'appointment_id', v_appt.id,
    'start_time', v_appt.start_time,
    'end_time', v_appt.end_time,
    'treatment_name', v_treatment.name,
    'clinic_id', v_clinic.id,
    'clinic_name', v_clinic.name,
    'clinic_email', v_clinic.email,
    'clinic_phone', v_clinic.phone,
    'timezone', COALESCE(NULLIF(v_clinic.timezone, ''), 'America/Mexico_City')
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.website_rule_for(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.website_therapist_slot_ok(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_public_booking(TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_public_booking(TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_site(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_availability(TEXT, UUID, DATE, INT) TO anon, authenticated;
