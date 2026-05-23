import { useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { cn } from '../../lib/utils/cn';

const glossary = [
  {
    label: 'Live spec',
    copy: 'What Clarify has understood so far. It updates every time you answer.',
  },
  {
    label: 'Readiness',
    copy: 'How close your idea is to being safe to build - not a score to game. Low readiness means there are still expensive unknowns.',
  },
  {
    label: 'Build package',
    copy: 'What you leave with: a prototype, a plan, or a clean prompt you can paste into Cursor, Claude Code, Codex, or Lovable.',
  },
];

export function SpecMovePreview() {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [openGlossary, setOpenGlossary] = useState<string | null>('Live spec');

  return (
    <div className="rounded-panel border border-paper-border bg-paper p-4 text-paper-text shadow-panel sm:p-5">
      <div className="rounded-xl border border-paper-border bg-paper p-4">
        <p className="text-xs font-semibold uppercase text-paper-muted">User says</p>
        <p className="mt-2 text-sm leading-relaxed">
          "I want a landing page where people can book my detailing service."
        </p>
      </div>

      <div className="mt-4 flex justify-center">
        <Button type="button" variant="primary" icon={<Play className="h-4 w-4" />} onClick={() => setHasPlayed(true)}>
          Play one move
        </Button>
      </div>

      <div className="mt-4 min-h-32 rounded-xl border border-paper-border bg-paper p-4">
        {hasPlayed ? (
          <div className="motion-safe:animate-[fadeIn_320ms_ease-out]">
            <p className="text-xs font-semibold uppercase text-paper-muted">Clarify asks</p>
            <p className="mt-2 text-sm leading-relaxed">
              Do you want to take payment when they book, or just hold the slot and collect on-site? That one choice
              decides whether we need a payment provider at all.
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-paper-muted">
            One sharp question appears here. It is scripted for the prototype, not a network call.
          </p>
        )}
      </div>

      <div
        className={cn(
          'mt-4 rounded-xl border border-paper-border bg-paper p-4 transition',
          hasPlayed && 'motion-safe:animate-[fadeIn_360ms_ease-out]',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-paper-muted">Live spec</p>
          <span className="text-xs text-paper-muted">{hasPlayed ? '45%' : '30%'}</span>
        </div>
        <Progress
          value={hasPlayed ? 45 : 30}
          className="mt-3 bg-paper-border"
          barClassName="bg-accent"
        />
        {hasPlayed ? (
          <div className="mt-4 rounded-lg border border-paper-border bg-paper px-3 py-2 text-sm">
            <span className="font-semibold">Booking model</span>
            <span className="text-paper-muted"> - undecided (pay-now vs. hold-and-collect)</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {glossary.map((item) => {
          const open = openGlossary === item.label;
          return (
            <div key={item.label} className="rounded-lg border border-paper-border bg-paper">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold text-paper-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                aria-expanded={open}
                onClick={() => setOpenGlossary(open ? null : item.label)}
              >
                {item.label}
                <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
              </button>
              {open ? <p className="px-3 pb-3 text-sm leading-relaxed text-paper-muted">{item.copy}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
