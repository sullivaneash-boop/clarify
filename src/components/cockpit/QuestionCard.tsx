import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DecisionOption as DecisionOptionType, JSONPatch, Question } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { DecisionOption } from './DecisionOption';
import { UnsurePath } from './UnsurePath';
import { CustomAnswerInput } from './CustomAnswerInput';

type QuestionCardProps = {
  question: Question;
  unsureOpen: boolean;
  customOpenSignal: number;
  onUnsureOpenChange: (open: boolean) => void;
  onSelectOption: (optionId: string) => void;
  onUseDefault: () => void;
  onPreviewPatch: (patch: JSONPatch[]) => void;
  onClearPreview: () => void;
  onCustomCommit: (payload: { rawText: string; canonicalText: string; specPatch: JSONPatch[] }) => void;
};

const importanceTone: Record<Question['importance'], 'danger' | 'warning' | 'info' | 'neutral'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

export function QuestionCard({
  question,
  unsureOpen,
  customOpenSignal,
  onUnsureOpenChange,
  onSelectOption,
  onUseDefault,
  onPreviewPatch,
  onClearPreview,
  onCustomCommit,
}: QuestionCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

  useEffect(() => {
    setWhyOpen(false);
    setPendingOptionId(null);
  }, [question.id]);

  function selectOption(option: DecisionOptionType) {
    setPendingOptionId(option.id);
    window.setTimeout(() => onSelectOption(option.id), 170);
  }

  return (
    <motion.article
      key={question.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="rounded-[10px] border border-accent-muted/35 bg-surface-raised shadow-panel"
      aria-labelledby={`${question.id}-title`}
    >
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={importanceTone[question.importance]}>{question.importance}</Badge>
          <Badge tone="accent">{question.readinessWeight} readiness weight</Badge>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-text-subtle">{question.type}</span>
        </div>
        <h1
          id={`${question.id}-title`}
          className="mt-5 max-w-3xl text-[clamp(2rem,5vw,4.75rem)] font-semibold leading-[0.95] tracking-normal text-text"
        >
          {question.title}
        </h1>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="grid gap-3" role="radiogroup" aria-label={question.title}>
          {question.options.map((option, index) => (
            <DecisionOption
              key={option.id}
              option={option}
              index={index}
              selected={pendingOptionId === option.id}
              onSelect={selectOption}
              onPreview={() => onPreviewPatch(option.specPatch)}
              onClearPreview={onClearPreview}
            />
          ))}
        </div>

        <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2 sm:items-start">
          <UnsurePath
            question={question}
            open={unsureOpen}
            onOpenChange={onUnsureOpenChange}
            onUseDefault={onUseDefault}
          />
          <CustomAnswerInput question={question} openSignal={customOpenSignal} onCommit={onCustomCommit} />
        </div>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            className={cn(
              'flex min-h-11 w-full items-center justify-between gap-3 rounded-[7px] text-left text-sm text-text-muted transition hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
            )}
            onClick={() => setWhyOpen((open) => !open)}
            aria-expanded={whyOpen}
          >
            <span>Why this matters</span>
            {whyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <AnimatePresence initial={false}>
            {whyOpen ? (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden text-sm leading-6 text-text-muted"
              >
                {question.whyItMatters}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

