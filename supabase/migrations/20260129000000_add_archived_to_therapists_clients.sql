-- Add archived flag to therapists and clients for soft hide/unhide.
-- Default false; when true, exclude from default lists (e.g. appointments dropdown).
-- Users can "include archived" on list pages to see and unarchive.

ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.therapists.archived IS 'When true, therapist is hidden from default lists; can be unarchived.';
COMMENT ON COLUMN public.clients.archived IS 'When true, client is hidden from default lists; can be unarchived.';
