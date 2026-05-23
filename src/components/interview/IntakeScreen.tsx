import { ArrowRight, PanelsTopLeft } from 'lucide-react';
import { examplePrompts } from '../../lib/interview/sampleData';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';

type IntakeScreenProps = {
  value: string;
  isSending: boolean;
  onChange: (value: string) => void;
  onSeed: (value: string) => void;
  onSubmit: () => void;
};

export function IntakeScreen({ value, isSending, onChange, onSeed, onSubmit }: IntakeScreenProps) {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full max-w-3xl overflow-hidden">
        <div className="border-b border-border bg-surface-raised px-6 py-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border-strong bg-surface-inset text-accent">
            <PanelsTopLeft className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-semibold tracking-normal text-text sm:text-4xl">What are you trying to build?</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-muted">
            Describe it roughly. I’ll ask the questions a developer would ask before building the wrong thing.
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <Textarea
            autoFocus
            value={value}
            placeholder="Example: I need a landing page for a local service business that captures qualified leads and feels premium..."
            className="min-h-40"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
          />

          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-lg border border-border bg-surface-inset px-3 py-2 text-sm text-text-muted transition hover:border-accent hover:text-text"
                onClick={() => onSeed(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={isSending || value.trim().length === 0}
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={onSubmit}
            >
              Start interview
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
