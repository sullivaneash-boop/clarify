import { AnimatePresence, motion } from 'motion/react';
import { ClipboardList } from 'lucide-react';
import { previewSpecPatch } from '../../lib/patch';
import { missingReadinessRequirements } from '../../lib/session';
import type { JSONPatch, SpecDoc, SpecImpact } from '../../lib/schemas';
import { cn } from '../../lib/utils';

type SpecImpactPreviewProps = {
  spec: SpecDoc;
  previewPatch: JSONPatch[] | null;
  lastImpact: SpecImpact | null;
  className?: string;
};

function list(values: string[], fallback: string) {
  return values.length > 0 ? values : [fallback];
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
  const stillNeeded = missingReadinessRequirements(previewSpec);
  const knownSoFar = [
    previewSpec.primaryUser ? `Primary user: ${previewSpec.primaryUser}` : '',
    previewSpec.mainThingTracked ? `Tracks: ${previewSpec.mainThingTracked}` : '',
    previewSpec.mainGoal ? `Main goal: ${previewSpec.mainGoal}` : '',
    previewSpec.firstVersionScope ? `Scope: ${previewSpec.firstVersionScope}` : '',
    previewSpec.desiredOutput ? `Output: ${previewSpec.desiredOutput.replace(/_/g, ' ')}` : '',
  ].filter(Boolean);

  return (
    <aside
      id="spec-impact-preview"
      className={cn(
        'flex h-full min-h-0 flex-col border-l border-border bg-surface/95 shadow-panel md:rounded-[10px] md:border',
        className,
      )}
      aria-label="Live spec"
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
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <Section title="Build type" items={[previewSpec.buildType.replace(/_/g, ' ')]} />
        <Section title="Known so far" items={list(knownSoFar, 'Waiting for the first high-impact answer.')} />
        <Section title="Still needed" items={list(stillNeeded, 'Everything needed for confirmation is known.')} />
        <Section title="Assumptions" items={list(previewSpec.risks.map((item) => item.text), 'No assumptions called out yet.')} />
        <Section title="Open questions" items={list(previewSpec.openQuestions.map((item) => item.text), 'No open questions right now.')} />

        <section className="border-t border-border/80 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">
            <ClipboardList className="h-3.5 w-3.5 text-accent-muted" aria-hidden="true" />
            What changed
          </div>
          <AnimatePresence initial={false}>
            {(lastImpact?.humanized.length ? lastImpact.humanized : ['No recent change yet.']).map((line) => (
              <motion.p
                key={line}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-2 rounded-[7px] border border-border bg-surface-inset px-3 py-2 text-sm text-text"
              >
                {line}
              </motion.p>
            ))}
          </AnimatePresence>
          {previewResult.error ? (
            <p className="mt-3 rounded-[7px] border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {previewResult.error}
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="border-t border-border/80 py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-text-subtle">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <p key={`${title}-${item}`} className="rounded-[7px] border border-border bg-surface-inset px-3 py-2 text-sm text-text">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

