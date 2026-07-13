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
