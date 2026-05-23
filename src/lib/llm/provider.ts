import type {
  ExtractSpecUpdatesInput,
  ExtractSpecUpdatesOutput,
  ProposeNextQuestionInput,
  ProposeNextQuestionOutput,
  SummarizeReadinessInput,
  SummarizeReadinessOutput,
  OrchestrateInterviewTurnInput,
  OrchestrateInterviewTurnOutput,
} from './schemas';

export type LLMProvider = {
  name: string;
  extractSpecUpdates(input: ExtractSpecUpdatesInput): Promise<ExtractSpecUpdatesOutput>;
  proposeNextQuestion(input: ProposeNextQuestionInput): Promise<ProposeNextQuestionOutput>;
  summarizeReadiness(input: SummarizeReadinessInput): Promise<SummarizeReadinessOutput>;
  orchestrateInterviewTurn?(input: OrchestrateInterviewTurnInput): Promise<OrchestrateInterviewTurnOutput>;
};
