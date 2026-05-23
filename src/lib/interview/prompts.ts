import type {
  ExtractSpecUpdatesInput,
  ProposeNextQuestionInput,
  SummarizeReadinessInput,
} from '../llm/schemas';

const productRules = `
Clarify is an interview-first build planning tool.
The app owns state, readiness, stopping rules, and spec merging.
The model only helps with language tasks.
Never invent facts.
Never decide app flow.
Ask before building.
`;

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildExtractSpecUpdatesPrompt(input: ExtractSpecUpdatesInput) {
  return `${productRules}

Task: Extract a SpecPatch from the latest user message.

Rules:
- Return a SpecPatch only.
- Only include updates clearly supported by the user's answer.
- Never invent values.
- Do not overwrite existing fields unless the user explicitly corrects them.
- Use confidence between 0 and 1.
- Use root JSON pointer paths like "/buildType", "/primaryUser", "/mainGoal", "/outputType".
- For "/buildType", value must be one of: "business_system", "website", "spreadsheet", "automation", "client_portal", "landing_page", "unknown".
- For "/outputType", value must be one of: "implementation_plan", "build_prompt", "prototype", "spreadsheet", "code_files".
- Do not put product categories like "client portal" or "internal dashboard" in "/outputType"; those belong in "/buildType" if clearly supported.
- Output JSON matching this shape only:
{
  "operations": [
    { "op": "set|append|remove|replace", "path": "/fieldName", "value": "...", "confidence": 0.8 }
  ],
  "summary": "short summary"
}

Current spec:
${json(input.currentSpec)}

Recent messages:
${json(input.recentMessages.slice(-6))}

Latest user message:
${input.latestUserMessage}`;
}

export function buildNextQuestionPrompt(input: ProposeNextQuestionInput) {
  return `${productRules}

Task: Propose the next useful interview question.

Rules:
- Ask one question only.
- Ask the question that most changes the build.
- Explain why only when useful.
- No jargon.
- No fake enthusiasm.
- No "great idea!"
- Do not ask for trivia.
- Output JSON matching this shape only:
{
  "question": "one plain-English question",
  "rationale": "optional short rationale or null"
}

Current spec:
${json(input.currentSpec)}

Readiness:
${json(input.readiness)}

Missing fields:
${json(input.missingFields)}

Open questions:
${json(input.openQuestions)}

Recent messages:
${json(input.recentMessages.slice(-6))}`;
}

export function buildReadinessSummaryPrompt(input: SummarizeReadinessInput) {
  return `${productRules}

Task: Write a concise confirmation summary.

Rules:
- Plain English.
- Include what will be built.
- Include what will not be included yet.
- Include assumptions.
- Include tradeoffs.
- Do not oversell.
- Output JSON matching this shape only:
{
  "summary": "concise confirmation summary"
}

Current spec:
${json(input.currentSpec)}

Readiness:
${json(input.readiness)}

Assumptions:
${json(input.assumptions)}`;
}
