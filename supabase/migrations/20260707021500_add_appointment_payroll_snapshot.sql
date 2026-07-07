-- Freeze therapist compensation setup on each appointment so payroll is non-retroactive.
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS payroll_compensation_type TEXT
  CHECK (payroll_compensation_type IN ('percentage', 'fixed_per_session')),
ADD COLUMN IF NOT EXISTS payroll_commission_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS payroll_fixed_session_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payroll_retention_enabled BOOLEAN,
ADD COLUMN IF NOT EXISTS payroll_retention_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS payroll_incentive_enabled BOOLEAN,
ADD COLUMN IF NOT EXISTS payroll_incentive_threshold_sessions INTEGER,
ADD COLUMN IF NOT EXISTS payroll_incentive_percentage_bonus NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS payroll_incentive_fixed_bonus NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payroll_snapshot_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.payroll_compensation_type IS
  'Snapshot of therapist compensation_type at payment time.';
COMMENT ON COLUMN public.appointments.payroll_commission_percentage IS
  'Snapshot of therapist commission_percentage at payment time.';
COMMENT ON COLUMN public.appointments.payroll_fixed_session_amount IS
  'Snapshot of therapist fixed_session_amount at payment time.';
COMMENT ON COLUMN public.appointments.payroll_retention_enabled IS
  'Snapshot of therapist retention_enabled at payment time.';
COMMENT ON COLUMN public.appointments.payroll_retention_rate IS
  'Snapshot of therapist retention_rate at payment time.';
COMMENT ON COLUMN public.appointments.payroll_incentive_enabled IS
  'Snapshot of therapist incentive_enabled at payment time.';
COMMENT ON COLUMN public.appointments.payroll_incentive_threshold_sessions IS
  'Snapshot of therapist incentive_threshold_sessions at payment time.';
COMMENT ON COLUMN public.appointments.payroll_incentive_percentage_bonus IS
  'Snapshot of therapist incentive_percentage_bonus at payment time.';
COMMENT ON COLUMN public.appointments.payroll_incentive_fixed_bonus IS
  'Snapshot of therapist incentive_fixed_bonus at payment time.';
COMMENT ON COLUMN public.appointments.payroll_snapshot_at IS
  'When payroll snapshot values were persisted on this appointment.';

-- One-time backfill for historical paid appointments that don't have snapshots yet.
UPDATE public.appointments AS a
SET
  payroll_compensation_type = t.compensation_type,
  payroll_commission_percentage = t.commission_percentage,
  payroll_fixed_session_amount = t.fixed_session_amount,
  payroll_retention_enabled = t.retention_enabled,
  payroll_retention_rate = t.retention_rate,
  payroll_incentive_enabled = t.incentive_enabled,
  payroll_incentive_threshold_sessions = t.incentive_threshold_sessions,
  payroll_incentive_percentage_bonus = t.incentive_percentage_bonus,
  payroll_incentive_fixed_bonus = t.incentive_fixed_bonus,
  payroll_snapshot_at = NOW()
FROM public.therapists AS t
WHERE
  a.therapist_id = t.id
  AND a.status = 'completed'
  AND a.payroll_compensation_type IS NULL;
