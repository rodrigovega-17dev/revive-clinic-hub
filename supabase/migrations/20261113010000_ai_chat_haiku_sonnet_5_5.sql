-- The AI chat now offers only Claude Haiku 5.5 (default) and Claude Sonnet 5.5, both with effort.
-- Saved selections move to the successor of the model they named (Opus 5 goes to Sonnet 5.5).
-- ai_chat_jobs keeps accepting the retired IDs because its rows are a record of what ran.

UPDATE public.ai_conversations
SET ai_model = CASE ai_model
  WHEN 'claude-haiku-4-5-20251001' THEN 'claude-haiku-5-5'
  WHEN 'claude-sonnet-5' THEN 'claude-sonnet-5-5'
  WHEN 'claude-opus-5' THEN 'claude-sonnet-5-5'
  ELSE ai_model
END;

ALTER TABLE public.ai_conversations
  DROP CONSTRAINT ai_conversations_ai_model_check,
  ADD CONSTRAINT ai_conversations_ai_model_check
    CHECK (ai_model IN ('claude-haiku-5-5', 'claude-sonnet-5-5')),
  ALTER COLUMN ai_model SET DEFAULT 'claude-haiku-5-5';

ALTER TABLE public.ai_chat_jobs
  DROP CONSTRAINT ai_chat_jobs_ai_model_check,
  ADD CONSTRAINT ai_chat_jobs_ai_model_check
    CHECK (ai_model IN (
      'claude-haiku-5-5', 'claude-sonnet-5-5',
      'claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5'
    )),
  ALTER COLUMN ai_model SET DEFAULT 'claude-haiku-5-5';
