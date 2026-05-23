# USER ACTION REQUIRED

## Required user action

No user action is required to run or test the local prototype, local onboarding flow, or local stub interview provider.

The interview flow defaults to the deterministic stub provider when Supabase Edge Function settings are not configured.

The Supabase project is connected and ready:

- Project URL: `https://bjtfnlvceaopvgoovflm.supabase.co`
- Edge Function: `interview-turn`
- Function URL: `https://bjtfnlvceaopvgoovflm.supabase.co/functions/v1/interview-turn`
- Status: deployed and `ACTIVE`
- JWT verification: enabled

To call the Supabase `interview-turn` Edge Function from the browser, add the legacy Supabase `anon` JWT key to `.env.local` as `VITE_SUPABASE_ANON_KEY`. The Supabase project URL has been set to `https://bjtfnlvceaopvgoovflm.supabase.co`.

Use the legacy `anon` JWT key because the deployed Edge Function has JWT verification enabled. Do not use the `service_role` key, an `sb_secret_` key, or a Supabase secret key in Vercel or any `VITE_` variable.

Run `npm run env:check` after adding keys.

## Optional user action

- Provide the Supabase anon key if the browser should call deployed Supabase Edge Functions.
- Provide a DeepSeek API key as a Supabase Edge Function secret when testing `LLM_PROVIDER=deepseek`.
- Add the Vercel project environment variables when the Vercel project is created.
- Provide OAuth credentials later if real authentication is added.
- Provide a billing provider account later if paid plans are added.

## Future (not now)

- Real auth would require an auth provider, such as Supabase, plus redirect URLs and magic-link or passwordless configuration if chosen.
- A privacy policy would be required only if real user information is ever collected.
- Billing setup is required only if onboarding is ever paywalled.
- None of these are needed for the current local prototype.

## DeepSeek testing setup

To test the real DeepSeek provider later:

1. Create a DeepSeek API key at `https://platform.deepseek.com/`.
2. In Supabase Dashboard, open Project Settings -> Edge Functions -> Secrets and add:

```text
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
LLM_PROVIDER=deepseek
```

Or set the same Supabase Edge Function secrets with the Supabase CLI:

```bash
supabase secrets set DEEPSEEK_API_KEY=your_key_here
supabase secrets set DEEPSEEK_MODEL=deepseek-v4-flash
supabase secrets set LLM_PROVIDER=deepseek
```

3. Set the browser-safe frontend variables locally or in your deployment environment:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not create `VITE_DEEPSEEK_API_KEY`. DeepSeek keys must remain server-side only.

To run locally with the stub provider, leave `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` empty, or set the Edge Function secret `LLM_PROVIDER=stub`.

Warning: DeepSeek is a third-party LLM provider. Do not test with real customer data, private business ideas, sensitive plans, or confidential information until the production privacy/legal posture is reviewed.

For production, confirm DeepSeek account terms, data handling, retention, and payment setup before real users enter private business information.

## Vercel setup

When creating the Vercel project, use:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not add `DEEPSEEK_API_KEY`, the Supabase `service_role` key, an `sb_secret_` key, or any Supabase secret key to Vercel. DeepSeek belongs in Supabase secrets only.

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
