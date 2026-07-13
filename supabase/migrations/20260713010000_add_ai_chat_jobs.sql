-- Async AI Chat jobs queue for background processing.

CREATE TABLE public.ai_chat_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_message_id UUID NULL REFERENCES public.ai_chat_messages(id) ON DELETE SET NULL,
  response_message_id UUID NULL REFERENCES public.ai_chat_messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  error TEXT NULL,
  tool_calls JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_jobs_conversation_created
  ON public.ai_chat_jobs (conversation_id, created_at DESC);

CREATE INDEX idx_ai_chat_jobs_user_status
  ON public.ai_chat_jobs (user_id, status, created_at DESC);

CREATE UNIQUE INDEX idx_ai_chat_jobs_one_active_per_conversation
  ON public.ai_chat_jobs (conversation_id, user_id)
  WHERE status IN ('queued', 'running');

ALTER TABLE public.ai_chat_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_ai_chat_jobs" ON public.ai_chat_jobs
  FOR ALL
  USING (clinic_id = get_user_clinic_id() AND user_id = auth.uid())
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_id = auth.uid());
