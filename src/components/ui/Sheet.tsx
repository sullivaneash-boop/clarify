import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { Button } from './Button';

type SheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function Sheet({ open, title, children, onOpenChange }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close live spec"
        className="absolute inset-0 bg-black/60"
        onClick={() => onOpenChange(false)}
      />
      <section
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[86vh] overflow-hidden rounded-t-[18px] border border-border bg-surface shadow-panel',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Close live spec" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </header>
        <div className="max-h-[calc(86vh-56px)] overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
