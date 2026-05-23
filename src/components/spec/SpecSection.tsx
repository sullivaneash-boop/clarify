import type { ReactNode } from 'react';

type SpecSectionProps = {
  title: string;
  children: ReactNode;
};

export function SpecSection({ title, children }: SpecSectionProps) {
  return (
    <section className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold uppercase text-text-subtle">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}
