import { z } from 'zod';
import {
  buildTypeSchema,
  fieldSourceSchema,
  outputTypeSchema,
  type AssumptionRecord,
  type BuildSpec,
  type FieldSource,
  type GovernorReadiness,
  type SpecConflict,
} from '../schema';

export const allowlistedPatchPaths = [
  '/projectName',
  '/buildType',
  '/businessType',
  '/primaryUser',
  '/mainGoal',
  '/coreFeatures',
  '/dataToTrack',
  '/userRoles',
  '/integrations',
  '/outputType',
  '/designPreferences',
  '/technicalConstraints',
  '/mustNotDo',
  '/assumptions',
] as const;

export const allowlistedPatchPathSchema = z.enum(allowlistedPatchPaths);

export const governorPatchOperationSchema = z.object({
  op: z.enum(['set', 'append', 'remove', 'replace']),
  path: allowlistedPatchPathSchema,
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
  sourceMessageId: z.string(),
});

export const proposedPatchSchema = z.object({
  operations: z.array(governorPatchOperationSchema),
  summary: z.string(),
});

export const patchDecisionSchema = z.object({
  operation: governorPatchOperationSchema,
  decision: z.enum(['accepted', 'rejected', 'rerouted', 'needs_confirmation']),
  reason: z.string(),
  appliedPath: allowlistedPatchPathSchema.optional(),
  appliedValue: z.unknown().optional(),
  conflictId: z.string().optional(),
});

export const candidateGapSchema = z.object({
  id: z.string(),
  path: allowlistedPatchPathSchema,
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

export const specGovernorResultSchema = z.object({
  spec: z.custom<BuildSpec>(),
  decisions: z.array(patchDecisionSchema),
  conflicts: z.array(z.custom<SpecConflict>()),
  assumptions: z.array(z.custom<AssumptionRecord>()),
  readiness: z.custom<GovernorReadiness>(),
  nextQuestion: z.string().nullable(),
});

export type GovernorPatchOperation = z.infer<typeof governorPatchOperationSchema>;
export type ProposedPatch = z.infer<typeof proposedPatchSchema>;
export type PatchDecision = z.infer<typeof patchDecisionSchema>;
export type CandidateGap = z.infer<typeof candidateGapSchema>;
export type PatchPath = (typeof allowlistedPatchPaths)[number];

export type GovernorApplyOptions = {
  source: FieldSource;
  sourceMessageId: string;
  evidenceFallback?: string;
};

export const governorEnums = {
  buildTypeSchema,
  outputTypeSchema,
  fieldSourceSchema,
};
