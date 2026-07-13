/**
 * Frontend AI Clinic Chat service. Calls the Netlify ai-chat function.
 */

import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

export type AiChatMessage = Tables<'ai_chat_messages'>;

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

export async function sendChatMessage(message: string): Promise<{ conversationId: string; message: AiChatMessage }> {
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
  return text ? JSON.parse(text) : ({} as { conversationId: string; message: AiChatMessage });
}
