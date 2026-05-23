import { StubLLMProvider } from '../llm/stub-provider';
import {
  interviewTurnRequestSchema,
  interviewTurnResponseSchema,
  type InterviewTurnRequest,
  type InterviewTurnResponse,
} from '../llm/schemas';
import { processInterviewTurn } from './controller';

const stubProvider = new StubLLMProvider();

function getSupabaseConfig() {
  const env = import.meta.env;
  return {
    url: env.VITE_SUPABASE_URL as string | undefined,
    anonKey: env.VITE_SUPABASE_ANON_KEY as string | undefined,
  };
}

async function runLocalStubInterviewTurn(request: InterviewTurnRequest): Promise<InterviewTurnResponse> {
  return processInterviewTurn({
    sessionId: request.sessionId,
    message: request.message,
    currentSpec: request.currentSpec,
    recentMessages: request.recentMessages,
    turnCount: request.turnCount,
    provider: stubProvider,
  });
}

export async function runInterviewTurn(request: InterviewTurnRequest): Promise<InterviewTurnResponse> {
  const validatedRequest = interviewTurnRequestSchema.parse(request);
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return runLocalStubInterviewTurn(validatedRequest);
  }

  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/interview-turn`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(validatedRequest),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Interview turn failed (${response.status}): ${detail || response.statusText}`);
  }

  return interviewTurnResponseSchema.parse(await response.json());
}
