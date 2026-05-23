import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { BuildPlanIcon, InterviewLoopIcon, PromptFrameIcon } from '../icons/ClarifyIcons';
import { Button } from '../ui/Button';
import { Magnetic } from '../ui/Magnetic';
import { SpotlightCard } from '../ui/SpotlightCard';
import { TrustNotes } from './TrustNotes';

type WelcomeStepProps = {
  onContinue: () => void;
  onSkipIntro: () => void;
};

export function WelcomeStep({ onContinue, onSkipIntro }: WelcomeStepProps) {
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setHeroReady(true), 30);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section className={`hero-sequence relative mx-auto flex min-h-[calc(100vh-148px)] max-w-6xl flex-col justify-center py-10 ${heroReady ? 'is-ready' : ''}`}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-12 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(240,161,95,0.2)_0%,rgba(240,161,95,0.06)_42%,rgba(240,161,95,0)_72%)] blur-2xl" />
        <div className="hero-scanline absolute inset-0 opacity-20" />
      </div>

      <div className="hero-stage hero-stage-1 neo-panel max-w-4xl p-8 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-muted/70 bg-accent-muted/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
          <Sparkles className="h-3.5 w-3.5" />
          Clarify / Prototype mode
        </div>
        <h1 className="hero-stage hero-stage-2 mt-5 text-4xl font-semibold tracking-normal text-text sm:text-6xl">
          Clarify asks before it builds.
        </h1>
        <p className="hero-stage hero-stage-3 mt-5 max-w-3xl text-lg leading-relaxed text-text-muted">
          Describe what you want to make. Clarify interviews you the way a senior product architect would - finding
          the gaps, weighing the tradeoffs, and turning a rough idea into a plan you can hand to Cursor, Claude Code,
          Codex, or Lovable.
        </p>

        <div className="hero-stage hero-stage-4 mt-7 grid gap-3 sm:grid-cols-3">
          <SignalCard icon={<PromptFrameIcon className="h-4 w-4" />} title="Gap mapper" subtitle="Finds missing constraints." />
          <SignalCard icon={<InterviewLoopIcon className="h-4 w-4" />} title="Tradeoff engine" subtitle="Surfaces implementation choices." />
          <SignalCard icon={<BuildPlanIcon className="h-4 w-4" />} title="Build-ready" subtitle="Outputs handoff artifacts." />
        </div>
      </div>

      <div className="hero-stage hero-stage-5 mt-8 grid gap-3 border-y border-border py-5 text-sm text-text-muted sm:grid-cols-3">
        <StepLabel label="Describe it" icon={<PromptFrameIcon className="h-4 w-4" />} />
        <StepLabel label="Get interviewed" icon={<InterviewLoopIcon className="h-4 w-4" />} />
        <StepLabel label="Leave with a build plan" icon={<BuildPlanIcon className="h-4 w-4" />} />
      </div>

      <div className="hero-stage hero-stage-6 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Magnetic>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="motion-premium shadow-[0_12px_30px_rgba(216,138,82,0.24)]"
            icon={<ArrowRight className="h-4 w-4" />}
            onClick={onContinue}
          >
            See how it works
          </Button>
        </Magnetic>
        <Magnetic strength={10}>
          <Button type="button" variant="ghost" size="lg" className="motion-premium" onClick={onSkipIntro}>
            Skip the intro
          </Button>
        </Magnetic>
      </div>

      <div className="hero-stage hero-stage-6 mt-10">
        <TrustNotes />
      </div>
    </section>
  );
}

function StepLabel({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 px-3 py-2 backdrop-blur-sm">
      <span className="text-accent-strong">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function SignalCard({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <SpotlightCard className="px-4 py-3">
      <div className="flex items-center gap-2 text-accent-strong">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{title}</p>
      </div>
      <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
    </SpotlightCard>
  );
}
