-- Add share_token to document_instances for public view links (e.g. WhatsApp).
-- When set, the document can be viewed at /.netlify/functions/view-document?id=<id>&t=<share_token>.
ALTER TABLE public.document_instances
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_document_instances_share_token
  ON public.document_instances (share_token)
  WHERE share_token IS NOT NULL;
