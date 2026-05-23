import { createId } from '../utils/ids';
import { assessSpec } from './assess';
import { extractSpecPatch } from './extract';
import { applyPatch, uniquePaths } from './patches';
import { phraseNextQuestion } from './phrase';
import type { Assessment, BuildSpec, InterviewPhase, SpecPatch } from './schema';
import type { InterviewMessage } from './schema';
import type { LLMProvider } from '../llm/provider';
import {
  interviewTurnResponseSchema,
  type InterviewTurnResponse,
} from '../llm/schemas';
import { assessReadiness, canConfirm } from './readiness';

export type ControllerResult = {
  spec: BuildSpec;
  patch: SpecPatch;
  assessment: Assessment;
  assistantContent: string;
  nextPhase: InterviewPhase;
  changedPaths: string[];
};

export function processUserTurn(
  spec: BuildSpec,
  userInput: string,
  sourceMessageId = createId('msg'),
  mode: 'interview' | 'iteration' = 'interview',
): ControllerResult {
  const patch = extractSpecPatch(userInput, spec, { sourceMessageId, mode });
  const applied = applyPatch(spec, patch);
  const assessment = assessSpec(applied.spec);
  const nextSpec: BuildSpec = {
    ...applied.spec,
    openQuestions: assessment.openQuestions,
    readiness: assessment.readiness,
    updatedAt: new Date().toISOString(),
  };
  const phrased = phraseNextQuestion(assessment, nextSpec);
  const nextPhase: InterviewPhase = assessment.readiness.requiredFieldsComplete ? 'confirm' : 'interview';

  return {
    spec: nextSpec,
    patch,
    assessment,
    assistantContent: phrased.content,
    nextPhase,
    changedPaths: uniquePaths([...applied.changedPaths, '/readiness', '/openQuestions']),
  };
}

export type InterviewTurnControllerInput = {
  sessionId: string;
  message: string;
  currentSpec: BuildSpec;
  recentMessages: InterviewMessage[];
  provider: LLMProvider;
  turnCount?: number;
  maxTurns?: number;
};

function formatQuestion(response: { question: string; rationale?: string | null }) {
  if (!response.rationale) return response.question;
  return `${response.question}\n\n${response.rationale}`;
}

export async function processInterviewTurn({
  message,
  currentSpec,
  recentMessages,
  provider,
  turnCount = recentMessages.filter((item) => item.role === 'user').length,
  maxTurns = 10,
}: InterviewTurnControllerInput): Promise<InterviewTurnResponse> {
  const specPatch = await provider.extractSpecUpdates({
    currentSpec,
    latestUserMessage: message,
    recentMessages,
  });
  const applied = applyPatch(currentSpec, specPatch);
  const readiness = assessReadiness(applied.spec, { turnCount, maxTurns });
  const updatedSpec: BuildSpec = {
    ...applied.spec,
    readiness: {
      score: readiness.score,
      requiredFieldsComplete: readiness.requiredFieldsComplete,
      reason: readiness.reason,
    },
    openQuestions: readiness.openQuestions,
    updatedAt: new Date().toISOString(),
  };

  let content: string;
  let nextPhase: 'interview' | 'confirm' = 'interview';

  if (canConfirm(readiness)) {
    const summary = await provider.summarizeReadiness({
      currentSpec: updatedSpec,
      readiness,
      assumptions: updatedSpec.assumptions,
    });
    content = summary.summary;
    nextPhase = 'confirm';
  } else {
    const question = await provider.proposeNextQuestion({
      currentSpec: updatedSpec,
      readiness,
      missingFields: readiness.missingFields,
      openQuestions: readiness.openQuestions,
      recentMessages,
    });
    content = formatQuestion(question);
  }

  return interviewTurnResponseSchema.parse({
    assistantMessage: {
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    },
    specPatch,
    updatedSpec,
    readiness,
    nextPhase,
    provider: provider.name,
  });
}
