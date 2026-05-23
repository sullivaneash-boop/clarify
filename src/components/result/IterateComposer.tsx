import { useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { iterationExamples } from '../../lib/interview/sampleData';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

type IterateComposerProps = {
  onSubmit: (feedback: string) => void;
};

export function IterateComposer({ onSubmit }: IterateComposerProps) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <section className="rounded-panel border border-border bg-surface p-4 shadow-soft">
      <label className="text-sm font-semibold text-text" htmlFor="iteration-feedback">
        Tell me what’s wrong in plain English.
      </label>
      <Textarea
        id="iteration-feedback"
        value={value}
        className="mt-3 min-h-28"
        placeholder="Example: Remove login and make this feel more premium."
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {iterationExamples.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-lg border border-border bg-surface-inset px-3 py-2 text-sm text-text-muted transition hover:border-accent hover:text-text"
            onClick={() => setValue(example)}
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          disabled={value.trim().length === 0}
          icon={<SendHorizontal className="h-4 w-4" />}
          onClick={submit}
        >
          Apply feedback
        </Button>
      </div>
    </section>
  );
}
