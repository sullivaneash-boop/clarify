import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useInterviewStore } from '../../stores/useInterviewStore';
import { ResetOnboardingButton } from '../onboarding/ResetOnboardingButton';
import { LogoMark } from './LogoMark';

export function TopBar() {
  const phase = useInterviewStore((state) => state.phase);
  const saveStatus = useInterviewStore((state) => state.saveStatus);
  const providerLabel = useInterviewStore((state) => state.providerLabel);
  const lastPatchSummary = useInterviewStore((state) => state.lastPatchSummary);
  const resetPrototype = useInterviewStore((state) => state.resetPrototype);

  const statusTone = saveStatus === 'error' ? 'danger' : saveStatus === 'saving' ? 'warning' : 'success';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <h1 className="text-base font-semibold leading-tight text-text">Clarify</h1>
            <p className="text-xs text-text-subtle">Interview-first build planning</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="accent" className="hidden sm:inline-flex">
            {phase}
          </Badge>
          <Badge tone={statusTone}>{saveStatus}</Badge>
          <Badge tone="neutral" className="hidden md:inline-flex" title={lastPatchSummary ?? undefined}>
            Provider: {providerLabel}
          </Badge>
          <div className="hidden sm:block">
            <ResetOnboardingButton />
          </div>
          <Button variant="ghost" size="icon" aria-label="Reset prototype" onClick={resetPrototype}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
