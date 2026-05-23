# Deployment And Key Setup

This project is ready for three modes:

- Local stub mode: no external keys required.
- Supabase Edge Function with stub provider: browser calls Supabase, but no LLM key is used.
- Supabase Edge Function with DeepSeek: browser calls Supabase, Supabase calls DeepSeek server-side.

## Current Supabase Status

The Supabase project is connected and the interview Edge Function is already deployed.

```text
Project URL: https://bjtfnlvceaopvgoovflm.supabase.co
Function URL: https://bjtfnlvceaopvgoovflm.supabase.co/functions/v1/interview-turn
Function name: interview-turn
Status: ACTIVE
JWT verification: enabled
```

You only need to add the frontend anon key and, when ready for DeepSeek testing, the server-side Supabase secrets below.

## Local `.env.local`

`.env.local` is ignored by git. Put browser-safe values here:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use the legacy Supabase `anon` JWT key for `VITE_SUPABASE_ANON_KEY`. The deployed Edge Function has JWT verification enabled, and Supabase currently verifies Edge Functions with the legacy JWT-based `anon` or `service_role` keys. Do not use the `service_role` key or any Supabase secret key here; Vite exposes `VITE_` variables to the browser.

Do not use an `sb_publishable_` key for this specific Edge Function unless you intentionally redeploy with JWT verification disabled and add your own authorization check inside the function.

The app only calls the deployed `interview-turn` Edge Function when both values are present. If either is missing, Clarify uses the local deterministic stub provider.

Do not add `VITE_DEEPSEEK_API_KEY`.

## Supabase Secrets

Set server-side provider secrets in Supabase Dashboard under Project Settings -> Edge Functions -> Secrets, or with the Supabase CLI.

For server stub testing:

```bash
supabase secrets set LLM_PROVIDER=stub
supabase secrets set DEEPSEEK_MODEL=deepseek-v4-flash
```

When ready to test DeepSeek:

```bash
supabase secrets set LLM_PROVIDER=deepseek
supabase secrets set DEEPSEEK_API_KEY=your_deepseek_key
supabase secrets set DEEPSEEK_MODEL=deepseek-v4-flash
```

The project ref is configured in `supabase/config.toml` as `bjtfnlvceaopvgoovflm`.

## Vercel Environment Variables

When you create the Vercel project, add only browser-safe variables:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not add `DEEPSEEK_API_KEY`, a Supabase `service_role` key, an `sb_secret_` key, or any other Supabase secret key to Vercel for this frontend project. DeepSeek should be set on Supabase Edge Function secrets only.

Recommended Vercel settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## Quick Checks

Run:

```bash
npm run env:check
npm run lint
npm run build
```

Manual browser test:

1. Add `VITE_SUPABASE_ANON_KEY` to `.env.local`.
2. Restart `npm run dev`.
3. Send: `I need a client portal for my detailing business where customers can request services.`
4. Confirm the top bar shows `Provider: stub` or `Provider: deepseek`.
5. Confirm the spec updates and a single next question appears.

## Privacy Warning

DeepSeek is a third-party LLM provider. Do not test private customer data, sensitive business ideas, or confidential plans until the production privacy/legal posture is reviewed.

For production, confirm DeepSeek account terms, data handling, retention, and payment setup before real users enter private business information.
