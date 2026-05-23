import { z } from 'zod';
import { createId } from '../utils/ids';

export const interviewPhaseSchema = z.enum([
  'intake',
  'interview',
  'confirm',
  'building',
  'result',
  'iterate',
  'error',
]);

export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);
export const messageStatusSchema = z.enum(['optimistic', 'streaming', 'complete', 'failed']);

export const buildTypeSchema = z.enum([
  'business_system',
  'website',
  'spreadsheet',
  'automation',
  'client_portal',
  'landing_page',
  'unknown',
]);

export const outputTypeSchema = z.enum([
  'implementation_plan',
  'build_prompt',
  'prototype',
  'spreadsheet',
  'code_files',
]);

export const readinessSchema = z.object({
  score: z.number().min(0).max(100),
  requiredFieldsComplete: z.boolean(),
  reason: z.string(),
});

export const buildSpecSchema = z.object({
  id: z.string(),
  projectName: z.string().nullable(),
  buildType: buildTypeSchema,
  businessType: z.string().nullable(),
  primaryUser: z.string().nullable(),
  mainGoal: z.string().nullable(),
  coreFeatures: z.array(z.string()),
  dataToTrack: z.array(z.string()),
  userRoles: z.array(z.string()),
  integrations: z.array(z.string()),
  outputType: outputTypeSchema.nullable(),
  designPreferences: z.array(z.string()),
  technicalConstraints: z.array(z.string()),
  mustNotDo: z.array(z.string()),
  assumptions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  readiness: readinessSchema,
  updatedAt: z.string(),
});

export const patchOperationSchema = z.object({
  op: z.enum(['set', 'append', 'remove', 'replace']),
  path: z.string(),
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
});

export const specPatchSchema = z.object({
  id: z.string(),
  specId: z.string(),
  createdAt: z.string(),
  sourceMessageId: z.string(),
  operations: z.array(patchOperationSchema),
  summary: z.string(),
});

export const buildStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  status: z.enum(['queued', 'running', 'complete', 'failed']),
});

export const buildJobSchema = z.object({
  id: z.string(),
  specId: z.string(),
  status: z.enum(['queued', 'running', 'complete', 'failed']),
  activeStep: z.number(),
  steps: z.array(buildStepSchema),
  artifactId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const resultFileSchema = z.object({
  path: z.string(),
  language: z.string(),
  content: z.string(),
});

export const resultArtifactSchema = z.object({
  id: z.string(),
  specId: z.string(),
  buildJobId: z.string(),
  title: z.string(),
  type: z.enum(['markdown', 'code', 'spreadsheet_plan', 'prompt_pack']),
  content: z.string(),
  sections: z.object({
    overview: z.string(),
    buildPrompt: z.string(),
    plan: z.string(),
    specJson: z.string(),
  }),
  files: z.array(resultFileSchema),
  createdAt: z.string(),
});

export const interviewMessageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
  status: messageStatusSchema,
  metadata: z.record(z.unknown()).optional(),
});

export type InterviewPhase = z.infer<typeof interviewPhaseSchema>;
export type MessageRole = z.infer<typeof messageRoleSchema>;
export type InterviewMessage = z.infer<typeof interviewMessageSchema>;
export type BuildType = z.infer<typeof buildTypeSchema>;
export type OutputType = z.infer<typeof outputTypeSchema>;
export type BuildSpec = z.infer<typeof buildSpecSchema>;
export type SpecPatch = z.infer<typeof specPatchSchema>;
export type PatchOperation = z.infer<typeof patchOperationSchema>;
export type BuildStep = z.infer<typeof buildStepSchema>;
export type BuildJob = z.infer<typeof buildJobSchema>;
export type ResultArtifact = z.infer<typeof resultArtifactSchema>;
export type ResultFile = z.infer<typeof resultFileSchema>;

export type AssessmentGap =
  | 'buildType'
  | 'primaryUser'
  | 'mainGoal'
  | 'coreFeatures'
  | 'dataToTrack'
  | 'loginConstraint'
  | 'outputType'
  | 'designPreferences'
  | 'none';

export type Assessment = {
  readiness: BuildSpec['readiness'];
  nextGap: AssessmentGap;
  openQuestions: string[];
  changedReason: string;
};

export function createEmptySpec(): BuildSpec {
  const now = new Date().toISOString();

  return {
    id: createId('spec'),
    projectName: null,
    buildType: 'unknown',
    businessType: null,
    primaryUser: null,
    mainGoal: null,
    coreFeatures: [],
    dataToTrack: [],
    userRoles: [],
    integrations: [],
    outputType: null,
    designPreferences: [],
    technicalConstraints: ['Local-first prototype. No paid APIs or secrets required.'],
    mustNotDo: ['Do not require paid services, auth, billing, Supabase, or API keys for this prototype.'],
    assumptions: [],
    openQuestions: [],
    readiness: {
      score: 0,
      requiredFieldsComplete: false,
      reason: 'Start by describing what you want to build.',
    },
    updatedAt: now,
  };
}

export const buildStepTemplates = [
  {
    label: 'Locking final spec',
    detail: 'Freezing the current decisions so the package does not drift.',
  },
  {
    label: 'Creating implementation plan',
    detail: 'Turning the spec into build phases and acceptance criteria.',
  },
  {
    label: 'Mapping data model',
    detail: 'Identifying entities, fields, roles, and persistence needs.',
  },
  {
    label: 'Drafting interface structure',
    detail: 'Organizing screens, states, empty cases, and user actions.',
  },
  {
    label: 'Packaging build prompt',
    detail: 'Writing the handoff prompt for a coding agent or engineering team.',
  },
  {
    label: 'Checking for missing pieces',
    detail: 'Listing assumptions, blockers, and next wiring steps.',
  },
] as const;
