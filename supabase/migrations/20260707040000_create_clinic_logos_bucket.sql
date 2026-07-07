-- Create clinic-logos storage bucket for clinic branding (used as the faded
-- background watermark on printed/shared documents).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-logos',
  'clinic-logos',
  true,  -- public bucket so the logo can render in documents and printed reports
  2097152,  -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload a logo for their own clinic
CREATE POLICY "Users can upload logo for their clinic"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinic-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to replace their clinic's logo
CREATE POLICY "Users can update logo for their clinic"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clinic-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete their clinic's logo
CREATE POLICY "Users can delete logo for their clinic"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clinic-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow public read access (bucket is public so documents/reports can display it)
CREATE POLICY "Anyone can view clinic logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clinic-logos');
