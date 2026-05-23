import { assessGovernorReadiness } from './governor/readiness';
import { buildDomainGaps, getDomainPack } from './governor/domainPacks';
import { rankCandidateGaps } from './governor/questions';
import type { BuildSpec, InterviewMessage } from './schema';
import {
  interviewContextPacketSchema,
  type InterviewContextPacket,
  type OrchestrateInterviewTurnInput,
  type QuestionHistoryItem,
} from '../llm/schemas';

function inferSkillLevel(messages: InterviewMessage[]): InterviewContextPacket['inferredUserSkillLevel'] {
  const text = messages.map((message) => message.content).join(' ').toLowerCase();
  if (/\b(api|schema|database|typescript|react|auth|webhook|endpoint|repo)\b/.test(text)) return 'technical';
  if (/\bnot technical|non technical|plain english|i don't code|no code\b/.test(text)) return 'nontechnical';
  if (text.trim().length > 0) return 'mixed';
  return 'unknown';
}

export function markQuestionHistoryAnswered(
  history: QuestionHistoryItem[],
  latestUserMessage: string,
): QuestionHistoryItem[] {
  if (!latestUserMessage.trim()) return history;
  let lastUnansweredIndex = -1;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (!history[index].answered) {
      lastUnansweredIndex = index;
      break;
    }
  }
  if (lastUnansweredIndex === -1) return history;

  return history.map((item, index) => (index === lastUnansweredIndex ? { ...item, answered: true } : item));
}

export function buildInterviewContextPacket(input: OrchestrateInterviewTurnInput): InterviewContextPacket {
  const currentSpec: BuildSpec = {
    ...input.currentSpec,
    assumptionLedger: input.currentSpec.assumptionLedger ?? input.assumptions,
    conflicts: input.currentSpec.conflicts ?? input.unresolvedConflicts,
  };
  const readiness = assessGovernorReadiness(currentSpec);
  const candidateGaps = rankCandidateGaps(buildDomainGaps(currentSpec)).filter(
    (gap) => !input.questionHistory.some((question) => question.targetField === gap.path),
  );
  const recentMessages = input.recentMessages.slice(-12);
  const unansweredQuestions = input.questionHistory.filter((question) => !question.answered);

  return interviewContextPacketSchema.parse({
    sessionId: input.sessionId,
    latestUserMessage: input.latestUserMessage,
    currentSpec,
    currentPhase: input.currentPhase,
    recentMessages,
    conversationSummary: input.conversationSummary,
    questionHistory: input.questionHistory,
    unansweredQuestions,
    assumptions: input.assumptions,
    unresolvedConflicts: input.unresolvedConflicts,
    selectedBuildMode: input.selectedBuildMode,
    artifactGoal: input.artifactGoal,
    inferredUserSkillLevel: inferSkillLevel(recentMessages),
    readiness,
    candidateGaps,
  });
}

export function buildOrchestrationPrompt(packet: InterviewContextPacket) {
  const domainPack = getDomainPack(packet.currentSpec);
  return `You are Clarify, an elevated AI product architect.

Core contract:
- You manage the user-facing conversation and reasoning.
- The app owns truth, state, validation, persistence, readiness, and final build gating.
- You propose specPatch operations. The app may reject, reroute, or hold them for confirmation.
- Never claim something is final unless the validated readiness says it is ready.

Behavior:
- Reflect what you understood in one specific sentence.
- If the user asked a meta question, answer it directly, then bridge back to the best interview question.
- Ask exactly one strong question when nextMove requires a question.
- Avoid generic prompts like "tell me more" or "what features do you want".
- Explain tradeoffs briefly when they matter.
- Prefer questions affecting architecture, auth, data, roles, integrations, workflow, failure behavior, or final output.
- Avoid cosmetic questions early.
- Do not sound like a form.

Spec patch rules:
- Return operation objects with op, path, value, confidence, evidence, sourceMessageId.
- Use only paths shown in candidate gaps or current spec.
- Only propose values supported by user words or clear conversation context.
- For outputType use only: implementation_plan, build_prompt, prototype, spreadsheet, code_files.
- For buildType use only: business_system, website, spreadsheet, automation, client_portal, landing_page, unknown.

Domain pack:
${JSON.stringify(domainPack, null, 2)}

Context packet:
${JSON.stringify(packet, null, 2)}

Return JSON only:
{
  "assistantMessage": "natural, specific response to user plus one high-leverage question if needed",
  "detectedUserIntent": "new_build_request|answering_question|asking_meta_question|changing_previous_answer|expressing_confusion|requesting_output|off_topic",
  "specPatch": {
    "operations": [
      {"op":"set|append|remove|replace","path":"/fieldName","value":"...","confidence":0.82,"evidence":["short quote or reason"],"sourceMessageId":"${packet.sessionId}"}
    ],
    "summary": "what changed"
  },
  "nextMove": "ask_question|answer_then_ask|reflect_and_continue|confirm_spec|request_clarification|hold_off_topic",
  "nextQuestion": {"question":"one question","targetField":"/fieldName","reason":"why this changes the build"} or null,
  "readiness": ${JSON.stringify(packet.readiness)},
  "assumptions": ${JSON.stringify(packet.assumptions)},
  "conflicts": ${JSON.stringify(packet.unresolvedConflicts)},
  "updatedConversationSummary": "running summary, max 120 words",
  "userUnderstanding": {
    "summary": "what the user seems to want",
    "inferredSkillLevel": "${packet.inferredUserSkillLevel}",
    "currentIntent": "same as detectedUserIntent",
    "confidence": 0.8
  }
}`;
}

export function createQuestionHistoryItem(
  question: NonNullable<import('../llm/schemas').OrchestratedInterviewTurn['nextQuestion']>,
): QuestionHistoryItem {
  return {
    id: `question_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
    question: question.question,
    targetField: question.targetField,
    reason: question.reason,
    createdAt: new Date().toISOString(),
    answered: false,
  };
}
