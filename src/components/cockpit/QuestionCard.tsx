import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { DecisionOption as DecisionOptionType, JSONPatch, Question } from '../../lib/schemas';
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
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

  useEffect(() => {
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
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Clarify interview
        </div>
        <h1
          id={`${question.id}-title`}
          className="mt-5 max-w-3xl text-[clamp(2rem,5vw,4.75rem)] font-semibold leading-[0.95] tracking-normal text-text"
        >
          {question.title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">{question.whyItMatters}</p>
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

      </div>
    </motion.article>
  );
}

