-- Add facturado and IVA fields to payments table for Mexican tax compliance
ALTER TABLE public.payments 
ADD COLUMN facturado BOOLEAN DEFAULT false,
ADD COLUMN iva_amount NUMERIC DEFAULT 0;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.payments.facturado IS 'Whether this payment requires an invoice (factura) for Mexican tax purposes';
COMMENT ON COLUMN public.payments.iva_amount IS 'IVA (VAT) amount calculated at 16% when facturado is true';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payments_facturado ON public.payments (facturado); 