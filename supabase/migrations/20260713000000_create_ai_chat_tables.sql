-- AI Clinic Chat: one ongoing conversation per (clinic, user), with its message history.
-- Private per staff member (not shared like activity_log) — scoped by clinic_id AND user_id,
-- matching the existing security_settings scoping shape.

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_chat_messages_conversation ON public.ai_chat_messages (conversation_id, created_at);

-- Enforces "single ongoing conversation per user" at the DB level (fetch-or-create on first
-- message). Drop this + add a title column later if multi-conversation is ever wanted.
CREATE UNIQUE INDEX idx_ai_conversations_one_per_user ON public.ai_conversations (clinic_id, user_id);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- These RLS policies are defense-in-depth for direct frontend reads (listing/loading history).
-- The Netlify function itself uses the service-role client and enforces clinic_id/user_id
-- scoping manually before ever touching these tables.
CREATE POLICY "users_manage_own_conversations" ON public.ai_conversations
  FOR ALL
  USING (clinic_id = get_user_clinic_id() AND user_id = auth.uid())
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_id = auth.uid());

CREATE POLICY "users_manage_own_messages" ON public.ai_chat_messages
  FOR ALL
  USING (clinic_id = get_user_clinic_id() AND user_id = auth.uid())
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_id = auth.uid());
