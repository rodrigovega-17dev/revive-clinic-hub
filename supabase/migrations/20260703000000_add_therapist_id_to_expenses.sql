-- Optionally attribute an expense to the therapist who generated it, so it can be
-- deducted from that therapist's payroll for the matching period.
-- Nullable; ON DELETE SET NULL preserves the expense record if the therapist is removed.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES public.therapists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_therapist_id
  ON public.expenses(therapist_id) WHERE therapist_id IS NOT NULL;

COMMENT ON COLUMN public.expenses.therapist_id IS
  'Optional therapist who generated this expense; deducted from their payroll for the period.';
