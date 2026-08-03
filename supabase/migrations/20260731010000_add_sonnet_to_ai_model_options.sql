-- Adds Claude Sonnet 5 as a third AI chat model option alongside Haiku and Opus. Sonnet 5
-- supports output_config.effort the same way Opus 5 does (confirmed against the live Anthropic
-- model docs), so it gets the same effort-selector treatment in the chat UI.

ALTER TABLE public.ai_conversations
  DROP CONSTRAINT ai_conversations_ai_model_check;
ALTER TABLE public.ai_conversations
  ADD CONSTRAINT ai_conversations_ai_model_check
    CHECK (ai_model IN ('claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5'));

ALTER TABLE public.ai_chat_jobs
  DROP CONSTRAINT ai_chat_jobs_ai_model_check;
ALTER TABLE public.ai_chat_jobs
  ADD CONSTRAINT ai_chat_jobs_ai_model_check
    CHECK (ai_model IN ('claude-haiku-4-5-20251001', 'claude-sonnet-5', 'claude-opus-5'));
