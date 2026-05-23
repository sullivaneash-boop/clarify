import { useEffect, useRef } from 'react';
import type { InterviewMessage } from '../../lib/interview/schema';
import { ScrollArea } from '../ui/ScrollArea';
import { MessageBubble } from './MessageBubble';
import { StreamingCursor } from './StreamingCursor';

type InterviewThreadProps = {
  messages: InterviewMessage[];
  isSending: boolean;
};

export function InterviewThread({ messages, isSending }: InterviewThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending]);

  return (
    <ScrollArea className="flex-1 px-4 py-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {messages.length === 0 ? (
          <div className="rounded-panel border border-border bg-surface p-5 text-sm leading-relaxed text-text-muted">
            Start rough. Clarify will translate the fuzzy parts into a live spec and ask only the next decision that
            matters.
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isSending ? (
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-raised">
              <StreamingCursor />
            </div>
            Reading for spec-changing details
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
