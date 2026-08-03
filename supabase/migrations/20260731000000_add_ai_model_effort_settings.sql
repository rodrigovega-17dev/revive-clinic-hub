-- Lets staff pick which Claude model (and, for Opus, how much reasoning effort) the AI chat
-- assistant uses. ai_conversations holds the persisted "current selection" shown in the chat UI
-- (there is exactly one conversation per clinic/user); ai_chat_jobs snapshots the selection at
-- enqueue time so a mid-flight job isn't affected by the user changing the toggle afterward.

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  ADD COLUMN IF NOT EXISTS ai_effort TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE public.ai_conversations
  ADD CONSTRAINT ai_conversations_ai_model_check
    CHECK (ai_model IN ('claude-haiku-4-5-20251001', 'claude-opus-5')),
  ADD CONSTRAINT ai_conversations_ai_effort_check
    CHECK (ai_effort IN ('low', 'medium', 'high'));

ALTER TABLE public.ai_chat_jobs
  ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  ADD COLUMN IF NOT EXISTS ai_effort TEXT NOT NULL DEFAULT 'medium';

ALTER TABLE public.ai_chat_jobs
  ADD CONSTRAINT ai_chat_jobs_ai_model_check
    CHECK (ai_model IN ('claude-haiku-4-5-20251001', 'claude-opus-5')),
  ADD CONSTRAINT ai_chat_jobs_ai_effort_check
    CHECK (ai_effort IN ('low', 'medium', 'high'));

COMMENT ON COLUMN public.ai_conversations.ai_model IS
  'Which Claude model the chat UI currently has selected for this user; effort only applies when this is the Opus model.';
COMMENT ON COLUMN public.ai_conversations.ai_effort IS
  'Reasoning effort (low/medium/high) applied only when ai_model is the Opus model.';
COMMENT ON COLUMN public.ai_chat_jobs.ai_model IS
  'Model selection snapshotted from ai_conversations at the moment this job was enqueued.';
COMMENT ON COLUMN public.ai_chat_jobs.ai_effort IS
  'Effort selection snapshotted from ai_conversations at the moment this job was enqueued.';
