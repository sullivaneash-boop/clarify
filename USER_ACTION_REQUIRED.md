# USER ACTION REQUIRED

Date/time: 2026-05-22 22:12:52 EDT

## Required user action

No user action is required to run or test the local prototype, local onboarding flow, or local stub interview provider.

The interview flow defaults to the deterministic stub provider when Supabase Edge Function settings are not configured.

To call the Supabase `interview-turn` Edge Function from the browser, add the Supabase anon key to `.env.local` as `VITE_SUPABASE_ANON_KEY`. The Supabase project URL has been set to `https://bjtfnlvceaopvgoovflm.supabase.co`.

Run `npm run env:check` after adding keys.

## Optional user action

- Provide the Supabase anon key if the browser should call deployed Supabase Edge Functions.
- Provide a Gemini API key as a Supabase Edge Function secret when testing `LLM_PROVIDER=gemini`.
- Add the Vercel project environment variables when the Vercel project is created.
- Provide OAuth credentials later if real authentication is added.
- Provide a billing provider account later if paid plans are added.

## Future (not now)

- Real auth would require an auth provider, such as Supabase, plus redirect URLs and magic-link or passwordless configuration if chosen.
- A privacy policy would be required only if real user information is ever collected.
- Billing setup is required only if onboarding is ever paywalled.
- None of these are needed for the current local prototype.

## Gemini testing setup

To test the real Gemini provider later:

1. Create a Gemini API key in Google AI Studio.
2. Set Supabase Edge Function secrets:

```bash
supabase secrets set GEMINI_API_KEY=your_key_here
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
supabase secrets set LLM_PROVIDER=gemini
```

3. Set the browser-safe frontend variables locally or in your deployment environment:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not create `VITE_GEMINI_API_KEY`. Gemini keys must remain server-side only.

To run locally with the stub provider, leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` empty, or set the Edge Function secret `LLM_PROVIDER=stub`.

Warning: Gemini free or unpaid tiers may use prompts and responses to improve Google products. Do not test with real customer data, private business ideas, sensitive plans, or confidential information on the free tier.

For production, move to paid Gemini, Vertex AI, or another privacy-safe provider before real users enter private business information.

## Vercel setup

When creating the Vercel project, use:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not add `GEMINI_API_KEY` to Vercel. Gemini belongs in Supabase secrets only.

Recommended Vercel settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

## Secrets/API keys not collected

No secrets, API keys, OAuth credentials, database URLs, or billing credentials were collected or committed.

## Paid services not activated

No paid services were activated. Supabase, LLM APIs, billing providers, deployment, and OAuth providers are intentionally not required for this prototype.

## Local prototype status

Clarify is implemented as a local Vite React TypeScript prototype with a deterministic interview engine, localStorage persistence, local onboarding, staged build progress, generated build package tabs, and iteration feedback flow.
