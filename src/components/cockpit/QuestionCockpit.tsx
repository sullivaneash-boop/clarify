import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Braces, Command as CommandIcon, FileCheck2, PanelRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { ClarifySession, JSONPatch } from '../../lib/schemas';
import { generateBuildPackage } from '../../lib/orchestrator/mock';
import { getCurrentQuestion, isBuildReady, sessionReducer } from '../../lib/session';
import { BuildReadyConfirmationModal } from '../chrome/BuildReadyConfirmationModal';
import { BuildReadinessMeter } from '../chrome/BuildReadinessMeter';
import { CommandPalette } from '../chrome/CommandPalette';
import { showSpecDiffToast } from '../spec/SpecDiffToast';
import { SpecImpactPreview } from '../spec/SpecImpactPreview';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { QuestionCard } from './QuestionCard';
import { QuestionStack } from './QuestionStack';

type QuestionCockpitProps = {
  initialSession: ClarifySession;
  onResetToPrompt: () => void;
};

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
}

async function writeClipboard(value: string) {
  if (!navigator.clipboard) throw new Error('Clipboard is not available in this browser.');
  await navigator.clipboard.writeText(value);
}

export function QuestionCockpit({ initialSession, onResetToPrompt }: QuestionCockpitProps) {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [commandOpen, setCommandOpen] = useState(false);
  const [specSheetOpen, setSpecSheetOpen] = useState(false);
  const [unsureOpen, setUnsureOpen] = useState(false);
  const [customOpenSignal, setCustomOpenSignal] = useState(0);
  const [generating, setGenerating] = useState(false);
  const activeQuestion = getCurrentQuestion(session);
  const activeQuestionRef = useRef<HTMLDivElement | null>(null);
  const lastToastImpactId = useRef<string | null>(null);
  const ready = isBuildReady(session);

  const projectCrumb = useMemo(() => session.projectName || 'Untitled build', [session.projectName]);

  const safeDispatch = useCallback((action: Parameters<typeof dispatch>[0]) => {
    try {
      dispatch(action);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The spec patch could not be applied.');
    }
  }, []);

  useEffect(() => {
    if (!session.lastImpact || session.lastImpact.id === lastToastImpactId.current) return;
    lastToastImpactId.current = session.lastImpact.id;
    showSpecDiffToast(session.lastImpact, () => {
      setSpecSheetOpen(true);
      document.getElementById('spec-impact-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [session.lastImpact]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !isTextEditingTarget(event.target)) {
        event.preventDefault();
        safeDispatch({ type: 'UNDO' });
        return;
      }

      if (commandOpen || session.reviewOpen || isTextEditingTarget(event.target) || !activeQuestion) return;

      const optionIndex = Number(event.key) - 1;
      if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < activeQuestion.options.length) {
        event.preventDefault();
        const option = activeQuestion.options[optionIndex];
        if (option) safeDispatch({ type: 'ANSWER_QUESTION', questionId: activeQuestion.id, optionId: option.id });
        return;
      }

      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        setUnsureOpen(true);
        return;
      }

      if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setCustomOpenSignal((signal) => signal + 1);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeQuestion, commandOpen, safeDispatch, session.reviewOpen]);

  useEffect(() => {
    setUnsureOpen(false);
    setCustomOpenSignal(0);
  }, [activeQuestion?.id]);

  function setPreviewPatch(patch: JSONPatch[]) {
    safeDispatch({ type: 'SET_PREVIEW_PATCH', patch });
  }

  function clearPreviewPatch() {
    safeDispatch({ type: 'CLEAR_PREVIEW_PATCH' });
  }

  function revisit(questionId: string) {
    safeDispatch({ type: 'REVISE_ANSWER', questionId });
    activeQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const buildPackage = await generateBuildPackage(session);
      safeDispatch({ type: 'GENERATE_PACKAGE', buildPackage });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate the handoff package.');
    } finally {
      setGenerating(false);
    }
  }

  async function copyMarkdown() {
    if (!session.buildPackage) return;
    try {
      await writeClipboard(session.buildPackage.markdown);
      toast.success('Markdown handoff copied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not copy markdown.');
    }
  }

  async function exportJson() {
    try {
      await writeClipboard(JSON.stringify(session.spec, null, 2));
      toast.success('Spec JSON copied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not copy spec JSON.');
    }
  }

  async function exportMarkdown() {
    const buildPackage = session.buildPackage ?? (await generateBuildPackage(session));
    try {
      await writeClipboard(buildPackage.markdown);
      if (!session.buildPackage) safeDispatch({ type: 'GENERATE_PACKAGE', buildPackage });
      toast.success('Markdown handoff copied.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not copy markdown.');
    }
  }

  function resetSession() {
    onResetToPrompt();
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-accent-muted/55 bg-surface">
              <Braces className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Clarify</p>
              <p className="truncate text-xs text-text-subtle">{projectCrumb}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <BuildReadinessMeter readiness={session.readiness} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 md:hidden"
                icon={<PanelRight className="h-4 w-4" />}
                onClick={() => setSpecSheetOpen(true)}
              >
                Spec
              </Button>
              <Button
                type="button"
                variant={ready ? 'primary' : 'secondary'}
                className="min-h-12 flex-1 sm:flex-none"
                icon={<Send className="h-4 w-4" />}
                disabled={!ready}
                onClick={() => safeDispatch({ type: 'OPEN_REVIEW', open: true })}
              >
                Generate
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="hidden min-h-12 md:inline-flex"
                icon={<CommandIcon className="h-4 w-4" />}
                aria-label="Open command palette"
                onClick={() => setCommandOpen(true)}
              >
                ⌘K
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1680px] gap-4 px-4 py-4 sm:px-5 md:h-[calc(100vh-82px)] md:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)] md:overflow-hidden">
        <section className="min-h-0 overflow-y-auto pr-0 md:pr-1" aria-label="Question cockpit">
          <div className="mx-auto max-w-[980px] space-y-4 pb-10" ref={activeQuestionRef}>
            <QuestionStack session={session} onRevisit={revisit} />

            <AnimatePresence mode="wait">
              {activeQuestion ? (
                <QuestionCard
                  key={activeQuestion.id}
                  question={activeQuestion}
                  unsureOpen={unsureOpen}
                  customOpenSignal={customOpenSignal}
                  onUnsureOpenChange={setUnsureOpen}
                  onSelectOption={(optionId) =>
                    safeDispatch({ type: 'ANSWER_QUESTION', questionId: activeQuestion.id, optionId })
                  }
                  onUseDefault={() => safeDispatch({ type: 'USE_DEFAULT', questionId: activeQuestion.id })}
                  onPreviewPatch={setPreviewPatch}
                  onClearPreview={clearPreviewPatch}
                  onCustomCommit={(payload) =>
                    safeDispatch({
                      type: 'SUBMIT_CUSTOM',
                      questionId: activeQuestion.id,
                      rawText: payload.rawText,
                      canonicalText: payload.canonicalText,
                      specPatch: payload.specPatch,
                    })
                  }
                />
              ) : (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="rounded-[10px] border border-accent-muted/40 bg-surface-raised p-6 shadow-panel"
                >
                  <div className="flex items-start gap-3">
                    <FileCheck2 className="mt-1 h-5 w-5 text-accent" aria-hidden="true" />
                    <div>
                      <h1 className="text-3xl font-semibold leading-tight text-text">Build contract is ready.</h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                        Review the spec before generating. Defaults and custom answers stay visible in the handoff.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" variant="primary" className="min-h-12" onClick={() => safeDispatch({ type: 'OPEN_REVIEW', open: true })}>
                      Review build contract
                    </Button>
                    <Button type="button" variant="secondary" className="min-h-12" icon={<PanelRight className="h-4 w-4" />} onClick={() => setSpecSheetOpen(true)}>
                      Open live spec
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="hidden rounded-[8px] border border-border bg-surface-inset px-4 py-3 text-xs text-text-subtle md:block">
              <span className="font-mono">1-4</span> selects · <span className="font-mono">U</span> opens default ·{' '}
              <span className="font-mono">C</span> writes custom · <span className="font-mono">⌘Z</span> undoes
            </div>
          </div>
        </section>

        <SpecImpactPreview
          spec={session.spec}
          previewPatch={session.previewPatch}
          lastImpact={session.lastImpact}
          className="hidden min-h-0 md:flex"
        />
      </main>

      <Sheet open={specSheetOpen} title="Live spec" onOpenChange={setSpecSheetOpen}>
        <SpecImpactPreview
          spec={session.spec}
          previewPatch={session.previewPatch}
          lastImpact={session.lastImpact}
          className="min-h-[70vh] border-0"
        />
      </Sheet>

      <CommandPalette
        open={commandOpen}
        session={session}
        onOpenChange={setCommandOpen}
        onJumpCurrent={() => activeQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onRevisit={revisit}
        onOpenSpec={() => setSpecSheetOpen(true)}
        onExportJson={() => void exportJson()}
        onExportMarkdown={() => void exportMarkdown()}
        onUndo={() => safeDispatch({ type: 'UNDO' })}
        onReset={resetSession}
      />

      <BuildReadyConfirmationModal
        session={session}
        open={session.reviewOpen}
        generating={generating}
        onOpenChange={(open) => safeDispatch({ type: 'OPEN_REVIEW', open })}
        onGenerate={() => void handleGenerate()}
        onCopyMarkdown={() => void copyMarkdown()}
      />
    </div>
  );
}
