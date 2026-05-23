import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Braces, Database, Layers, LockKeyhole, Plug, ShieldAlert, Users } from 'lucide-react';
import { previewSpecPatch } from '../../lib/patch';
import type { JSONPatch, SpecDoc, SpecImpact, SpecLine } from '../../lib/schemas';
import { cn } from '../../lib/utils';
import { AnswerConfidenceIndicator } from './AnswerConfidenceIndicator';

type SpecImpactPreviewProps = {
  spec: SpecDoc;
  previewPatch: JSONPatch[] | null;
  lastImpact: SpecImpact | null;
  className?: string;
};

type SectionConfig = {
  key: keyof Pick<SpecDoc, 'users' | 'features' | 'dataModel' | 'integrations' | 'outOfScope' | 'risks' | 'openQuestions'>;
  title: string;
  icon: typeof Users;
  empty: string;
};

const sections: SectionConfig[] = [
  { key: 'users', title: 'Users', icon: Users, empty: 'No user model locked yet.' },
  { key: 'features', title: 'Core Features', icon: Layers, empty: 'No feature loop locked yet.' },
  { key: 'dataModel', title: 'Data Model', icon: Database, empty: 'No persistent model selected yet.' },
  { key: 'integrations', title: 'Integrations', icon: Plug, empty: 'No integrations selected.' },
  { key: 'outOfScope', title: 'Out of Scope', icon: ShieldAlert, empty: 'No explicit exclusions yet.' },
  { key: 'risks', title: 'Risks / Revisit', icon: AlertTriangle, empty: 'No build risks flagged yet.' },
  { key: 'openQuestions', title: 'Open Questions', icon: Braces, empty: 'No open questions.' },
];

function isLineGhost(committed: SpecLine[], line: SpecLine, previewPatch: JSONPatch[] | null) {
  return Boolean(previewPatch) && !committed.some((committedLine) => committedLine.id === line.id);
}

function isLineFresh(line: SpecLine, lastImpact: SpecImpact | null) {
  return Boolean(lastImpact && line.sourceQuestionId === lastImpact.questionId);
}

function architectureChanged(field: string, previewPatch: JSONPatch[] | null, lastImpact: SpecImpact | null) {
  const path = `/architecture/${field}`;
  return Boolean(previewPatch?.some((patch) => patch.path === path) || lastImpact?.patch.some((patch) => patch.path === path));
}

function SpecLineRow({
  line,
  ghost,
  fresh,
}: {
  line: SpecLine;
  ghost: boolean;
  fresh: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: ghost ? 0.74 : 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'group rounded-[7px] border px-3 py-2.5 transition-colors',
        ghost
          ? 'border-accent-muted/45 bg-accent-muted/10 text-text-muted'
          : 'border-border/80 bg-surface-inset/70 text-text',
        fresh && !ghost && 'border-accent-muted/45 bg-accent-muted/12',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm leading-5">{line.text}</p>
        <AnswerConfidenceIndicator confidence={line.confidence} compact />
      </div>
    </motion.div>
  );
}

function Section({
  config,
  committed,
  preview,
  previewPatch,
  lastImpact,
}: {
  config: SectionConfig;
  committed: SpecLine[];
  preview: SpecLine[];
  previewPatch: JSONPatch[] | null;
  lastImpact: SpecImpact | null;
}) {
  const Icon = config.icon;

  return (
    <section className="border-t border-border/80 py-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
        <Icon className="h-3.5 w-3.5 text-accent-muted" aria-hidden="true" />
        {config.title}
      </div>
      {preview.length ? (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {preview.map((line) => (
              <SpecLineRow
                key={line.id}
                line={line}
                ghost={isLineGhost(committed, line, previewPatch)}
                fresh={isLineFresh(line, lastImpact)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="rounded-[7px] border border-dashed border-border px-3 py-2.5 text-sm text-text-subtle">
          {config.empty}
        </p>
      )}
    </section>
  );
}

export function SpecImpactPreview({ spec, previewPatch, lastImpact, className }: SpecImpactPreviewProps) {
  const previewResult = (() => {
    if (!previewPatch) return { spec, error: null as string | null };
    try {
      return { spec: previewSpecPatch(spec, previewPatch), error: null as string | null };
    } catch (error) {
      return {
        spec,
        error: error instanceof Error ? error.message : 'Preview patch failed',
      };
    }
  })();

  const previewSpec = previewResult.spec;

  return (
    <aside
      id="spec-impact-preview"
      className={cn(
        'flex h-full min-h-0 flex-col border-l border-border bg-surface/95 shadow-panel md:rounded-[10px] md:border',
        className,
      )}
      aria-label="Live spec impact preview"
    >
      <header className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">Live spec</p>
            <h2 className="mt-1 text-lg font-semibold text-text">{previewSpec.projectName}</h2>
          </div>
          {previewPatch ? (
            <span className="rounded-[6px] border border-accent-muted/50 bg-accent-muted/10 px-2 py-1 text-xs text-accent-strong">
              Preview
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-5 text-text-muted">{previewSpec.oneLiner}</p>
        {previewResult.error ? (
          <p className="mt-3 rounded-[7px] border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {previewResult.error}
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <section className="pb-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
            <LockKeyhole className="h-3.5 w-3.5 text-accent-muted" aria-hidden="true" />
            Architecture
          </div>
          <div className="grid gap-2">
            {(['auth', 'realtime', 'offline', 'payments', 'deployment'] as const).map((field) => (
              <motion.div
                key={field}
                layout
                className={cn(
                  'flex min-h-11 items-center justify-between gap-3 rounded-[7px] border border-border/80 bg-surface-inset/70 px-3 py-2 text-sm',
                  architectureChanged(field, previewPatch, lastImpact) && 'border-accent-muted/45 bg-accent-muted/12',
                )}
              >
                <span className="capitalize text-text-muted">{field}</span>
                <span className="flex items-center gap-2 text-right">
                  <span className="font-mono text-xs text-text">
                    {typeof previewSpec.architecture[field] === 'boolean'
                      ? previewSpec.architecture[field]
                        ? 'yes'
                        : 'no'
                      : previewSpec.architecture[field]}
                  </span>
                  <AnswerConfidenceIndicator confidence={previewSpec.architecture.confidence[field]} compact />
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {sections.map((config) => (
          <Section
            key={config.key}
            config={config}
            committed={spec[config.key]}
            preview={previewSpec[config.key]}
            previewPatch={previewPatch}
            lastImpact={lastImpact}
          />
        ))}
      </div>
    </aside>
  );
}

