import { ClipboardList } from 'lucide-react';
import type { BuildSpec } from '../../lib/interview/schema';
import { toTitle } from '../../lib/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ReadinessMeter } from './ReadinessMeter';
import { SpecFieldRow } from './SpecFieldRow';
import { SpecSection } from './SpecSection';

type SpecPanelProps = {
  spec: BuildSpec;
  changedPaths: string[];
  compact?: boolean;
};

export function SpecPanel({ spec, changedPaths, compact = false }: SpecPanelProps) {
  return (
    <Card className={compact ? 'rounded-none border-0 shadow-none' : 'sticky top-20 max-h-[calc(100vh-96px)] overflow-hidden'}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" />
          <CardTitle>Live Spec</CardTitle>
        </div>
        <Badge tone={spec.readiness.requiredFieldsComplete ? 'success' : 'warning'}>
          {spec.readiness.requiredFieldsComplete ? 'Confirmable' : 'In progress'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5 overflow-y-auto md:max-h-[calc(100vh-174px)]">
        <ReadinessMeter score={spec.readiness.score} reason={spec.readiness.reason} />

        <SpecSection title="Core Shape">
          <SpecFieldRow label="Build type" value={toTitle(spec.buildType)} path="/buildType" changedPaths={changedPaths} required />
          <SpecFieldRow label="Project / business name" value={spec.projectName} path="/projectName" changedPaths={changedPaths} />
          <SpecFieldRow label="Business type" value={spec.businessType} path="/businessType" changedPaths={changedPaths} />
          <SpecFieldRow label="Primary user" value={spec.primaryUser} path="/primaryUser" changedPaths={changedPaths} required />
          <SpecFieldRow label="Main goal" value={spec.mainGoal} path="/mainGoal" changedPaths={changedPaths} required />
          <SpecFieldRow label="Recommended output" value={spec.outputType ? toTitle(spec.outputType) : null} path="/outputType" changedPaths={changedPaths} required />
        </SpecSection>

        <SpecSection title="Build Decisions">
          <SpecFieldRow label="Core features" value={spec.coreFeatures} path="/coreFeatures" changedPaths={changedPaths} required />
          <SpecFieldRow label="Data to track" value={spec.dataToTrack} path="/dataToTrack" changedPaths={changedPaths} />
          <SpecFieldRow label="User roles" value={spec.userRoles} path="/userRoles" changedPaths={changedPaths} />
          <SpecFieldRow label="Integrations" value={spec.integrations} path="/integrations" changedPaths={changedPaths} />
        </SpecSection>

        <SpecSection title="Taste and Constraints">
          <SpecFieldRow label="Design preferences" value={spec.designPreferences} path="/designPreferences" changedPaths={changedPaths} />
          <SpecFieldRow label="Technical constraints" value={spec.technicalConstraints} path="/technicalConstraints" changedPaths={changedPaths} />
          <SpecFieldRow label="Must not do" value={spec.mustNotDo} path="/mustNotDo" changedPaths={changedPaths} />
        </SpecSection>

        <SpecSection title="Trust Surface">
          <SpecFieldRow label="Assumptions" value={spec.assumptions} path="/assumptions" changedPaths={changedPaths} />
          <SpecFieldRow label="Open questions" value={spec.openQuestions} path="/openQuestions" changedPaths={changedPaths} />
          <SpecFieldRow label="Latest changes" value={changedPaths.length > 0 ? changedPaths.map((path) => path.replace('/', '')) : []} path="/latestChanges" changedPaths={changedPaths} />
        </SpecSection>
      </CardContent>
    </Card>
  );
}
