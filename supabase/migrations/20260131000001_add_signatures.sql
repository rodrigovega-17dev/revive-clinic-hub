-- Add signature support for documents
-- Therapists and profiles can have signature images; documents track responsible person

-- Add signature_image_url to therapists (for therapist signatures)
ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

-- Add signature_image_url to profiles (for non-therapist staff signatures)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

COMMENT ON COLUMN public.therapists.signature_image_url IS 
  'URL to signature image (uploaded or drawn). Falls back to stylized name if null.';
COMMENT ON COLUMN public.profiles.signature_image_url IS 
  'URL to signature image (uploaded or drawn). Falls back to stylized name if null.';

-- Track who is responsible for the document (therapist_id or user_id)
ALTER TABLE public.document_instances
  ADD COLUMN IF NOT EXISTS responsible_person_type TEXT 
    CHECK (responsible_person_type IN ('therapist', 'user')),
  ADD COLUMN IF NOT EXISTS responsible_person_id UUID;

COMMENT ON COLUMN public.document_instances.responsible_person_type IS 
  'Type of responsible person: therapist or user (non-therapist staff)';
COMMENT ON COLUMN public.document_instances.responsible_person_id IS 
  'ID of therapist or profile who is responsible for this document';
