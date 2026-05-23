# Deployment And Key Setup

This project is ready for three modes:

- Local stub mode: no external keys required.
- Supabase Edge Function with stub provider: browser calls Supabase, but no Gemini key is used.
- Supabase Edge Function with Gemini: browser calls Supabase, Supabase calls Gemini server-side.

## Local `.env.local`

`.env.local` is ignored by git. Put browser-safe values here:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app only calls the deployed `interview-turn` Edge Function when both values are present. If either is missing, Clarify uses the local deterministic stub provider.

Do not add `VITE_GEMINI_API_KEY`.

## Supabase Secrets

Set server-side provider secrets with the Supabase CLI:

```bash
supabase secrets set LLM_PROVIDER=stub
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
```

When ready to test Gemini:

```bash
supabase secrets set LLM_PROVIDER=gemini
supabase secrets set GEMINI_API_KEY=your_gemini_key
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
```

Deploy the Edge Function:

```bash
supabase functions deploy interview-turn
```

The project ref is configured in `supabase/config.toml` as `bjtfnlvceaopvgoovflm`.

## Vercel Environment Variables

When you create the Vercel project, add only browser-safe variables:

```bash
VITE_SUPABASE_URL=https://bjtfnlvceaopvgoovflm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not add `GEMINI_API_KEY` to Vercel for this frontend project. Gemini should be set on Supabase Edge Function secrets only.

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
4. Confirm the top bar shows `Provider: stub` or `Provider: gemini`.
5. Confirm the spec updates and a single next question appears.

## Privacy Warning

Gemini free or unpaid tiers may use prompts and responses to improve Google products. Do not test private customer data, sensitive business ideas, or confidential plans on the free tier.

For production, use paid Gemini, Vertex AI, or another privacy-safe provider before real users enter private business information.
