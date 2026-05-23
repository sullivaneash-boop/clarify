import * as Popover from '@radix-ui/react-popover';
import { Compass, LockKeyhole } from 'lucide-react';
import type { BuildReadiness } from '../../lib/schemas';
import { cn } from '../../lib/utils';

type BuildReadinessMeterProps = {
  readiness: BuildReadiness;
  className?: string;
};

export function BuildReadinessMeter({ readiness, className }: BuildReadinessMeterProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'min-h-12 w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-left transition hover:border-accent-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] sm:w-[280px]',
            className,
          )}
          aria-label={readiness.statusText}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
              <Compass className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Readiness
            </span>
            <span className="text-sm font-semibold text-text">{readiness.statusText}</span>
          </span>
          <span className="mt-2 block truncate text-xs text-text-muted">
            {readiness.ready
              ? 'Ready to review your build plan.'
              : `${readiness.decisionsRemaining} decision${readiness.decisionsRemaining === 1 ? '' : 's'} still needed.`}
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
            <h3 className="text-sm font-semibold text-text">What is still needed</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {readiness.ready
              ? 'Everything needed for a safe confirmation is now known.'
              : `${readiness.statusText}. These answers still change what gets built.`}
          </p>
          <div className="mt-4 space-y-2">
            {readiness.missingRequirements.length ? (
              readiness.missingRequirements.map((item) => (
                <div key={item} className="rounded-[7px] border border-border bg-surface-inset px-3 py-2">
                  <p className="text-sm font-medium text-text">{item}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[7px] border border-border bg-surface-inset px-3 py-2 text-sm text-text-muted">
                No required decisions remain.
              </div>
            )}
          </div>
          <Popover.Arrow className="fill-surface-raised" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

