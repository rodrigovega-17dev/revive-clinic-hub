-- Optional 4-digit code to access Finanzas and Nómina (stored hashed)
ALTER TABLE public.security_settings
  ADD COLUMN IF NOT EXISTS finance_pin_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS finance_pin_salt text,
  ADD COLUMN IF NOT EXISTS finance_pin_hash text;
