import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { TrustNotes } from './TrustNotes';

type WelcomeStepProps = {
  onContinue: () => void;
  onSkipIntro: () => void;
};

export function WelcomeStep({ onContinue, onSkipIntro }: WelcomeStepProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-148px)] max-w-4xl flex-col justify-center py-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-accent-strong">Clarify</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-text sm:text-6xl">
          Clarify asks before it builds.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
          Describe what you want to make. Clarify interviews you the way a senior product architect would - finding
          the gaps, weighing the tradeoffs, and turning a rough idea into a plan you can hand to Cursor, Claude Code,
          Codex, or Lovable.
        </p>
      </div>

      <div className="mt-10 grid gap-3 border-y border-border py-5 text-sm text-text-muted sm:grid-cols-3">
        <StepLabel label="Describe it" />
        <StepLabel label="Get interviewed" />
        <StepLabel label="Leave with a build plan" />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={onContinue}>
          See how it works
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onSkipIntro}>
          Skip the intro
        </Button>
      </div>

      <div className="mt-10">
        <TrustNotes />
      </div>
    </section>
  );
}

function StepLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-sm bg-accent" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
