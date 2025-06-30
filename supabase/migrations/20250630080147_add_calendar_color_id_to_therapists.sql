-- Add calendar_color_id column to therapists table
-- This column is expected by the application code but missing from the database

-- First, add the column (nullable initially)
ALTER TABLE public.therapists 
ADD COLUMN calendar_color_id TEXT;

-- Update existing records to use the existing calendar_color value
UPDATE public.therapists 
SET calendar_color_id = calendar_color 
WHERE calendar_color_id IS NULL;

-- Make the column NOT NULL after updating existing data
ALTER TABLE public.therapists 
ALTER COLUMN calendar_color_id SET NOT NULL;

-- Add a default value for new records
ALTER TABLE public.therapists 
ALTER COLUMN calendar_color_id SET DEFAULT '#3B82F6';

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_therapists_calendar_color_id 
ON public.therapists (calendar_color_id);
