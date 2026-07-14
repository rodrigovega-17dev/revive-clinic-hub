-- Clinic-wide facts the AI chat assistant is explicitly told to remember (e.g. "Sergio
-- is the clinic owner"). Deliberately clinic-wide, not per-user, so any staff member's
-- "remember X" is visible to the whole clinic through the chat, same as clinic
-- configuration. This is the one place the AI chat feature is allowed to write.
CREATE TABLE public.ai_clinic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_clinic_memory_clinic ON public.ai_clinic_memory (clinic_id, created_at);

ALTER TABLE public.ai_clinic_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_manage_memory" ON public.ai_clinic_memory
  FOR ALL USING (clinic_id = get_user_clinic_id())
  WITH CHECK (clinic_id = get_user_clinic_id());
