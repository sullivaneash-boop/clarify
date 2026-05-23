import type { BuildStep } from '../../lib/interview/schema';
import { cn } from '../../lib/utils/cn';
import { BuildStepIcon } from './BuildStepIcon';

type BuildStepListProps = {
  steps: BuildStep[];
};

export function BuildStepList({ steps }: BuildStepListProps) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li
          key={step.id}
          className={cn(
            'flex gap-3 rounded-xl border border-border bg-surface-inset p-4 transition',
            step.status === 'running' && 'border-accent-muted bg-accent-muted/10',
          )}
        >
          <BuildStepIcon status={step.status} />
          <div>
            <p className="font-medium text-text">{step.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
