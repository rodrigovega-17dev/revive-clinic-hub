-- CFDI upload: source column + cfdi-uploads bucket + RLS
-- For uploaded CFDIs, xml_url/pdf_url store storage paths; Facturapi keeps full URLs.

-- 1. Add source to cfdi_invoices
ALTER TABLE public.cfdi_invoices
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'facturapi';

COMMENT ON COLUMN public.cfdi_invoices.source IS 'facturapi | uploaded; uploaded uses storage paths in xml_url/pdf_url';

UPDATE public.cfdi_invoices SET source = 'facturapi' WHERE source IS NULL;

-- 2. Create private bucket cfdi-uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('cfdi-uploads', 'cfdi-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3. RLS on storage.objects for cfdi-uploads
-- Path format: {clinic_id}/{invoice_id}/cfdi.xml | cfdi.pdf
-- SELECT: users can read objects under their clinic folder
CREATE POLICY "cfdi_uploads_select_clinic"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cfdi-uploads'
    AND (storage.foldername(name))[1] = public.get_user_clinic_id()::text
  );

-- INSERT: clinic owners only, same folder check
CREATE POLICY "cfdi_uploads_insert_clinic_owner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cfdi-uploads'
    AND public.is_clinic_owner()
    AND (storage.foldername(name))[1] = public.get_user_clinic_id()::text
  );
