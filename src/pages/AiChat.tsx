import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAiConversation, useAiChatMessages, useSendAiChatMessage } from '@/hooks/useAiChat';
import ChatMessageList from '@/components/ai-chat/ChatMessageList';
import ChatInput from '@/components/ai-chat/ChatInput';

const AiChat = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: conversation, isLoading: conversationLoading } = useAiConversation();
  const { data: messages = [], isLoading: messagesLoading } = useAiChatMessages(conversation?.id);
  const sendMessage = useSendAiChatMessage();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t('aiChat.title')}</h1>
        <p className="text-muted-foreground">{t('aiChat.subtitle')}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('aiChat.title')}</CardTitle>
          <CardDescription>{t('aiChat.readOnlyNotice')}</CardDescription>
        </CardHeader>
        <CardContent>
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
