import { ClipboardList } from 'lucide-react';
import type { BuildSpec, InterviewMessage } from '../../lib/interview/schema';
import { Button } from '../ui/Button';
import { SpecPanel } from '../spec/SpecPanel';
import { SpecSheet } from '../spec/SpecSheet';
import { InterviewPane } from './InterviewPane';

type InterviewLayoutProps = {
  messages: InterviewMessage[];
  spec: BuildSpec;
  changedPaths: string[];
  composerValue: string;
  isSending: boolean;
  specSheetOpen: boolean;
  onComposerChange: (value: string) => void;
  onSubmit: () => void;
  onSpecSheetOpenChange: (open: boolean) => void;
};

export function InterviewLayout({
  messages,
  spec,
  changedPaths,
  composerValue,
  isSending,
  specSheetOpen,
  onComposerChange,
  onSubmit,
  onSpecSheetOpenChange,
}: InterviewLayoutProps) {
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-0 py-0 md:grid-cols-[minmax(0,1fr)_430px] md:px-6 md:py-4">
      <InterviewPane
        messages={messages}
        composerValue={composerValue}
        isSending={isSending}
        onComposerChange={onComposerChange}
        onSubmit={onSubmit}
      />

      <aside className="hidden md:block">
        <SpecPanel spec={spec} changedPaths={changedPaths} />
      </aside>

      <Button
        type="button"
        variant="primary"
        className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 shadow-panel md:hidden"
        icon={<ClipboardList className="h-4 w-4" />}
        onClick={() => onSpecSheetOpenChange(true)}
      >
        View live spec
      </Button>

      <SpecSheet open={specSheetOpen} spec={spec} changedPaths={changedPaths} onOpenChange={onSpecSheetOpenChange} />
    </div>
  );
}
