import { Check, Circle, Loader2, X } from 'lucide-react';
import type { BuildStep } from '../../lib/interview/schema';
import { cn } from '../../lib/utils/cn';

type BuildStepIconProps = {
  status: BuildStep['status'];
};

export function BuildStepIcon({ status }: BuildStepIconProps) {
  const className = cn(
    'flex h-9 w-9 items-center justify-center rounded-lg border',
    status === 'complete' && 'border-success/40 bg-success/10 text-success',
    status === 'running' && 'border-accent-muted bg-accent-muted/20 text-accent-strong',
    status === 'queued' && 'border-border bg-surface-inset text-text-subtle',
    status === 'failed' && 'border-danger/40 bg-danger/10 text-danger',
  );

  if (status === 'complete') {
    return (
      <div className={className}>
        <Check className="h-4 w-4" />
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={className}>
        <X className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Circle className="h-3 w-3" />
    </div>
  );
}
