import { Progress } from '../ui/Progress';

type ReadinessMeterProps = {
  score: number;
  reason: string;
};

function labelFor(score: number) {
  if (score >= 90) return 'Ready to confirm';
  if (score >= 70) return 'Almost ready';
  if (score >= 31) return 'Shaping the build';
  return 'Not enough yet';
}

export function ReadinessMeter({ score, reason }: ReadinessMeterProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-inset p-4">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-text-subtle">Readiness</p>
          <p className="mt-1 text-sm font-semibold text-text">{labelFor(score)}</p>
        </div>
        <span className="text-3xl font-semibold tabular-nums text-accent-strong">{score}</span>
      </div>
      <Progress value={score} />
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{reason}</p>
    </div>
  );
}
