
-- Add charge_amount field to clients table
ALTER TABLE public.clients 
ADD COLUMN charge_amount NUMERIC DEFAULT 0;

-- Add payment tracking fields to appointments table
ALTER TABLE public.appointments 
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_amount NUMERIC DEFAULT 0,
ADD COLUMN payment_method TEXT DEFAULT NULL,
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add name fields to therapists table (since we're removing specialties focus)
ALTER TABLE public.therapists 
ADD COLUMN first_name TEXT DEFAULT '',
ADD COLUMN last_name TEXT DEFAULT '';

-- Update existing therapists to have default names if they don't exist
UPDATE public.therapists 
SET first_name = COALESCE(
  (SELECT p.first_name FROM public.profiles p WHERE p.id = therapists.user_id), 
  'Therapist'
),
last_name = COALESCE(
  (SELECT p.last_name FROM public.profiles p WHERE p.id = therapists.user_id), 
  ''
)
WHERE first_name IS NULL OR first_name = '';
