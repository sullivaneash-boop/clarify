import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { JSONPatch, Question } from '../../lib/schemas';
import { canonicalizeCustomAnswer } from '../../lib/orchestrator/mock';
import { Button } from '../ui/Button';

type CustomAnswerInputProps = {
  question: Question;
  openSignal: number;
  onCommit: (payload: { rawText: string; canonicalText: string; specPatch: JSONPatch[] }) => void;
};

type CanonicalDraft = {
  rawText: string;
  canonicalText: string;
  specPatch: JSONPatch[];
};

export function CustomAnswerInput({ question, openSignal, onCommit }: CustomAnswerInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [draft, setDraft] = useState<CanonicalDraft | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (openSignal > 0) {
      setExpanded(true);
      window.setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [openSignal]);

  async function prepareDraft() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const canonicalized = await canonicalizeCustomAnswer(question, trimmed);
    setDraft({
      rawText: trimmed,
      canonicalText: canonicalized.canonicalText,
      specPatch: canonicalized.specPatch,
    });
  }

  function reset() {
    setDraft(null);
    window.setTimeout(() => textareaRef.current?.focus(), 20);
  }

  return (
    <div className="border-t border-border pt-4">
      {!expanded ? (
        <Button
          type="button"
          variant="ghost"
          className="min-h-12 w-full justify-between px-0 text-left text-text-muted hover:bg-transparent hover:text-accent-strong"
          onClick={() => {
            setExpanded(true);
            window.setTimeout(() => textareaRef.current?.focus(), 50);
          }}
        >
          Write your own
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <div className="rounded-[8px] border border-border bg-surface-inset p-3">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle" htmlFor="custom-answer">
            Custom answer
          </label>
          <textarea
            id="custom-answer"
            ref={textareaRef}
            value={value}
            rows={4}
            className="mt-3 min-h-[112px] w-full resize-none rounded-[7px] border border-border bg-bg px-3 py-3 text-sm leading-6 text-text outline-none transition focus:border-accent"
            placeholder="Describe the answer in your own words."
            onChange={(event) => {
              setValue(event.currentTarget.value);
              setDraft(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void prepareDraft();
              }
            }}
          />

          {draft ? (
            <div className="mt-3 rounded-[7px] border border-accent-muted/45 bg-accent-muted/10 p-3">
              <p className="text-sm text-text">{draft.canonicalText}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="primary" size="sm" onClick={() => onCommit(draft)}>
                  Confirm
                </Button>
                <Button type="button" variant="ghost" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>
                  Rewrite
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={() => void prepareDraft()} disabled={!value.trim()}>
                Read answer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

