-- Optionally attribute an income payment to the therapist it came from (e.g. reimbursing a
-- clinic expense already attributed to them), so it can offset that therapist's payroll
-- expense deduction for the matching period. Nullable; ON DELETE SET NULL preserves the
-- payment record if the therapist is removed. Mirrors expenses.therapist_id
-- (20260703000000_add_therapist_id_to_expenses.sql).
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES public.therapists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_therapist_id
  ON public.payments(therapist_id) WHERE therapist_id IS NOT NULL;

-- A payment attributes to at most one source: a client, a therapist, or neither.
ALTER TABLE public.payments
  ADD CONSTRAINT payments_client_or_therapist_exclusive
  CHECK (client_id IS NULL OR therapist_id IS NULL);

COMMENT ON COLUMN public.payments.therapist_id IS
  'Optional therapist this income came from (e.g. reimbursing a clinic expense attributed to them); offsets their payroll expense deduction for the period. Mutually exclusive with client_id.';
