import { getDomainPack } from './domainPacks';
import { chooseNextQuestion } from './questions';
import type { AssumptionRecord, BuildSpec, GovernorReadiness } from '../schema';

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function assessGovernorReadiness(spec: BuildSpec): GovernorReadiness {
  const pack = getDomainPack(spec);
  const conflicts = spec.conflicts?.filter((conflict) => conflict.status === 'unresolved') ?? [];
  const assumptions = spec.assumptionLedger ?? [];
  const packBlockers = pack.hardBlockers(spec);
  const assumptionBlockers = assumptions
    .filter((assumption) => assumption.askBeforeBuild)
    .map((assumption) => `Assumption needs confirmation: ${assumption.statement}`);
  const conflictBlockers = conflicts.map((conflict) => `Conflict on ${conflict.path} must be resolved before build.`);
  const hardBlockers = unique([...packBlockers, ...assumptionBlockers, ...conflictBlockers]);
  const softGaps = unique(
    pack.requiredFields
      .filter((path) => !hardBlockers.some((blocker) => blocker.includes(path.slice(1))))
      .map((path) => `${path.slice(1)} can use a safe default if needed.`),
  );
  const completed = Math.max(0, pack.requiredFields.length - packBlockers.length);
  const baseScore = Math.round((completed / Math.max(1, pack.requiredFields.length)) * 82);
  const assumptionPenalty = assumptions.filter((assumption) => assumption.risk === 'high').length * 8;
  const conflictPenalty = conflicts.length * 15;
  const score = Math.max(0, Math.min(100, baseScore - assumptionPenalty - conflictPenalty));
  let status: GovernorReadiness['status'] = 'needs_interview';

  if (hardBlockers.length > 0) status = 'blocked';
  else if (score >= 85 && assumptions.length === 0) status = 'ready';
  else if (score >= 75) status = 'ready_with_assumptions';

  return {
    score,
    status,
    hardBlockers,
    softGaps,
    assumptions,
    recommendedOutput: spec.outputType ?? pack.defaults['/outputType'] as GovernorReadiness['recommendedOutput'] ?? null,
  };
}

export function createAssumption(statement: string, basis: string, affectsBuild: string[], askBeforeBuild: boolean): AssumptionRecord {
  return {
    id: `assumption_${Math.random().toString(36).slice(2, 10)}`,
    statement,
    basis,
    risk: askBeforeBuild ? 'high' : 'medium',
    affectsBuild,
    askBeforeBuild,
    createdAt: new Date().toISOString(),
  };
}

export function nextGovernorQuestion(spec: BuildSpec) {
  const readiness = assessGovernorReadiness(spec);
  if (readiness.hardBlockers.length > 0) return chooseNextQuestion(spec);
  return chooseNextQuestion(spec);
}
