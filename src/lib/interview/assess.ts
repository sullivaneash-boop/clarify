import type { Assessment, AssessmentGap, BuildSpec } from './schema';

function hasValue(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isClearSimpleLanding(spec: BuildSpec) {
  return (
    spec.buildType === 'landing_page' &&
    Boolean(spec.mainGoal?.toLowerCase().includes('lead') || spec.coreFeatures.includes('Lead capture form'))
  );
}

function questionForGap(gap: AssessmentGap) {
  switch (gap) {
    case 'buildType':
      return 'What kind of thing is this: a landing page, client portal, internal dashboard, automation, spreadsheet, or something else?';
    case 'primaryUser':
      return 'Who is this primarily for: your internal team, your customers, or both?';
    case 'mainGoal':
      return 'What is the first action someone should be able to take when this works?';
    case 'coreFeatures':
      return 'What would make this first version useful even if it were simple?';
    case 'dataToTrack':
      return 'What information needs to be saved or tracked?';
    case 'loginConstraint':
      return 'Does this need accounts/login, or should the first version avoid that?';
    case 'outputType':
      return 'Should this produce a working prototype, a build prompt, an implementation plan, or a spreadsheet-style structure?';
    case 'designPreferences':
      return 'What should the interface feel like: premium, utilitarian, editorial, mobile-first, or something else?';
    case 'none':
      return '';
  }
}

function pickNextGap(spec: BuildSpec): AssessmentGap {
  if (spec.buildType === 'unknown') return 'buildType';
  if (!hasValue(spec.primaryUser)) return 'primaryUser';
  if (!hasValue(spec.mainGoal)) return 'mainGoal';
  if (spec.coreFeatures.length < 2 && !isClearSimpleLanding(spec)) return 'coreFeatures';
  if (!spec.outputType) return 'outputType';

  const likelyNeedsData =
    ['business_system', 'client_portal', 'automation', 'spreadsheet'].includes(spec.buildType) &&
    spec.dataToTrack.length === 0;
  if (likelyNeedsData) return 'dataToTrack';

  const mentionsLogin =
    spec.coreFeatures.some((feature) => feature.toLowerCase().includes('login')) ||
    spec.userRoles.length > 1 ||
    spec.buildType === 'client_portal';
  const hasLoginDecision = [...spec.technicalConstraints, ...spec.mustNotDo].some((item) =>
    item.toLowerCase().includes('login'),
  );
  if (mentionsLogin && !hasLoginDecision) return 'loginConstraint';

  if (spec.designPreferences.length === 0 && ['website', 'landing_page', 'client_portal'].includes(spec.buildType)) {
    return 'designPreferences';
  }

  return 'none';
}

export function assessSpec(spec: BuildSpec): Assessment {
  const hasBuildType = spec.buildType !== 'unknown';
  const hasGoal = hasValue(spec.mainGoal);
  const hasPrimaryUser = hasValue(spec.primaryUser);
  const hasFeatures = spec.coreFeatures.length >= 2 || isClearSimpleLanding(spec);
  const hasOutput = Boolean(spec.outputType);

  let score = 8;
  if (hasBuildType) score += 18;
  if (hasGoal) score += 22;
  if (hasPrimaryUser) score += 18;
  if (hasFeatures) score += 18;
  if (hasOutput) score += 18;
  if (spec.dataToTrack.length > 0) score += 4;
  if (spec.designPreferences.length > 0) score += 3;
  if (spec.technicalConstraints.length > 1 || spec.mustNotDo.length > 1) score += 3;
  if (spec.assumptions.length > 0) score += 2;

  const requiredFieldsComplete = hasBuildType && hasGoal && hasPrimaryUser && hasFeatures && hasOutput;
  const nextGap = requiredFieldsComplete ? pickNextGap(spec) : pickNextGap(spec);
  const openQuestions = nextGap === 'none' ? [] : [questionForGap(nextGap)];
  const boundedScore = Math.min(requiredFieldsComplete ? Math.max(score, 90) : score, 100);

  let reason = 'Not enough detail yet.';
  if (boundedScore >= 90) reason = 'Ready to confirm. The required decisions are clear enough for a first build package.';
  else if (boundedScore >= 70) reason = 'Almost ready. One or two decisions still materially affect the build.';
  else if (boundedScore >= 31) reason = 'Shaping the build. The direction is visible, but the next answer still changes scope.';

  return {
    readiness: {
      score: boundedScore,
      requiredFieldsComplete,
      reason,
    },
    nextGap,
    openQuestions,
    changedReason: reason,
  };
}
