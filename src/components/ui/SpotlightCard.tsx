import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

type SpotlightCardProps = HTMLAttributes<HTMLDivElement>;

export function SpotlightCard({ className, onMouseMove, children, ...props }: SpotlightCardProps) {
  return (
    <div
      className={cn(
        'spotlight-card rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-sm transition',
        className,
      )}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;

        event.currentTarget.style.setProperty('--spotlight-x', `${x}px`);
        event.currentTarget.style.setProperty('--spotlight-y', `${y}px`);
        onMouseMove?.(event);
      }}
      {...props}
    >
      {children}
    </div>
  );
}
