import { ChatComposer } from './ChatComposer';
import { InterviewThread } from './InterviewThread';
import type { InterviewMessage } from '../../lib/interview/schema';

type InterviewPaneProps = {
  messages: InterviewMessage[];
  composerValue: string;
  isSending: boolean;
  onComposerChange: (value: string) => void;
  onSubmit: () => void;
};

export function InterviewPane({
  messages,
  composerValue,
  isSending,
  onComposerChange,
  onSubmit,
}: InterviewPaneProps) {
  return (
    <section className="flex min-h-[calc(100vh-64px)] flex-col bg-bg-soft md:min-h-[calc(100vh-96px)] md:rounded-panel md:border md:border-border">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs uppercase text-text-subtle">Interview</p>
        <h2 className="mt-1 text-lg font-semibold text-text">One decision at a time</h2>
      </div>
      <InterviewThread messages={messages} isSending={isSending} />
      <div className="sticky bottom-0">
        <ChatComposer value={composerValue} disabled={isSending} onChange={onComposerChange} onSubmit={onSubmit} />
      </div>
    </section>
  );
}
