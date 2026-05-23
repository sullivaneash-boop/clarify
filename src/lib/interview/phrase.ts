import type { Assessment, BuildSpec } from './schema';

export function phraseNextQuestion(assessment: Assessment, spec: BuildSpec) {
  const question = assessment.openQuestions[0] ?? 'I have enough to draft the build plan.';

  switch (assessment.nextGap) {
    case 'primaryUser':
      return {
        content: `${question}\n\nI’m asking because the answer changes permissions, navigation, data privacy, and what a useful first version means.`,
        tone: 'rationale',
      };
    case 'mainGoal':
      return {
        content: `${question}\n\nI’m asking because the first action becomes the spine of the interface, not just copy in a spec.`,
        tone: 'rationale',
      };
    case 'coreFeatures':
      return {
        content: `${question}\n\nI’ll keep this to the few features that decide the build shape, not a wishlist.`,
        tone: 'rationale',
      };
    case 'dataToTrack':
      return {
        content: `${question}\n\nI’m asking because stored data changes the model, screens, empty states, and export needs.`,
        tone: 'rationale',
      };
    case 'loginConstraint':
      return {
        content: `${question}\n\nI’m asking because customer login changes security, database structure, and build size.`,
        tone: 'rationale',
      };
    case 'outputType':
      return {
        content: `${question}\n\nThat choice decides whether I package this as a prototype plan, a coding prompt, or a structured operating artifact.`,
        tone: 'rationale',
      };
    case 'designPreferences':
      return {
        content: `${question}\n\nA small design decision now keeps the build prompt from producing something visually generic later.`,
        tone: 'rationale',
      };
    case 'buildType':
      return {
        content: question,
        tone: 'direct',
      };
    case 'none':
      return {
        content: `I have enough to draft the build plan for ${spec.projectName ?? 'this project'}. I’ll show the assumptions and exclusions before anything is “built.”`,
        tone: 'ready',
      };
  }
}
