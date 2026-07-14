import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiChatMessage } from '@/integrations/aiChat/service';
import type { Json } from '@/integrations/supabase/types';

/** tool_calls is stored as an array of {name, input} — extract distinct tool names, in call order. */
const getUsedToolNames = (toolCalls: Json | null): string[] => {
  if (!Array.isArray(toolCalls)) return [];
  const names: string[] = [];
  toolCalls.forEach((entry) => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && typeof (entry as { name?: unknown }).name === 'string') {
      const name = (entry as { name: string }).name;
      if (!names.includes(name)) names.push(name);
    }
  });
  return names;
};

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
    <ScrollArea className="flex-1 min-h-0">
      <div className="mx-auto w-full max-w-4xl space-y-4 py-2">
        {messages.map((message) => {
          const usedTools = message.role === 'assistant' ? getUsedToolNames(message.tool_calls) : [];
          return (
            <div
              key={message.id}
              className={cn('w-full', message.role === 'user' && 'flex justify-end')}
            >
              <div
                className={cn(
                  'text-sm',
                  message.role === 'user'
                    ? 'max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground whitespace-pre-wrap'
                    : 'w-full rounded-none bg-transparent px-0 py-1 text-foreground'
                )}
              >
                {message.role === 'assistant'
                  ? (
                    <>
                      {usedTools.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                          {usedTools.map((toolName) => (
                            <Badge key={toolName} variant="secondary" className="text-[10px] font-mono font-normal px-1.5 py-0">
                              {toolName}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className={MARKDOWN_CLASSNAMES}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    </>
                  )
                  : message.content}
              </div>
            </div>
          );
        })}
        {isThinking && (
          <div className="w-full text-sm text-muted-foreground flex items-center gap-2 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t('aiChat.thinking')}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessageList;
