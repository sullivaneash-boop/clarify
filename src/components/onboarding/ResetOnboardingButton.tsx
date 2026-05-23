import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { useOnboardingStore } from '../../stores/useOnboardingStore';

type ResetOnboardingButtonProps = {
  compact?: boolean;
};

export function ResetOnboardingButton({ compact = false }: ResetOnboardingButtonProps) {
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  function reset() {
    const confirmed = window.confirm(
      "This clears your local onboarding state and starts you at the welcome screen. Your sample data isn't sent anywhere.",
    );
    if (confirmed) resetOnboarding();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? 'icon' : 'sm'}
      aria-label="Reset onboarding"
      title="Reset onboarding"
      icon={<RotateCcw className="h-4 w-4" />}
      onClick={reset}
    >
      {compact ? null : 'Reset onboarding'}
    </Button>
  );
}
