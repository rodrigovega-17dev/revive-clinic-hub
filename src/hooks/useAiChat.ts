import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAiChatJobStatus, sendChatMessage } from '@/integrations/aiChat/service';
import { useAuth } from './useAuth';

/**
 * The user's single ongoing AI chat conversation (fetch-or-create semantics live in the
 * ai-chat function; here we just read whatever exists — the function creates it lazily
 * on the first sent message).
 */
export const useAiConversation = () => {
  const { clinicId, user } = useAuth();

  return useQuery({
    queryKey: ['ai-conversation', clinicId, user?.id],
    queryFn: async () => {
      if (!clinicId || !user?.id) return null;
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId && !!user?.id,
  });
};

export const useAiChatMessages = (conversationId: string | null | undefined) => {
  return useQuery({
    queryKey: ['ai-chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });
};

export type AiChatModel = 'claude-haiku-4-5-20251001' | 'claude-sonnet-5' | 'claude-opus-5';
export type AiChatEffort = 'low' | 'medium' | 'high';

/**
 * Updates the persisted model/effort selection shown in the chat UI. Mirrors
 * resolveOrCreateConversation's get-or-create logic (ai-chat.js) since a conversation row may
 * not exist yet the first time someone changes these settings, before ever sending a message.
 */
export const useUpdateAiChatSettings = () => {
  const queryClient = useQueryClient();
  const { clinicId, user } = useAuth();

  return useMutation({
    mutationFn: async (settings: { aiModel: AiChatModel; aiEffort: AiChatEffort }) => {
      if (!clinicId || !user?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('ai_conversations')
          .update({ ai_model: settings.aiModel, ai_effort: settings.aiEffort })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_conversations')
          .insert({ clinic_id: clinicId, user_id: user.id, ai_model: settings.aiModel, ai_effort: settings.aiEffort });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', clinicId, user?.id] });
    },
  });
};

export const useSendAiChatMessage = () => {
  const queryClient = useQueryClient();
  const { clinicId, user } = useAuth();

  return useMutation({
    mutationFn: (message: string) => sendChatMessage(message),
    onSuccess: ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', clinicId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-chat-messages', conversationId] });
    },
  });
};

export const useAiChatJobStatus = (conversationId: string | null | undefined, jobId: string | null | undefined) => {
  return useQuery({
    queryKey: ['ai-chat-job-status', conversationId, jobId],
    queryFn: () => fetchAiChatJobStatus({ jobId: jobId || undefined, conversationId: jobId ? undefined : conversationId || undefined }),
    enabled: !!conversationId || !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.job?.status;
      if (status === 'queued' || status === 'running') return 2000;
      if (!jobId && conversationId) return 5000;
      return false;
    },
  });
};

/**
 * Deletes the user's conversation row (ai_chat_messages cascades via FK) so the next
 * message starts a fresh one. RLS already scopes this delete to the caller's own row.
 */
export const useClearAiChat = () => {
  const queryClient = useQueryClient();
  const { clinicId, user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', clinicId, user?.id] });
      queryClient.removeQueries({ queryKey: ['ai-chat-messages'] });
    },
  });
};
