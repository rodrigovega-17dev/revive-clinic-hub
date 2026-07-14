-- Lets the background worker report which tool it's currently calling mid-loop, so the
-- frontend (already polling job status every 2s) can show live progress instead of a
-- generic "thinking" spinner for the whole multi-tool-call duration.
ALTER TABLE public.ai_chat_jobs
  ADD COLUMN current_tool TEXT NULL;
