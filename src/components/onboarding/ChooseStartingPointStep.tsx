import { ArrowLeft, PenLine } from 'lucide-react';
import { SAMPLE_PROJECTS } from '../../lib/onboarding/sampleProjects';
import type { OutputType, UserContext } from '../../lib/onboarding/schema';
import { cn } from '../../lib/utils/cn';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { SampleProjectCard } from './SampleProjectCard';

type ChooseStartingPointStepProps = {
  selectedSampleId: string | null;
  scratchPrompt: string;
  selectedContext: UserContext | null;
  selectedOutputType: OutputType;
  onBack: () => void;
  onSelectSample: (id: string) => void;
  onCompleteSample: (id: string) => void;
  onScratchChange: (value: string) => void;
  onCompleteScratch: () => void;
  onContextChange: (context: UserContext) => void;
  onOutputTypeChange: (outputType: OutputType) => void;
  onSkip: () => void;
};

const contextChips: Array<{ label: string; value: UserContext }> = [
  { label: 'Founder', value: 'founder' },
  { label: 'Agency', value: 'agency' },
  { label: 'Operator', value: 'operator' },
  { label: 'Developer', value: 'developer' },
  { label: 'Just exploring', value: 'exploring' },
];

const outputChips: Array<{ label: string; value: OutputType }> = [
  { label: 'A working prototype', value: 'prototype' },
  { label: 'A build package', value: 'build-package' },
  { label: 'Just a sharp prompt', value: 'prompt' },
  { label: 'Not sure yet', value: 'undecided' },
];

export function ChooseStartingPointStep({
  selectedSampleId,
  scratchPrompt,
  selectedContext,
  selectedOutputType,
  onBack,
  onSelectSample,
  onCompleteSample,
  onScratchChange,
  onCompleteScratch,
  onContextChange,
  onOutputTypeChange,
  onSkip,
}: ChooseStartingPointStepProps) {
  const scratchReady = scratchPrompt.trim().length > 0;

  return (
    <section className="mx-auto min-h-[calc(100vh-148px)] max-w-7xl py-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-accent-strong">Start point</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-text sm:text-5xl">Pick a starting point.</h1>
        <p className="mt-5 text-lg leading-relaxed text-text-muted">
          Start from one of these so you can see how the interview works, or describe your own. You can change
          direction anytime.
        </p>
      </div>

      <div className="mt-8 space-y-5 rounded-panel border border-border bg-surface p-4 shadow-soft">
        <ChipRow
          label="What are you? (optional)"
          chips={contextChips}
          value={selectedContext}
          onChange={onContextChange}
        />
        <ChipRow
          label="What do you want out of this? (optional)"
          chips={outputChips}
          value={selectedOutputType}
          onChange={onOutputTypeChange}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {SAMPLE_PROJECTS.map((project) => (
          <SampleProjectCard
            key={project.id}
            project={project}
            selected={selectedSampleId === project.id}
            onSelect={() => onSelectSample(project.id)}
            onStart={() => onCompleteSample(project.id)}
          />
        ))}
      </div>

      <div className="my-8 h-px bg-border" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-panel border border-border bg-surface p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-surface-inset text-accent">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Or start from scratch</h2>
              <p className="text-sm text-text-subtle">One or two sentences is enough.</p>
            </div>
          </div>
          <Textarea
            value={scratchPrompt}
            placeholder="In a sentence or two, what do you want to build?"
            className="min-h-32"
            onChange={(event) => onScratchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && scratchReady) {
                event.preventDefault();
                onCompleteScratch();
              }
            }}
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-subtle">
              {scratchReady ? 'Ready to hand this to the interview.' : 'Add a sentence to begin.'}
            </p>
            <Button type="button" variant="primary" disabled={!scratchReady} onClick={onCompleteScratch}>
              Begin the interview
            </Button>
          </div>
        </section>

        <aside className="flex flex-col justify-between rounded-panel border border-border bg-surface p-5 shadow-soft">
          <div>
            <h2 className="text-lg font-semibold text-text">Prototype mode</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Everything is stored locally in your browser. No account, API key, backend, billing, or analytics service
              is used.
            </p>
          </div>
          <Button type="button" className="mt-5" variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Back
          </Button>
        </aside>
      </div>

      <footer className="mt-8 flex justify-center">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip and go straight to a blank session
        </Button>
      </footer>
    </section>
  );
}

type ChipRowProps<T extends string> = {
  label: string;
  chips: Array<{ label: string; value: T }>;
  value: T | null;
  onChange: (value: T) => void;
};

function ChipRow<T extends string>({ label, chips, value, onChange }: ChipRowProps<T>) {
  return (
    <div>
      <p className="text-sm font-semibold text-text">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const selected = value === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              className={cn(
                'rounded-lg border px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
                selected
                  ? 'border-accent-muted bg-accent-muted/20 text-accent-strong'
                  : 'border-border bg-surface-inset text-text-muted hover:border-border-strong hover:text-text',
              )}
              aria-pressed={selected}
              onClick={() => onChange(chip.value)}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
