import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, Copy, FileText, Hammer, X } from 'lucide-react';
import type { ClarifySession } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import { AnswerConfidenceIndicator } from '../spec/AnswerConfidenceIndicator';
import { Button } from '../ui/Button';

type BuildReadyConfirmationModalProps = {
  session: ClarifySession;
  open: boolean;
  generating: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: () => void;
  onCopyMarkdown: () => void;
};

function AnswerFlagList({ session }: { session: ClarifySession }) {
  const flagged = session.answers.filter((answer) => answer.mode === 'default' || answer.mode === 'custom');

  if (!flagged.length) {
    return (
      <p className="rounded-[7px] border border-border bg-surface-inset px-3 py-2 text-sm text-text-muted">
        No default or custom decisions to flag.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {flagged.map((answer) => {
        const question = session.questions.find((candidate) => candidate.id === answer.questionId);
        return (
          <div key={answer.id} className="rounded-[7px] border border-border bg-surface-inset px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">{question?.title ?? 'Decision'}</p>
                <p className="mt-1 text-sm text-text-muted">{answer.label}</p>
              </div>
              <AnswerConfidenceIndicator confidence={answer.confidence} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function plainList(values: string[], fallback: string) {
  return values.length ? values : [fallback];
}

function lineList(values: { text: string }[], fallback: string) {
  return values.length ? values.map((value) => value.text) : [fallback];
}

export function BuildReadyConfirmationModal({
  session,
  open,
  generating,
  onOpenChange,
  onGenerate,
  onCopyMarkdown,
}: BuildReadyConfirmationModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/72 data-[state=open]:animate-[fadeIn_160ms_ease-out]" />
        <Dialog.Content className="fixed inset-0 z-50 flex bg-bg outline-none md:inset-6 md:rounded-[12px] md:border md:border-border-strong md:shadow-panel">
          <div className="flex min-h-0 w-full flex-col">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
              <div>
                <Dialog.Title className="text-lg font-semibold text-text">Review your first build plan</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-text-muted">
                  Clarify only unlocks this when enough high-impact decisions are known.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Close review">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </header>

            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="min-h-0 overflow-y-auto border-b border-border p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="rounded-[10px] border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-semibold text-text">{session.spec.projectName}</h3>
                      <p className="mt-2 text-sm leading-6 text-text-muted">{session.spec.oneLiner}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <PlanCard title="What you're building" items={[session.spec.buildType.replace(/_/g, ' ')]} />
                  <PlanCard title="Who it's for" items={[session.spec.primaryUser ?? 'Still needed']} />
                  <PlanCard
                    title="What it will do"
                    items={plainList(
                      [
                        session.spec.mainThingTracked ? `Track: ${session.spec.mainThingTracked}` : '',
                        session.spec.mainGoal ? `Goal: ${session.spec.mainGoal}` : '',
                        ...lineList(session.spec.features, '').filter(Boolean),
                      ].filter(Boolean),
                      'Still shaping the first workflow.',
                    )}
                  />
                  <PlanCard
                    title="What it will not include yet"
                    items={lineList(session.spec.outOfScope, 'No explicit exclusions locked yet.')}
                  />
                  <PlanCard title="Assumptions" items={lineList(session.spec.risks, 'No major assumptions currently flagged.')} />
                  <PlanCard
                    title="Recommended first output"
                    items={[session.spec.desiredOutput?.replace(/_/g, ' ') ?? 'Implementation plan']}
                  />
                </div>

                <div className="mt-5">
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
                    Flagged decisions
                  </h3>
                  <AnswerFlagList session={session} />
                </div>
              </div>

              <div className="flex min-h-0 flex-col p-4 sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">Codex handoff</h3>
                  {session.buildPackage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="h-4 w-4" />}
                      onClick={onCopyMarkdown}
                    >
                      Copy
                    </Button>
                  ) : null}
                </div>
                {session.buildPackage ? (
                  <textarea
                    readOnly
                    value={session.buildPackage.markdown}
                    className="min-h-0 flex-1 resize-none rounded-[8px] border border-border bg-surface-inset p-4 font-mono text-xs leading-6 text-text outline-none"
                    aria-label="Generated Codex handoff prompt"
                  />
                ) : (
                  <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-[8px] border border-dashed border-border bg-surface-inset p-6 text-center">
                    <div className="max-w-sm">
                      <FileText className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                      <p className="mt-4 text-sm leading-6 text-text-muted">
                        Generate the handoff after reviewing the locked, default, and custom decisions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <Button
                type="button"
                variant="primary"
                className={cn('min-h-12', session.buildPackage && 'border-border-strong bg-surface-raised text-text')}
                disabled={generating}
                onClick={onGenerate}
                  icon={<Hammer className="h-4 w-4" />}
              >
                  {session.buildPackage ? 'Regenerate build package' : 'Build this'}
              </Button>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PlanCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[8px] border border-border bg-surface-inset px-3 py-3">
      <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text">
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

