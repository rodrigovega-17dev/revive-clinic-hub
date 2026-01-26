-- Track therapist payouts per pay period
CREATE TABLE IF NOT EXISTS public.therapist_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'transfer',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT therapist_payouts_period_check CHECK (period_start <= period_end)
);

-- Prevent duplicate payouts for the same therapist and pay period
CREATE UNIQUE INDEX IF NOT EXISTS therapist_payouts_unique_period
  ON public.therapist_payouts (clinic_id, therapist_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_therapist_payouts_clinic
  ON public.therapist_payouts (clinic_id);
CREATE INDEX IF NOT EXISTS idx_therapist_payouts_therapist
  ON public.therapist_payouts (therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_payouts_period
  ON public.therapist_payouts (period_start, period_end);

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_therapist_payouts_updated_at ON public.therapist_payouts;
CREATE TRIGGER update_therapist_payouts_updated_at
  BEFORE UPDATE ON public.therapist_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS and restrict by clinic
ALTER TABLE public.therapist_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only access their clinic's data" ON public.therapist_payouts;
CREATE POLICY "Users can only access their clinic's data"
  ON public.therapist_payouts
  FOR ALL
  USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));
