import { ArrowLeft, CheckCircle2, Hammer, Layers3, SlidersHorizontal } from 'lucide-react';
import type { BuildSpec } from '../../lib/interview/schema';
import { toTitle } from '../../lib/utils/format';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

type SpecConfirmationViewProps = {
  spec: BuildSpec;
  onBuild: () => void;
  onChange: () => void;
  onSimplify: () => void;
  onAdvanced: () => void;
};

function list(items: string[], fallback: string) {
  return items.length > 0 ? items : [fallback];
}

export function SpecConfirmationView({
  spec,
  onBuild,
  onChange,
  onSimplify,
  onAdvanced,
}: SpecConfirmationViewProps) {
  const complex =
    spec.coreFeatures.length >= 5 ||
    spec.integrations.length >= 2 ||
    spec.coreFeatures.some((feature) => feature.toLowerCase().includes('login'));

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-[18px] border border-paper-border bg-paper p-6 text-paper-text shadow-panel sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent-muted">Here’s the build plan.</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
              {spec.projectName ?? toTitle(spec.buildType)}
            </h2>
          </div>
          <Badge tone={complex ? 'warning' : 'success'}>{complex ? 'Complex first version' : 'Clean first version'}</Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <PlanBlock title="What you’re building" items={[`${toTitle(spec.buildType)} for ${spec.primaryUser ?? 'the primary user'}`]} />
          <PlanBlock title="Who it’s for" items={[spec.primaryUser ?? 'Needed']} />
          <PlanBlock title="First version includes" items={list(spec.coreFeatures, 'The smallest useful workflow from the interview.')} />
          <PlanBlock title="It will not include yet" items={list(spec.mustNotDo, 'Paid services, real auth, billing, or production integrations.')} />
          <PlanBlock title="Assumptions" items={list(spec.assumptions, 'No extra assumptions beyond the current spec.')} />
          <PlanBlock title="Recommended output" items={[spec.outputType ? toTitle(spec.outputType) : 'Build prompt']} />
        </div>

        {complex ? (
          <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed text-paper-text">
            Complexity warning: this scope has enough moving parts that login, integrations, or role logic should be staged
            carefully before it becomes production software.
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="primary" size="lg" icon={<Hammer className="h-4 w-4" />} onClick={onBuild}>
            Build this
          </Button>
          <Button variant="paper" size="lg" icon={<ArrowLeft className="h-4 w-4" />} onClick={onChange}>
            Change something
          </Button>
          <Button variant="paper" size="lg" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={onSimplify}>
            Simplify this
          </Button>
          <Button variant="paper" size="lg" icon={<Layers3 className="h-4 w-4" />} onClick={onAdvanced}>
            Make it more advanced
          </Button>
        </div>
      </section>
    </div>
  );
}

type PlanBlockProps = {
  title: string;
  items: string[];
};

function PlanBlock({ title, items }: PlanBlockProps) {
  return (
    <div className="rounded-xl border border-paper-border bg-[#fff8eb] p-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-accent-muted" />
        <h3 className="text-sm font-semibold uppercase text-paper-muted">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
