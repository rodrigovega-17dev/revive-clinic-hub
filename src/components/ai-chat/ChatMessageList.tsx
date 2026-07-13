import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiChatMessage } from '@/integrations/aiChat/service';

const MARKDOWN_CLASSNAMES = cn(
  'prose prose-sm dark:prose-invert max-w-none',
  'prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-headings:first:mt-0',
  'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
  'prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground',
  'prose-a:text-primary prose-code:text-foreground prose-blockquote:text-foreground',
  'prose-table:my-2'
);

interface ChatMessageListProps {
  messages: AiChatMessage[];
  isThinking: boolean;
}

const ChatMessageList = ({ messages, isThinking }: ChatMessageListProps) => {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isThinking]);

  if (messages.length === 0 && !isThinking) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center text-muted-foreground">
        <Sparkles className="h-10 w-10 mb-3 opacity-40" />
        <p>{t('aiChat.emptyState')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0 pr-3">
      <div className="space-y-4 py-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex items-start gap-3', message.role === 'user' && 'flex-row-reverse')}
          >
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                message.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
              )}
            >
              {message.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                message.role === 'user' ? 'bg-primary text-primary-foreground whitespace-pre-wrap' : 'bg-muted text-foreground'
              )}
            >
              {message.role === 'assistant' ? (
                <div className={MARKDOWN_CLASSNAMES}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="rounded-lg px-4 py-2 text-sm bg-muted text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('aiChat.thinking')}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessageList;
