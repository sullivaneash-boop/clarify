import { z } from 'zod';
import {
  buildSpecSchema,
  interviewMessageSchema,
  patchOperationSchema,
  type BuildSpec,
  type InterviewMessage,
  type PatchOperation,
} from '../interview/schema';

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
  specPatch: llmSpecPatchSchema,
  updatedSpec: buildSpecSchema,
  readiness: readinessAssessmentSchema,
  nextPhase: z.enum(['interview', 'confirm']),
  provider: z.string().optional(),
});

export type SpecPatchOperation = PatchOperation;
export type LLMSpecPatch = z.infer<typeof llmSpecPatchSchema>;
export type ReadinessAssessment = z.infer<typeof readinessAssessmentSchema>;
export type NextQuestionResponse = z.infer<typeof nextQuestionResponseSchema>;
export type ReadinessSummaryResponse = z.infer<typeof readinessSummaryResponseSchema>;
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
