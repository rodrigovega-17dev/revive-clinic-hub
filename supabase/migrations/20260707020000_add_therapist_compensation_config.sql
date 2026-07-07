-- Add configurable therapist compensation, retention and incentive fields
ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS compensation_type TEXT NOT NULL DEFAULT 'percentage'
  CHECK (compensation_type IN ('percentage', 'fixed_per_session')),
ADD COLUMN IF NOT EXISTS fixed_session_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS retention_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS retention_rate NUMERIC(5,2) NOT NULL DEFAULT 16.00
  CHECK (retention_rate >= 0 AND retention_rate <= 100),
ADD COLUMN IF NOT EXISTS incentive_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS incentive_threshold_sessions INTEGER
  CHECK (incentive_threshold_sessions IS NULL OR incentive_threshold_sessions >= 1),
ADD COLUMN IF NOT EXISTS incentive_percentage_bonus NUMERIC(5,2)
  CHECK (
    incentive_percentage_bonus IS NULL
    OR (incentive_percentage_bonus >= 0 AND incentive_percentage_bonus <= 100)
  ),
ADD COLUMN IF NOT EXISTS incentive_fixed_bonus NUMERIC(10,2)
  CHECK (incentive_fixed_bonus IS NULL OR incentive_fixed_bonus >= 0);

-- Ensure a stable baseline for old rows.
UPDATE public.therapists
SET
  compensation_type = COALESCE(compensation_type, 'percentage'),
  retention_enabled = COALESCE(retention_enabled, false),
  retention_rate = COALESCE(retention_rate, 16.00),
  incentive_enabled = COALESCE(incentive_enabled, false)
WHERE
  compensation_type IS NULL
  OR retention_enabled IS NULL
  OR retention_rate IS NULL
  OR incentive_enabled IS NULL;

COMMENT ON COLUMN public.therapists.compensation_type IS
  'Compensation model: percentage (commission_percentage) or fixed_per_session (fixed_session_amount).';
COMMENT ON COLUMN public.therapists.fixed_session_amount IS
  'Fixed payout amount per completed+paid session when compensation_type = fixed_per_session.';
COMMENT ON COLUMN public.therapists.retention_enabled IS
  'Whether retention should be deducted from therapist gross earnings.';
COMMENT ON COLUMN public.therapists.retention_rate IS
  'Retention percent applied over therapist gross earnings when retention_enabled = true.';
COMMENT ON COLUMN public.therapists.incentive_enabled IS
  'Whether quarterly volume incentives are enabled for this therapist.';
COMMENT ON COLUMN public.therapists.incentive_threshold_sessions IS
  'Quarterly completed+paid session threshold that activates incentive.';
COMMENT ON COLUMN public.therapists.incentive_percentage_bonus IS
  'Additional percentage points added to commission_percentage when incentive threshold is met.';
COMMENT ON COLUMN public.therapists.incentive_fixed_bonus IS
  'Additional fixed amount per session added to fixed_session_amount when incentive threshold is met.';
