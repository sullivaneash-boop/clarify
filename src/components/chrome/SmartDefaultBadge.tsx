import { BadgeCheck } from 'lucide-react';

export function SmartDefaultBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] border border-warning/45 bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Smart default
    </span>
  );
}

