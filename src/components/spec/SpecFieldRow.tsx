import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils/cn';

type SpecFieldRowProps = {
  label: string;
  value: string | string[] | null | undefined;
  path: string;
  changedPaths: string[];
  required?: boolean;
};

function renderValue(value: SpecFieldRowProps['value']) {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.join(', ');
  }

  return value || null;
}

export function SpecFieldRow({ label, value, path, changedPaths, required }: SpecFieldRowProps) {
  const changed = changedPaths.includes(path);
  const displayValue = renderValue(value);

  return (
    <div
      className={cn(
        'rounded-lg border border-transparent px-3 py-2 transition',
        changed && 'border-accent-muted bg-accent-muted/10 spec-pulse',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase text-text-subtle">{label}</p>
          {displayValue ? (
            <p className="mt-1 text-sm leading-relaxed text-text">{displayValue}</p>
          ) : (
            <p className="mt-1 text-sm text-text-subtle">Needed</p>
          )}
        </div>
        {required && !displayValue ? <Badge tone="warning">Needed</Badge> : null}
      </div>
    </div>
  );
}
