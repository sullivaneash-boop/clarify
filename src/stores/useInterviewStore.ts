import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateResultArtifact } from '../lib/interview/buildArtifact';
import { runInterviewTurn } from '../lib/interview/api';
import { processUserTurn } from '../lib/interview/controller';
import {
  buildStepTemplates,
  createEmptySpec,
  type BuildJob,
  type BuildSpec,
  type InterviewMessage,
  type InterviewPhase,
  type ResultArtifact,
} from '../lib/interview/schema';
import { createId } from '../lib/utils/ids';
import { storageKeys } from '../lib/utils/storage';
import { assessSpec } from '../lib/interview/assess';
import type { InterviewSeed } from '../lib/onboarding/schema';

export type ResultTab = 'overview' | 'prompt' | 'plan' | 'files' | 'spec';
export type SaveStatus = 'saved' | 'saving' | 'error';

type InterviewState = {
  phase: InterviewPhase;
  messages: InterviewMessage[];
  activeSpec: BuildSpec;
  changedPaths: string[];
  composerValue: string;
  isSending: boolean;
  buildJob: BuildJob | null;
  artifact: ResultArtifact | null;
  selectedResultTab: ResultTab;
  saveStatus: SaveStatus;
  providerLabel: string;
  lastPatchSummary: string | null;
  error: string | null;
  isSpecSheetOpen: boolean;
};

type InterviewActions = {
  setComposerValue: (value: string) => void;
  seedComposer: (value: string) => void;
  submitComposer: () => void;
  sendMessage: (content: string, mode?: 'interview' | 'iteration') => void;
  returnToInterview: (intent: 'change' | 'simplify' | 'advanced') => void;
  beginBuild: () => void;
  advanceBuildJob: () => void;
  setSelectedResultTab: (tab: ResultTab) => void;
  submitIterationFeedback: (feedback: string) => void;
  setSpecSheetOpen: (open: boolean) => void;
  startFromSeed: (seed: InterviewSeed) => void;
  resetPrototype: () => void;
};

const assistantIntro =
  'Good. I’ll keep this focused: one question at a time, only when the answer changes what should be built.';
const workspaceEntryHint =
  'Clarify asks one question at a time. Answer honestly - "I don\'t know yet" is a valid answer, and a useful one.';

function createMessage(role: InterviewMessage['role'], content: string, status: InterviewMessage['status'] = 'complete') {
  return {
    id: createId('msg'),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  };
}

function createBuildJob(specId: string): BuildJob {
  const now = new Date().toISOString();
  return {
    id: createId('job'),
    specId,
    status: 'running',
    activeStep: 0,
    steps: buildStepTemplates.map((step, index) => ({
      id: createId('step'),
      label: step.label,
      detail: step.detail,
      status: index === 0 ? 'running' : 'queued',
    })),
    artifactId: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

function splitSpecList(value: string) {
  return value
    .split(/,|\+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueChangedPaths(paths: string[]) {
  return Array.from(new Set(paths));
}

function outputTypeFromSeed(seed: InterviewSeed): BuildSpec['outputType'] {
  if (seed.outputType === 'prototype') return 'prototype';
  if (seed.outputType === 'build-package' || seed.outputType === 'prompt') return 'build_prompt';
  return null;
}

function buildTypeFromSeed(seed: InterviewSeed): BuildSpec['buildType'] {
  if (seed.sampleId === 'local-service') return 'landing_page';
  if (seed.sampleId === 'client-portal') return 'client_portal';
  if (seed.sampleId === 'lead-cleanup') return 'spreadsheet';
  return 'unknown';
}

function mergeSeedIntoSpec(seed: InterviewSeed): { spec: BuildSpec; changedPaths: string[] } {
  const spec = createEmptySpec();
  const changedPaths = new Set<string>(['/openQuestions', '/readiness']);
  const unknowns: string[] = [];

  spec.buildType = buildTypeFromSeed(seed);
  if (spec.buildType !== 'unknown') changedPaths.add('/buildType');
  spec.outputType = outputTypeFromSeed(seed);
  if (spec.outputType) changedPaths.add('/outputType');

  for (const field of seed.partialSpec) {
    const label = field.label.toLowerCase();

    if (label === 'goal') {
      spec.mainGoal = field.value;
      changedPaths.add('/mainGoal');
      continue;
    }

    if (label === 'primary user') {
      spec.primaryUser = field.value;
      changedPaths.add('/primaryUser');
      continue;
    }

    if (label === 'core surfaces') {
      spec.coreFeatures = Array.from(new Set([...spec.coreFeatures, ...splitSpecList(field.value)]));
      changedPaths.add('/coreFeatures');
      continue;
    }

    if (field.status === 'unknown') {
      unknowns.push(`${field.label}: ${field.value}`);
    }
  }

  if (seed.sampleId === 'local-service') {
    spec.dataToTrack = ['Bookings', 'Packages', 'Customer contact details'];
    spec.designPreferences = ['Local service landing page', 'Clear booking flow'];
    changedPaths.add('/dataToTrack');
    changedPaths.add('/designPreferences');
  }

  if (seed.sampleId === 'client-portal') {
    spec.dataToTrack = ['Projects', 'Invoices', 'Files', 'Client accounts'];
    spec.userRoles = ['Admin', 'Client'];
    spec.designPreferences = ['Professional', 'Self-serve client view'];
    changedPaths.add('/dataToTrack');
    changedPaths.add('/userRoles');
    changedPaths.add('/designPreferences');
  }

  if (seed.sampleId === 'lead-cleanup') {
    spec.dataToTrack = ['Leads', 'Duplicate candidates', 'Cleanup decisions'];
    spec.coreFeatures = Array.from(new Set([...spec.coreFeatures, 'Export clean list']));
    spec.designPreferences = ['Spreadsheet-friendly', 'Review before applying changes'];
    changedPaths.add('/dataToTrack');
    changedPaths.add('/coreFeatures');
    changedPaths.add('/designPreferences');
  }

  if (unknowns.length > 0) {
    spec.assumptions = unknowns;
    changedPaths.add('/assumptions');
  }

  if (seed.firstQuestion) {
    spec.openQuestions = [seed.firstQuestion];
  }

  const assessment = assessSpec(spec);
  spec.readiness = {
    ...assessment.readiness,
    score: Math.min(assessment.readiness.score, 68),
    requiredFieldsComplete: false,
    reason: 'Seeded from onboarding. One expensive unknown is intentionally left open.',
  };
  spec.openQuestions = seed.firstQuestion ? [seed.firstQuestion] : assessment.openQuestions;
  spec.updatedAt = new Date().toISOString();

  return { spec, changedPaths: Array.from(changedPaths) };
}

const initialState = (): InterviewState => ({
  phase: 'intake',
  messages: [],
  activeSpec: createEmptySpec(),
  changedPaths: [],
  composerValue: '',
  isSending: false,
  buildJob: null,
  artifact: null,
  selectedResultTab: 'overview',
  saveStatus: 'saved',
  providerLabel: 'stub',
  lastPatchSummary: null,
  error: null,
  isSpecSheetOpen: false,
});

export const useInterviewStore = create<InterviewState & InterviewActions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setComposerValue: (value) => set({ composerValue: value, saveStatus: 'saving' }),

      seedComposer: (value) => set({ composerValue: value }),

      submitComposer: () => {
        const value = get().composerValue.trim();
        if (!value || get().isSending) return;
        get().sendMessage(value);
      },

      sendMessage: (content, mode = 'interview') => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const state = get();
        const userMessage = createMessage('user', trimmed);
        const shouldShowIntro = state.messages.length === 0;

        set({
          phase: mode === 'iteration' ? state.phase : 'interview',
          messages: [...state.messages, userMessage],
          composerValue: '',
          isSending: true,
          saveStatus: 'saving',
          error: null,
        });

        void (async () => {
          try {
            const current = get();
            const response = await runInterviewTurn({
              sessionId: current.activeSpec.id,
              message: trimmed,
              currentSpec: current.activeSpec,
              recentMessages: current.messages,
              turnCount: current.messages.filter((message) => message.role === 'user').length,
            });
            const assistantContent = shouldShowIntro
              ? `${assistantIntro}\n\n${response.assistantMessage.content}`
              : response.assistantMessage.content;
            const assistantMessage: InterviewMessage = {
              id: createId('msg'),
              role: 'assistant',
              content: assistantContent,
              createdAt: response.assistantMessage.createdAt,
              status: 'complete',
            };
            set({
              activeSpec: response.updatedSpec,
              changedPaths: uniqueChangedPaths([
                ...response.specPatch.operations.map((operation) => operation.path),
                '/readiness',
                '/openQuestions',
              ]),
              messages: [...current.messages, assistantMessage],
              phase: mode === 'iteration' ? current.phase : response.nextPhase,
              isSending: false,
              saveStatus: 'saved',
              providerLabel: response.provider ?? 'edge',
              lastPatchSummary: response.specPatch.summary,
              error: null,
            });
          } catch (error) {
            const current = get();
            const message = error instanceof Error ? error.message : 'The interview turn failed.';
            set({
              messages: [
                ...current.messages,
                createMessage(
                  'assistant',
                  `I could not process that turn. ${message}`,
                  'failed',
                ),
              ],
              isSending: false,
              saveStatus: 'error',
              error: message,
            });
          }
        })();
      },

      returnToInterview: (intent) => {
        const state = get();
        const messageByIntent = {
          change: 'Tell me what you want to change. I’ll preserve the current spec and only update the parts you contradict.',
          simplify:
            'Let’s simplify it. What should be removed, deferred, or made manual in the first version?',
          advanced:
            'We can make it more advanced, but I’ll call out the complexity. What capability should be added first?',
        };
        const assumptionByIntent = {
          change: null,
          simplify: 'Prefer the smallest useful first version before expanding scope.',
          advanced: 'User is considering a more advanced version; added scope should be justified before build.',
        };
        const assumption = assumptionByIntent[intent];
        const spec = assumption
          ? {
              ...state.activeSpec,
              assumptions: Array.from(new Set([...state.activeSpec.assumptions, assumption])),
              updatedAt: new Date().toISOString(),
            }
          : state.activeSpec;

        set({
          phase: 'interview',
          activeSpec: spec,
          changedPaths: assumption ? ['/assumptions'] : [],
          messages: [...state.messages, createMessage('assistant', messageByIntent[intent])],
          saveStatus: 'saved',
        });
      },

      beginBuild: () => {
        const job = createBuildJob(get().activeSpec.id);
        set({
          phase: 'building',
          buildJob: job,
          selectedResultTab: 'overview',
          changedPaths: [],
          error: null,
          saveStatus: 'saved',
        });
      },

      advanceBuildJob: () => {
        const state = get();
        const job = state.buildJob;
        if (!job || job.status !== 'running') return;

        const now = new Date().toISOString();
        const nextActiveStep = job.activeStep + 1;

        if (nextActiveStep >= job.steps.length) {
          const completeJob: BuildJob = {
            ...job,
            status: 'complete',
            activeStep: job.steps.length - 1,
            steps: job.steps.map((step) => ({ ...step, status: 'complete' })),
            updatedAt: now,
          };
          const artifact = generateResultArtifact(state.activeSpec, completeJob);
          set({
            phase: 'result',
            buildJob: { ...completeJob, artifactId: artifact.id },
            artifact,
            selectedResultTab: 'overview',
            saveStatus: 'saved',
          });
          return;
        }

        set({
          buildJob: {
            ...job,
            activeStep: nextActiveStep,
            steps: job.steps.map((step, index) => {
              if (index < nextActiveStep) return { ...step, status: 'complete' };
              if (index === nextActiveStep) return { ...step, status: 'running' };
              return { ...step, status: 'queued' };
            }),
            updatedAt: now,
          },
          saveStatus: 'saved',
        });
      },

      setSelectedResultTab: (tab) => set({ selectedResultTab: tab }),

      submitIterationFeedback: (feedback) => {
        const trimmed = feedback.trim();
        if (!trimmed) return;

        const state = get();
        const userMessage = createMessage('user', trimmed);

        try {
          const result = processUserTurn(state.activeSpec, trimmed, userMessage.id, 'iteration');
          const updatedSpec = result.spec;
          const job =
            state.buildJob ??
            ({
              ...createBuildJob(updatedSpec.id),
              status: 'complete',
            } satisfies BuildJob);
          const artifact = result.assessment.readiness.requiredFieldsComplete
            ? generateResultArtifact(updatedSpec, job, trimmed)
            : state.artifact;
          const assistantMessage = createMessage(
            'assistant',
            result.assessment.readiness.requiredFieldsComplete
              ? 'I updated the package against that feedback and preserved the existing spec decisions that still apply.'
              : result.assistantContent,
          );

          set({
            activeSpec: updatedSpec,
            changedPaths: result.changedPaths,
            messages: [...state.messages, userMessage, assistantMessage],
            artifact,
            phase: result.assessment.readiness.requiredFieldsComplete ? 'result' : 'interview',
            selectedResultTab: artifact ? 'overview' : state.selectedResultTab,
            saveStatus: 'saved',
          });
        } catch (error) {
          set({
            phase: 'error',
            error: error instanceof Error ? error.message : 'The iteration could not be applied locally.',
            saveStatus: 'error',
          });
        }
      },

      setSpecSheetOpen: (open) => set({ isSpecSheetOpen: open }),

      startFromSeed: (seed) => {
        if (seed.source === 'scratch') {
          const baseSpec = createEmptySpec();
          const userMessage = createMessage('user', seed.initialPrompt);
          const result = processUserTurn(baseSpec, seed.initialPrompt, userMessage.id, 'interview');
          const assistantMessage = createMessage('assistant', `${workspaceEntryHint}\n\n${result.assistantContent}`);

          set({
            ...initialState(),
            phase: result.nextPhase,
            activeSpec: result.spec,
            changedPaths: result.changedPaths,
            messages: [userMessage, assistantMessage],
            providerLabel: 'stub',
            lastPatchSummary: 'Started from scratch onboarding seed.',
            saveStatus: 'saved',
          });
          return;
        }

        const { spec, changedPaths } = mergeSeedIntoSpec(seed);
        const userMessage = createMessage('user', seed.initialPrompt);
        const assistantMessage = createMessage(
          'assistant',
          `${workspaceEntryHint}\n\n${seed.firstQuestion ?? 'I have enough to start shaping the build. What should change first?'}`,
        );

        set({
          ...initialState(),
          phase: 'interview',
          activeSpec: spec,
          changedPaths,
          messages: [userMessage, assistantMessage],
          providerLabel: 'stub',
          lastPatchSummary: 'Started from sample onboarding seed.',
          saveStatus: 'saved',
        });
      },

      resetPrototype: () => set(initialState()),
    }),
    {
      name: storageKeys.interview,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        phase: state.phase,
        messages: state.messages,
        activeSpec: state.activeSpec,
        changedPaths: state.changedPaths,
        buildJob: state.buildJob,
        artifact: state.artifact,
        selectedResultTab: state.selectedResultTab,
        saveStatus: state.saveStatus,
        providerLabel: state.providerLabel,
        lastPatchSummary: state.lastPatchSummary,
      }),
    },
  ),
);
