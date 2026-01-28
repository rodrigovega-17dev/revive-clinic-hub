-- Store Facturapi customer id per client for CFDI issuance
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS facturapi_customer_id TEXT;

COMMENT ON COLUMN public.clients.facturapi_customer_id IS 'Facturapi customer id for CFDI';

CREATE INDEX IF NOT EXISTS idx_clients_facturapi_customer_id ON public.clients (facturapi_customer_id) WHERE facturapi_customer_id IS NOT NULL;
