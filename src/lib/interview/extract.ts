import { createId } from '../utils/ids';
import type { BuildSpec, OutputType, PatchOperation, SpecPatch } from './schema';

type ExtractionOptions = {
  sourceMessageId: string;
  mode?: 'interview' | 'iteration';
};

const buildTypeHints = [
  { terms: ['client portal', 'customer portal', 'vendor portal'], value: 'client_portal' },
  { terms: ['landing page', 'sales page', 'lead page'], value: 'landing_page' },
  { terms: ['spreadsheet', 'sheet', 'excel', 'advanced spreadsheet'], value: 'spreadsheet' },
  { terms: ['automation', 'workflow', 'zapier', 'automate'], value: 'automation' },
  { terms: ['dashboard', 'internal tool', 'crm', 'admin panel', 'business system'], value: 'business_system' },
  { terms: ['website', 'site', 'web app'], value: 'website' },
] as const;

const featureHints = [
  { terms: ['login', 'account', 'sign in', 'auth'], value: 'Accounts and login' },
  { terms: ['booking', 'book', 'schedule', 'appointment', 'calendar', 'consultation'], value: 'Booking and scheduling' },
  { terms: ['payment', 'checkout', 'subscription', 'stripe'], value: 'Payments or checkout' },
  { terms: ['dashboard', 'report', 'analytics', 'metrics'], value: 'Dashboard and reporting' },
  { terms: ['admin', 'manage', 'approve'], value: 'Admin management' },
  { terms: ['upload', 'file', 'document'], value: 'File/document upload' },
  { terms: ['message', 'chat', 'email'], value: 'Messaging or notifications' },
  { terms: ['form', 'lead', 'inquiry', 'quote'], value: 'Lead capture form' },
  { terms: ['task', 'project', 'pipeline'], value: 'Task or project tracking' },
  { terms: ['inventory', 'stock'], value: 'Inventory tracking' },
  { terms: ['onboarding', 'intake'], value: 'Guided intake flow' },
] as const;

const dataHints = [
  { terms: ['lead', 'inquiry'], value: 'Leads' },
  { terms: ['customer', 'client'], value: 'Customers' },
  { terms: ['appointment', 'booking', 'consultation'], value: 'Appointments' },
  { terms: ['order', 'purchase'], value: 'Orders' },
  { terms: ['invoice', 'payment'], value: 'Invoices/payments' },
  { terms: ['project', 'task'], value: 'Projects/tasks' },
  { terms: ['message', 'email'], value: 'Messages' },
  { terms: ['file', 'document'], value: 'Files/documents' },
  { terms: ['inventory', 'stock'], value: 'Inventory' },
] as const;

const integrationHints = [
  { terms: ['stripe'], value: 'Stripe' },
  { terms: ['google sheet', 'sheets', 'excel'], value: 'Google Sheets/Excel' },
  { terms: ['slack'], value: 'Slack' },
  { terms: ['zapier', 'make.com'], value: 'Zapier/Make' },
  { terms: ['gmail', 'email'], value: 'Email provider' },
  { terms: ['calendly'], value: 'Calendly' },
  { terms: ['hubspot'], value: 'HubSpot' },
  { terms: ['quickbooks'], value: 'QuickBooks' },
] as const;

const designHints = [
  { terms: ['premium', 'luxury', 'high end'], value: 'Premium' },
  { terms: ['clean', 'simple', 'minimal'], value: 'Clean and minimal' },
  { terms: ['dark'], value: 'Dark interface' },
  { terms: ['editorial'], value: 'Editorial' },
  { terms: ['mobile', 'phone'], value: 'Mobile-first' },
  { terms: ['professional', 'enterprise'], value: 'Professional' },
  { terms: ['warm'], value: 'Warm accent palette' },
] as const;

const roleHints = [
  { terms: ['admin', 'owner'], value: 'Admin' },
  { terms: ['customer', 'client'], value: 'Customer/client' },
  { terms: ['employee', 'staff', 'team'], value: 'Team member' },
  { terms: ['manager'], value: 'Manager' },
] as const;

function includesAny(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(term));
}

function appendOperation(path: string, value: string | string[], confidence = 0.72): PatchOperation {
  return { op: 'append', path, value, confidence };
}

function setOperation(path: string, value: string | null, confidence = 0.7): PatchOperation {
  return { op: 'set', path, value, confidence };
}

function replaceOperation(path: string, value: string | null, confidence = 0.88): PatchOperation {
  return { op: 'replace', path, value, confidence };
}

function removeOperation(path: string, value: string | string[], confidence = 0.86): PatchOperation {
  return { op: 'remove', path, value, confidence };
}

function inferProjectName(input: string) {
  const quoted = input.match(/["“”']([^"“”']{2,48})["“”']/);
  if (quoted?.[1]) return quoted[1].trim();

  const named = input.match(/\b(?:called|named|name is|brand is)\s+([a-z0-9][a-z0-9 '&.-]{1,42})/i);
  if (named?.[1]) {
    return cleanPhrase(named[1].split(/\b(?:that|to|with|where|who)\b/i)[0]);
  }

  return null;
}

function inferBusinessType(input: string) {
  const match = input.match(/\b(?:for|for a|for an|for my|for our)\s+([a-z][a-z\s-]{2,42})(?:\s+(?:that|to|where|with|who)|[.!?]|$)/i);
  if (!match?.[1]) return null;

  const phrase = cleanPhrase(match[1].split(/\b(?:called|named|that|to|where|with|who)\b/i)[0]).replace(
    /^(?:a|an|my|our)\s+/i,
    '',
  );
  if (phrase.length < 3) return null;
  if (['customers', 'clients', 'employees', 'team', 'people'].includes(phrase.toLowerCase())) return null;
  return phrase;
}

function inferGoal(input: string, normalized: string, spec: BuildSpec) {
  const goalMatch = input.match(/\b(?:goal is|main goal is|so that|to help|needs to|should)\s+([^.!?]{8,150})/i);
  if (goalMatch?.[1]) {
    const candidate = cleanPhrase(goalMatch[1]);
    const constraintLike = includesAny(candidate.toLowerCase(), [
      'avoid login',
      'no login',
      'without login',
      'avoid accounts',
      'no accounts',
      'without accounts',
    ]);
    if (!constraintLike) return candidate;
  }

  const hasBuildSignal = spec.buildType !== 'unknown' || buildTypeHints.some((hint) => includesAny(normalized, hint.terms));

  if (includesAny(normalized, ['lead', 'inquiry', 'sales call', 'book calls', 'booking', 'consultation']) && hasBuildSignal) {
    return 'Capture qualified interest and turn visitors into conversations.';
  }

  if (includesAny(normalized, ['track', 'manage', 'dashboard', 'pipeline'])) {
    return 'Help the team track work clearly and make better decisions.';
  }

  if (includesAny(normalized, ['automate', 'save time', 'manual'])) {
    return 'Reduce manual work with a reliable workflow.';
  }

  return null;
}

function inferPrimaryUser(normalized: string) {
  if (includesAny(normalized, ['both customers', 'customers and team', 'clients and staff', 'both'])) {
    return 'Customers and internal team';
  }

  if (includesAny(normalized, ['customer', 'client', 'lead', 'visitor', 'patient', 'member'])) {
    return 'Customers/clients';
  }

  if (includesAny(normalized, ['internal', 'team', 'employee', 'staff', 'operator', 'manager'])) {
    return 'Internal team';
  }

  return null;
}

function inferOutputType(normalized: string): OutputType | null {
  if (includesAny(normalized, ['working prototype', 'prototype', 'clickable'])) return 'prototype';
  if (includesAny(normalized, ['build prompt', 'prompt pack', 'prompt'])) return 'build_prompt';
  if (includesAny(normalized, ['implementation plan', 'plan'])) return 'implementation_plan';
  if (includesAny(normalized, ['spreadsheet', 'sheet', 'excel'])) return 'spreadsheet';
  if (includesAny(normalized, ['code files', 'code'])) return 'code_files';
  return null;
}

function cleanPhrase(value: string) {
  return value
    .replace(/\b(?:please|thanks|thank you)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/, '');
}

function maybeCaptureConstraint(input: string, normalized: string) {
  const constraints: string[] = [];
  const mustNot: string[] = [];
  const avoidsLogin = includesAny(normalized, [
    'no login',
    'without login',
    'avoid login',
    'remove login',
    'no accounts',
    'without accounts',
    'anything that requires login',
  ]);

  if (avoidsLogin) {
    constraints.push('First version should avoid accounts/login unless later required.');
    mustNot.push('Do not require accounts/login in the first version.');
  }

  if (includesAny(normalized, ['no paid', 'free only', 'no api key', 'no secrets', 'local only'])) {
    constraints.push('Must run locally without paid services, API keys, or secrets.');
  }

  if (includesAny(normalized, ['react', 'typescript', 'vite', 'tailwind'])) {
    constraints.push('Use the requested modern React/TypeScript frontend stack.');
  }

  const avoidMatch = input.match(/\b(?:do not|don't|avoid|must not|without)\s+([^.!?]{4,90})/i);
  if (avoidMatch?.[1]) {
    const avoidedThing = cleanPhrase(avoidMatch[1]);
    if (!avoidedThing.toLowerCase().includes('login')) {
      mustNot.push(cleanPhrase(`Do not ${avoidedThing}`));
    }
  }

  return { constraints, mustNot };
}

export function extractSpecPatch(input: string, spec: BuildSpec, options: ExtractionOptions): SpecPatch {
  const normalized = input.toLowerCase();
  const operations: PatchOperation[] = [];
  const summaryParts: string[] = [];
  const avoidsLogin = includesAny(normalized, [
    'no login',
    'without login',
    'avoid login',
    'remove login',
    'no accounts',
    'without accounts',
    'anything that requires login',
  ]);

  for (const hint of buildTypeHints) {
    if (includesAny(normalized, hint.terms)) {
      operations.push(setOperation('/buildType', hint.value, spec.buildType === 'unknown' ? 0.82 : 0.9));
      summaryParts.push(`build type: ${hint.value.replace(/_/g, ' ')}`);
      break;
    }
  }

  const projectName = inferProjectName(input);
  if (projectName) {
    operations.push(setOperation('/projectName', projectName, 0.9));
    summaryParts.push(`project name: ${projectName}`);
  }

  const businessType = inferBusinessType(input);
  if (businessType) {
    operations.push(setOperation('/businessType', businessType, 0.7));
  }

  const primaryUser = inferPrimaryUser(normalized);
  if (primaryUser) {
    operations.push(setOperation('/primaryUser', primaryUser, 0.84));
    summaryParts.push(`primary user: ${primaryUser}`);
  }

  const goal = inferGoal(input, normalized, spec);
  if (goal) {
    operations.push(setOperation('/mainGoal', goal, 0.76));
    summaryParts.push('main goal clarified');
  }

  const outputType = inferOutputType(normalized);
  if (outputType) {
    operations.push(setOperation('/outputType', outputType, 0.86));
    summaryParts.push(`output: ${outputType.replace(/_/g, ' ')}`);
  }

  const features = featureHints
    .filter((hint) => {
      if (avoidsLogin && hint.value === 'Accounts and login') return false;
      return includesAny(normalized, hint.terms);
    })
    .map((hint) => hint.value);
  if (features.length > 0) {
    operations.push(appendOperation('/coreFeatures', features, 0.78));
    summaryParts.push(`${features.length} feature signal${features.length === 1 ? '' : 's'}`);
  }

  if (avoidsLogin) {
    operations.push(removeOperation('/coreFeatures', 'Accounts and login'));
  }

  const data = dataHints.filter((hint) => includesAny(normalized, hint.terms)).map((hint) => hint.value);
  if (data.length > 0) {
    operations.push(appendOperation('/dataToTrack', data, 0.76));
  }

  const roles = roleHints.filter((hint) => includesAny(normalized, hint.terms)).map((hint) => hint.value);
  if (roles.length > 0) {
    operations.push(appendOperation('/userRoles', roles, 0.74));
  }

  const integrations = integrationHints
    .filter((hint) => includesAny(normalized, hint.terms))
    .map((hint) => hint.value);
  if (integrations.length > 0) {
    operations.push(appendOperation('/integrations', integrations, 0.74));
  }

  const designPreferences = designHints
    .filter((hint) => includesAny(normalized, hint.terms))
    .map((hint) => hint.value);
  if (designPreferences.length > 0) {
    operations.push(appendOperation('/designPreferences', designPreferences, 0.68));
  }

  const { constraints, mustNot } = maybeCaptureConstraint(input, normalized);
  if (constraints.length > 0) {
    operations.push(appendOperation('/technicalConstraints', constraints, 0.84));
  }

  if (mustNot.length > 0) {
    operations.push(appendOperation('/mustNotDo', mustNot, 0.86));
  }

  if (options.mode === 'iteration' && includesAny(normalized, ['simpler', 'simple', 'small', 'mvp'])) {
    operations.push(appendOperation('/assumptions', 'Favor the smallest useful first version before expanding scope.', 0.86));
    operations.push(appendOperation('/mustNotDo', 'Do not add advanced scope until the simple version works.', 0.84));
  }

  if (options.mode === 'iteration' && includesAny(normalized, ['more advanced', 'advanced', 'powerful'])) {
    operations.push(appendOperation('/assumptions', 'User wants a more advanced version, but complexity should be called out before implementation.', 0.84));
  }

  if (includesAny(normalized, ['customers, not employees', 'customers not employees', 'clients not staff'])) {
    operations.push(replaceOperation('/primaryUser', 'Customers/clients'));
  }

  if (includesAny(normalized, ['employees, not customers', 'team not customers', 'internal not customer'])) {
    operations.push(replaceOperation('/primaryUser', 'Internal team'));
  }

  if (
    (spec.buildType === 'landing_page' || includesAny(normalized, ['landing page'])) &&
    includesAny(normalized, ['lead', 'inquiry', 'call', 'booking'])
  ) {
    operations.push(appendOperation('/assumptions', 'A simple landing page can avoid accounts and focus on lead capture first.', 0.74));
  }

  return {
    id: createId('patch'),
    specId: spec.id,
    createdAt: new Date().toISOString(),
    sourceMessageId: options.sourceMessageId,
    operations,
    summary: summaryParts.length > 0 ? `Updated ${summaryParts.join(', ')}.` : 'No concrete spec fields changed yet.',
  };
}
