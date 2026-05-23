import { useEffect } from 'react';
import { InterviewWorkspace } from './interview/InterviewWorkspace';
import { OnboardingShell } from './onboarding/OnboardingShell';
import { AppShell } from './shell/AppShell';
import { useOnboardingStore } from '../stores/useOnboardingStore';

export function AppGate() {
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  useEffect(() => {
    if (!window.location.search.includes('reset-onboarding')) return;

    resetOnboarding();
    const url = new URL(window.location.href);
    url.searchParams.delete('reset-onboarding');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [resetOnboarding]);

  if (!hasCompletedOnboarding) {
    return <OnboardingShell />;
  }

  return (
    <AppShell>
      <InterviewWorkspace />
    </AppShell>
  );
}
