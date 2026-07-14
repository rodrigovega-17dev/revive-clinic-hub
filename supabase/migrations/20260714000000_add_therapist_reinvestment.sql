-- Lets a percentage-commission therapist voluntarily give up a fixed number of percentage
-- points of their own commission rate back to the clinic (e.g. a therapist's real agreed
-- rate is 35%, but they reinvest 5 points, netting 30% — previously this was faked by just
-- hardcoding commission_percentage = 30, which lost the real agreement's semantics).
ALTER TABLE public.therapists
ADD COLUMN reinvestment_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN reinvestment_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00
  CHECK (reinvestment_percentage >= 0 AND reinvestment_percentage <= 100);

COMMENT ON COLUMN public.therapists.reinvestment_enabled IS
  'Whether this therapist voluntarily reinvests part of their commission rate back into the clinic.';
COMMENT ON COLUMN public.therapists.reinvestment_percentage IS
  'Percentage POINTS subtracted from commission_percentage (not a % of the commission amount) when reinvestment_enabled = true. Only meaningful when compensation_type = percentage.';
