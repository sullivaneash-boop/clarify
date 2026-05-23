import type { BuildSpec, OutputType } from '../schema';
import type { CandidateGap, PatchPath } from './schemas';

export type DomainPackId =
  | 'website'
  | 'web_app'
  | 'internal_tool'
  | 'client_portal'
  | 'automation'
  | 'spreadsheet'
  | 'unknown';

export type DomainPack = {
  id: DomainPackId;
  label: string;
  schemaExtensions: string[];
  requiredFields: PatchPath[];
  hardBlockers: (spec: BuildSpec) => string[];
  defaults: Partial<Record<PatchPath, unknown>>;
  questionTemplates: Partial<Record<PatchPath, string>>;
  readinessRubric: string[];
  artifactTemplate: string;
};

const commonQuestions: Partial<Record<PatchPath, string>> = {
  '/buildType': 'What kind of thing are we building: internal tool, client portal, automation, website, spreadsheet, or something else?',
  '/primaryUser': 'Who uses this most, and what are they trying to get done?',
  '/mainGoal': 'What is the main outcome this has to create?',
  '/outputType': 'What should Clarify produce at the end: implementation plan, build prompt, prototype, spreadsheet plan, or code files?',
};

function missing(spec: BuildSpec, path: PatchPath) {
  if (path === '/buildType') return spec.buildType === 'unknown';
  if (path === '/outputType') return !spec.outputType;
  const key = path.slice(1) as keyof BuildSpec;
  const value = spec[key];
  if (Array.isArray(value)) return value.length === 0;
  return value === null || value === undefined || value === '';
}

function blockersFor(spec: BuildSpec, paths: PatchPath[]) {
  return paths.filter((path) => missing(spec, path)).map((path) => `${path.slice(1)} is required before build.`);
}

export const DOMAIN_PACKS: Record<DomainPackId, DomainPack> = {
  internal_tool: {
    id: 'internal_tool',
    label: 'Internal tool',
    schemaExtensions: ['workflowSteps', 'dataToTrack', 'userRoles', 'failureBehavior'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType']),
    defaults: {
      '/userRoles': ['Admin/operator'],
      '/technicalConstraints': ['Local-first prototype before production persistence.'],
    },
    questionTemplates: {
      ...commonQuestions,
      '/dataToTrack': 'What records does this tool need to create, update, or review?',
      '/userRoles': 'Who can change data, and who can only view it?',
    },
    readinessRubric: ['Primary user and data model are known.', 'Workflow is clear.', 'Output format is selected.'],
    artifactTemplate: 'internal-tool-package',
  },
  web_app: {
    id: 'web_app',
    label: 'Web app',
    schemaExtensions: ['authModel', 'dataModel', 'coreWorkflow', 'roles'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/outputType']),
    defaults: {
      '/technicalConstraints': ['Local-first prototype before production services.'],
    },
    questionTemplates: {
      ...commonQuestions,
      '/dataToTrack': 'What data does the app need to create, show, or update for users?',
      '/userRoles': 'Does everyone see the same thing, or are there different roles and permissions?',
    },
    readinessRubric: ['Audience, core workflow, data model, and output are clear.'],
    artifactTemplate: 'web-app-package',
  },
  automation: {
    id: 'automation',
    label: 'Automation',
    schemaExtensions: ['trigger', 'inputs', 'actions', 'failureBehavior', 'handoffMode'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/integrations', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/outputType']),
    defaults: {
      '/technicalConstraints': ['Use a manual trigger in the MVP unless a real integration is confirmed.'],
      '/mustNotDo': ['Do not run irreversible actions without review.'],
    },
    questionTemplates: {
      ...commonQuestions,
      '/integrations': 'What system should trigger this, and what system should it update?',
      '/mustNotDo': 'What should this automation never do without a human review step?',
    },
    readinessRubric: ['Trigger is known.', 'Action target is known.', 'Failure behavior is clear.'],
    artifactTemplate: 'automation-package',
  },
  website: {
    id: 'website',
    label: 'Website',
    schemaExtensions: ['pages', 'conversionGoal', 'contentSources'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/outputType']),
    defaults: { '/technicalConstraints': ['Static-first implementation unless dynamic behavior is confirmed.'] },
    questionTemplates: commonQuestions,
    readinessRubric: ['Audience, goal, and output are clear.'],
    artifactTemplate: 'website-package',
  },
  client_portal: {
    id: 'client_portal',
    label: 'Client portal',
    schemaExtensions: ['permissions', 'clientVisibleData', 'inviteFlow'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/userRoles', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/outputType']),
    defaults: { '/mustNotDo': ['Do not implement real auth in the local prototype.'] },
    questionTemplates: {
      ...commonQuestions,
      '/userRoles': 'Who decides what each client can see: fixed template, per project, or admin-selected?',
    },
    readinessRubric: ['Visibility model and account model are clear.'],
    artifactTemplate: 'client-portal-package',
  },
  spreadsheet: {
    id: 'spreadsheet',
    label: 'Spreadsheet',
    schemaExtensions: ['tabs', 'formulas', 'importExport'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/outputType']),
    defaults: { '/outputType': 'spreadsheet' satisfies OutputType },
    questionTemplates: commonQuestions,
    readinessRubric: ['Inputs, outputs, and update cadence are known.'],
    artifactTemplate: 'spreadsheet-package',
  },
  unknown: {
    id: 'unknown',
    label: 'Unknown',
    schemaExtensions: ['buildTypeDiscovery', 'primaryUser', 'mainGoal', 'artifactGoal'],
    requiredFields: ['/buildType', '/primaryUser', '/mainGoal', '/outputType'],
    hardBlockers: (spec) => blockersFor(spec, ['/buildType', '/primaryUser', '/mainGoal', '/outputType']),
    defaults: {},
    questionTemplates: commonQuestions,
    readinessRubric: ['The first pass identifies what kind of thing is being built and who it is for.'],
    artifactTemplate: 'generic-package',
  },
};

export function inferDomainPackId(spec: BuildSpec): DomainPackId {
  if (spec.buildType === 'automation') return 'automation';
  if (spec.buildType === 'client_portal') return 'client_portal';
  if (spec.buildType === 'spreadsheet') return 'spreadsheet';
  if (spec.buildType === 'landing_page') return 'website';
  if (spec.buildType === 'website') return 'website';
  if (spec.buildType === 'business_system') return 'internal_tool';
  if (spec.coreFeatures.some((item) => /app|login|workflow|dashboard/i.test(item))) return 'web_app';
  return 'unknown';
}

export function getDomainPack(spec: BuildSpec) {
  return DOMAIN_PACKS[inferDomainPackId(spec)];
}

export function buildDomainGaps(spec: BuildSpec): CandidateGap[] {
  const pack = getDomainPack(spec);
  return pack.requiredFields
    .filter((path) => missing(spec, path))
    .map((path) => ({
      id: `${pack.id}:${path}`,
      path,
      question: pack.questionTemplates[path] ?? commonQuestions[path] ?? 'What decision would most change the build?',
      category:
        path === '/outputType'
          ? 'output_type'
          : path === '/integrations'
            ? 'integrations'
            : path === '/dataToTrack'
              ? 'data'
              : 'architecture',
      impactOnBuild: path === '/outputType' || path === '/dataToTrack' ? 5 : 4,
      riskIfWrong: path === '/integrations' || path === '/dataToTrack' ? 5 : 4,
      dependencyUnlockValue: path === '/buildType' || path === '/outputType' ? 5 : 3,
      userUncertainty: 3,
      canUseSafeDefault: !['/buildType', '/mainGoal', '/outputType'].includes(path),
      questionAnnoyance: path === '/designPreferences' ? 5 : 2,
    }));
}
