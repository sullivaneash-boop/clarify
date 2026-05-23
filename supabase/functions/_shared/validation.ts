import { z } from 'npm:zod@3.24.1';

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

export const buildSpecSchema = z.object({
  id: z.string().optional(),
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
  readiness: z.object({
    score: z.number().min(0).max(100),
    requiredFieldsComplete: z.boolean(),
    reason: z.string(),
  }),
  updatedAt: z.string(),
});

export const interviewMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string().optional(),
  status: z.enum(['optimistic', 'streaming', 'complete', 'failed']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const specPatchOperationSchema = z.object({
  op: z.enum(['set', 'append', 'remove', 'replace']),
  path: z.string(),
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
});

export const specPatchSchema = z.object({
  operations: z.array(specPatchOperationSchema),
  summary: z.string(),
});

export const readinessAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  requiredFieldsComplete: z.boolean(),
  reason: z.string(),
  missingFields: z.array(z.string()),
  openQuestions: z.array(z.string()),
  blockingOpenQuestions: z.array(z.string()),
  maxTurnsReached: z.boolean().default(false),
});

export const nextQuestionResponseSchema = z.object({
  question: z.string(),
  rationale: z.string().nullable().optional(),
});

export const readinessSummaryResponseSchema = z.object({
  summary: z.string(),
});

export const interviewTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  currentSpec: buildSpecSchema,
  recentMessages: z.array(interviewMessageSchema),
  turnCount: z.number().int().min(0).optional(),
});

export const interviewTurnResponseSchema = z.object({
  assistantMessage: z.object({
    role: z.literal('assistant'),
    content: z.string(),
    createdAt: z.string(),
  }),
  specPatch: specPatchSchema,
  updatedSpec: buildSpecSchema,
  readiness: readinessAssessmentSchema,
  nextPhase: z.enum(['interview', 'confirm']),
  provider: z.string().optional(),
});

export type BuildSpec = z.infer<typeof buildSpecSchema>;
export type InterviewMessage = z.infer<typeof interviewMessageSchema>;
export type SpecPatch = z.infer<typeof specPatchSchema>;
export type SpecPatchOperation = z.infer<typeof specPatchOperationSchema>;
export type ReadinessAssessment = z.infer<typeof readinessAssessmentSchema>;
export type NextQuestionResponse = z.infer<typeof nextQuestionResponseSchema>;
export type ReadinessSummaryResponse = z.infer<typeof readinessSummaryResponseSchema>;
