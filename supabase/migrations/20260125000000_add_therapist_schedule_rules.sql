-- Create therapist schedule rules for availability generation
CREATE TABLE IF NOT EXISTS public.therapist_schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes > 0),
  buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT therapist_schedule_rules_time_window CHECK (start_time < end_time)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_therapist_schedule_rules_clinic_id
  ON public.therapist_schedule_rules (clinic_id);
CREATE INDEX IF NOT EXISTS idx_therapist_schedule_rules_therapist_id
  ON public.therapist_schedule_rules (therapist_id);

-- Uniqueness for clinic defaults (therapist_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS therapist_schedule_rules_clinic_day_default_unique
  ON public.therapist_schedule_rules (clinic_id, weekday)
  WHERE therapist_id IS NULL;

-- Uniqueness for therapist-specific rules
CREATE UNIQUE INDEX IF NOT EXISTS therapist_schedule_rules_therapist_day_unique
  ON public.therapist_schedule_rules (clinic_id, therapist_id, weekday)
  WHERE therapist_id IS NOT NULL;

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_therapist_schedule_rules_updated_at ON public.therapist_schedule_rules;
CREATE TRIGGER update_therapist_schedule_rules_updated_at
  BEFORE UPDATE ON public.therapist_schedule_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS and restrict by clinic
ALTER TABLE public.therapist_schedule_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their clinic's data" ON public.therapist_schedule_rules;
CREATE POLICY "Users can only access their clinic's data"
  ON public.therapist_schedule_rules
  FOR ALL
  USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Default rules per clinic (08:00-18:00, 60 min slots, no buffer)
INSERT INTO public.therapist_schedule_rules (
  clinic_id,
  therapist_id,
  weekday,
  start_time,
  end_time,
  slot_minutes,
  buffer_minutes
)
SELECT
  clinics.id,
  NULL,
  weekday.day,
  TIME '08:00',
  TIME '18:00',
  60,
  0
FROM public.clinics
CROSS JOIN generate_series(0, 6) AS weekday(day)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.therapist_schedule_rules rules
  WHERE rules.clinic_id = clinics.id
    AND rules.therapist_id IS NULL
    AND rules.weekday = weekday.day
);
