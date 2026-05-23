import { z } from 'zod';

export const OnboardingStepZ = z.enum(['welcome', 'how-it-works', 'choose']);
export const StartingModeZ = z.enum(['sample', 'scratch']);
export const OutputTypeZ = z.enum(['prototype', 'build-package', 'prompt', 'undecided']);
export const UserContextZ = z.enum(['founder', 'agency', 'operator', 'developer', 'exploring']);

export const SpecFieldStatusZ = z.enum(['unknown', 'draft', 'confirmed']);

export const SpecFieldZ = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  status: SpecFieldStatusZ,
});

export const InterviewSeedZ = z.object({
  source: StartingModeZ,
  sampleId: z.string().optional(),
  initialPrompt: z.string(),
  partialSpec: z.array(SpecFieldZ),
  firstQuestion: z.string().nullable(),
  outputType: OutputTypeZ,
  userContext: UserContextZ.nullable(),
  createdAt: z.number(),
});

export type OnboardingStep = z.infer<typeof OnboardingStepZ>;
export type StartingMode = z.infer<typeof StartingModeZ>;
export type OutputType = z.infer<typeof OutputTypeZ>;
export type UserContext = z.infer<typeof UserContextZ>;
export type SpecField = z.infer<typeof SpecFieldZ>;
export type InterviewSeed = z.infer<typeof InterviewSeedZ>;

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: OnboardingStep;
  startingMode: StartingMode | null;
  selectedSampleId: string | null;
  selfDescribedContext: UserContext | null;
  selectedOutputType: OutputType;
  scratchPrompt: string;
  skippedSteps: OnboardingStep[];
  completedAt: number | null;
  displayName: string | null;
}

export interface SampleProject {
  id: string;
  title: string;
  oneLine: string;
  whatYoullSee: string;
  seed: Omit<InterviewSeed, 'createdAt'>;
}
