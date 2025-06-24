-- Add Google Calendar integration fields to clinics table
ALTER TABLE clinics 
ADD COLUMN google_calendar_auth JSONB,
ADD COLUMN google_calendar_selected_id TEXT,
ADD COLUMN google_calendar_enabled BOOLEAN DEFAULT false,
ADD COLUMN google_calendar_sync_settings JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN clinics.google_calendar_auth IS 'Stores Google Calendar OAuth tokens and authentication data for this clinic';
COMMENT ON COLUMN clinics.google_calendar_selected_id IS 'The selected Google Calendar ID for this clinic';
COMMENT ON COLUMN clinics.google_calendar_enabled IS 'Whether Google Calendar integration is enabled for this clinic';
COMMENT ON COLUMN clinics.google_calendar_sync_settings IS 'Clinic-specific Google Calendar sync configuration';

-- Create index for better performance on Google Calendar queries
CREATE INDEX idx_clinics_google_calendar_enabled ON clinics(google_calendar_enabled) WHERE google_calendar_enabled = true;

-- Add RLS policies for Google Calendar fields
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own clinic's Google Calendar settings
CREATE POLICY "Users can read their own clinic Google Calendar settings" ON clinics
    FOR SELECT USING (id = (auth.jwt() ->> 'clinic_id')::uuid);

-- Policy to allow users to update their own clinic's Google Calendar settings
CREATE POLICY "Users can update their own clinic Google Calendar settings" ON clinics
    FOR UPDATE USING (id = (auth.jwt() ->> 'clinic_id')::uuid);

-- Policy to allow users to insert their own clinic's Google Calendar settings
CREATE POLICY "Users can insert their own clinic Google Calendar settings" ON clinics
    FOR INSERT WITH CHECK (id = (auth.jwt() ->> 'clinic_id')::uuid); 