-- Add "waiting_checkout" as an intermediate status between in_progress and completed
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'waiting_checkout' AFTER 'in_progress';
