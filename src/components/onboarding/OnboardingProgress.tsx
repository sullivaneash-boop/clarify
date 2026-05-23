import type { OnboardingStep } from '../../lib/onboarding/schema';
import { cn } from '../../lib/utils/cn';

const steps: Array<{ id: OnboardingStep; label: string }> = [
  { id: 'welcome', label: 'Frame' },
  { id: 'how-it-works', label: 'Loop' },
  { id: 'choose', label: 'Start' },
];

type OnboardingProgressProps = {
  currentStep: OnboardingStep;
};

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <ol className="flex items-center gap-2" aria-label="Onboarding progress">
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-xs font-medium transition',
              index <= currentIndex
                ? 'border-accent-muted bg-accent-muted/20 text-accent-strong'
                : 'border-border bg-surface-inset text-text-subtle',
            )}
            aria-current={step.id === currentStep ? 'step' : undefined}
          >
            {step.label}
          </span>
          {index < steps.length - 1 ? <span className="h-px w-5 bg-border" aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}
