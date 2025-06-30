
-- Create default treatments for 60 and 120 minute sessions if they don't exist
INSERT INTO public.treatments (name, duration_minutes, description, price)
VALUES 
  ('Standard Session (60 min)', 60, 'Standard 60-minute therapy session', 100),
  ('Extended Session (120 min)', 120, 'Extended 120-minute therapy session', 180)
ON CONFLICT DO NOTHING;

-- Make treatment_id nullable in appointments table to allow duration-based appointments
ALTER TABLE public.appointments ALTER COLUMN treatment_id DROP NOT NULL;

-- Add simple indexes for better performance on date-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments (start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_start_time ON public.appointments (therapist_id, start_time);
