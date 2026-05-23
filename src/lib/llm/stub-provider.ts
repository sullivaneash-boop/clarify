import { extractSpecPatch } from '../interview/extract';
import type { LLMProvider } from './provider';
import type {
  ExtractSpecUpdatesInput,
  ExtractSpecUpdatesOutput,
  ProposeNextQuestionInput,
  ProposeNextQuestionOutput,
  SummarizeReadinessInput,
  SummarizeReadinessOutput,
} from './schemas';

function stripPatch(patch: ReturnType<typeof extractSpecPatch>): ExtractSpecUpdatesOutput {
  return {
    operations: patch.operations,
    summary: patch.summary,
  };
}

function inferFallbackPatch(input: ExtractSpecUpdatesInput): ExtractSpecUpdatesOutput {
  const text = input.latestUserMessage.toLowerCase();
  const operations: ExtractSpecUpdatesOutput['operations'] = [];

  if (text.includes('client portal') || text.includes('portal')) {
    operations.push({ op: 'set', path: '/buildType', value: 'client_portal', confidence: 0.84 });
  } else if (text.includes('spreadsheet') || text.includes('sheet')) {
    operations.push({ op: 'set', path: '/buildType', value: 'spreadsheet', confidence: 0.82 });
  } else if (text.includes('automation') || text.includes('workflow')) {
    operations.push({ op: 'set', path: '/buildType', value: 'automation', confidence: 0.82 });
  } else if (text.includes('website') || text.includes('landing page')) {
    operations.push({ op: 'set', path: '/buildType', value: 'website', confidence: 0.78 });
  }

  if (text.includes('customer') || text.includes('client')) {
    operations.push({ op: 'set', path: '/primaryUser', value: 'Customers/clients', confidence: 0.78 });
  } else if (text.includes('team') || text.includes('internal') || text.includes('employee')) {
    operations.push({ op: 'set', path: '/primaryUser', value: 'Internal team', confidence: 0.78 });
  }

  if (text.includes('detailing')) {
    operations.push({ op: 'set', path: '/businessType', value: 'detailing business', confidence: 0.74 });
  }

  if (text.includes('request service') || text.includes('request services') || text.includes('services')) {
    operations.push({
      op: 'set',
      path: '/mainGoal',
      value: 'Let customers request services clearly.',
      confidence: 0.74,
    });
    operations.push({ op: 'append', path: '/coreFeatures', value: ['Service request flow'], confidence: 0.7 });
  }

  return {
    operations,
    summary: operations.length > 0 ? 'Stub extracted obvious supported fields.' : 'Stub found no obvious supported fields.',
  };
}

export class StubLLMProvider implements LLMProvider {
  name = 'stub';

  async extractSpecUpdates(input: ExtractSpecUpdatesInput): Promise<ExtractSpecUpdatesOutput> {
    const patch = stripPatch(
      extractSpecPatch(input.latestUserMessage, input.currentSpec, {
        sourceMessageId: 'stub-provider',
      }),
    );

    if (patch.operations.length > 0) return patch;
    return inferFallbackPatch(input);
  }

  async proposeNextQuestion(input: ProposeNextQuestionInput): Promise<ProposeNextQuestionOutput> {
    const missing = input.missingFields[0];

    if (missing === 'buildType') {
      return {
        question:
          'What kind of thing are you trying to build: a website, internal system, spreadsheet, automation, client portal, or something else?',
      };
    }

    if (missing === 'primaryUser') {
      return {
        question: 'Who will use this most: you, your team, customers, clients, or someone else?',
      };
    }

    if (missing === 'mainGoal') {
      return {
        question: 'What is the main outcome this needs to create?',
      };
    }

    if (missing === 'outputType') {
      return {
        question:
          'What do you want at the end: a build prompt, implementation plan, prototype, spreadsheet plan, or code files?',
        rationale: 'That choice changes how I package the result and how much implementation detail to include.',
      };
    }

    return {
      question: input.openQuestions[0] ?? 'What decision would most change the first version?',
    };
  }

  async summarizeReadiness(input: SummarizeReadinessInput): Promise<SummarizeReadinessOutput> {
    const spec = input.currentSpec;
    const excluded =
      spec.mustNotDo.length > 0
        ? spec.mustNotDo.join(', ')
        : 'paid services, secrets, real auth, billing, and production integrations';
    const assumptions =
      input.assumptions.length > 0 ? input.assumptions.join(', ') : 'no extra assumptions beyond the current spec';

    return {
      summary: `Here is the build plan: a ${spec.buildType.replace(/_/g, ' ')} for ${
        spec.primaryUser ?? 'the primary user'
      } that helps with ${spec.mainGoal ?? 'the main outcome'}. This first version will not include ${excluded}. Assumptions: ${assumptions}. The main tradeoff is keeping the first package specific enough to build without adding production services yet.`,
    };
  }
}
