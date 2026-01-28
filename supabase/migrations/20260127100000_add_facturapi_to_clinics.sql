-- Add Facturapi (CFDI) integration fields to clinics table (per-clinic, like Google Calendar).
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS facturapi_test_secret TEXT,
  ADD COLUMN IF NOT EXISTS facturapi_live_secret TEXT,
  ADD COLUMN IF NOT EXISTS facturapi_use_live BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS facturapi_webhook_secret TEXT;

COMMENT ON COLUMN public.clinics.facturapi_test_secret IS 'Facturapi test API secret for this clinic (CFDI)';
COMMENT ON COLUMN public.clinics.facturapi_live_secret IS 'Facturapi live API secret for this clinic (CFDI)';
COMMENT ON COLUMN public.clinics.facturapi_use_live IS 'Use live Facturapi key when true, else test';
COMMENT ON COLUMN public.clinics.facturapi_webhook_secret IS 'Optional webhook secret for Facturapi signature verification';
