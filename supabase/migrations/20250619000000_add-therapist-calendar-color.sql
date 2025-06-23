-- Add calendar_color field to therapists table
-- This field stores the Google Calendar color ID for each therapist's appointments

ALTER TABLE therapists 
ADD COLUMN calendar_color_id TEXT DEFAULT '1';

-- Add comment to explain the field
COMMENT ON COLUMN therapists.calendar_color_id IS 'Google Calendar color ID for this therapist''s appointments. Default is "1" (lavender).';

-- Update existing therapists to have the default color if not set
UPDATE therapists 
SET calendar_color_id = '1' 
WHERE calendar_color_id IS NULL;

-- Create an index for better performance when querying by color
CREATE INDEX IF NOT EXISTS idx_therapists_calendar_color ON therapists (calendar_color_id); 