import type {
  ExtractSpecUpdatesInput,
  ExtractSpecUpdatesOutput,
  ProposeNextQuestionInput,
  ProposeNextQuestionOutput,
  SummarizeReadinessInput,
  SummarizeReadinessOutput,
} from './schemas';

export type LLMProvider = {
  name: string;
  extractSpecUpdates(input: ExtractSpecUpdatesInput): Promise<ExtractSpecUpdatesOutput>;
  proposeNextQuestion(input: ProposeNextQuestionInput): Promise<ProposeNextQuestionOutput>;
  summarizeReadiness(input: SummarizeReadinessInput): Promise<SummarizeReadinessOutput>;
};
