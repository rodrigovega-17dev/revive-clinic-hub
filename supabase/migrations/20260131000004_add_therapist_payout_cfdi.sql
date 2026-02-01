-- Add optional CFDI link to therapist payouts (therapist-provided factura de egreso)
ALTER TABLE public.therapist_payouts
  ADD COLUMN IF NOT EXISTS cfdi_invoice_id UUID REFERENCES public.cfdi_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_therapist_payouts_cfdi
  ON public.therapist_payouts (cfdi_invoice_id) WHERE cfdi_invoice_id IS NOT NULL;
