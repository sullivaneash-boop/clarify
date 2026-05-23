import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

type TabItem<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type TabsProps<T extends string> = {
  value: T;
  items: Array<TabItem<T>>;
  onChange: (value: T) => void;
  className?: string;
};

export function Tabs<T extends string>({ value, items, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('flex flex-wrap gap-1 rounded-xl border border-border bg-surface-inset p-1', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-text-muted transition hover:text-text',
            item.value === value && 'bg-surface-raised text-text shadow-soft',
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
