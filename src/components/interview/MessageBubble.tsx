import { Bot, User } from 'lucide-react';
import type { InterviewMessage } from '../../lib/interview/schema';
import { formatDateTime } from '../../lib/utils/format';
import { cn } from '../../lib/utils/cn';
import { StreamingCursor } from './StreamingCursor';

type MessageBubbleProps = {
  message: InterviewMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <article className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
          isUser ? 'border-accent-muted bg-accent-muted/20 text-accent-strong' : 'border-border bg-surface-raised text-text-muted',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('max-w-[84%]', isUser && 'text-right')}>
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-soft',
            isUser
              ? 'rounded-tr-sm border-accent-muted bg-accent-muted/20 text-text'
              : 'rounded-tl-sm border-border bg-surface text-text',
          )}
        >
          {message.content.split('\n').map((line, index) => (
            <p key={`${message.id}-${index}`} className="mb-2 last:mb-0">
              {line}
            </p>
          ))}
          {message.status === 'streaming' ? <StreamingCursor /> : null}
        </div>
        <p className="mt-1 text-xs text-text-subtle">{formatDateTime(message.createdAt)}</p>
      </div>
    </article>
  );
}
