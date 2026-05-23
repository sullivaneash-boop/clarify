import { z } from 'zod';
import {
  buildSpecSchema,
  interviewMessageSchema,
  patchOperationSchema,
  assumptionRecordSchema,
  conflictSchema,
  governorReadinessSchema,
  type AssumptionRecord,
  type BuildSpec,
  type InterviewMessage,
  type PatchOperation,
  type SpecConflict,
} from '../interview/schema';
import { candidateGapSchema } from '../interview/governor/schemas';

export const specPatchOperationSchema = patchOperationSchema;

export const llmSpecPatchSchema = z.object({
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
  specPatch: llmSpecPatchSchema,
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
  specPatch: llmSpecPatchSchema,
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

export type SpecPatchOperation = PatchOperation;
export type LLMSpecPatch = z.infer<typeof llmSpecPatchSchema>;
export type ReadinessAssessment = z.infer<typeof readinessAssessmentSchema>;
export type NextQuestionResponse = z.infer<typeof nextQuestionResponseSchema>;
export type ReadinessSummaryResponse = z.infer<typeof readinessSummaryResponseSchema>;
export type DetectedUserIntent = z.infer<typeof detectedUserIntentSchema>;
export type NextMove = z.infer<typeof nextMoveSchema>;
export type QuestionHistoryItem = z.infer<typeof questionHistoryItemSchema>;
export type UserUnderstanding = z.infer<typeof userUnderstandingSchema>;
export type InterviewContextPacket = z.infer<typeof interviewContextPacketSchema>;
export type OrchestratedInterviewTurn = z.infer<typeof orchestratedInterviewTurnSchema>;
export type InterviewTurnRequest = z.infer<typeof interviewTurnRequestSchema>;
export type InterviewTurnResponse = z.infer<typeof interviewTurnResponseSchema>;

export type ExtractSpecUpdatesInput = {
  currentSpec: BuildSpec;
  latestUserMessage: string;
  recentMessages: InterviewMessage[];
};

export type ExtractSpecUpdatesOutput = LLMSpecPatch;

export type ProposeNextQuestionInput = {
  currentSpec: BuildSpec;
  readiness: ReadinessAssessment;
  missingFields: string[];
  openQuestions: string[];
  recentMessages: InterviewMessage[];
};

export type ProposeNextQuestionOutput = NextQuestionResponse;

export type SummarizeReadinessInput = {
  currentSpec: BuildSpec;
  readiness: ReadinessAssessment;
  assumptions: string[];
};

export type SummarizeReadinessOutput = ReadinessSummaryResponse;

export type OrchestrateInterviewTurnInput = {
  sessionId: string;
  latestUserMessage: string;
  currentSpec: BuildSpec;
  currentPhase: string;
  recentMessages: InterviewMessage[];
  conversationSummary: string;
  questionHistory: QuestionHistoryItem[];
  assumptions: AssumptionRecord[];
  unresolvedConflicts: SpecConflict[];
  selectedBuildMode: z.infer<typeof selectedBuildModeSchema>;
  artifactGoal: z.infer<typeof artifactGoalSchema>;
};

export type OrchestrateInterviewTurnOutput = OrchestratedInterviewTurn;
