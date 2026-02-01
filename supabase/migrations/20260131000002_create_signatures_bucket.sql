-- Create signatures storage bucket for signature images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  true,  -- public bucket so signature images can be displayed in documents
  2097152,  -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload signatures for their clinic
CREATE POLICY "Users can upload signatures for their clinic"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update/replace signatures for their clinic
CREATE POLICY "Users can update signatures for their clinic"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete signatures for their clinic
CREATE POLICY "Users can delete signatures for their clinic"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures'
  AND (storage.foldername(name))[1] IN (
    SELECT clinic_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Allow public read access (since bucket is public for document display)
CREATE POLICY "Anyone can view signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signatures');
