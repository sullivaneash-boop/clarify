import { cn } from '../../lib/utils/cn';

type ProgressProps = {
  value: number;
  className?: string;
  barClassName?: string;
};

export function Progress({ value, className, barClassName }: ProgressProps) {
  const boundedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-surface-inset', className)} role="progressbar">
      <div
        className={cn('h-full rounded-full bg-accent transition-all duration-500 ease-out', barClassName)}
        style={{ width: `${boundedValue}%` }}
      />
    </div>
  );
}
