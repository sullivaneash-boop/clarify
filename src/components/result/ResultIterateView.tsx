import { PackageCheck } from 'lucide-react';
import type { BuildSpec, ResultArtifact } from '../../lib/interview/schema';
import type { ResultTab } from '../../stores/useInterviewStore';
import { Badge } from '../ui/Badge';
import { ArtifactViewer } from './ArtifactViewer';
import { IterateComposer } from './IterateComposer';
import { SpecSnapshotCard } from './SpecSnapshotCard';

type ResultIterateViewProps = {
  artifact: ResultArtifact | null;
  spec: BuildSpec;
  selectedTab: ResultTab;
  changedPaths: string[];
  onTabChange: (tab: ResultTab) => void;
  onIterationSubmit: (feedback: string) => void;
};

export function ResultIterateView({
  artifact,
  spec,
  selectedTab,
  changedPaths,
  onTabChange,
  onIterationSubmit,
}: ResultIterateViewProps) {
  if (!artifact) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl items-center px-4">
        <div className="rounded-panel border border-border bg-surface p-6 text-text-muted shadow-panel">
          The build package has not been generated yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-surface text-accent">
              <PackageCheck className="h-5 w-5" />
            </div>
            <Badge tone="success">Local package</Badge>
            {changedPaths.length > 0 ? <Badge tone="accent">Updated</Badge> : null}
          </div>
          <h2 className="text-3xl font-semibold tracking-normal text-text">Your build package is ready.</h2>
          <p className="mt-2 max-w-2xl text-text-muted">
            The artifact is generated from the live spec and can be iterated without starting over.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <ArtifactViewer artifact={artifact} selectedTab={selectedTab} onTabChange={onTabChange} />
          <IterateComposer onSubmit={onIterationSubmit} />
        </div>
        <SpecSnapshotCard spec={spec} />
      </div>
    </div>
  );
}
