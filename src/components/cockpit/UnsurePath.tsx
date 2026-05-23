import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { HelpCircle } from 'lucide-react';
import type { Question } from '../../lib/schemas';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { SmartDefaultBadge } from '../chrome/SmartDefaultBadge';

type UnsurePathProps = {
  question: Question;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseDefault: () => void;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function UnsureContent({ question, onUseDefault }: Pick<UnsurePathProps, 'question' | 'onUseDefault'>) {
  const recommended = question.options.find((option) => option.id === question.recommendedOptionId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-text">Not sure is fine.</h3>
        <SmartDefaultBadge />
      </div>
      <p className="text-sm leading-6 text-text-muted">{question.smartDefaultRationale}</p>
      {recommended ? (
        <div className="rounded-[8px] border border-border bg-surface-inset p-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">Recommended</p>
          <p className="mt-2 text-sm font-semibold text-text">{recommended.label}</p>
          <p className="mt-1 text-sm leading-5 text-text-muted">{recommended.consequence}</p>
        </div>
      ) : null}
      <Button type="button" variant="primary" className="min-h-12 w-full" onClick={onUseDefault}>
        Use smart default
      </Button>
    </div>
  );
}

export function UnsurePath({ question, open, onOpenChange, onUseDefault }: UnsurePathProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          className="min-h-12 justify-start px-0 text-text-muted hover:bg-transparent hover:text-accent-strong"
          icon={<HelpCircle className="h-4 w-4" />}
          onClick={() => onOpenChange(true)}
        >
          I'm not sure
        </Button>
        <Sheet open={open} title="Smart default" onOpenChange={onOpenChange}>
          <div className="p-4">
            <UnsureContent question={question} onUseDefault={onUseDefault} />
          </div>
        </Sheet>
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="min-h-12 justify-start px-0 text-text-muted hover:bg-transparent hover:text-accent-strong"
          icon={<HelpCircle className="h-4 w-4" />}
        >
          I'm not sure
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={12}
          className="z-50 w-[360px] rounded-[10px] border border-border-strong bg-surface-raised p-4 shadow-panel outline-none data-[state=open]:animate-[fadeIn_160ms_ease-out]"
        >
          <UnsureContent question={question} onUseDefault={onUseDefault} />
          <Popover.Arrow className="fill-surface-raised" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

