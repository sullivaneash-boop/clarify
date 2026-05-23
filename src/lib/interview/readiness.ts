import type { BuildSpec } from './schema';
import type { ReadinessAssessment } from '../llm/schemas';

const requiredFields = ['buildType', 'primaryUser', 'mainGoal', 'outputType'] as const;

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function fieldComplete(spec: BuildSpec, field: (typeof requiredFields)[number]) {
  if (field === 'buildType') return spec.buildType !== 'unknown';
  if (field === 'outputType') return Boolean(spec.outputType);
  return hasText(spec[field]);
}

function questionForMissingField(field: string) {
  switch (field) {
    case 'buildType':
      return 'What kind of thing are you trying to build: a website, internal system, spreadsheet, automation, client portal, or something else?';
    case 'primaryUser':
      return 'Who will use this most: you, your team, customers, clients, or someone else?';
    case 'mainGoal':
      return 'What is the main outcome this needs to create?';
    case 'outputType':
      return 'What do you want at the end: a build prompt, implementation plan, prototype, spreadsheet plan, or code files?';
    default:
      return 'What is the next decision that would change the build most?';
  }
}

export type AssessReadinessOptions = {
  turnCount?: number;
  maxTurns?: number;
};

export function getMissingRequiredFields(spec: BuildSpec) {
  return requiredFields.filter((field) => !fieldComplete(spec, field));
}

export function assessReadiness(spec: BuildSpec, options: AssessReadinessOptions = {}): ReadinessAssessment {
  const missingFields = getMissingRequiredFields(spec);
  const completedRequired = requiredFields.length - missingFields.length;
  const requiredScore = Math.round((completedRequired / requiredFields.length) * 76);
  let optionalScore = 0;

  if (spec.projectName) optionalScore += 3;
  if (spec.businessType) optionalScore += 3;
  if (spec.coreFeatures.length > 0) optionalScore += 5;
  if (spec.coreFeatures.length > 1) optionalScore += 4;
  if (spec.dataToTrack.length > 0) optionalScore += 3;
  if (spec.userRoles.length > 0) optionalScore += 2;
  if (spec.integrations.length > 0) optionalScore += 2;
  if (spec.designPreferences.length > 0) optionalScore += 2;

  const score = Math.min(100, requiredScore + optionalScore);
  const requiredFieldsComplete = missingFields.length === 0;
  const maxTurnsReached = (options.turnCount ?? 0) >= (options.maxTurns ?? 10);
  const openQuestions = missingFields.slice(0, 1).map(questionForMissingField);
  const blockingOpenQuestions = requiredFieldsComplete ? [] : openQuestions;

  let reason = 'Not enough detail yet.';
  if (requiredFieldsComplete && score >= 75) {
    reason = 'Ready to confirm. The required build decisions are clear enough for a first package.';
  } else if (score >= 50) {
    reason = 'The shape is visible, but one required decision still changes the build.';
  } else if (score >= 25) {
    reason = 'Clarify has a direction, but the build is not safe to confirm yet.';
  }

  if (maxTurnsReached && !requiredFieldsComplete) {
    reason = 'Maximum interview turns reached. Move to confirmation with assumptions instead of looping.';
  }

  return {
    score,
    requiredFieldsComplete,
    reason,
    missingFields,
    openQuestions,
    blockingOpenQuestions,
    maxTurnsReached,
  };
}

export function canConfirm(readiness: ReadinessAssessment) {
  if (readiness.maxTurnsReached) return true;
  return (
    readiness.requiredFieldsComplete &&
    readiness.score >= 75 &&
    readiness.blockingOpenQuestions.length === 0
  );
}
