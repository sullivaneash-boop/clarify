import { ArrowLeft, ArrowRight, CheckCircle2, CircleDotDashed, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { SpecMovePreview } from './SpecMovePreview';

type HowItWorksStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

const loopLabels = [
  '1. You describe it',
  '2. Clarify interviews you',
  '3. The spec fills in as you answer',
  '4. You confirm the plan',
  '5. Clarify generates the build package',
];

export function HowItWorksStep({ onBack, onContinue }: HowItWorksStepProps) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-148px)] max-w-6xl items-center gap-8 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
      <div className="order-2 lg:order-1">
        <p className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-muted/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
          <CircleDotDashed className="h-3.5 w-3.5" />
          The loop
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-text sm:text-5xl">
          It works like a good first meeting with an engineer.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          You bring the idea. Clarify asks one question at a time, writes down what it learns, and won't start building
          until the plan is actually safe to build.
        </p>

        <ol className="mt-8 space-y-3">
          {loopLabels.map((label, index) => (
            <li
              key={label}
              className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted transition hover:border-accent-muted/70 hover:bg-surface-raised/90"
            >
              {index < 2 ? (
                <Sparkles className="h-4 w-4 text-accent-strong" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              )}
              <span>{label}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="shadow-[0_12px_30px_rgba(216,138,82,0.24)]"
            icon={<ArrowRight className="h-4 w-4" />}
            onClick={onContinue}
          >
            Start building
          </Button>
          <Button type="button" variant="secondary" size="lg" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div className="neo-panel p-2">
          <SpecMovePreview />
        </div>
      </div>
    </section>
  );
}
