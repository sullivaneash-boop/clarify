# Clarify Local Prototype

Clarify is an interview-first AI build tool prototype. It asks a non-technical user one high-leverage question at a time, turns fuzzy intent into a live evolving spec, confirms the plan, then generates a local build package that can be iterated.

This prototype is fully local. It uses deterministic heuristics instead of paid LLM calls and does not require Supabase, auth, billing, external APIs, or secrets.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`.

## Build And Lint

```bash
npm run lint
npm run build
```

## Manual Flow Test

1. Start on onboarding and move through Welcome, How it works, and Choose.
2. Pick a sample or enter a scratch prompt.
3. Confirm the workspace opens with an initial prompt and a pending question.
4. Answer each interview question in plain English.
5. Watch the live spec panel update and highlight changed fields.
6. Continue until the confirmation screen appears.
7. Choose `Build this`.
8. Wait for the staged local build job to complete.
9. Review the generated package tabs: Overview, Build Prompt, Plan, Files, and Spec.
10. Submit iteration feedback, such as `Remove anything that requires login.`
11. Confirm the artifact updates while preserving the existing spec.

## Onboarding (Local)

On first load, Clarify shows a 3-step local onboarding flow before the interview workspace:

1. Welcome: explains that Clarify asks before it builds.
2. How it works: shows a deterministic question-to-spec preview.
3. Choose: lets you start from a sample, from scratch, or skip to a blank session.

The onboarding state is stored in localStorage under `specforge.onboarding.v1` so refresh resumes on the same step. Sample and scratch starts write a one-time seed to `specforge.interview.seed`; the workspace consumes and clears that seed on mount.

To reset onboarding locally, use the `Reset onboarding` button or open:

```text
http://127.0.0.1:5173/?reset-onboarding
```

Resetting onboarding clears the onboarding state and pending seed. It does not contact any backend.

## What Is Mocked

- LLM extraction, assessment, and phrasing default to a deterministic local stub unless Supabase Edge Function variables are configured.
- Build progress is simulated with timed local steps.
- Generated files are virtual artifact files displayed in the UI.
- Persistence is localStorage only.
- No production database, auth, billing, or external integration is active.

## LLM Provider Layer

Clarify has a narrow provider layer for interview language tasks:

- extract structured spec updates
- propose the next useful question
- summarize readiness/tradeoffs

The deterministic app logic still owns state, readiness, stopping rules, and spec merging.

Provider behavior:

- No `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: browser uses the deterministic stub provider locally.
- Supabase configured with `LLM_PROVIDER=stub`: browser calls the `interview-turn` Edge Function, which uses the server stub.
- Supabase configured with `LLM_PROVIDER=deepseek` and `DEEPSEEK_API_KEY`: Edge Function uses DeepSeek.

`DEEPSEEK_API_KEY` must only be set as a server-side Supabase secret. Never expose it with a `VITE_` prefix.

The connected Supabase project is `https://bjtfnlvceaopvgoovflm.supabase.co`, and the deployed function is available at `https://bjtfnlvceaopvgoovflm.supabase.co/functions/v1/interview-turn` with JWT verification enabled.

For `VITE_SUPABASE_ANON_KEY`, use the legacy Supabase `anon` JWT key because this Edge Function has JWT verification enabled. Do not use `service_role`, `sb_secret_`, `sb_publishable_`, or any other Supabase secret key in Vercel or browser-facing env vars for this setup.

Manual stub test:

1. Ensure `LLM_PROVIDER=stub` or leave Supabase env vars empty.
2. Send: `I need a client portal for my detailing business where customers can request services.`
3. Expect the spec to infer a client portal or business-system shape, detailing business context, customers as primary users, service requests as the goal, and a follow-up question for missing output type or remaining detail.

Manual DeepSeek test:

1. Set `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL=deepseek-v4-flash`, and `LLM_PROVIDER=deepseek` in Supabase secrets.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the frontend.
3. Repeat the same message.
4. Expect a valid JSON patch, no frontend exposure of the DeepSeek key, and one next question.

See [docs/DEPLOYMENT_KEYS.md](docs/DEPLOYMENT_KEYS.md) for Supabase secrets, Vercel env vars, and DeepSeek setup.

To check local readiness:

```bash
npm run env:check
```

## What To Wire Up Next

- Use the `interview-turn` Edge Function for provider-backed extraction and question phrasing.
- Persist specs, messages, patches, build jobs, and artifacts in a database.
- Add authenticated project ownership only after the local workflow is validated.
- Add real build execution or code generation behind the existing `buildArtifact` boundary.
- Add deployment, billing, and integration setup when the product surface is proven.
