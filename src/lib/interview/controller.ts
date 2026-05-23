import { createId } from '../utils/ids';
import { assessSpec } from './assess';
import { extractSpecPatch } from './extract';
import { uniquePaths } from './patches';
import { phraseNextQuestion } from './phrase';
import type { Assessment, BuildSpec, InterviewPhase, SpecPatch } from './schema';
import type { InterviewMessage } from './schema';
import type { LLMProvider } from '../llm/provider';
import {
  interviewTurnResponseSchema,
  type InterviewTurnResponse,
} from '../llm/schemas';
import { assessReadiness, canConfirm } from './readiness';
import { runSpecGovernor } from './governor/apply';

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
  const governed = runSpecGovernor(spec, patch, {
    source: 'user_explicit',
    sourceMessageId,
    evidenceFallback: userInput,
  });
  const assessment = assessSpec(governed.spec);
  const nextSpec: BuildSpec = {
    ...governed.spec,
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
    changedPaths: uniquePaths([
      ...governed.decisions.flatMap((decision) => [decision.operation.path, decision.appliedPath ?? decision.operation.path]),
      '/readiness',
      '/openQuestions',
    ]),
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

function fallbackPatch(reason: string) {
  return {
    operations: [],
    summary: `Provider output was not usable, so Clarify kept the current spec and continued deterministically. ${reason}`,
  };
}

function fallbackSummary(spec: BuildSpec, assumptions: string[]) {
  const excluded =
    spec.mustNotDo.length > 0
      ? spec.mustNotDo.join(', ')
      : 'paid services, secrets, real auth, billing, and production integrations';
  const assumptionText = assumptions.length > 0 ? assumptions.join(', ') : 'no extra assumptions beyond the current spec';

  return `Here is the build plan: a ${spec.buildType.replace(/_/g, ' ')} for ${
    spec.primaryUser ?? 'the primary user'
  } that helps with ${spec.mainGoal ?? 'the main outcome'}. This first version will not include ${excluded}. Assumptions: ${assumptionText}. The main tradeoff is keeping the first package specific enough to build without adding production services yet.`;
}

export async function processInterviewTurn({
  message,
  currentSpec,
  recentMessages,
  provider,
  turnCount = recentMessages.filter((item) => item.role === 'user').length,
  maxTurns = 10,
}: InterviewTurnControllerInput): Promise<InterviewTurnResponse> {
  const specPatch = await provider
    .extractSpecUpdates({
      currentSpec,
      latestUserMessage: message,
      recentMessages,
    })
    .catch((error: unknown) =>
      fallbackPatch(error instanceof Error ? error.message : 'Unknown provider extraction error.'),
    );
  const governed = runSpecGovernor(currentSpec, specPatch, {
    source: 'model_inferred',
    sourceMessageId: [...recentMessages].reverse().find((item) => item.role === 'user')?.id ?? 'provider-turn',
    evidenceFallback: message,
  });
  const readiness = assessReadiness(governed.spec, { turnCount, maxTurns });
  const hardBlockers = governed.readiness.hardBlockers;
  const updatedSpec: BuildSpec = {
    ...governed.spec,
    readiness: {
      score: governed.readiness.score,
      requiredFieldsComplete: readiness.requiredFieldsComplete && hardBlockers.length === 0,
      reason: hardBlockers[0] ?? readiness.reason,
    },
    openQuestions: governed.nextQuestion ? [governed.nextQuestion] : readiness.openQuestions,
    updatedAt: new Date().toISOString(),
  };

  let content: string;
  let nextPhase: 'interview' | 'confirm' = 'interview';

  if (canConfirm(readiness) && (governed.readiness.status === 'ready' || governed.readiness.status === 'ready_with_assumptions')) {
    const summary = await provider
      .summarizeReadiness({
        currentSpec: updatedSpec,
        readiness,
        assumptions: updatedSpec.assumptions,
      })
      .catch(() => ({ summary: fallbackSummary(updatedSpec, updatedSpec.assumptions) }));
    content = summary.summary;
    nextPhase = 'confirm';
  } else {
    content = governed.nextQuestion ?? readiness.openQuestions[0] ?? 'What decision would most change the first version?';
  }

  return interviewTurnResponseSchema.parse({
    assistantMessage: {
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    },
    specPatch,
    updatedSpec,
    readiness: {
      ...readiness,
      score: governed.readiness.score,
      requiredFieldsComplete: readiness.requiredFieldsComplete && hardBlockers.length === 0,
      reason: hardBlockers[0] ?? readiness.reason,
      openQuestions: updatedSpec.openQuestions,
      blockingOpenQuestions: hardBlockers,
    },
    nextPhase,
    provider: provider.name,
  });
}
