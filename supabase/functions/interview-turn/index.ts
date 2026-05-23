import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { callGeminiJson } from '../_shared/gemini.ts';
import {
  buildSpecSchema,
  interviewTurnRequestSchema,
  interviewTurnResponseSchema,
  nextQuestionResponseSchema,
  readinessSummaryResponseSchema,
  specPatchSchema,
  type BuildSpec,
  type InterviewMessage,
  type NextQuestionResponse,
  type ReadinessAssessment,
  type ReadinessSummaryResponse,
  type SpecPatch,
  type SpecPatchOperation,
} from '../_shared/validation.ts';

type Provider = {
  name: string;
  extractSpecUpdates(input: {
    currentSpec: BuildSpec;
    latestUserMessage: string;
    recentMessages: InterviewMessage[];
  }): Promise<SpecPatch>;
  proposeNextQuestion(input: {
    currentSpec: BuildSpec;
    readiness: ReadinessAssessment;
    missingFields: string[];
    openQuestions: string[];
    recentMessages: InterviewMessage[];
  }): Promise<NextQuestionResponse>;
  summarizeReadiness(input: {
    currentSpec: BuildSpec;
    readiness: ReadinessAssessment;
    assumptions: string[];
  }): Promise<ReadinessSummaryResponse>;
};

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function op(
  operation: SpecPatchOperation['op'],
  path: string,
  value: unknown,
  confidence = 0.75,
): SpecPatchOperation {
  return { op: operation, path, value, confidence };
}

class StubProvider implements Provider {
  name = 'stub';

  async extractSpecUpdates(input: {
    currentSpec: BuildSpec;
    latestUserMessage: string;
  }): Promise<SpecPatch> {
    const text = input.latestUserMessage.toLowerCase();
    const operations: SpecPatchOperation[] = [];

    if (includesAny(text, ['client portal', 'customer portal', 'portal'])) {
      operations.push(op('set', '/buildType', 'client_portal', 0.86));
    } else if (includesAny(text, ['spreadsheet', 'sheet', 'excel'])) {
      operations.push(op('set', '/buildType', 'spreadsheet', 0.82));
    } else if (includesAny(text, ['automation', 'workflow', 'automate'])) {
      operations.push(op('set', '/buildType', 'automation', 0.82));
    } else if (includesAny(text, ['website', 'landing page', 'site'])) {
      operations.push(op('set', '/buildType', 'website', 0.78));
    } else if (includesAny(text, ['dashboard', 'internal tool', 'business system'])) {
      operations.push(op('set', '/buildType', 'business_system', 0.78));
    }

    if (includesAny(text, ['customer', 'client'])) {
      operations.push(op('set', '/primaryUser', 'Customers/clients', 0.8));
    } else if (includesAny(text, ['team', 'internal', 'employee', 'staff'])) {
      operations.push(op('set', '/primaryUser', 'Internal team', 0.8));
    }

    if (text.includes('detailing')) {
      operations.push(op('set', '/businessType', 'detailing business', 0.76));
    }

    if (includesAny(text, ['request services', 'request service', 'service requests'])) {
      operations.push(op('set', '/mainGoal', 'Let customers request services clearly.', 0.78));
      operations.push(op('append', '/coreFeatures', ['Service request flow'], 0.72));
    } else if (includesAny(text, ['book', 'booking', 'appointment'])) {
      operations.push(op('set', '/mainGoal', 'Turn interest into booked appointments.', 0.76));
      operations.push(op('append', '/coreFeatures', ['Booking flow'], 0.72));
    } else if (includesAny(text, ['track', 'manage', 'dashboard'])) {
      operations.push(op('set', '/mainGoal', 'Help the team track work clearly.', 0.72));
    }

    if (includesAny(text, ['prototype', 'working prototype'])) {
      operations.push(op('set', '/outputType', 'prototype', 0.84));
    } else if (includesAny(text, ['build prompt', 'prompt'])) {
      operations.push(op('set', '/outputType', 'build_prompt', 0.84));
    } else if (includesAny(text, ['implementation plan', 'plan'])) {
      operations.push(op('set', '/outputType', 'implementation_plan', 0.8));
    }

    return {
      operations,
      summary: operations.length > 0 ? 'Stub extracted obvious supported fields.' : 'Stub found no obvious supported fields.',
    };
  }

  async proposeNextQuestion(input: {
    missingFields: string[];
    openQuestions: string[];
  }): Promise<NextQuestionResponse> {
    const missing = input.missingFields[0];
    if (missing === 'buildType') {
      return {
        question:
          'What kind of thing are you trying to build: a website, internal system, spreadsheet, automation, client portal, or something else?',
      };
    }
    if (missing === 'primaryUser') {
      return { question: 'Who will use this most: you, your team, customers, clients, or someone else?' };
    }
    if (missing === 'mainGoal') {
      return { question: 'What is the main outcome this needs to create?' };
    }
    if (missing === 'outputType') {
      return {
        question:
          'What do you want at the end: a build prompt, implementation plan, prototype, spreadsheet plan, or code files?',
      };
    }
    return { question: input.openQuestions[0] ?? 'What decision would most change the first version?' };
  }

  async summarizeReadiness(input: {
    currentSpec: BuildSpec;
    assumptions: string[];
  }): Promise<ReadinessSummaryResponse> {
    return {
      summary: `Here is the build plan: a ${input.currentSpec.buildType.replace(/_/g, ' ')} for ${
        input.currentSpec.primaryUser ?? 'the primary user'
      } that helps with ${input.currentSpec.mainGoal ?? 'the main outcome'}. Assumptions: ${
        input.assumptions.length > 0 ? input.assumptions.join(', ') : 'none beyond the current spec'
      }. This first pass should avoid paid services, secrets, and production integrations unless explicitly added later.`,
    };
  }
}

function promptHeader() {
  return `Clarify is an interview-first build planning tool.
The deterministic app owns state, readiness, stopping rules, and spec merging.
The model only helps with language tasks.
Never invent facts.
Never decide app flow.
Return JSON only.`;
}

function geminiExtractPrompt(input: {
  currentSpec: BuildSpec;
  latestUserMessage: string;
  recentMessages: InterviewMessage[];
}) {
  return `${promptHeader()}

Return a SpecPatch only:
{"operations":[{"op":"set|append|remove|replace","path":"/fieldName","value":"...","confidence":0.8}],"summary":"short summary"}

Rules:
- Only include updates clearly supported by the user's answer.
- Never invent values.
- Do not overwrite existing fields unless the user explicitly corrects them.
- Use confidence between 0 and 1.

Current spec:
${JSON.stringify(input.currentSpec, null, 2)}

Recent messages:
${JSON.stringify(input.recentMessages.slice(-6), null, 2)}

Latest user message:
${input.latestUserMessage}`;
}

function geminiQuestionPrompt(input: {
  currentSpec: BuildSpec;
  readiness: ReadinessAssessment;
  missingFields: string[];
  openQuestions: string[];
  recentMessages: InterviewMessage[];
}) {
  return `${promptHeader()}

Return one next question:
{"question":"one plain-English question","rationale":"optional short rationale or null"}

Rules:
- Ask one question only.
- Ask the question that most changes the build.
- Explain why only when useful.
- No jargon.
- No fake enthusiasm.
- No "great idea!"
- Do not ask for trivia.

Current spec:
${JSON.stringify(input.currentSpec, null, 2)}

Readiness:
${JSON.stringify(input.readiness, null, 2)}

Missing fields:
${JSON.stringify(input.missingFields)}

Open questions:
${JSON.stringify(input.openQuestions)}

Recent messages:
${JSON.stringify(input.recentMessages.slice(-6), null, 2)}`;
}

function geminiSummaryPrompt(input: {
  currentSpec: BuildSpec;
  readiness: ReadinessAssessment;
  assumptions: string[];
}) {
  return `${promptHeader()}

Return a concise confirmation summary:
{"summary":"plain English summary"}

Rules:
- Include what will be built.
- Include what will not be included yet.
- Include assumptions.
- Include tradeoffs.
- Do not oversell.

Current spec:
${JSON.stringify(input.currentSpec, null, 2)}

Readiness:
${JSON.stringify(input.readiness, null, 2)}

Assumptions:
${JSON.stringify(input.assumptions)}`;
}

class GeminiProvider implements Provider {
  name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    if (!apiKey) throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini.');
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractSpecUpdates(input: {
    currentSpec: BuildSpec;
    latestUserMessage: string;
    recentMessages: InterviewMessage[];
  }): Promise<SpecPatch> {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: geminiExtractPrompt(input),
      schema: specPatchSchema,
      operationName: 'extractSpecUpdates',
    });
  }

  async proposeNextQuestion(input: {
    currentSpec: BuildSpec;
    readiness: ReadinessAssessment;
    missingFields: string[];
    openQuestions: string[];
    recentMessages: InterviewMessage[];
  }): Promise<NextQuestionResponse> {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: geminiQuestionPrompt(input),
      schema: nextQuestionResponseSchema,
      operationName: 'proposeNextQuestion',
    });
  }

  async summarizeReadiness(input: {
    currentSpec: BuildSpec;
    readiness: ReadinessAssessment;
    assumptions: string[];
  }): Promise<ReadinessSummaryResponse> {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: geminiSummaryPrompt(input),
      schema: readinessSummaryResponseSchema,
      operationName: 'summarizeReadiness',
    });
  }
}

function resolveProvider(): Provider {
  const providerName = Deno.env.get('LLM_PROVIDER') ?? 'stub';
  if (providerName === 'gemini') {
    return new GeminiProvider(
      Deno.env.get('GEMINI_API_KEY') ?? '',
      Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash',
    );
  }
  return new StubProvider();
}

function normalizeListValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function applySpecPatch(currentSpec: BuildSpec, patch: SpecPatch) {
  const next: BuildSpec = {
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
  };

  for (const operation of patch.operations) {
    const key = operation.path.replace(/^\//, '') as keyof BuildSpec;
    if (!(key in next)) continue;
    const previous = next[key];

    if (operation.op === 'append') {
      if (!Array.isArray(previous)) continue;
      const seen = new Set(previous.map((item) => String(item).toLowerCase()));
      const incoming = normalizeListValue(operation.value).filter((item) => !seen.has(item.toLowerCase()));
      (next[key] as string[]) = [...previous, ...incoming];
      continue;
    }

    if (operation.op === 'remove') {
      if (Array.isArray(previous)) {
        const removeValues = new Set(normalizeListValue(operation.value).map((item) => item.toLowerCase()));
        (next[key] as string[]) = previous.filter((item) => !removeValues.has(String(item).toLowerCase()));
      } else {
        (next[key] as null) = null;
      }
      continue;
    }

    if (operation.op === 'replace' || previous === null || previous === undefined || operation.confidence >= 0.82) {
      (next[key] as typeof operation.value) = operation.value;
    }
  }

  next.updatedAt = new Date().toISOString();
  return buildSpecSchema.parse(next);
}

const requiredFields = ['buildType', 'primaryUser', 'mainGoal', 'outputType'] as const;

function hasRequired(spec: BuildSpec, field: (typeof requiredFields)[number]) {
  if (field === 'buildType') return spec.buildType !== 'unknown';
  if (field === 'outputType') return Boolean(spec.outputType);
  return Boolean(spec[field] && String(spec[field]).trim().length > 0);
}

function questionFor(field: string) {
  if (field === 'buildType') {
    return 'What kind of thing are you trying to build: a website, internal system, spreadsheet, automation, client portal, or something else?';
  }
  if (field === 'primaryUser') return 'Who will use this most: you, your team, customers, clients, or someone else?';
  if (field === 'mainGoal') return 'What is the main outcome this needs to create?';
  if (field === 'outputType') {
    return 'What do you want at the end: a build prompt, implementation plan, prototype, spreadsheet plan, or code files?';
  }
  return 'What decision would most change the first version?';
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
  const openQuestions = missingFields.slice(0, 1).map(questionFor);
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

  return {
    score,
    requiredFieldsComplete,
    reason,
    missingFields,
    openQuestions,
    blockingOpenQuestions,
    maxTurnsReached,
  };
}

function canConfirm(readiness: ReadinessAssessment) {
  if (readiness.maxTurnsReached) return true;
  return readiness.requiredFieldsComplete && readiness.score >= 75 && readiness.blockingOpenQuestions.length === 0;
}

function formatQuestion(response: NextQuestionResponse) {
  if (!response.rationale) return response.question;
  return `${response.question}\n\n${response.rationale}`;
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
    const provider = resolveProvider();
    const specPatch = await provider.extractSpecUpdates({
      currentSpec: request.currentSpec,
      latestUserMessage: request.message,
      recentMessages: request.recentMessages,
    });
    const updatedSpecBase = applySpecPatch(request.currentSpec, specPatch);
    const readiness = assessReadiness(
      updatedSpecBase,
      request.turnCount ?? request.recentMessages.filter((message) => message.role === 'user').length,
    );
    const updatedSpec = buildSpecSchema.parse({
      ...updatedSpecBase,
      readiness: {
        score: readiness.score,
        requiredFieldsComplete: readiness.requiredFieldsComplete,
        reason: readiness.reason,
      },
      openQuestions: readiness.openQuestions,
      updatedAt: new Date().toISOString(),
    });

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
      content = formatQuestion(
        await provider.proposeNextQuestion({
          currentSpec: updatedSpec,
          readiness,
          missingFields: readiness.missingFields,
          openQuestions: readiness.openQuestions,
          recentMessages: request.recentMessages,
        }),
      );
    }

    return jsonResponse(
      interviewTurnResponseSchema.parse({
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
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown interview-turn error';
    return jsonResponse({ error: message }, { status: 400 });
  }
});
