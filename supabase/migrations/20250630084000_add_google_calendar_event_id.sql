-- Add google_calendar_event_id column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

-- Add index for better performance when querying by Google Calendar event ID
CREATE INDEX IF NOT EXISTS idx_appointments_google_calendar_event_id 
ON public.appointments(google_calendar_event_id);

-- Add comment for documentation
COMMENT ON COLUMN public.appointments.google_calendar_event_id IS 'Google Calendar event ID for syncing appointments'; 
 
 