import { z } from 'npm:zod@3.24.1';

type CallGeminiJsonOptions<T> = {
  apiKey: string;
  model: string;
  prompt: string;
  schema: z.ZodType<T>;
  operationName: string;
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
  return JSON.parse(
    text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim(),
  );
}

export async function callGeminiJson<T>({
  apiKey,
  model,
  prompt,
  schema,
  operationName,
}: CallGeminiJsonOptions<T>): Promise<T> {
  let lastError: unknown;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
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
