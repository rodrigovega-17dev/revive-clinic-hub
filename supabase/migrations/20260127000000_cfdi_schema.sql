-- CFDI / Mexico electronic invoicing schema
-- Plan: clients CFDI fields, treatments SAT + VAT, cfdi_invoices, cfdi_invoice_payments, payments invoice_state + refund

-- 1. Clients: optional tax (CFDI) fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS rfc VARCHAR(13),
  ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(10),
  ADD COLUMN IF NOT EXISTS cfdi_use VARCHAR(5),
  ADD COLUMN IF NOT EXISTS cfdi_email TEXT;

COMMENT ON COLUMN public.clients.rfc IS 'RFC (Mexican tax ID) for CFDI';
COMMENT ON COLUMN public.clients.tax_regime IS 'SAT tax regime code (regimen fiscal)';
COMMENT ON COLUMN public.clients.cfdi_use IS 'SAT CFDI use code (uso CFDI)';
COMMENT ON COLUMN public.clients.cfdi_email IS 'Email for CFDI delivery; defaults to email if null';

-- 2. Treatments: SAT product/service code, unit code, VAT-exempt
ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS sat_product_service_code VARCHAR(20) DEFAULT '85121608',
  ADD COLUMN IF NOT EXISTS sat_unit_code VARCHAR(10) DEFAULT 'E48',
  ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.treatments.sat_product_service_code IS 'SAT product/service code for CFDI';
COMMENT ON COLUMN public.treatments.sat_unit_code IS 'SAT unit of measure code (e.g. E48)';
COMMENT ON COLUMN public.treatments.vat_exempt IS 'Whether treatment is VAT-exempt';

-- 3. Invoice state enum and payments columns
DO $$ BEGIN
  CREATE TYPE public.invoice_state_type AS ENUM ('non_invoiced', 'individually_invoiced', 'globally_invoiced');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS invoice_state public.invoice_state_type DEFAULT 'non_invoiced',
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);

COMMENT ON COLUMN public.payments.invoice_state IS 'CFDI state: non_invoiced, individually_invoiced, globally_invoiced';
COMMENT ON COLUMN public.payments.refunded_at IS 'When payment was refunded';
COMMENT ON COLUMN public.payments.refund_amount IS 'Refunded amount';

-- Set existing payments to non_invoiced where null
UPDATE public.payments SET invoice_state = 'non_invoiced' WHERE invoice_state IS NULL;

-- 4. CFDI invoice type enum
DO $$ BEGIN
  CREATE TYPE public.cfdi_type AS ENUM ('ingreso', 'egreso', 'pago');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cfdi_status AS ENUM ('draft', 'issued', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. cfdi_invoices
CREATE TABLE IF NOT EXISTS public.cfdi_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  facturapi_id TEXT,
  uuid TEXT,
  type public.cfdi_type NOT NULL,
  status public.cfdi_status NOT NULL DEFAULT 'draft',
  folio TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'MXN',
  emitted_at TIMESTAMPTZ,
  related_cfdi_id UUID REFERENCES public.cfdi_invoices(id) ON DELETE SET NULL,
  global_period_start DATE,
  global_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  canceled_at TIMESTAMPTZ,
  pdf_url TEXT,
  xml_url TEXT,
  raw_response JSONB
);

COMMENT ON TABLE public.cfdi_invoices IS 'CFDI documents (ingreso, egreso, pago) from Facturapi';
CREATE INDEX IF NOT EXISTS idx_cfdi_invoices_clinic_id ON public.cfdi_invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cfdi_invoices_emitted_at ON public.cfdi_invoices(emitted_at);
CREATE INDEX IF NOT EXISTS idx_cfdi_invoices_status ON public.cfdi_invoices(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cfdi_invoices_uuid ON public.cfdi_invoices(uuid) WHERE uuid IS NOT NULL;

-- 6. cfdi_invoice_payments (traceability: which payments belong to which CFDI)
CREATE TABLE IF NOT EXISTS public.cfdi_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfdi_invoice_id UUID NOT NULL REFERENCES public.cfdi_invoices(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cfdi_invoice_id, payment_id)
);

COMMENT ON TABLE public.cfdi_invoice_payments IS 'Links CFDI invoices to payments for traceability';
CREATE INDEX IF NOT EXISTS idx_cfdi_invoice_payments_invoice ON public.cfdi_invoice_payments(cfdi_invoice_id);
CREATE INDEX IF NOT EXISTS idx_cfdi_invoice_payments_payment ON public.cfdi_invoice_payments(payment_id);

-- 7. RLS for cfdi_invoices and cfdi_invoice_payments (no delete; soft cancel only)
ALTER TABLE public.cfdi_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfdi_invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinic cfdi_invoices" ON public.cfdi_invoices
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can insert cfdi_invoices" ON public.cfdi_invoices
  FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

CREATE POLICY "Clinic owners can update cfdi_invoices" ON public.cfdi_invoices
  FOR UPDATE USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- No DELETE policy: invoices must not be manually deleted (fiscal compliance).

CREATE POLICY "Users can view clinic cfdi_invoice_payments" ON public.cfdi_invoice_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cfdi_invoices c
      WHERE c.id = cfdi_invoice_payments.cfdi_invoice_id
        AND c.clinic_id = public.get_user_clinic_id()
    )
  );

CREATE POLICY "Clinic owners can insert cfdi_invoice_payments" ON public.cfdi_invoice_payments
  FOR INSERT WITH CHECK (
    public.is_clinic_owner() AND
    EXISTS (
      SELECT 1 FROM public.cfdi_invoices c
      WHERE c.id = cfdi_invoice_id AND c.clinic_id = public.get_user_clinic_id()
    )
  );

CREATE POLICY "Clinic owners can update cfdi_invoice_payments" ON public.cfdi_invoice_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cfdi_invoices c
      WHERE c.id = cfdi_invoice_payments.cfdi_invoice_id
        AND c.clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner()
    )
  );

-- No DELETE policy for cfdi_invoice_payments; treat as append-only for audit.

-- 8. updated_at trigger for cfdi_invoices
CREATE TRIGGER set_cfdi_invoices_updated_at
  BEFORE UPDATE ON public.cfdi_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
