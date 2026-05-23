import { ArrowLeft, ArrowRight } from 'lucide-react';
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
        <p className="text-sm font-semibold uppercase text-accent-strong">The loop</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-text sm:text-5xl">
          It works like a good first meeting with an engineer.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          You bring the idea. Clarify asks one question at a time, writes down what it learns, and won't start building
          until the plan is actually safe to build.
        </p>

        <ol className="mt-8 space-y-3">
          {loopLabels.map((label) => (
            <li key={label} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
              {label}
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={onContinue}>
            Start building
          </Button>
          <Button type="button" variant="secondary" size="lg" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <SpecMovePreview />
      </div>
    </section>
  );
}
