import { ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import type { SpecImpact } from '../../lib/schemas';

export function showSpecDiffToast(impact: SpecImpact, onJump: () => void) {
  if (!impact.humanized.length) return;

  toast.custom(
    (toastId) => (
      <button
        type="button"
        className="group w-[min(360px,calc(100vw-32px))] rounded-[8px] border border-border-strong bg-surface-raised p-4 text-left shadow-panel transition hover:border-accent-muted"
        onClick={() => {
          onJump();
          toast.dismiss(toastId);
        }}
      >
        <span className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.12em] text-text-subtle">
          Spec changed
          <ArrowUpRight className="h-4 w-4 text-accent transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
        <span className="mt-3 block space-y-1 font-mono text-xs text-text">
          {impact.humanized.slice(0, 4).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </button>
    ),
    {
      duration: 4200,
      position: 'bottom-right',
    },
  );
}

