import { useEffect, useRef } from 'react';
import { IntakeScreen } from './IntakeScreen';
import { InterviewLayout } from './InterviewLayout';
import { BuildProgressView } from '../build/BuildProgressView';
import { ResultIterateView } from '../result/ResultIterateView';
import { SpecConfirmationView } from '../spec/SpecConfirmationView';
import { Button } from '../ui/Button';
import { useInterviewStore } from '../../stores/useInterviewStore';
import { clearSeed, readSeed } from '../../lib/onboarding/storage';

export function InterviewWorkspace() {
  const phase = useInterviewStore((state) => state.phase);
  const messages = useInterviewStore((state) => state.messages);
  const spec = useInterviewStore((state) => state.activeSpec);
  const changedPaths = useInterviewStore((state) => state.changedPaths);
  const composerValue = useInterviewStore((state) => state.composerValue);
  const isSending = useInterviewStore((state) => state.isSending);
  const buildJob = useInterviewStore((state) => state.buildJob);
  const artifact = useInterviewStore((state) => state.artifact);
  const selectedResultTab = useInterviewStore((state) => state.selectedResultTab);
  const error = useInterviewStore((state) => state.error);
  const specSheetOpen = useInterviewStore((state) => state.isSpecSheetOpen);
  const setComposerValue = useInterviewStore((state) => state.setComposerValue);
  const seedComposer = useInterviewStore((state) => state.seedComposer);
  const submitComposer = useInterviewStore((state) => state.submitComposer);
  const returnToInterview = useInterviewStore((state) => state.returnToInterview);
  const beginBuild = useInterviewStore((state) => state.beginBuild);
  const advanceBuildJob = useInterviewStore((state) => state.advanceBuildJob);
  const setSelectedResultTab = useInterviewStore((state) => state.setSelectedResultTab);
  const submitIterationFeedback = useInterviewStore((state) => state.submitIterationFeedback);
  const setSpecSheetOpen = useInterviewStore((state) => state.setSpecSheetOpen);
  const startFromSeed = useInterviewStore((state) => state.startFromSeed);
  const resetPrototype = useInterviewStore((state) => state.resetPrototype);
  const seedConsumedRef = useRef(false);

  useEffect(() => {
    if (seedConsumedRef.current) return;

    const seed = readSeed();
    if (!seed) return;

    seedConsumedRef.current = true;
    startFromSeed(seed);
    clearSeed();
  }, [startFromSeed]);

  if (phase === 'intake') {
    return (
      <IntakeScreen
        value={composerValue}
        isSending={isSending}
        onChange={setComposerValue}
        onSeed={seedComposer}
        onSubmit={submitComposer}
      />
    );
  }

  if (phase === 'confirm') {
    return (
      <SpecConfirmationView
        spec={spec}
        onBuild={beginBuild}
        onChange={() => returnToInterview('change')}
        onSimplify={() => returnToInterview('simplify')}
        onAdvanced={() => returnToInterview('advanced')}
      />
    );
  }

  if (phase === 'building') {
    return <BuildProgressView job={buildJob} onAdvance={advanceBuildJob} />;
  }

  if (phase === 'result' || phase === 'iterate') {
    return (
      <ResultIterateView
        artifact={artifact}
        spec={spec}
        selectedTab={selectedResultTab}
        changedPaths={changedPaths}
        onTabChange={setSelectedResultTab}
        onIterationSubmit={submitIterationFeedback}
      />
    );
  }

  if (phase === 'error') {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl items-center px-4">
        <div className="rounded-panel border border-danger/40 bg-surface p-6 shadow-panel">
          <p className="text-sm font-semibold uppercase text-danger">Local engine error</p>
          <h2 className="mt-2 text-2xl font-semibold text-text">The prototype hit a recoverable state.</h2>
          <p className="mt-3 text-text-muted">{error ?? 'Unknown error'}</p>
          <Button className="mt-5" variant="primary" onClick={resetPrototype}>
            Reset prototype
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InterviewLayout
      messages={messages}
      spec={spec}
      changedPaths={changedPaths}
      composerValue={composerValue}
      isSending={isSending}
      specSheetOpen={specSheetOpen}
      onComposerChange={setComposerValue}
      onSubmit={submitComposer}
      onSpecSheetOpenChange={setSpecSheetOpen}
    />
  );
}
