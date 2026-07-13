import { useTranslation } from 'react-i18next';
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
import { useAiConversation, useAiChatMessages, useSendAiChatMessage, useClearAiChat } from '@/hooks/useAiChat';
import ChatMessageList from '@/components/ai-chat/ChatMessageList';
import ChatInput from '@/components/ai-chat/ChatInput';

const AiChat = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: conversation, isLoading: conversationLoading } = useAiConversation();
  const { data: messages = [], isLoading: messagesLoading } = useAiChatMessages(conversation?.id);
  const sendMessage = useSendAiChatMessage();
  const clearChat = useClearAiChat();

  const isLoadingHistory = conversationLoading || (!!conversation?.id && messagesLoading);

  const handleSend = (message: string) => {
    sendMessage.mutate(message, {
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('aiChat.title')}</h1>
          <p className="text-muted-foreground">{t('aiChat.subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0" disabled={clearChat.isPending}>
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

      <Card>
        <CardContent className="pt-6">
          {isLoadingHistory ? (
            <div className="space-y-4 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <Skeleton className="h-10 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <ChatMessageList messages={messages} isThinking={sendMessage.isPending} />
          )}
          <ChatInput onSend={handleSend} disabled={sendMessage.isPending} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AiChat;
