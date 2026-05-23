import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { callDeepSeekJson } from '../_shared/deepseek.ts';
import { callGeminiJson } from '../_shared/gemini.ts';
import {
  buildSpecSchema,
  buildTypeSchema,
  interviewContextPacketSchema,
  interviewTurnRequestSchema,
  interviewTurnResponseSchema,
  orchestratedInterviewTurnSchema,
  outputTypeSchema,
  specPatchSchema,
  type ArtifactGoal,
  type BuildSpec,
  type CandidateGap,
  type FieldSource,
  type InterviewContextPacket,
  type InterviewMessage,
  type OrchestratedInterviewTurn,
  type QuestionHistoryItem,
  type ReadinessAssessment,
  type SelectedBuildMode,
  type SpecPatch,
  type SpecPatchOperation,
} from '../_shared/validation.ts';

type OrchestrateInterviewTurnInput = {
  sessionId: string;
  latestUserMessage: string;
  currentSpec: BuildSpec;
  currentPhase: string;
  recentMessages: InterviewMessage[];
  conversationSummary: string;
  questionHistory: QuestionHistoryItem[];
  assumptions: NonNullable<BuildSpec['assumptionLedger']>;
  unresolvedConflicts: NonNullable<BuildSpec['conflicts']>;
  selectedBuildMode: SelectedBuildMode;
  artifactGoal: ArtifactGoal;
};

type Provider = {
  name: string;
  orchestrateInterviewTurn(input: OrchestrateInterviewTurnInput): Promise<OrchestratedInterviewTurn>;
};

type DomainPackId = 'website' | 'web_app' | 'client_portal' | 'internal_tool' | 'automation' | 'spreadsheet' | 'unknown';

const requiredFields = ['buildType', 'primaryUser', 'mainGoal', 'outputType'] as const;
const arrayPaths = new Set([
  '/coreFeatures',
  '/dataToTrack',
  '/userRoles',
  '/integrations',
  '/designPreferences',
  '/technicalConstraints',
  '/mustNotDo',
  '/assumptions',
]);

const sourceAuthority: Record<FieldSource, number> = {
  system_default: 1,
  model_inferred: 2,
  imported_context: 3,
  user_explicit: 4,
  user_confirmed: 5,
};

const domainPacks: Record<DomainPackId, {
  id: DomainPackId;
  label: string;
  criticalFields: string[];
  usefulFields: string[];
  artifactRequirements: string[];
}> = {
  website: {
    id: 'website',
    label: 'Website',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/outputType'],
    usefulFields: ['/coreFeatures', '/designPreferences'],
    artifactRequirements: ['page structure', 'conversion goal', 'copy/content needs'],
  },
  web_app: {
    id: 'web_app',
    label: 'Web app',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType'],
    usefulFields: ['/userRoles', '/integrations', '/coreFeatures'],
    artifactRequirements: ['core workflow', 'data model', 'roles', 'edge cases'],
  },
  client_portal: {
    id: 'client_portal',
    label: 'Client portal',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/userRoles', '/outputType'],
    usefulFields: ['/dataToTrack', '/integrations', '/mustNotDo'],
    artifactRequirements: ['visibility model', 'client data', 'auth/roles', 'invite flow'],
  },
  internal_tool: {
    id: 'internal_tool',
    label: 'Internal tool',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType'],
    usefulFields: ['/userRoles', '/coreFeatures', '/integrations'],
    artifactRequirements: ['operator workflow', 'data model', 'permissions', 'failure states'],
  },
  automation: {
    id: 'automation',
    label: 'Automation',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/integrations', '/outputType'],
    usefulFields: ['/mustNotDo', '/dataToTrack', '/technicalConstraints'],
    artifactRequirements: ['trigger', 'inputs', 'actions', 'human review', 'failure handling'],
  },
  spreadsheet: {
    id: 'spreadsheet',
    label: 'Spreadsheet',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/dataToTrack', '/outputType'],
    usefulFields: ['/coreFeatures', '/technicalConstraints'],
    artifactRequirements: ['tabs', 'inputs', 'formulas', 'review/export flow'],
  },
  unknown: {
    id: 'unknown',
    label: 'Unknown',
    criticalFields: ['/buildType', '/primaryUser', '/mainGoal', '/outputType'],
    usefulFields: ['/coreFeatures', '/dataToTrack'],
    artifactRequirements: ['identified build type', 'target user', 'goal', 'artifact goal'],
  },
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function operation(op: SpecPatchOperation['op'], path: string, value: unknown, confidence = 0.75): SpecPatchOperation {
  return { op, path, value, confidence, evidence: [String(value)], sourceMessageId: 'stub' };
}

function inferDomainPack(spec: BuildSpec) {
  if (spec.buildType === 'website' || spec.buildType === 'landing_page') return domainPacks.website;
  if (spec.buildType === 'client_portal') return domainPacks.client_portal;
  if (spec.buildType === 'automation') return domainPacks.automation;
  if (spec.buildType === 'spreadsheet') return domainPacks.spreadsheet;
  if (spec.buildType === 'business_system') return domainPacks.internal_tool;
  if (spec.coreFeatures.some((item) => /app|login|workflow|dashboard/i.test(item))) return domainPacks.web_app;
  return domainPacks.unknown;
}

function hasRequired(spec: BuildSpec, field: (typeof requiredFields)[number]) {
  if (field === 'buildType') return spec.buildType !== 'unknown';
  if (field === 'outputType') return Boolean(spec.outputType);
  return Boolean(spec[field] && String(spec[field]).trim().length > 0);
}

function pathMissing(spec: BuildSpec, path: string) {
  if (path === '/buildType') return spec.buildType === 'unknown';
  if (path === '/outputType') return !spec.outputType;
  const value = spec[path.slice(1) as keyof BuildSpec];
  if (Array.isArray(value)) return value.length === 0;
  return value === null || value === undefined || value === '';
}

function questionForPath(path: string) {
  if (path === '/buildType') return 'What kind of thing are we building: website, web app, client portal, internal tool, automation, spreadsheet, or something else?';
  if (path === '/primaryUser') return 'Who will use this most, and what job are they trying to get done?';
  if (path === '/mainGoal') return 'What is the main outcome this needs to create?';
  if (path === '/outputType') return 'What should Clarify produce at the end: an implementation plan, build prompt, prototype, spreadsheet plan, or code files?';
  if (path === '/dataToTrack') return 'What data does this need to create, show, update, or export?';
  if (path === '/userRoles') return 'Does everyone see the same thing, or are there different roles and permissions?';
  if (path === '/integrations') return 'What outside systems does this need to read from or update, if any?';
  if (path === '/mustNotDo') return 'What should this never do without a human review step?';
  return 'What decision would most change the first version?';
}

function categoryForPath(path: string): CandidateGap['category'] {
  if (path === '/outputType') return 'output_type';
  if (path === '/integrations') return 'integrations';
  if (path === '/dataToTrack') return 'data';
  if (path === '/userRoles') return 'auth';
  if (path === '/mustNotDo') return 'failure_behavior';
  if (path === '/coreFeatures') return 'workflow';
  return 'architecture';
}

function scoreCandidateGap(gap: CandidateGap) {
  const categoryBoost: Record<CandidateGap['category'], number> = {
    architecture: 8,
    auth: 8,
    data: 7,
    integrations: 7,
    workflow: 7,
    failure_behavior: 6,
    output_type: 8,
    scope: 4,
    cosmetic: -6,
  };
  return (
    gap.impactOnBuild * 3 +
    gap.riskIfWrong * 3 +
    gap.dependencyUnlockValue * 2 +
    gap.userUncertainty -
    gap.questionAnnoyance * 2 -
    (gap.canUseSafeDefault ? 3 : 0) +
    categoryBoost[gap.category]
  );
}

function buildCandidateGaps(spec: BuildSpec, questionHistory: QuestionHistoryItem[]) {
  const pack = inferDomainPack(spec);
  const paths = Array.from(new Set([...pack.criticalFields, ...pack.usefulFields]));
  const askedTargets = new Set(questionHistory.map((item) => item.targetField));

  return paths
    .filter((path) => pathMissing(spec, path) && !askedTargets.has(path))
    .map((path) => {
      const gap: CandidateGap = {
        id: `${pack.id}:${path}`,
        path,
        question: questionForPath(path),
        category: categoryForPath(path),
        impactOnBuild: path === '/outputType' || path === '/dataToTrack' || path === '/userRoles' ? 5 : 4,
        riskIfWrong: path === '/integrations' || path === '/dataToTrack' || path === '/userRoles' ? 5 : 4,
        dependencyUnlockValue: path === '/buildType' || path === '/outputType' ? 5 : 3,
        userUncertainty: 3,
        canUseSafeDefault: !['/buildType', '/mainGoal', '/outputType'].includes(path),
        questionAnnoyance: path === '/designPreferences' ? 5 : 2,
      };
      return { ...gap, score: scoreCandidateGap(gap) };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function inferSkillLevel(messages: InterviewMessage[]): InterviewContextPacket['inferredUserSkillLevel'] {
  const text = messages.map((message) => message.content).join(' ').toLowerCase();
  if (/\b(api|schema|database|typescript|react|auth|webhook|endpoint|repo)\b/.test(text)) return 'technical';
  if (/\bnot technical|non technical|plain english|i don't code|no code\b/.test(text)) return 'nontechnical';
  if (text.trim().length > 0) return 'mixed';
  return 'unknown';
}

function markQuestionHistoryAnswered(history: QuestionHistoryItem[], latestUserMessage: string) {
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

function createQuestionHistoryItem(question: NonNullable<OrchestratedInterviewTurn['nextQuestion']>): QuestionHistoryItem {
  return {
    id: `question_${crypto.randomUUID()}`,
    question: question.question,
    targetField: question.targetField,
    reason: question.reason,
    createdAt: new Date().toISOString(),
    answered: false,
  };
}

function normalizeListValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function inferBuildTypeFromText(value: unknown): BuildSpec['buildType'] | undefined {
  const text = String(value).toLowerCase();
  if (text.includes('portal')) return 'client_portal';
  if (text.includes('spreadsheet') || text.includes('sheet') || text.includes('excel')) return 'spreadsheet';
  if (text.includes('automation') || text.includes('workflow')) return 'automation';
  if (text.includes('landing')) return 'landing_page';
  if (text.includes('website') || text.includes('site')) return 'website';
  if (text.includes('dashboard') || text.includes('internal') || text.includes('system') || text.includes('app')) return 'business_system';
  return undefined;
}

function inferOutputTypeFromText(value: unknown): BuildSpec['outputType'] | undefined {
  const text = String(value).toLowerCase();
  if (text.includes('prototype')) return 'prototype';
  if (text.includes('prompt')) return 'build_prompt';
  if (text.includes('spreadsheet')) return 'spreadsheet';
  if (text.includes('code')) return 'code_files';
  if (text.includes('package') || text.includes('plan')) return 'implementation_plan';
  return undefined;
}

function normalizeEnumField(key: keyof BuildSpec, value: unknown) {
  if (value === null || value === undefined || value === '') return key === 'outputType' ? null : value;
  if (key !== 'buildType' && key !== 'outputType') return value;

  const normalized = String(value).trim().toLowerCase().replace(/[-\s/]+/g, '_');
  if (key === 'buildType') {
    const aliases: Record<string, BuildSpec['buildType']> = {
      app: 'business_system',
      business_system: 'business_system',
      client_area: 'client_portal',
      client_dashboard: 'client_portal',
      client_portal: 'client_portal',
      customer_portal: 'client_portal',
      dashboard: 'business_system',
      internal_dashboard: 'business_system',
      internal_system: 'business_system',
      landing_page: 'landing_page',
      portal: 'client_portal',
      site: 'website',
      web_app: 'business_system',
    };
    const candidate = aliases[normalized] ?? normalized;
    const parsed = buildTypeSchema.safeParse(candidate);
    return parsed.success ? parsed.data : inferBuildTypeFromText(value);
  }

  const aliases: Record<string, BuildSpec['outputType']> = {
    build_package: 'implementation_plan',
    build_plan: 'implementation_plan',
    build_prompt: 'build_prompt',
    code: 'code_files',
    code_files: 'code_files',
    implementation_plan: 'implementation_plan',
    plan: 'implementation_plan',
    prompt: 'build_prompt',
    prototype: 'prototype',
    spreadsheet: 'spreadsheet',
    spreadsheet_plan: 'spreadsheet',
    working_prototype: 'prototype',
  };
  const candidate = aliases[normalized] ?? normalized;
  const parsed = outputTypeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : inferOutputTypeFromText(value);
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== '';
}

function applySpecPatch(currentSpec: BuildSpec, patch: SpecPatch) {
  const next = buildSpecSchema.parse({
    ...currentSpec,
    coreFeatures: [...currentSpec.coreFeatures],
    dataToTrack: [...currentSpec.dataToTrack],
    userRoles: [...currentSpec.userRoles],
    integrations: [...currentSpec.integrations],
    designPreferences: [...currentSpec.designPreferences],
    technicalConstraints: [...currentSpec.technicalConstraints],
    mustNotDo: [...currentSpec.mustNotDo],
    assumptions: [...currentSpec.assumptions],
    openQuestions: [...currentSpec.openQuestions],
    readiness: { ...currentSpec.readiness },
    fieldMetadata: { ...(currentSpec.fieldMetadata ?? {}) },
    conflicts: [...(currentSpec.conflicts ?? [])],
    assumptionLedger: [...(currentSpec.assumptionLedger ?? [])],
  });

  for (const patchOperation of patch.operations) {
    const key = patchOperation.path.replace(/^\//, '') as keyof BuildSpec;
    if (!(key in next)) continue;
    const path = patchOperation.path;
    const previous = next[key];

    if (arrayPaths.has(path)) {
      if (!Array.isArray(previous)) continue;
      const removeValues = new Set(normalizeListValue(patchOperation.value).map((item) => item.toLowerCase()));
      const seen = new Set(previous.map((item) => String(item).toLowerCase()));
      const incoming = normalizeListValue(patchOperation.value).filter((item) => !seen.has(item.toLowerCase()));
      (next[key] as string[]) = patchOperation.op === 'remove'
        ? previous.filter((item) => !removeValues.has(String(item).toLowerCase()))
        : [...previous, ...incoming];
      continue;
    }

    const normalizedValue = normalizeEnumField(key, patchOperation.value);
    if (normalizedValue === undefined) continue;
    const source: FieldSource = 'model_inferred';
    const metadata = next.fieldMetadata?.[path];
    const previousSource = metadata?.source ?? (hasValue(previous) ? 'system_default' : source);

    if (sourceAuthority[source] < sourceAuthority[previousSource] && hasValue(previous) && !sameValue(previous, normalizedValue)) {
      next.conflicts = [
        ...(next.conflicts ?? []),
        {
          id: `conflict_${patchOperation.sourceMessageId ?? Date.now()}_${String(key)}`,
          path,
          existingValue: previous,
          incomingValue: normalizedValue,
          existingSource: previousSource,
          incomingSource: source,
          evidence: patchOperation.evidence ?? [],
          sourceMessageId: patchOperation.sourceMessageId,
          status: 'unresolved',
          createdAt: new Date().toISOString(),
        },
      ];
      continue;
    }

    if (patchOperation.op === 'remove') {
      (next[key] as null) = null;
    } else if (patchOperation.op === 'replace' || !hasValue(previous) || patchOperation.confidence >= 0.82) {
      (next[key] as typeof normalizedValue) = normalizedValue;
      next.fieldMetadata = {
        ...(next.fieldMetadata ?? {}),
        [path]: {
          source,
          confidence: patchOperation.confidence,
          evidence: patchOperation.evidence ?? [],
          sourceMessageId: patchOperation.sourceMessageId,
          updatedAt: new Date().toISOString(),
        },
      };
    }
  }

  next.updatedAt = new Date().toISOString();
  return buildSpecSchema.parse(next);
}

function assessReadiness(spec: BuildSpec, turnCount: number, maxTurns = 10): ReadinessAssessment {
  const missingFields = requiredFields.filter((field) => !hasRequired(spec, field));
  const requiredScore = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 76);
  let optionalScore = 0;
  if (spec.projectName) optionalScore += 3;
  if (spec.businessType) optionalScore += 3;
  if (spec.coreFeatures.length > 0) optionalScore += 5;
  if (spec.coreFeatures.length > 1) optionalScore += 4;
  if (spec.dataToTrack.length > 0) optionalScore += 3;
  if (spec.userRoles.length > 0) optionalScore += 2;
  if (spec.integrations.length > 0) optionalScore += 2;
  if (spec.designPreferences.length > 0) optionalScore += 2;

  const score = Math.min(100, requiredScore + optionalScore);
  const requiredFieldsComplete = missingFields.length === 0;
  const maxTurnsReached = turnCount >= maxTurns;
  const openQuestions = missingFields.slice(0, 1).map((field) => questionForPath(`/${field}`));
  const blockingOpenQuestions = requiredFieldsComplete ? [] : openQuestions;
  let reason = 'Not enough detail yet.';

  if (requiredFieldsComplete && score >= 75) {
    reason = 'Ready to confirm. The required build decisions are clear enough for a first package.';
  } else if (score >= 50) {
    reason = 'The shape is visible, but one required decision still changes the build.';
  }
  if (maxTurnsReached && !requiredFieldsComplete) {
    reason = 'Maximum interview turns reached. Move to confirmation with assumptions instead of looping.';
  }

  return { score, requiredFieldsComplete, reason, missingFields, openQuestions, blockingOpenQuestions, maxTurnsReached };
}

function governorStatus(readiness: ReadinessAssessment, spec: BuildSpec) {
  const conflictBlockers = (spec.conflicts ?? [])
    .filter((conflict) => conflict.status === 'unresolved')
    .map((conflict) => `Conflict on ${conflict.path} must be resolved before build.`);
  const hardBlockers = [...readiness.blockingOpenQuestions, ...conflictBlockers];
  const status = hardBlockers.length > 0
    ? 'blocked'
    : readiness.score >= 85
      ? 'ready'
      : readiness.score >= 75
        ? 'ready_with_assumptions'
        : 'needs_interview';

  return {
    score: readiness.score,
    status,
    hardBlockers,
    softGaps: readiness.missingFields.length === 0 ? [] : readiness.missingFields.map((field) => `${field} may need a safe default.`),
    assumptions: spec.assumptionLedger ?? [],
    recommendedOutput: spec.outputType,
  };
}

function canConfirm(readiness: ReadinessAssessment, spec: BuildSpec) {
  if (readiness.maxTurnsReached) return true;
  const governed = governorStatus(readiness, spec);
  return readiness.requiredFieldsComplete && readiness.score >= 75 && governed.hardBlockers.length === 0;
}

function buildInterviewContextPacket(input: OrchestrateInterviewTurnInput): InterviewContextPacket {
  const currentSpec = buildSpecSchema.parse({
    ...input.currentSpec,
    assumptionLedger: input.currentSpec.assumptionLedger ?? input.assumptions,
    conflicts: input.currentSpec.conflicts ?? input.unresolvedConflicts,
  });
  const simpleReadiness = assessReadiness(
    currentSpec,
    input.recentMessages.filter((message) => message.role === 'user').length,
  );
  const recentMessages = input.recentMessages.slice(-12);

  return interviewContextPacketSchema.parse({
    sessionId: input.sessionId,
    latestUserMessage: input.latestUserMessage,
    currentSpec,
    currentPhase: input.currentPhase,
    recentMessages,
    conversationSummary: input.conversationSummary,
    questionHistory: input.questionHistory,
    unansweredQuestions: input.questionHistory.filter((question) => !question.answered),
    assumptions: input.assumptions,
    unresolvedConflicts: input.unresolvedConflicts,
    selectedBuildMode: input.selectedBuildMode,
    artifactGoal: input.artifactGoal,
    inferredUserSkillLevel: inferSkillLevel(recentMessages),
    readiness: governorStatus(simpleReadiness, currentSpec),
    candidateGaps: buildCandidateGaps(currentSpec, input.questionHistory),
  });
}

function buildOrchestrationPrompt(packet: InterviewContextPacket) {
  const domainPack = inferDomainPack(packet.currentSpec);
  return `You are Clarify, an elevated AI product architect.

Core contract:
- You manage the user-facing conversation and reasoning.
- The app owns truth, state, validation, persistence, readiness, and final build gating.
- You propose specPatch operations only. The app may reject, reroute, or hold them for confirmation.
- Never claim something is final unless validated readiness says it is ready.

Behavior:
- Reflect what you understood in one specific sentence.
- If the user asked a question, answer it directly, then bridge back to the best interview question.
- Ask exactly one strong question when nextMove requires a question.
- Avoid generic prompts like "tell me more", "what are you trying to build", or "what features do you want".
- Explain tradeoffs briefly when they affect architecture, auth, data, integrations, workflow, failure behavior, or final output.
- Avoid cosmetic questions early.
- Do not sound like a form.

Patch rules:
- Return operation objects with op, path, value, confidence, evidence, sourceMessageId.
- Use only paths visible in currentSpec.
- Only propose values supported by user words or clear context.
- outputType values: implementation_plan, build_prompt, prototype, spreadsheet, code_files.
- buildType values: business_system, website, spreadsheet, automation, client_portal, landing_page, unknown.

Build-type pack:
${JSON.stringify(domainPack, null, 2)}

Context packet:
${JSON.stringify(packet, null, 2)}

Return JSON only matching this shape:
{
  "assistantMessage": "natural, specific response plus one high-leverage question if needed",
  "detectedUserIntent": "new_build_request|answering_question|asking_meta_question|changing_previous_answer|expressing_confusion|requesting_output|off_topic",
  "specPatch": {"operations": [{"op":"set|append|remove|replace","path":"/fieldName","value":"...","confidence":0.82,"evidence":["short quote or reason"],"sourceMessageId":"${packet.sessionId}"}], "summary": "what changed"},
  "nextMove": "ask_question|answer_then_ask|reflect_and_continue|confirm_spec|request_clarification|hold_off_topic",
  "nextQuestion": {"question":"one question","targetField":"/fieldName","reason":"why this changes the build"} or null,
  "readiness": ${JSON.stringify(packet.readiness)},
  "assumptions": ${JSON.stringify(packet.assumptions)},
  "conflicts": ${JSON.stringify(packet.unresolvedConflicts)},
  "updatedConversationSummary": "running summary, max 120 words",
  "userUnderstanding": {"summary": "what the user seems to want", "inferredSkillLevel": "${packet.inferredUserSkillLevel}", "currentIntent": "same as detectedUserIntent", "confidence": 0.8}
}`;
}

function fallbackPatch(reason: string): SpecPatch {
  return {
    operations: [],
    summary: `Provider output was not usable, so Clarify kept the current spec and continued deterministically. ${reason}`,
  };
}

function fallbackOrchestration(input: OrchestrateInterviewTurnInput, specPatch: SpecPatch): OrchestratedInterviewTurn {
  const packet = buildInterviewContextPacket(input);
  const bestGap = packet.candidateGaps[0];

  return {
    assistantMessage: bestGap
      ? `I’m tracking the build shape, and this is the next decision that changes the architecture: ${bestGap.question}`
      : 'I have enough to summarize the plan and call out the assumptions before building.',
    detectedUserIntent: 'answering_question',
    specPatch,
    nextMove: bestGap ? 'ask_question' : 'confirm_spec',
    nextQuestion: bestGap
      ? {
          question: bestGap.question,
          targetField: bestGap.path,
          reason: 'Highest-scoring remaining gap in Clarify’s deterministic governor.',
        }
      : null,
    readiness: packet.readiness,
    assumptions: packet.assumptions,
    conflicts: packet.unresolvedConflicts,
    updatedConversationSummary: packet.conversationSummary || input.latestUserMessage.slice(0, 240),
    userUnderstanding: {
      summary: packet.conversationSummary || input.latestUserMessage,
      inferredSkillLevel: packet.inferredUserSkillLevel,
      currentIntent: 'answering_question',
      confidence: 0.5,
    },
  };
}

function stubPatch(input: OrchestrateInterviewTurnInput): SpecPatch {
  const text = input.latestUserMessage.toLowerCase();
  const operations: SpecPatchOperation[] = [];

  if (includesAny(text, ['client portal', 'customer portal', 'portal'])) operations.push(operation('set', '/buildType', 'client_portal', 0.86));
  else if (includesAny(text, ['spreadsheet', 'sheet', 'excel'])) operations.push(operation('set', '/buildType', 'spreadsheet', 0.82));
  else if (includesAny(text, ['automation', 'workflow', 'automate'])) operations.push(operation('set', '/buildType', 'automation', 0.82));
  else if (includesAny(text, ['website', 'landing page', 'site'])) operations.push(operation('set', '/buildType', 'website', 0.78));
  else if (includesAny(text, ['dashboard', 'internal tool', 'business system'])) operations.push(operation('set', '/buildType', 'business_system', 0.78));

  if (includesAny(text, ['customer', 'client'])) operations.push(operation('set', '/primaryUser', 'Customers/clients', 0.8));
  else if (includesAny(text, ['team', 'internal', 'employee', 'staff'])) operations.push(operation('set', '/primaryUser', 'Internal team', 0.8));

  if (text.includes('detailing')) operations.push(operation('set', '/businessType', 'detailing business', 0.76));
  if (includesAny(text, ['request services', 'request service', 'service requests'])) {
    operations.push(operation('set', '/mainGoal', 'Let customers request services clearly.', 0.78));
    operations.push(operation('append', '/coreFeatures', ['Service request flow'], 0.72));
  } else if (includesAny(text, ['book', 'booking', 'appointment'])) {
    operations.push(operation('set', '/mainGoal', 'Turn interest into booked appointments.', 0.76));
    operations.push(operation('append', '/coreFeatures', ['Booking flow'], 0.72));
  } else if (includesAny(text, ['track', 'manage', 'dashboard'])) {
    operations.push(operation('set', '/mainGoal', 'Help the team track work clearly.', 0.72));
  }

  if (includesAny(text, ['prototype', 'working prototype'])) operations.push(operation('set', '/outputType', 'prototype', 0.84));
  else if (includesAny(text, ['build prompt', 'prompt'])) operations.push(operation('set', '/outputType', 'build_prompt', 0.84));
  else if (includesAny(text, ['implementation plan', 'plan'])) operations.push(operation('set', '/outputType', 'implementation_plan', 0.8));

  return {
    operations,
    summary: operations.length > 0 ? 'Stub extracted obvious supported fields.' : 'Stub found no obvious supported fields.',
  };
}

class StubProvider implements Provider {
  name = 'stub';

  async orchestrateInterviewTurn(input: OrchestrateInterviewTurnInput) {
    return fallbackOrchestration(input, stubPatch(input));
  }
}

class DeepSeekProvider implements Provider {
  name = 'deepseek';

  constructor(private apiKey: string, private model: string) {
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek.');
  }

  async orchestrateInterviewTurn(input: OrchestrateInterviewTurnInput) {
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildOrchestrationPrompt(buildInterviewContextPacket(input)),
      schema: orchestratedInterviewTurnSchema,
      operationName: 'orchestrateInterviewTurn',
    });
  }
}

class GeminiProvider implements Provider {
  name = 'gemini';

  constructor(private apiKey: string, private model: string) {
    if (!apiKey) throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini.');
  }

  async orchestrateInterviewTurn(input: OrchestrateInterviewTurnInput) {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildOrchestrationPrompt(buildInterviewContextPacket(input)),
      schema: orchestratedInterviewTurnSchema,
      operationName: 'orchestrateInterviewTurn',
    });
  }
}

function resolveProvider(): Provider {
  const providerName = Deno.env.get('LLM_PROVIDER') ?? 'stub';
  if (providerName === 'deepseek') {
    return new DeepSeekProvider(
      Deno.env.get('DEEPSEEK_API_KEY') ?? '',
      Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-v4-pro',
    );
  }
  if (providerName === 'gemini') {
    return new GeminiProvider(
      Deno.env.get('GEMINI_API_KEY') ?? '',
      Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash',
    );
  }
  return new StubProvider();
}

function fallbackSummary(spec: BuildSpec, assumptions: string[]) {
  const excluded = spec.mustNotDo.length > 0
    ? spec.mustNotDo.join(', ')
    : 'paid services, secrets, real auth, billing, and production integrations';
  const assumptionText = assumptions.length > 0 ? assumptions.join(', ') : 'no extra assumptions beyond the current spec';

  return `Here is the build plan: a ${spec.buildType.replace(/_/g, ' ')} for ${
    spec.primaryUser ?? 'the primary user'
  } that helps with ${spec.mainGoal ?? 'the main outcome'}. This first version will not include ${excluded}. Assumptions: ${assumptionText}. The main tradeoff is keeping the first package specific enough to build without adding production services yet.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, { status: 405 });
  }

  try {
    const request = interviewTurnRequestSchema.parse(await req.json());
    const markedQuestionHistory = markQuestionHistoryAnswered(request.questionHistory ?? [], request.message);
    const orchestrationInput: OrchestrateInterviewTurnInput = {
      sessionId: request.sessionId,
      latestUserMessage: request.message,
      currentSpec: request.currentSpec,
      currentPhase: request.currentPhase ?? 'interview',
      recentMessages: request.recentMessages,
      conversationSummary: request.conversationSummary ?? '',
      questionHistory: markedQuestionHistory,
      assumptions: request.assumptions ?? request.currentSpec.assumptionLedger ?? [],
      unresolvedConflicts: request.unresolvedConflicts ?? request.currentSpec.conflicts?.filter((conflict) => conflict.status === 'unresolved') ?? [],
      selectedBuildMode: request.selectedBuildMode ?? null,
      artifactGoal: request.artifactGoal ?? null,
    };

    const provider = resolveProvider();
    const orchestration = await provider.orchestrateInterviewTurn(orchestrationInput).catch((error: unknown) =>
      fallbackOrchestration(
        orchestrationInput,
        fallbackPatch(error instanceof Error ? error.message : 'Unknown orchestration error.'),
      )
    );
    const specPatch = specPatchSchema.parse(orchestration.specPatch);
    const updatedSpecBase = applySpecPatch(request.currentSpec, specPatch);
    const readiness = assessReadiness(
      updatedSpecBase,
      request.turnCount ?? request.recentMessages.filter((message) => message.role === 'user').length,
    );
    const governedReadiness = governorStatus(readiness, updatedSpecBase);
    const updatedSpec = buildSpecSchema.parse({
      ...updatedSpecBase,
      readiness: {
        score: readiness.score,
        requiredFieldsComplete: readiness.requiredFieldsComplete && governedReadiness.hardBlockers.length === 0,
        reason: governedReadiness.hardBlockers[0] ?? readiness.reason,
      },
      openQuestions: readiness.openQuestions,
      governorReadiness: governedReadiness,
      updatedAt: new Date().toISOString(),
    });

    const nextPhase = canConfirm(readiness, updatedSpec) ? 'confirm' : 'interview';
    const content = nextPhase === 'confirm' && orchestration.nextMove !== 'confirm_spec'
      ? fallbackSummary(updatedSpec, updatedSpec.assumptions)
      : orchestration.assistantMessage;
    const nextQuestionItem = nextPhase === 'interview' && orchestration.nextQuestion
      ? createQuestionHistoryItem(orchestration.nextQuestion)
      : null;
    const nextQuestionHistory = nextQuestionItem ? [...markedQuestionHistory, nextQuestionItem] : markedQuestionHistory;

    return jsonResponse(
      interviewTurnResponseSchema.parse({
        assistantMessage: {
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
        },
        specPatch,
        updatedSpec,
        readiness: {
          ...readiness,
          requiredFieldsComplete: readiness.requiredFieldsComplete && governedReadiness.hardBlockers.length === 0,
          reason: governedReadiness.hardBlockers[0] ?? readiness.reason,
          blockingOpenQuestions: governedReadiness.hardBlockers,
        },
        nextPhase,
        provider: provider.name,
        detectedUserIntent: orchestration.detectedUserIntent,
        nextMove: orchestration.nextMove,
        nextQuestion: nextQuestionItem,
        questionHistory: nextQuestionHistory,
        assumptions: updatedSpec.assumptionLedger ?? [],
        conflicts: updatedSpec.conflicts ?? [],
        updatedConversationSummary: orchestration.updatedConversationSummary,
        userUnderstanding: orchestration.userUnderstanding,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown interview-turn error';
    return jsonResponse({ error: message }, { status: 400 });
  }
});
