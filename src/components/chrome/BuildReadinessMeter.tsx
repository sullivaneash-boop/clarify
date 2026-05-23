import * as Popover from '@radix-ui/react-popover';
import { Gauge, LockKeyhole } from 'lucide-react';
import type { BuildReadiness } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import { Progress } from '../ui/Progress';

type BuildReadinessMeterProps = {
  readiness: BuildReadiness;
  className?: string;
};

export function BuildReadinessMeter({ readiness, className }: BuildReadinessMeterProps) {
  const missingCount = readiness.missingHighImpact.length;
  const unlocked = readiness.score >= 85;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'min-h-12 w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-left transition hover:border-accent-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:w-[280px]',
            className,
          )}
          aria-label={`Build-readiness ${readiness.score} percent`}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
              <Gauge className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Build-readiness
            </span>
            <span className="font-mono text-sm text-text">{readiness.score}%</span>
          </span>
          <Progress value={readiness.score} className="mt-2 h-1.5 rounded-[4px]" />
          <span className="mt-2 block truncate text-xs text-text-muted">
            {unlocked
              ? 'Ready to review the build contract.'
              : `${missingCount} high-impact decision${missingCount === 1 ? '' : 's'} still open.`}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={10}
          className="z-50 w-[min(360px,calc(100vw-24px))] rounded-[10px] border border-border-strong bg-surface-raised p-4 shadow-panel outline-none data-[state=open]:animate-[fadeIn_160ms_ease-out]"
        >
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">Readiness gates</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Build-readiness {readiness.score}%.{' '}
            {unlocked ? 'The remaining items are polish decisions.' : 'These still affect architecture or scope.'}
          </p>
          <div className="mt-4 space-y-2">
            {readiness.missingHighImpact.length ? (
              readiness.missingHighImpact.slice(0, 5).map((question) => (
                <div key={question.id} className="rounded-[7px] border border-border bg-surface-inset px-3 py-2">
                  <p className="text-sm font-medium text-text">{question.title}</p>
                  <p className="mt-1 text-xs text-text-subtle">
                    {question.importance} · {question.readinessWeight} weight
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[7px] border border-border bg-surface-inset px-3 py-2 text-sm text-text-muted">
                No critical decisions remain.
              </div>
            )}
          </div>
          <Popover.Arrow className="fill-surface-raised" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

