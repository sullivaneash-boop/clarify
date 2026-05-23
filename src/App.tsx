import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Braces, CornerDownLeft } from 'lucide-react';
import { Toaster } from 'sonner';
import { QuestionCockpit } from './components/cockpit/QuestionCockpit';
import { Button } from './components/ui/Button';
import { createInitialSession } from './lib/orchestrator/mock';
import type { ClarifySession } from './lib/schemas';
import { cn } from './lib/utils';

const examples = ['SaaS MVP', 'Client portal', 'Internal dashboard', 'AI workflow', 'Landing page'];

function InitialPromptScreen({ onStart }: { onStart: (session: ClarifySession) => void }) {
  const [prompt, setPrompt] = useState('');
  const canSubmit = prompt.trim().length > 6;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onStart(createInitialSession(prompt.trim()));
  }

  return (
    <motion.main
      key="prompt"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="min-h-screen overflow-hidden bg-bg text-text"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,17,21,0.1)_0%,rgba(15,17,21,0.72)_74%,#0f1115_100%)]" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">
          <div className="mb-8 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-accent-muted/55 bg-surface shadow-soft">
              <Braces className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
          </div>
          <div className="text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent">Clarify</p>
            <h1 className="text-[clamp(2.6rem,8vw,7.5rem)] font-semibold leading-[0.9] tracking-normal text-text">
              What are you building?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
              Describe it roughly. I&apos;ll ask the questions that change the build.
            </p>
          </div>

          <form className="mx-auto mt-10 max-w-3xl" onSubmit={submit}>
            <div className="rounded-[12px] border border-border-strong bg-surface-raised p-3 shadow-panel">
              <label className="sr-only" htmlFor="initial-build-prompt">
                Build description
              </label>
              <textarea
                id="initial-build-prompt"
                value={prompt}
                rows={5}
                className="min-h-[180px] w-full resize-none rounded-[8px] border border-border bg-surface-inset px-4 py-4 text-lg leading-8 text-text outline-none transition placeholder:text-text-subtle focus:border-accent"
                placeholder="I want to build a client portal for a small agency."
                onChange={(event) => setPrompt(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    if (canSubmit) onStart(createInitialSession(prompt.trim()));
                  }
                }}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className={cn(
                        'min-h-10 rounded-[7px] border border-border bg-surface px-3 text-sm text-text-muted transition hover:border-accent-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
                      )}
                      onClick={() => setPrompt(example === 'Client portal' ? 'I want to build a client portal for a small agency.' : example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <Button type="submit" variant="primary" className="min-h-12" disabled={!canSubmit} icon={<ArrowRight className="h-4 w-4" />}>
                  Start interview
                </Button>
              </div>
            </div>
            <p className="mt-4 hidden items-center justify-center gap-2 text-center text-xs text-text-subtle sm:flex">
              <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Press Cmd/Ctrl+Enter from the prompt to start.
            </p>
          </form>
        </div>
      </section>
    </motion.main>
  );
}

export function App() {
  const [session, setSession] = useState<ClarifySession | null>(null);
  const cockpitKey = useMemo(() => session?.id ?? 'prompt', [session?.id]);

  return (
    <>
      <AnimatePresence mode="wait">
        {session ? (
          <motion.div key={cockpitKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuestionCockpit initialSession={session} onResetToPrompt={() => setSession(null)} />
          </motion.div>
        ) : (
          <InitialPromptScreen onStart={setSession} />
        )}
      </AnimatePresence>
      <Toaster
        theme="dark"
        richColors={false}
        toastOptions={{
          style: {
            background: '#202631',
            color: '#F4EFE4',
            border: '1px solid #3A4351',
          },
        }}
      />
    </>
  );
}

