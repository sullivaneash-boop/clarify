import { z } from 'npm:zod@3.24.1';

type CallDeepSeekJsonOptions<T> = {
  apiKey: string;
  model: string;
  prompt: string;
  schema: z.ZodType<T>;
  operationName: string;
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

function readDeepSeekText(data: unknown) {
  const parsed = deepSeekResponseSchema.parse(data);
  const content = parsed.choices[0].message.content;
  if (!content?.trim()) {
    throw new Error('DeepSeek returned empty content.');
  }
  return content;
}

function parseJson(text: string) {
  return JSON.parse(
    text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim(),
  );
}

export async function callDeepSeekJson<T>({
  apiKey,
  model,
  prompt,
  schema,
  operationName,
}: CallDeepSeekJsonOptions<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
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
