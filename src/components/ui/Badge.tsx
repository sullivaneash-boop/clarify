import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-border bg-surface-inset text-text-muted',
  accent: 'border-accent-muted bg-accent-muted/20 text-accent-strong',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  info: 'border-info/40 bg-info/10 text-info',
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  );
}
