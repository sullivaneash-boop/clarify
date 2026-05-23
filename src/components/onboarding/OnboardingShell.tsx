import { useEffect } from 'react';
import { OnboardingProgress } from './OnboardingProgress';
import { ResetOnboardingButton } from './ResetOnboardingButton';
import { WelcomeStep } from './WelcomeStep';
import { HowItWorksStep } from './HowItWorksStep';
import { ChooseStartingPointStep } from './ChooseStartingPointStep';
import { useOnboardingStore } from '../../stores/useOnboardingStore';
import { LogoMark } from '../shell/LogoMark';

export function OnboardingShell() {
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const selectedSampleId = useOnboardingStore((state) => state.selectedSampleId);
  const scratchPrompt = useOnboardingStore((state) => state.scratchPrompt);
  const selectedContext = useOnboardingStore((state) => state.selfDescribedContext);
  const selectedOutputType = useOnboardingStore((state) => state.selectedOutputType);
  const goTo = useOnboardingStore((state) => state.goTo);
  const back = useOnboardingStore((state) => state.back);
  const selectSample = useOnboardingStore((state) => state.selectSample);
  const setScratchPrompt = useOnboardingStore((state) => state.setScratchPrompt);
  const setContext = useOnboardingStore((state) => state.setContext);
  const setOutputType = useOnboardingStore((state) => state.setOutputType);
  const completeWithSample = useOnboardingStore((state) => state.completeWithSample);
  const completeWithScratch = useOnboardingStore((state) => state.completeWithScratch);
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && currentStep !== 'welcome') {
        event.preventDefault();
        back();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [back, currentStep]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <p className="text-base font-semibold leading-tight text-text">Clarify</p>
              <p className="text-xs text-text-subtle">Prototype mode</p>
            </div>
          </div>
          <ResetOnboardingButton />
        </div>
      </header>

      <main className="px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 pt-5">
          <OnboardingProgress currentStep={currentStep} />
        </div>

        <div className="motion-safe:animate-[fadeIn_220ms_ease-out]">
          {currentStep === 'welcome' ? (
            <WelcomeStep onContinue={() => goTo('how-it-works')} onSkipIntro={() => goTo('choose')} />
          ) : null}

          {currentStep === 'how-it-works' ? (
            <HowItWorksStep onBack={back} onContinue={() => goTo('choose')} />
          ) : null}

          {currentStep === 'choose' ? (
            <ChooseStartingPointStep
              selectedSampleId={selectedSampleId}
              scratchPrompt={scratchPrompt}
              selectedContext={selectedContext}
              selectedOutputType={selectedOutputType}
              onBack={back}
              onSelectSample={selectSample}
              onCompleteSample={completeWithSample}
              onScratchChange={setScratchPrompt}
              onCompleteScratch={completeWithScratch}
              onContextChange={setContext}
              onOutputTypeChange={setOutputType}
              onSkip={skipOnboarding}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
