import { Check } from 'lucide-react';
import type { ClarifySession } from '../../lib/schemas';
import { cn } from '../../lib/utils';

type QuestionStackProps = {
  session: ClarifySession;
  onRevisit: (questionId: string) => void;
};

export function QuestionStack({ session, onRevisit }: QuestionStackProps) {
  if (!session.answers.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Answered questions">
      {session.answers.map((answer) => {
        const question = session.questions.find((candidate) => candidate.id === answer.questionId);
        const shortTitle = question?.title.replace(/[.?]$/g, '') ?? 'Decision';

        return (
          <button
            key={answer.id}
            type="button"
            className={cn(
              'inline-flex min-h-9 max-w-full items-center gap-2 rounded-[7px] border border-border bg-surface px-3 py-1.5 text-left text-xs text-text-muted transition hover:border-accent-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
            )}
            onClick={() => onRevisit(answer.questionId)}
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <span className="truncate">
              {shortTitle} · <span className="text-text">{answer.label.replace(/^We read this as:\s*/i, '')}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

