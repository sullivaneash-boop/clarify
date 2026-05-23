import { cn } from '../../lib/utils';
import type { Confidence } from '../../lib/schemas';

type AnswerConfidenceIndicatorProps = {
  confidence: Confidence;
  compact?: boolean;
};

const confidenceMeta: Record<Confidence, { label: string; className: string }> = {
  locked: {
    label: 'Locked',
    className: 'border-accent-muted/70 bg-accent-muted/20 text-accent-strong',
  },
  default: {
    label: 'Default',
    className: 'border-warning/50 bg-warning/10 text-warning',
  },
  assumed: {
    label: 'Assumed',
    className: 'border-text-subtle/40 bg-surface-inset text-text-muted',
  },
  custom: {
    label: 'Custom',
    className: 'border-info/50 bg-info/10 text-info',
  },
};

export function AnswerConfidenceIndicator({ confidence, compact = false }: AnswerConfidenceIndicatorProps) {
  const meta = confidenceMeta[confidence];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[6px] border font-mono uppercase tracking-[0.08em]',
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
