import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { callDeepSeekJson } from '../_shared/deepseek.ts';
import { callGeminiJson } from '../_shared/gemini.ts';
import {
  buildTypeSchema,
  buildSpecSchema,
  interviewTurnRequestSchema,
  interviewTurnResponseSchema,
  nextQuestionResponseSchema,
  outputTypeSchema,
  readinessSummaryResponseSchema,
  specPatchSchema,
  type BuildSpec,
  type FieldSource,
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

function llmExtractPrompt(input: {
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
- For "/buildType", value must be one of: "business_system", "website", "spreadsheet", "automation", "client_portal", "landing_page", "unknown".
- For "/outputType", value must be one of: "implementation_plan", "build_prompt", "prototype", "spreadsheet", "code_files".
- Do not put product categories like "client portal" or "internal dashboard" in "/outputType"; those belong in "/buildType" if clearly supported.

Current spec:
${JSON.stringify(input.currentSpec, null, 2)}

Recent messages:
${JSON.stringify(input.recentMessages.slice(-6), null, 2)}

Latest user message:
${input.latestUserMessage}`;
}

function llmQuestionPrompt(input: {
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

function llmSummaryPrompt(input: {
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
      prompt: llmExtractPrompt(input),
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
      prompt: llmQuestionPrompt(input),
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
      prompt: llmSummaryPrompt(input),
      schema: readinessSummaryResponseSchema,
      operationName: 'summarizeReadiness',
    });
  }
}

class DeepSeekProvider implements Provider {
  name = 'deepseek';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek.');
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractSpecUpdates(input: {
    currentSpec: BuildSpec;
    latestUserMessage: string;
    recentMessages: InterviewMessage[];
  }): Promise<SpecPatch> {
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: llmExtractPrompt(input),
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
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: llmQuestionPrompt(input),
      schema: nextQuestionResponseSchema,
      operationName: 'proposeNextQuestion',
    });
  }

  async summarizeReadiness(input: {
    currentSpec: BuildSpec;
    readiness: ReadinessAssessment;
    assumptions: string[];
  }): Promise<ReadinessSummaryResponse> {
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: llmSummaryPrompt(input),
      schema: readinessSummaryResponseSchema,
      operationName: 'summarizeReadiness',
    });
  }
}

function resolveProvider(): Provider {
  const providerName = Deno.env.get('LLM_PROVIDER') ?? 'stub';
  if (providerName === 'deepseek') {
    return new DeepSeekProvider(
      Deno.env.get('DEEPSEEK_API_KEY') ?? '',
      Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-v4-flash',
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

function normalizeListValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function inferBuildTypeFromText(text: string): BuildSpec['buildType'] | undefined {
  if (text.includes('portal')) return 'client_portal';
  if (text.includes('spreadsheet') || text.includes('sheet') || text.includes('excel')) return 'spreadsheet';
  if (text.includes('automation') || text.includes('workflow')) return 'automation';
  if (text.includes('landing')) return 'landing_page';
  if (text.includes('website') || text.includes('site')) return 'website';
  if (text.includes('dashboard') || text.includes('internal') || text.includes('system') || text.includes('app')) {
    return 'business_system';
  }
  return undefined;
}

function inferOutputTypeFromText(text: string): BuildSpec['outputType'] | undefined {
  if (text.includes('prototype')) return 'prototype';
  if (text.includes('prompt')) return 'build_prompt';
  if (text.includes('spreadsheet')) return 'spreadsheet';
  if (text.includes('code')) return 'code_files';
  if (text.includes('package') || text.includes('plan')) return 'implementation_plan';
  return undefined;
}

const sourceAuthority: Record<FieldSource, number> = {
  system_default: 1,
  model_inferred: 2,
  imported_context: 3,
  user_explicit: 4,
  user_confirmed: 5,
};

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== '';
}

function normalizeEnumField(key: keyof BuildSpec, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return key === 'outputType' ? null : value;
  }

  if (key !== 'buildType' && key !== 'outputType') return value;

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s/]+/g, '_');
  const text = String(value).trim().toLowerCase();

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
    return parsed.success ? parsed.data : inferBuildTypeFromText(text);
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
  return parsed.success ? parsed.data : inferOutputTypeFromText(text);
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
    fieldMetadata: { ...(currentSpec.fieldMetadata ?? {}) },
    conflicts: [...(currentSpec.conflicts ?? [])],
    assumptionLedger: [...(currentSpec.assumptionLedger ?? [])],
  };

  for (const operation of patch.operations) {
    const key = operation.path.replace(/^\//, '') as keyof BuildSpec;
    if (!(key in next)) continue;
    const previous = next[key];
    const source: FieldSource = 'model_inferred';
    const path = operation.path;

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

    const normalizedValue = normalizeEnumField(key, operation.value);
    if (normalizedValue === undefined) continue;
    const metadata = next.fieldMetadata?.[path];
    const previousSource = metadata?.source ?? (hasValue(previous) ? 'system_default' : source);

    if (sourceAuthority[source] < sourceAuthority[previousSource] && hasValue(previous) && !sameValue(previous, normalizedValue)) {
      next.conflicts = [
        ...(next.conflicts ?? []),
        {
          id: `conflict_${operation.sourceMessageId ?? Date.now()}_${String(key)}`,
          path,
          existingValue: previous,
          incomingValue: normalizedValue,
          existingSource: previousSource,
          incomingSource: source,
          evidence: operation.evidence ?? [],
          sourceMessageId: operation.sourceMessageId,
          status: 'unresolved',
          createdAt: new Date().toISOString(),
        },
      ];
      continue;
    }

    if (operation.op === 'replace' || previous === null || previous === undefined || operation.confidence >= 0.82) {
      (next[key] as typeof normalizedValue) = normalizedValue;
      next.fieldMetadata = {
        ...(next.fieldMetadata ?? {}),
        [path]: {
          source,
          confidence: operation.confidence,
          evidence: operation.evidence ?? [],
          sourceMessageId: operation.sourceMessageId,
          updatedAt: new Date().toISOString(),
        },
      };
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

function formatQuestion(response: NextQuestionResponse) {
  if (!response.rationale) return response.question;
  return `${response.question}\n\n${response.rationale}`;
}

function fallbackPatch(reason: string): SpecPatch {
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
    const specPatch = await provider
      .extractSpecUpdates({
        currentSpec: request.currentSpec,
        latestUserMessage: request.message,
        recentMessages: request.recentMessages,
      })
      .catch((error: unknown) =>
        fallbackPatch(error instanceof Error ? error.message : 'Unknown provider extraction error.'),
      );
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
      governorReadiness: governorStatus(readiness, updatedSpecBase),
      updatedAt: new Date().toISOString(),
    });

    let content: string;
    let nextPhase: 'interview' | 'confirm' = 'interview';

    if (canConfirm(readiness)) {
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
      content = formatQuestion(
        await provider
          .proposeNextQuestion({
            currentSpec: updatedSpec,
            readiness,
            missingFields: readiness.missingFields,
            openQuestions: readiness.openQuestions,
            recentMessages: request.recentMessages,
          })
          .catch(() => ({
            question: readiness.openQuestions[0] ?? 'What decision would most change the first version?',
          })),
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
