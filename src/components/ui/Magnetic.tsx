import { useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

type MagneticProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

export function Magnetic({ children, className, strength = 18 }: MagneticProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className={cn('magnetic-wrap inline-flex', className)}
      onMouseMove={(event) => {
        const container = containerRef.current;
        const content = contentRef.current;
        if (!container || !content) return;

        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        content.style.transform = `translate3d(${(x / (rect.width / 2)) * strength}px, ${(y / (rect.height / 2)) * strength}px, 0)`;
      }}
      onMouseLeave={() => {
        const content = contentRef.current;
        if (!content) return;
        content.style.transform = 'translate3d(0,0,0)';
      }}
    >
      <div ref={contentRef} className="magnetic-content">
        {children}
      </div>
    </div>
  );
}
