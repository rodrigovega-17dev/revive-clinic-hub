-- Add facturado and iva_amount columns to payments table
ALTER TABLE public.payments 
ADD COLUMN facturado BOOLEAN DEFAULT false,
ADD COLUMN iva_amount DECIMAL(10,2) DEFAULT 0; 