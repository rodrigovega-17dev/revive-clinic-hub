-- Add commission_percentage field to therapists table
-- This field stores the percentage (0-100) that each therapist gets from their appointments

ALTER TABLE therapists 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100);

-- Add comment to explain the field
COMMENT ON COLUMN therapists.commission_percentage IS 'Percentage (0-100) that the therapist receives from appointment payments. Default is 0%.';

-- Update existing therapists to have the default percentage if not set
UPDATE therapists 
SET commission_percentage = 0.00 
WHERE commission_percentage IS NULL; 