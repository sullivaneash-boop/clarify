import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { Clipboard, FileJson, FileText, RotateCcw, ScrollText, Undo2 } from 'lucide-react';
import type { ClarifySession } from '../../lib/schemas';

type CommandPaletteProps = {
  open: boolean;
  session: ClarifySession;
  onOpenChange: (open: boolean) => void;
  onJumpCurrent: () => void;
  onRevisit: (questionId: string) => void;
  onOpenSpec: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onUndo: () => void;
  onReset: () => void;
};

export function CommandPalette({
  open,
  session,
  onOpenChange,
  onJumpCurrent,
  onRevisit,
  onOpenSpec,
  onExportJson,
  onExportMarkdown,
  onUndo,
  onReset,
}: CommandPaletteProps) {
  const answered = session.answers.map((answer) => ({
    answer,
    question: session.questions.find((candidate) => candidate.id === answer.questionId),
  }));

  function run(action: () => void) {
    action();
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/62 data-[state=open]:animate-[fadeIn_160ms_ease-out]" />
        <Dialog.Content className="clarify-command-dialog">
          <Dialog.Title className="sr-only">Clarify command palette</Dialog.Title>
          <Command label="Clarify command palette" loop>
            <Command.Input placeholder="Jump, revisit, export..." />
            <Command.List>
              <Command.Empty>No matching action.</Command.Empty>
              <Command.Group heading="Session">
                <Command.Item value="jump current question" onSelect={() => run(onJumpCurrent)}>
                  <Clipboard className="h-4 w-4" />
                  Jump to current question
                </Command.Item>
                <Command.Item value="open spec preview" onSelect={() => run(onOpenSpec)}>
                  <ScrollText className="h-4 w-4" />
                  Open spec
                </Command.Item>
                <Command.Item value="undo last decision" onSelect={() => run(onUndo)}>
                  <Undo2 className="h-4 w-4" />
                  Undo last decision
                </Command.Item>
              </Command.Group>

              {answered.length ? (
                <Command.Group heading="Revisit">
                  {answered.map(({ answer, question }) => (
                    <Command.Item
                      key={answer.id}
                      value={`revisit ${question?.title ?? answer.questionId} ${answer.label}`}
                      onSelect={() => run(() => onRevisit(answer.questionId))}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {question?.title ?? 'Decision'} · {answer.label.replace(/^We read this as:\s*/i, '')}
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              <Command.Group heading="Export">
                <Command.Item value="export spec json" onSelect={() => run(onExportJson)}>
                  <FileJson className="h-4 w-4" />
                  Export spec JSON
                </Command.Item>
                <Command.Item value="export markdown handoff" onSelect={() => run(onExportMarkdown)}>
                  <FileText className="h-4 w-4" />
                  Export markdown
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Danger">
                <Command.Item value="reset session" onSelect={() => run(onReset)}>
                  <RotateCcw className="h-4 w-4" />
                  Reset session
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
