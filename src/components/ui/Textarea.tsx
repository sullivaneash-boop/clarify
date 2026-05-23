import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-none rounded-xl border border-border bg-surface-inset px-4 py-3 text-base leading-relaxed text-text placeholder:text-text-subtle transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}
