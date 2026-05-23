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

type DeepSeekProviderOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

type CallDeepSeekJsonOptions<T> = {
  apiKey: string;
  model: string;
  prompt: string;
  schema: z.ZodType<T>;
  operationName: string;
  fetchImpl?: typeof fetch;
};

const deepSeekResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable(),
        }),
      }),
    )
    .min(1),
});

function parseJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(withoutFence);
}

function readDeepSeekText(data: unknown) {
  const parsed = deepSeekResponseSchema.parse(data);
  const content = parsed.choices[0].message.content;
  if (!content?.trim()) {
    throw new Error('DeepSeek returned empty content.');
  }
  return content;
}

export async function callDeepSeekJson<T>({
  apiKey,
  model,
  prompt,
  schema,
  operationName,
  fetchImpl = fetch,
}: CallDeepSeekJsonOptions<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Return valid json only. Do not include markdown fences.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 1200,
          stream: false,
          thinking: { type: 'disabled' },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const retryable = response.status >= 500 || response.status === 429;
        if (!retryable || attempt === 2) {
          throw new Error(`DeepSeek ${operationName} failed (${response.status}): ${detail || response.statusText}`);
        }
        throw new Error(`DeepSeek ${operationName} transient failure (${response.status})`);
      }

      const text = readDeepSeekText(await response.json());
      return schema.parse(parseJson(text));
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown DeepSeek response error';
  throw new Error(`DeepSeek ${operationName} returned invalid output: ${message}`);
}

export class DeepSeekLLMProvider implements LLMProvider {
  name = 'deepseek';

  private apiKey: string;
  private model: string;
  private fetchImpl?: typeof fetch;

  constructor({ apiKey, model = 'deepseek-v4-flash', fetchImpl }: DeepSeekProviderOptions) {
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek.');
    }

    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
  }

  async extractSpecUpdates(input: ExtractSpecUpdatesInput): Promise<ExtractSpecUpdatesOutput> {
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildExtractSpecUpdatesPrompt(input),
      schema: llmSpecPatchSchema,
      operationName: 'extractSpecUpdates',
      fetchImpl: this.fetchImpl,
    });
  }

  async proposeNextQuestion(input: ProposeNextQuestionInput): Promise<ProposeNextQuestionOutput> {
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildNextQuestionPrompt(input),
      schema: nextQuestionResponseSchema,
      operationName: 'proposeNextQuestion',
      fetchImpl: this.fetchImpl,
    });
  }

  async summarizeReadiness(input: SummarizeReadinessInput): Promise<SummarizeReadinessOutput> {
    return callDeepSeekJson({
      apiKey: this.apiKey,
      model: this.model,
      prompt: buildReadinessSummaryPrompt(input),
      schema: readinessSummaryResponseSchema,
      operationName: 'summarizeReadiness',
      fetchImpl: this.fetchImpl,
    });
  }
}
