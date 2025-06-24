-- Add sync-related fields to appointments table for Google Calendar integration
ALTER TABLE public.appointments 
ADD COLUMN sync_status TEXT DEFAULT 'pending',
ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN sync_error_message TEXT,
ADD COLUMN google_calendar_version TEXT,
ADD COLUMN local_version INTEGER DEFAULT 1;

-- Add comments to explain the new fields
COMMENT ON COLUMN public.appointments.sync_status IS 'Status of Google Calendar sync: pending, synced, failed, conflict';
COMMENT ON COLUMN public.appointments.last_synced_at IS 'Timestamp of last successful sync with Google Calendar';
COMMENT ON COLUMN public.appointments.sync_error_message IS 'Error message from last failed sync attempt';
COMMENT ON COLUMN public.appointments.google_calendar_version IS 'Version identifier from Google Calendar event';
COMMENT ON COLUMN public.appointments.local_version IS 'Local version counter for conflict resolution';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_sync_status ON public.appointments (sync_status);
CREATE INDEX IF NOT EXISTS idx_appointments_last_synced_at ON public.appointments (last_synced_at); 