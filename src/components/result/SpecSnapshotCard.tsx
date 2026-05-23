import type { BuildSpec } from '../../lib/interview/schema';
import { toTitle } from '../../lib/utils/format';
import { Badge } from '../ui/Badge';

type SpecSnapshotCardProps = {
  spec: BuildSpec;
};

export function SpecSnapshotCard({ spec }: SpecSnapshotCardProps) {
  return (
    <aside className="rounded-panel border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase text-text-subtle">Current Spec</h2>
        <Badge tone="success">{spec.readiness.score}</Badge>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <SnapshotRow label="Build" value={toTitle(spec.buildType)} />
        <SnapshotRow label="User" value={spec.primaryUser ?? 'Needed'} />
        <SnapshotRow label="Goal" value={spec.mainGoal ?? 'Needed'} />
        <SnapshotRow label="Output" value={spec.outputType ? toTitle(spec.outputType) : 'Needed'} />
      </dl>
    </aside>
  );
}

type SnapshotRowProps = {
  label: string;
  value: string;
};

function SnapshotRow({ label, value }: SnapshotRowProps) {
  return (
    <div>
      <dt className="text-xs uppercase text-text-subtle">{label}</dt>
      <dd className="mt-1 leading-relaxed text-text">{value}</dd>
    </div>
  );
}
