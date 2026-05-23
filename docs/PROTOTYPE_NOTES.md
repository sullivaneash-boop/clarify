# Clarify Prototype Notes

## Architecture Overview

The app is a local Vite React TypeScript prototype. React components render the product flow, Zustand owns client state, and the interview engine in `src/lib/interview` is stateless so it can be replaced by real backend services later.

Core flow:

- `intake`: collect rough user intent.
- `interview`: ask one material question at a time.
- `confirm`: show a paper-style build plan before packaging.
- `building`: run deterministic staged progress.
- `result`: show the generated build package.
- `iterate`: apply plain-English feedback without starting over.
- `error`: show recoverable local engine failures.

## Local Interview Engine

The local engine is split into small modules:

- `schema.ts`: Zod contracts and TypeScript types.
- `extract.ts`: deterministic heuristics that turn answers into spec patch operations.
- `patches.ts`: applies `set`, `append`, `remove`, and `replace` operations without unsafe overwrites.
- `assess.ts`: scores readiness and chooses the single next high-value gap.
- `phrase.ts`: turns the next gap into a plain-English question with rationale when useful.
- `controller.ts`: coordinates extract, patch, assess, and phrase while keeping state outside the engine.
- `buildArtifact.ts`: generates the local result package from the confirmed spec.

## State Management

`src/stores/useInterviewStore.ts` owns:

- phase
- messages
- active spec
- changed paths
- composer value
- sending state
- build job
- result artifact
- selected result tab
- save status
- local error state

State is persisted to localStorage so refresh does not wipe the prototype.

## Onboarding State

`src/stores/useOnboardingStore.ts` owns the local onboarding state:

- `hasCompletedOnboarding`
- `currentStep`
- `startingMode`
- `selectedSampleId`
- `selfDescribedContext`
- `selectedOutputType`
- `scratchPrompt`
- `skippedSteps`
- `completedAt`
- `displayName`

The store persists to localStorage under `specforge.onboarding.v1`. The key intentionally follows the onboarding prompt contract even though the product name shown in the UI is Clarify.

## InterviewSeed Handoff Contract

Sample and scratch starts write an `InterviewSeed` to `specforge.interview.seed`.

The workspace reads that seed once on mount, calls `startFromSeed(seed)` in `useInterviewStore`, then clears the seed. This prevents re-seeding after refresh.

Sample seeds open the workspace with:

- the sample prompt as a visible user message
- partial spec fields merged into the live spec
- one pending sharp question
- the onboarding entry hint

Scratch seeds open the workspace with:

- the typed prompt as a visible user message
- the deterministic local interview engine's first question
- the onboarding entry hint

## Sample Project Structure

`src/lib/onboarding/sampleProjects.ts` exports `SAMPLE_PROJECTS`, a typed array of sample projects. Each sample includes:

- `id`
- `title`
- `oneLine`
- `whatYoullSee`
- `seed.initialPrompt`
- `seed.partialSpec`
- `seed.firstQuestion`
- `seed.outputType`
- `seed.userContext`

## Onboarding Manual Test Checklist

- First load with empty localStorage shows onboarding at `welcome`.
- Completing onboarding through any sample opens the workspace.
- Completing onboarding from scratch opens the workspace with the typed prompt.
- Skip opens a blank workspace with no seed.
- Each sample seeds the visible initial prompt, partial spec, and pending question.
- `specforge.onboarding.v1` persists completion across reloads.
- `?reset-onboarding` returns to welcome and clears pending seeds.
- The `Reset onboarding` button returns to welcome and clears pending seeds.
- Mid-onboarding refresh resumes at the same step.
- The How it works preview reveals the question, spec field, and readiness movement without a network call.
- `npm run lint` and `npm run build` pass.

## Future Supabase/LLM Wiring Plan

1. Run the stateless `supabase/functions/interview-turn` Edge Function.
2. Keep the existing `SpecPatch` contract so UI state does not change.
3. Set `LLM_PROVIDER=stub` for no-key server testing or `LLM_PROVIDER=deepseek` with `DEEPSEEK_API_KEY` for DeepSeek.
4. Store specs, messages, patches, build jobs, and artifacts in Supabase or another database after the stateless flow is proven.
5. Add auth/project ownership only after the local workflow is validated.
6. Replace simulated build packaging with real code generation or workflow execution behind the existing artifact boundary.

## LLM Provider Layer

The provider interface lives in `src/lib/llm/provider.ts` and supports only:

- `extractSpecUpdates`
- `proposeNextQuestion`
- `summarizeReadiness`

The provider does not own app state, readiness, stopping rules, or phase transitions.

Schemas live in `src/lib/llm/schemas.ts` and are validated with Zod. DeepSeek output is parsed as JSON and validated before it can affect state.

Providers:

- `src/lib/llm/stub-provider.ts`: deterministic heuristics, no key required.
- `src/lib/llm/deepseek-provider.ts`: DeepSeek wrapper for server-side use.
- `src/lib/llm/gemini-provider.ts`: legacy Gemini wrapper retained for fallback experiments.
- `supabase/functions/interview-turn/index.ts`: stateless Edge Function that resolves `LLM_PROVIDER`, applies patches, runs deterministic readiness, and returns the next phase.

Frontend behavior:

- If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present, `src/lib/interview/api.ts` calls the Edge Function.
- If either is missing, the browser uses the deterministic stub locally through the same response contract.
- `DEEPSEEK_API_KEY` is never read by frontend code and must not use a `VITE_` prefix.

Manual provider test:

- Stub: send `I need a client portal for my detailing business where customers can request services.` Expect a structured patch and a question for missing output type or remaining required detail.
- DeepSeek: set Supabase secrets `LLM_PROVIDER=deepseek`, `DEEPSEEK_MODEL=deepseek-v4-flash`, and `DEEPSEEK_API_KEY`, then repeat the same message. Expect valid JSON output and no browser-visible DeepSeek key.

## Known Limitations

- Extraction is heuristic and intentionally conservative.
- The local engine can miss nuanced contradictions.
- Build artifacts are virtual files shown in the UI, not generated on disk.
- Build progress is deterministic and simulated.
- localStorage is not suitable for multi-user or production persistence.
- No production auth, database, billing, deployment, or paid LLM service is configured.
