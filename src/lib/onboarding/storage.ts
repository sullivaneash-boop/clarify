import { InterviewSeedZ, type InterviewSeed } from './schema';

export const onboardingStorageKey = 'specforge.onboarding.v1';
export const interviewSeedStorageKey = 'specforge.interview.seed';

export function writeSeed(seed: InterviewSeed) {
  localStorage.setItem(interviewSeedStorageKey, JSON.stringify(seed));
}

export function readSeed(): InterviewSeed | null {
  const rawSeed = localStorage.getItem(interviewSeedStorageKey);
  if (!rawSeed) return null;

  try {
    return InterviewSeedZ.parse(JSON.parse(rawSeed));
  } catch {
    clearSeed();
    return null;
  }
}

export function clearSeed() {
  localStorage.removeItem(interviewSeedStorageKey);
}

export function clearOnboardingStorage() {
  localStorage.removeItem(onboardingStorageKey);
  clearSeed();
}
