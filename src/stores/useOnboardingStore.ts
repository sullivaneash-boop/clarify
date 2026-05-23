import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getSampleProject } from '../lib/onboarding/sampleProjects';
import {
  onboardingStorageKey,
  clearOnboardingStorage,
  clearSeed,
  writeSeed,
} from '../lib/onboarding/storage';
import { useInterviewStore } from './useInterviewStore';
import type {
  InterviewSeed,
  OnboardingState,
  OnboardingStep,
  OutputType,
  UserContext,
} from '../lib/onboarding/schema';

const stepOrder: OnboardingStep[] = ['welcome', 'how-it-works', 'choose'];

type OnboardingActions = {
  goTo: (step: OnboardingStep) => void;
  back: () => void;
  selectSample: (id: string) => void;
  setScratchPrompt: (text: string) => void;
  setContext: (context: UserContext) => void;
  setOutputType: (type: OutputType) => void;
  completeWithSample: (id: string) => void;
  completeWithScratch: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
};

const defaultState = (): OnboardingState => ({
  hasCompletedOnboarding: false,
  currentStep: 'welcome',
  startingMode: null,
  selectedSampleId: null,
  selfDescribedContext: null,
  selectedOutputType: 'undecided',
  scratchPrompt: '',
  skippedSteps: [],
  completedAt: null,
  displayName: null,
});

function completeState(state: OnboardingState): Partial<OnboardingState> {
  return {
    hasCompletedOnboarding: true,
    completedAt: Date.now(),
    skippedSteps: state.skippedSteps,
  };
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...defaultState(),

      goTo: (step) => set({ currentStep: step }),

      back: () => {
        const state = get();
        const currentIndex = stepOrder.indexOf(state.currentStep);
        set({ currentStep: stepOrder[Math.max(0, currentIndex - 1)] });
      },

      selectSample: (id) =>
        set({
          startingMode: 'sample',
          selectedSampleId: id,
        }),

      setScratchPrompt: (text) =>
        set({
          scratchPrompt: text,
          startingMode: text.trim().length > 0 ? 'scratch' : get().startingMode,
        }),

      setContext: (context) => set({ selfDescribedContext: context }),

      setOutputType: (type) => set({ selectedOutputType: type }),

      completeWithSample: (id) => {
        const sample = getSampleProject(id);
        if (!sample) return;

        const state = get();
        const seed: InterviewSeed = {
          ...sample.seed,
          outputType: state.selectedOutputType,
          userContext: state.selfDescribedContext,
          createdAt: Date.now(),
        };

        writeSeed(seed);
        set({
          ...completeState(state),
          startingMode: 'sample',
          selectedSampleId: id,
        });
      },

      completeWithScratch: () => {
        const state = get();
        const initialPrompt = state.scratchPrompt.trim();
        if (!initialPrompt) return;

        const seed: InterviewSeed = {
          source: 'scratch',
          initialPrompt,
          partialSpec: [],
          firstQuestion: null,
          outputType: state.selectedOutputType,
          userContext: state.selfDescribedContext,
          createdAt: Date.now(),
        };

        writeSeed(seed);
        set({
          ...completeState(state),
          startingMode: 'scratch',
        });
      },

      skipOnboarding: () => {
        const state = get();
        clearSeed();
        useInterviewStore.getState().resetPrototype();
        set({
          ...completeState({
            ...state,
            skippedSteps: Array.from(new Set([...state.skippedSteps, state.currentStep])),
          }),
          startingMode: null,
          selectedSampleId: null,
        });
      },

      resetOnboarding: () => {
        clearOnboardingStorage();
        set(defaultState());
      },
    }),
    {
      name: onboardingStorageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        currentStep: state.currentStep,
        startingMode: state.startingMode,
        selectedSampleId: state.selectedSampleId,
        selfDescribedContext: state.selfDescribedContext,
        selectedOutputType: state.selectedOutputType,
        scratchPrompt: state.scratchPrompt,
        skippedSteps: state.skippedSteps,
        completedAt: state.completedAt,
        displayName: state.displayName,
      }),
    },
  ),
);
