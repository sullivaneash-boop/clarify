import { existsSync, readFileSync } from 'node:fs';

const envPath = '.env.local';
const expectedSupabaseUrl = 'https://bjtfnlvceaopvgoovflm.supabase.co';

function readJwtRole(value) {
  const parts = value.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function getSupabaseBrowserKeyCheck(value) {
  if (!value) {
    return {
      ok: false,
      detail: 'missing; add the Supabase anon/public or publishable key to call deployed Edge Functions',
    };
  }

  if (value.startsWith('sb_secret_')) {
    return {
      ok: false,
      detail: 'looks like a Supabase secret key; use the anon/public or publishable key for VITE_SUPABASE_ANON_KEY',
    };
  }

  const role = readJwtRole(value);
  if (role === 'service_role') {
    return {
      ok: false,
      detail: 'looks like the service_role key; replace it with the anon/public key',
    };
  }

  if (role && role !== 'anon') {
    return {
      ok: false,
      detail: `JWT role is ${role}; expected anon for a browser key`,
    };
  }

  return {
    ok: true,
    detail: role === 'anon' ? 'set as anon browser key' : 'set for browser Edge Function calls',
  };
}

function parseEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) return [line, ''];
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

const env = parseEnv(envPath);
const supabaseBrowserKeyCheck = getSupabaseBrowserKeyCheck(env.VITE_SUPABASE_ANON_KEY);
const checks = [
  {
    label: 'VITE_SUPABASE_URL',
    ok: env.VITE_SUPABASE_URL === expectedSupabaseUrl,
    detail: env.VITE_SUPABASE_URL
      ? `set to ${env.VITE_SUPABASE_URL}`
      : `missing, expected ${expectedSupabaseUrl}`,
  },
  {
    label: 'VITE_SUPABASE_ANON_KEY',
    ...supabaseBrowserKeyCheck,
  },
  {
    label: 'GEMINI_API_KEY',
    ok: Boolean(env.GEMINI_API_KEY),
    detail: env.GEMINI_API_KEY
      ? 'present locally; still set it as a Supabase secret for deployed functions'
      : 'missing locally; set as a Supabase secret before using LLM_PROVIDER=gemini',
  },
  {
    label: 'GEMINI_MODEL',
    ok: env.GEMINI_MODEL === 'gemini-2.5-flash',
    detail: env.GEMINI_MODEL || 'missing; default should be gemini-2.5-flash',
  },
  {
    label: 'LLM_PROVIDER',
    ok: ['stub', 'gemini'].includes(env.LLM_PROVIDER ?? ''),
    detail: env.LLM_PROVIDER || 'missing; use stub or gemini',
  },
];

console.log('Clarify env readiness');
console.log(`File: ${envPath}${existsSync(envPath) ? '' : ' (missing)'}`);
console.log('');

for (const check of checks) {
  console.log(`${check.ok ? 'OK' : 'TODO'} ${check.label}: ${check.detail}`);
}

console.log('');
console.log('Reminder: use the Supabase anon/public or publishable key in VITE_SUPABASE_ANON_KEY.');
console.log('Never put service_role, sb_secret_, or GEMINI_API_KEY values in browser-facing VITE_ variables.');
