import { z } from 'zod';
import {
  buildExtractSpecUpdatesPrompt,
  buildNextQuestionPrompt,
  buildReadinessSummaryPrompt,
} from '../interview/prompts';
import type { LLMProvider } from './provider';
import {
  llmSpecPatchSchema,
  nextQuestionResponseSchema,
  readinessSummaryResponseSchema,
  type ExtractSpecUpdatesInput,
  type ExtractSpecUpdatesOutput,
  type ProposeNextQuestionInput,
  type ProposeNextQuestionOutput,
  type SummarizeReadinessInput,
  type SummarizeReadinessOutput,
} from './schemas';

type GeminiProviderOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

type CallGeminiJsonOptions<T> = {
  apiKey: string;
  model: string;
  prompt: string;
  schema: z.ZodType<T>;
  operationName: string;
  fetchImpl?: typeof fetch;
};

function readGeminiText(data: unknown) {
  const parsed = z
    .object({
      candidates: z
        .array(
          z.object({
            content: z.object({
              parts: z.array(z.object({ text: z.string() })),
            }),
          }),
        )
        .min(1),
    })
    .parse(data);

  return parsed.candidates[0].content.parts.map((part) => part.text).join('\n');
}

function parseJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(withoutFence);
}

export async function callGeminiJson<T>({
  apiKey,
  model,
  prompt,
  schema,
  operationName,
  fetchImpl = fetch,
}: CallGeminiJsonOptions<T>): Promise<T> {
  let lastError: unknown;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const retryable = response.status >= 500 || response.status === 429;
        if (!retryable || attempt === 2) {
          throw new Error(`Gemini ${operationName} failed (${response.status}): ${detail || response.statusText}`);
        }
        throw new Error(`Gemini ${operationName} transient failure (${response.status})`);
      }

      const text = readGeminiText(await response.json());
      return schema.parse(parseJson(text));
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown Gemini response error';
  throw new Error(`Gemini ${operationName} returned invalid output: ${message}`);
}

export class GeminiLLMProvider implements LLMProvider {
  name = 'gemini';

  private apiKey: string;
  private model: string;
  private fetchImpl?: typeof fetch;

  constructor({ apiKey, model = 'gemini-2.5-flash', fetchImpl }: GeminiProviderOptions) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER=gemini.');
    }

    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
  }

  async extractSpecUpdates(input: ExtractSpecUpdatesInput): Promise<ExtractSpecUpdatesOutput> {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildExtractSpecUpdatesPrompt(input),
      schema: llmSpecPatchSchema,
      operationName: 'extractSpecUpdates',
      fetchImpl: this.fetchImpl,
    });
  }

  async proposeNextQuestion(input: ProposeNextQuestionInput): Promise<ProposeNextQuestionOutput> {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildNextQuestionPrompt(input),
      schema: nextQuestionResponseSchema,
      operationName: 'proposeNextQuestion',
      fetchImpl: this.fetchImpl,
    });
  }

  async summarizeReadiness(input: SummarizeReadinessInput): Promise<SummarizeReadinessOutput> {
    return callGeminiJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildReadinessSummaryPrompt(input),
      schema: readinessSummaryResponseSchema,
      operationName: 'summarizeReadiness',
      fetchImpl: this.fetchImpl,
    });
  }
}
