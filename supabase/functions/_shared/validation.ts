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

export const fieldSourceSchema = z.enum([
  'user_explicit',
  'user_confirmed',
  'model_inferred',
  'system_default',
  'imported_context',
]);

export const fieldMetadataSchema = z.object({
  source: fieldSourceSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  sourceMessageId: z.string().optional(),
  updatedAt: z.string(),
});

export const conflictSchema = z.object({
  id: z.string(),
  path: z.string(),
  existingValue: z.unknown(),
  incomingValue: z.unknown(),
  existingSource: fieldSourceSchema,
  incomingSource: fieldSourceSchema,
  evidence: z.array(z.string()),
  sourceMessageId: z.string().optional(),
  status: z.enum(['unresolved', 'resolved']),
  createdAt: z.string(),
});

export const assumptionRecordSchema = z.object({
  id: z.string(),
  statement: z.string(),
  basis: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  affectsBuild: z.array(z.string()),
  askBeforeBuild: z.boolean(),
  createdAt: z.string(),
});

export const governorReadinessSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(['blocked', 'needs_interview', 'ready_with_assumptions', 'ready']),
  hardBlockers: z.array(z.string()),
  softGaps: z.array(z.string()),
  assumptions: z.array(assumptionRecordSchema),
  recommendedOutput: outputTypeSchema.nullable(),
});

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
  fieldMetadata: z.record(fieldMetadataSchema).optional(),
  conflicts: z.array(conflictSchema).optional(),
  assumptionLedger: z.array(assumptionRecordSchema).optional(),
  governorReadiness: governorReadinessSchema.optional(),
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
  evidence: z.array(z.string()).optional(),
  sourceMessageId: z.string().optional(),
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

export const detectedUserIntentSchema = z.enum([
  'new_build_request',
  'answering_question',
  'asking_meta_question',
  'changing_previous_answer',
  'expressing_confusion',
  'requesting_output',
  'off_topic',
]);

export const nextMoveSchema = z.enum([
  'ask_question',
  'answer_then_ask',
  'reflect_and_continue',
  'confirm_spec',
  'request_clarification',
  'hold_off_topic',
]);

export const selectedBuildModeSchema = z.enum(['interview', 'prototype', 'build_package', 'prompt', 'plan']).nullable();
export const artifactGoalSchema = z.enum(['implementation_plan', 'build_prompt', 'prototype', 'code_files', 'spreadsheet']).nullable();

export const questionHistoryItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  targetField: z.string(),
  reason: z.string(),
  createdAt: z.string(),
  answered: z.boolean(),
});

export const userUnderstandingSchema = z.object({
  summary: z.string(),
  inferredSkillLevel: z.enum(['nontechnical', 'technical', 'mixed', 'unknown']),
  currentIntent: detectedUserIntentSchema,
  confidence: z.number().min(0).max(1),
});

export const candidateGapSchema = z.object({
  id: z.string(),
  path: z.string(),
  question: z.string(),
  category: z.enum([
    'architecture',
    'auth',
    'data',
    'integrations',
    'workflow',
    'failure_behavior',
    'output_type',
    'scope',
    'cosmetic',
  ]),
  impactOnBuild: z.number().min(0).max(5),
  riskIfWrong: z.number().min(0).max(5),
  dependencyUnlockValue: z.number().min(0).max(5),
  userUncertainty: z.number().min(0).max(5),
  canUseSafeDefault: z.boolean(),
  questionAnnoyance: z.number().min(0).max(5),
  score: z.number().min(0).optional(),
});

export const interviewContextPacketSchema = z.object({
  sessionId: z.string(),
  latestUserMessage: z.string(),
  currentSpec: buildSpecSchema,
  currentPhase: z.string(),
  recentMessages: z.array(interviewMessageSchema),
  conversationSummary: z.string(),
  questionHistory: z.array(questionHistoryItemSchema),
  unansweredQuestions: z.array(questionHistoryItemSchema),
  assumptions: z.array(assumptionRecordSchema),
  unresolvedConflicts: z.array(conflictSchema),
  selectedBuildMode: selectedBuildModeSchema,
  artifactGoal: artifactGoalSchema,
  inferredUserSkillLevel: userUnderstandingSchema.shape.inferredSkillLevel,
  readiness: governorReadinessSchema,
  candidateGaps: z.array(candidateGapSchema),
});

export const orchestratedInterviewTurnSchema = z.object({
  assistantMessage: z.string().min(1),
  detectedUserIntent: detectedUserIntentSchema,
  specPatch: specPatchSchema,
  nextMove: nextMoveSchema,
  nextQuestion: z
    .object({
      question: z.string(),
      targetField: z.string(),
      reason: z.string(),
    })
    .nullable(),
  readiness: governorReadinessSchema,
  assumptions: z.array(assumptionRecordSchema),
  conflicts: z.array(conflictSchema),
  updatedConversationSummary: z.string(),
  userUnderstanding: userUnderstandingSchema,
});

export const interviewTurnRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  currentSpec: buildSpecSchema,
  currentPhase: z.string().optional(),
  recentMessages: z.array(interviewMessageSchema),
  conversationSummary: z.string().optional(),
  questionHistory: z.array(questionHistoryItemSchema).optional(),
  assumptions: z.array(assumptionRecordSchema).optional(),
  unresolvedConflicts: z.array(conflictSchema).optional(),
  selectedBuildMode: selectedBuildModeSchema.optional(),
  artifactGoal: artifactGoalSchema.optional(),
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
  detectedUserIntent: detectedUserIntentSchema.optional(),
  nextMove: nextMoveSchema.optional(),
  nextQuestion: questionHistoryItemSchema.nullable().optional(),
  questionHistory: z.array(questionHistoryItemSchema).optional(),
  assumptions: z.array(assumptionRecordSchema).optional(),
  conflicts: z.array(conflictSchema).optional(),
  updatedConversationSummary: z.string().optional(),
  userUnderstanding: userUnderstandingSchema.optional(),
});

export type BuildSpec = z.infer<typeof buildSpecSchema>;
export type InterviewMessage = z.infer<typeof interviewMessageSchema>;
export type SpecPatch = z.infer<typeof specPatchSchema>;
export type SpecPatchOperation = z.infer<typeof specPatchOperationSchema>;
export type FieldSource = z.infer<typeof fieldSourceSchema>;
export type ReadinessAssessment = z.infer<typeof readinessAssessmentSchema>;
export type NextQuestionResponse = z.infer<typeof nextQuestionResponseSchema>;
export type ReadinessSummaryResponse = z.infer<typeof readinessSummaryResponseSchema>;
export type QuestionHistoryItem = z.infer<typeof questionHistoryItemSchema>;
export type InterviewContextPacket = z.infer<typeof interviewContextPacketSchema>;
export type OrchestratedInterviewTurn = z.infer<typeof orchestratedInterviewTurnSchema>;
export type CandidateGap = z.infer<typeof candidateGapSchema>;
export type SelectedBuildMode = z.infer<typeof selectedBuildModeSchema>;
export type ArtifactGoal = z.infer<typeof artifactGoalSchema>;
