import { CheckCircle2 } from 'lucide-react';
import type { SampleProject } from '../../lib/onboarding/schema';
import { cn } from '../../lib/utils/cn';
import { Button } from '../ui/Button';

type SampleProjectCardProps = {
  project: SampleProject;
  selected: boolean;
  onSelect: () => void;
  onStart: () => void;
};

export function SampleProjectCard({ project, selected, onSelect, onStart }: SampleProjectCardProps) {
  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-panel border bg-surface p-4 shadow-soft transition',
        selected ? 'border-accent-muted bg-accent-muted/10' : 'border-border',
      )}
    >
      <button
        type="button"
        className="flex flex-1 flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-text">{project.title}</h3>
          {selected ? <CheckCircle2 className="h-5 w-5 text-accent-strong" /> : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">{project.oneLine}</p>
        <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-text-subtle">
          {project.whatYoullSee}
        </p>
      </button>

      <Button
        type="button"
        className="mt-5 w-full"
        variant={selected ? 'primary' : 'secondary'}
        onClick={selected ? onStart : onSelect}
      >
        {selected ? 'Start with this sample' : 'Select sample'}
      </Button>
    </article>
  );
}
