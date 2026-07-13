import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAiConversation, useAiChatMessages, useSendAiChatMessage, useClearAiChat, useAiChatJobStatus } from '@/hooks/useAiChat';
import ChatMessageList from '@/components/ai-chat/ChatMessageList';
import ChatInput from '@/components/ai-chat/ChatInput';

const AiChat = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const reportedFailedJobId = useRef<string | null>(null);
  const { data: conversation, isLoading: conversationLoading } = useAiConversation();
  const { data: messages = [], isLoading: messagesLoading } = useAiChatMessages(conversation?.id);
  const { data: jobStatusData } = useAiChatJobStatus(conversation?.id, activeJobId);
  const sendMessage = useSendAiChatMessage();
  const clearChat = useClearAiChat();

  const isLoadingHistory = conversationLoading || (!!conversation?.id && messagesLoading);
  const activeJob = jobStatusData?.job || null;
  const isJobRunning = activeJob?.status === 'queued' || activeJob?.status === 'running';

  const handleSend = (message: string) => {
    sendMessage.mutate(message, {
      onSuccess: (result) => {
        setActiveJobId(result.jobId);
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('aiChat.sendFailed'),
          variant: 'destructive',
        });
      },
    });
  };

  const handleClear = () => {
    if (!conversation?.id) return;
    clearChat.mutate(conversation.id, {
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error instanceof Error ? error.message : t('aiChat.clearFailed'),
          variant: 'destructive',
        });
      },
    });
  };

  useEffect(() => {
    if (!activeJob || !conversation?.id) return;

    if (activeJob.status === 'succeeded' || activeJob.status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['ai-chat-messages', conversation.id] });
    }

    if (activeJob.status === 'succeeded' && activeJobId && activeJob.id === activeJobId) {
      setActiveJobId(null);
      reportedFailedJobId.current = null;
    }

    if (activeJob.status === 'failed') {
      if (activeJob.id !== reportedFailedJobId.current) {
        reportedFailedJobId.current = activeJob.id;
        toast({
          title: t('common.error'),
          description: activeJob.error || t('aiChat.sendFailed'),
          variant: 'destructive',
        });
      }
      if (activeJobId && activeJob.id === activeJobId) setActiveJobId(null);
    }
  }, [activeJob, activeJobId, conversation?.id, queryClient, t, toast]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('aiChat.title')}</h1>
          <p className="text-muted-foreground">{t('aiChat.subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0" disabled={clearChat.isPending || isJobRunning}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('aiChat.clearChat')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('aiChat.clearChatConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('aiChat.clearChatConfirmDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>{t('aiChat.clearChat')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardContent className="pt-6 flex-1 min-h-0 flex flex-col">
          {isLoadingHistory ? (
            <div className="space-y-4 py-2 flex-1 min-h-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <Skeleton className="h-10 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <ChatMessageList messages={messages} isThinking={sendMessage.isPending || isJobRunning} />
          )}
          <ChatInput onSend={handleSend} disabled={sendMessage.isPending || isJobRunning} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AiChat;
