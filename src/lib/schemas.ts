import { z } from 'zod';

export const InterviewPhaseSchema = z.enum(['intake', 'clarify_category', 'interview', 'confirm', 'building', 'result']);
export const BuildCategorySchema = z.enum([
  'internal_dashboard',
  'client_portal',
  'landing_page',
  'automation',
  'saas_mvp',
  'spreadsheet_tool',
  'unknown',
]);
export const DesiredOutputSchema = z.enum(['implementation_plan', 'build_prompt', 'prototype', 'spreadsheet_plan']);
export const QuestionTypeSchema = z.enum(['intent-confirm', 'tradeoff', 'fork', 'scope', 'freeform', 'review']);
export const ResponseModeSchema = z.enum(['options-only', 'options-or-custom', 'unsure-allowed', 'free']);
export const ImportanceSchema = z.enum(['critical', 'high', 'medium', 'low']);
export const ConfidenceSchema = z.enum(['locked', 'default', 'assumed', 'custom']);
export const ImpactTagSchema = z.enum([
  'architecture',
  'scope',
  'data-model',
  'auth',
  'ux',
  'risk',
  'integration',
  'billing',
  'deployment',
]);

export const JSONPatchSchema = z
  .object({
    op: z.enum(['add', 'replace', 'remove']),
    path: z.string(),
    value: z.unknown().optional(),
  })
  .strict();

export const ArchitectureSchema = z
  .object({
    auth: z.enum(['none', 'single-user', 'magic-link', 'oauth', 'credentials', 'tbd']),
    realtime: z.boolean(),
    offline: z.boolean(),
    payments: z.enum(['none', 'stripe', 'other', 'tbd']),
    deployment: z.enum(['vercel', 'netlify', 'self-host', 'tbd']),
    confidence: z
      .object({
        auth: ConfidenceSchema,
        realtime: ConfidenceSchema,
        offline: ConfidenceSchema,
        payments: ConfidenceSchema,
        deployment: ConfidenceSchema,
      })
      .strict(),
  })
  .strict();

export const SpecLineSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    confidence: ConfidenceSchema,
    sourceQuestionId: z.string().optional(),
    tags: z.array(ImpactTagSchema),
  })
  .strict();

export const SpecDocSchema = z
  .object({
    projectName: z.string(),
    oneLiner: z.string(),
    buildType: BuildCategorySchema,
    primaryUser: z.string().nullable(),
    mainThingTracked: z.string().nullable(),
    mainGoal: z.string().nullable(),
    firstVersionScope: z.string().nullable(),
    desiredOutput: DesiredOutputSchema.nullable(),
    users: z.array(SpecLineSchema),
    features: z.array(SpecLineSchema),
    dataModel: z.array(SpecLineSchema),
    architecture: ArchitectureSchema,
    integrations: z.array(SpecLineSchema),
    outOfScope: z.array(SpecLineSchema),
    risks: z.array(SpecLineSchema),
    openQuestions: z.array(SpecLineSchema),
  })
  .strict();

export const DecisionOptionSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    consequence: z.string(),
    impactTags: z.array(ImpactTagSchema),
    scopeWeight: z.number().min(0).max(10),
    specPatch: z.array(JSONPatchSchema),
    disabledReason: z.string().optional(),
  })
  .strict();

export const QuestionSchema = z
  .object({
    id: z.string(),
    type: QuestionTypeSchema,
    responseMode: ResponseModeSchema,
    title: z.string(),
    whyItMatters: z.string(),
    importance: ImportanceSchema,
    readinessWeight: z.number().positive(),
    options: z.array(DecisionOptionSchema).min(2).max(10),
    recommendedOptionId: z.string(),
    smartDefaultRationale: z.string(),
  })
  .strict();

export const UserAnswerSchema = z
  .object({
    id: z.string(),
    questionId: z.string(),
    mode: z.enum(['option', 'default', 'custom']),
    optionId: z.string().optional(),
    label: z.string(),
    rawText: z.string().optional(),
    canonicalText: z.string().optional(),
    confidence: ConfidenceSchema,
    specPatch: z.array(JSONPatchSchema),
    createdAt: z.string(),
  })
  .strict();

export const SpecImpactSchema = z
  .object({
    id: z.string(),
    questionId: z.string(),
    answerId: z.string(),
    patch: z.array(JSONPatchSchema),
    humanized: z.array(z.string()),
    createdAt: z.string(),
  })
  .strict();

export const BuildReadinessSchema = z
  .object({
    ready: z.boolean(),
    statusText: z.string(),
    decisionsRemaining: z.number().min(0),
    missingRequirements: z.array(z.string()),
  })
  .strict();

export const BuildPackageSchema = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    markdown: z.string(),
    spec: SpecDocSchema,
    generatedAt: z.string(),
  })
  .strict();

export const SessionSnapshotSchema = z
  .object({
    spec: SpecDocSchema,
    answers: z.array(UserAnswerSchema),
    answeredQuestionIds: z.array(z.string()),
    currentQuestionId: z.string().nullable(),
    readiness: BuildReadinessSchema,
  })
  .strict();

export const ClarifySessionSchema = z
  .object({
    id: z.string(),
    phase: InterviewPhaseSchema,
    initialPrompt: z.string(),
    projectName: z.string(),
    questions: z.array(QuestionSchema),
    currentQuestionId: z.string().nullable(),
    answeredQuestionIds: z.array(z.string()),
    answers: z.array(UserAnswerSchema),
    spec: SpecDocSchema,
    previewPatch: z.array(JSONPatchSchema).nullable(),
    readiness: BuildReadinessSchema,
    undoStack: z.array(SessionSnapshotSchema),
    lastImpact: SpecImpactSchema.nullable(),
    reviewOpen: z.boolean(),
    buildPackage: BuildPackageSchema.nullable(),
  })
  .strict();

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type ResponseMode = z.infer<typeof ResponseModeSchema>;
export type Importance = z.infer<typeof ImportanceSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type ImpactTag = z.infer<typeof ImpactTagSchema>;
export type InterviewPhase = z.infer<typeof InterviewPhaseSchema>;
export type BuildCategory = z.infer<typeof BuildCategorySchema>;
export type DesiredOutput = z.infer<typeof DesiredOutputSchema>;
export type JSONPatch = z.infer<typeof JSONPatchSchema>;
export type SpecLine = z.infer<typeof SpecLineSchema>;
export type SpecDoc = z.infer<typeof SpecDocSchema>;
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type UserAnswer = z.infer<typeof UserAnswerSchema>;
export type SpecImpact = z.infer<typeof SpecImpactSchema>;
export type BuildReadiness = z.infer<typeof BuildReadinessSchema>;
export type BuildPackage = z.infer<typeof BuildPackageSchema>;
export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>;
export type ClarifySession = z.infer<typeof ClarifySessionSchema>;

