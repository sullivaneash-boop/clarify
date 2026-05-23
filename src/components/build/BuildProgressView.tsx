import { useEffect } from 'react';
import { PackageCheck } from 'lucide-react';
import type { BuildJob } from '../../lib/interview/schema';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Progress } from '../ui/Progress';
import { BuildStepList } from './BuildStepList';

type BuildProgressViewProps = {
  job: BuildJob | null;
  onAdvance: () => void;
};

export function BuildProgressView({ job, onAdvance }: BuildProgressViewProps) {
  useEffect(() => {
    if (!job || job.status !== 'running') return undefined;

    const timeout = window.setTimeout(onAdvance, 900);
    return () => window.clearTimeout(timeout);
  }, [job?.activeStep, job?.status, onAdvance, job]);

  if (!job) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl items-center px-4">
        <Card>
          <CardContent>
            <p className="text-text-muted">No build job is active.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completeSteps = job.steps.filter((step) => step.status === 'complete').length;
  const progress = Math.round((completeSteps / job.steps.length) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl items-center px-4 py-8 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-surface-inset text-accent">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Packaging the build</CardTitle>
              <p className="mt-1 text-sm text-text-muted">Deterministic local steps, based on the confirmed spec.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={progress} />
          <BuildStepList steps={job.steps} />
        </CardContent>
      </Card>
    </div>
  );
}
