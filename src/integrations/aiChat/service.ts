/**
 * Frontend AI Clinic Chat service. Calls the Netlify ai-chat function.
 */

import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

export type AiChatMessage = Tables<'ai_chat_messages'>;
export type AiChatJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type AiChatEnqueueResponse = { conversationId: string; jobId: string; status: AiChatJobStatus };
export type AiChatJob = {
  id: string;
  conversationId: string;
  status: AiChatJobStatus;
  error: string | null;
  responseMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

const getBaseUrl = () => {
  const fallback =
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    window.location.port !== '8888'
      ? 'http://localhost:8888'
      : '';
  return import.meta.env.VITE_NETLIFY_FUNCTIONS_BASE || fallback;
};

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('User session required for AI chat');
  return token;
}

export async function sendChatMessage(message: string): Promise<AiChatEnqueueResponse> {
  const token = await getToken();
  const base = getBaseUrl();
  const res = await fetch(`${base}/.netlify/functions/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j?.error ?? text;
    } catch {
      /* use text */
    }
    throw new Error(msg || 'AI chat request failed');
  }
  return text ? JSON.parse(text) : ({} as AiChatEnqueueResponse);
}

export async function fetchAiChatJobStatus({
  jobId,
  conversationId,
}: {
  jobId?: string;
  conversationId?: string;
}): Promise<{ job: AiChatJob | null }> {
  if (!jobId && !conversationId) return { job: null };

  const token = await getToken();
  const base = getBaseUrl();
  const params = new URLSearchParams();
  if (jobId) params.set('jobId', jobId);
  else if (conversationId) params.set('conversationId', conversationId);

  const res = await fetch(`${base}/.netlify/functions/ai-chat-job-status?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j?.error ?? text;
    } catch {
      /* use text */
    }
    throw new Error(msg || 'AI chat job status request failed');
  }
  return text ? JSON.parse(text) : { job: null };
}
