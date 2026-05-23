import { buildDomainGaps } from './domainPacks';
import type { BuildSpec } from '../schema';
import type { CandidateGap } from './schemas';

const priorityBoost: Record<CandidateGap['category'], number> = {
  architecture: 8,
  auth: 8,
  data: 7,
  integrations: 7,
  workflow: 7,
  failure_behavior: 6,
  output_type: 8,
  scope: 4,
  cosmetic: -6,
};

export function scoreCandidateGap(gap: CandidateGap) {
  const safeDefaultPenalty = gap.canUseSafeDefault ? 3 : 0;
  return (
    gap.impactOnBuild * 3 +
    gap.riskIfWrong * 3 +
    gap.dependencyUnlockValue * 2 +
    gap.userUncertainty -
    gap.questionAnnoyance * 2 -
    safeDefaultPenalty +
    priorityBoost[gap.category]
  );
}

export function rankCandidateGaps(gaps: CandidateGap[]) {
  return gaps
    .map((gap) => ({ ...gap, score: scoreCandidateGap(gap) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function chooseNextQuestion(spec: BuildSpec) {
  const ranked = rankCandidateGaps(buildDomainGaps(spec));
  return ranked[0]?.question ?? null;
}
