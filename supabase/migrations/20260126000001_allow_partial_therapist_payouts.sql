-- Allow multiple payouts per therapist and pay period
DROP INDEX IF EXISTS therapist_payouts_unique_period;

CREATE INDEX IF NOT EXISTS therapist_payouts_period_lookup
  ON public.therapist_payouts (clinic_id, therapist_id, period_start, period_end);
