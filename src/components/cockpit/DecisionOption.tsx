import { Check, Gauge } from 'lucide-react';
import type { DecisionOption as DecisionOptionType } from '../../lib/schemas';
import { cn } from '../../lib/utils';

type DecisionOptionProps = {
  option: DecisionOptionType;
  index: number;
  selected: boolean;
  onSelect: (option: DecisionOptionType) => void;
  onPreview: (option: DecisionOptionType) => void;
  onClearPreview: () => void;
};

export function DecisionOption({
  option,
  index,
  selected,
  onSelect,
  onPreview,
  onClearPreview,
}: DecisionOptionProps) {
  const disabled = Boolean(option.disabledReason);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${index + 1}. ${option.label}. ${option.consequence}`}
      disabled={disabled}
      className={cn(
        'group relative min-h-[132px] w-full rounded-[8px] border p-4 text-left transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-45',
        selected
          ? 'border-accent bg-accent-muted/20 shadow-[0_0_0_1px_rgba(240,161,95,0.35)]'
          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-raised focus-visible:border-accent-muted',
      )}
      onClick={() => onSelect(option)}
      onFocus={() => onPreview(option)}
      onBlur={onClearPreview}
      onMouseEnter={() => onPreview(option)}
      onMouseLeave={onClearPreview}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="mb-3 inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] border border-border-strong bg-surface-inset px-1.5 font-mono text-[11px] text-text-muted">
            {index + 1}
          </span>
          <span className="block text-base font-semibold leading-6 text-text">{option.label}</span>
        </span>
        <span
          className={cn(
            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
            selected ? 'border-accent bg-accent text-bg' : 'border-border text-text-subtle group-hover:border-accent-muted',
          )}
          aria-hidden="true"
        >
          {selected ? <Check className="h-4 w-4" /> : null}
        </span>
      </span>

      <span className="mt-3 block text-sm leading-5 text-text-muted">{option.consequence}</span>

      <span className="mt-4 flex flex-wrap items-center gap-2">
        {option.impactTags.map((tag) => (
          <span
            key={tag}
            className="rounded-[6px] border border-border bg-surface-inset px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 rounded-[6px] border border-accent-muted/35 bg-accent-muted/10 px-2 py-1 font-mono text-[10px] text-accent-strong">
          <Gauge className="h-3 w-3" aria-hidden="true" />
          {option.scopeWeight}/10
        </span>
      </span>
    </button>
  );
}

