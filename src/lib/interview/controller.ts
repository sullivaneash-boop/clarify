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
  type LLMSpecPatch,
  type OrchestratedInterviewTurn,
  type InterviewTurnResponse,
  type QuestionHistoryItem,
} from '../llm/schemas';
import { assessReadiness, canConfirm } from './readiness';
import { runSpecGovernor } from './governor/apply';
import { buildInterviewContextPacket, createQuestionHistoryItem, markQuestionHistoryAnswered } from './orchestration';

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
  currentPhase?: string;
  conversationSummary?: string;
  questionHistory?: QuestionHistoryItem[];
  selectedBuildMode?: 'interview' | 'prototype' | 'build_package' | 'prompt' | 'plan' | null;
  artifactGoal?: 'implementation_plan' | 'build_prompt' | 'prototype' | 'code_files' | 'spreadsheet' | null;
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

function fallbackOrchestration(
  input: InterviewTurnControllerInput,
  specPatch: LLMSpecPatch,
): OrchestratedInterviewTurn {
  const markedHistory = markQuestionHistoryAnswered(input.questionHistory ?? [], input.message);
  const packet = buildInterviewContextPacket({
    sessionId: input.sessionId,
    latestUserMessage: input.message,
    currentSpec: input.currentSpec,
    currentPhase: input.currentPhase ?? 'interview',
    recentMessages: input.recentMessages,
    conversationSummary: input.conversationSummary ?? '',
    questionHistory: markedHistory,
    assumptions: input.currentSpec.assumptionLedger ?? [],
    unresolvedConflicts: input.currentSpec.conflicts?.filter((conflict) => conflict.status === 'unresolved') ?? [],
    selectedBuildMode: input.selectedBuildMode ?? null,
    artifactGoal: input.artifactGoal ?? null,
  });
  const bestGap = packet.candidateGaps[0];
  const assistantMessage = bestGap
    ? `I’m tracking the shape of this as a build plan, but this decision still changes the architecture: ${bestGap.question}`
    : 'I have enough to summarize the current plan and call out the assumptions before building.';

  return {
    assistantMessage,
    detectedUserIntent: 'answering_question',
    specPatch,
    nextMove: bestGap ? 'ask_question' : 'confirm_spec',
    nextQuestion: bestGap
      ? {
          question: bestGap.question,
          targetField: bestGap.path,
          reason: 'Highest-scoring remaining gap in the deterministic governor.',
        }
      : null,
    readiness: packet.readiness,
    assumptions: packet.assumptions,
    conflicts: packet.unresolvedConflicts,
    updatedConversationSummary: packet.conversationSummary || input.message.slice(0, 240),
    userUnderstanding: {
      summary: packet.conversationSummary || input.message,
      inferredSkillLevel: packet.inferredUserSkillLevel,
      currentIntent: 'answering_question',
      confidence: 0.5,
    },
  };
}

export async function processInterviewTurn({
  sessionId,
  message,
  currentSpec,
  recentMessages,
  provider,
  turnCount = recentMessages.filter((item) => item.role === 'user').length,
  maxTurns = 10,
  currentPhase = 'interview',
  conversationSummary = '',
  questionHistory = [],
  selectedBuildMode = null,
  artifactGoal = null,
}: InterviewTurnControllerInput): Promise<InterviewTurnResponse> {
  const markedQuestionHistory = markQuestionHistoryAnswered(questionHistory, message);
  const orchestration = provider.orchestrateInterviewTurn
    ? await provider
        .orchestrateInterviewTurn({
          sessionId,
          latestUserMessage: message,
          currentSpec,
          currentPhase,
          recentMessages,
          conversationSummary,
          questionHistory: markedQuestionHistory,
          assumptions: currentSpec.assumptionLedger ?? [],
          unresolvedConflicts: currentSpec.conflicts?.filter((conflict) => conflict.status === 'unresolved') ?? [],
          selectedBuildMode,
          artifactGoal,
        })
        .catch(async (error: unknown) => {
          const specPatch = fallbackPatch(
            error instanceof Error ? error.message : 'Unknown orchestration error.',
          );
          return fallbackOrchestration(
            {
              sessionId,
              message,
              currentSpec,
              recentMessages,
              provider,
              turnCount,
              maxTurns,
              currentPhase,
              conversationSummary,
              questionHistory: markedQuestionHistory,
              selectedBuildMode,
              artifactGoal,
            },
            specPatch,
          );
        })
    : fallbackOrchestration(
        {
          sessionId,
          message,
          currentSpec,
          recentMessages,
          provider,
          turnCount,
          maxTurns,
          currentPhase,
          conversationSummary,
          questionHistory: markedQuestionHistory,
          selectedBuildMode,
          artifactGoal,
        },
        await provider
          .extractSpecUpdates({
            currentSpec,
            latestUserMessage: message,
            recentMessages,
          })
          .catch((error: unknown) =>
            fallbackPatch(error instanceof Error ? error.message : 'Unknown provider extraction error.'),
          ),
      );
  const specPatch = orchestration.specPatch;
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
    content = orchestration.nextMove === 'confirm_spec'
      ? orchestration.assistantMessage
      : fallbackSummary(updatedSpec, updatedSpec.assumptions);
    nextPhase = 'confirm';
  } else {
    content = orchestration.assistantMessage || governed.nextQuestion || readiness.openQuestions[0] || 'What decision would most change the first version?';
  }

  const nextQuestionItem = orchestration.nextQuestion ? createQuestionHistoryItem(orchestration.nextQuestion) : null;
  const nextQuestionHistory = nextQuestionItem ? [...markedQuestionHistory, nextQuestionItem] : markedQuestionHistory;

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
    detectedUserIntent: orchestration.detectedUserIntent,
    nextMove: orchestration.nextMove,
    nextQuestion: nextQuestionItem,
    questionHistory: nextQuestionHistory,
    assumptions: governed.assumptions,
    conflicts: governed.conflicts,
    updatedConversationSummary: orchestration.updatedConversationSummary,
    userUnderstanding: orchestration.userUnderstanding,
  });
}
