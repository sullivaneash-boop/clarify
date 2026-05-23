import { buildSpecSchema, buildTypeSchema, outputTypeSchema, type BuildSpec, type PatchOperation } from './schema';

export type SpecPatchLike = {
  operations: PatchOperation[];
  summary: string;
};

function normalizeListValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (value === null || value === undefined || value === '') return [];

  return [String(value)];
}

function uniqueAppend(existing: string[], incoming: unknown) {
  const next = [...existing];
  const seen = new Set(existing.map((item) => item.toLowerCase()));

  for (const item of normalizeListValue(incoming)) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      next.push(item);
    }
  }

  return next;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function replaceIfAllowed(currentValue: unknown, value: unknown, confidence: number) {
  if (value === undefined) return currentValue;
  if (currentValue === null || currentValue === undefined || currentValue === '' || confidence >= 0.82) {
    return value;
  }

  return currentValue;
}

function inferBuildTypeFromText(text: string): BuildSpec['buildType'] | undefined {
  if (text.includes('portal')) return 'client_portal';
  if (text.includes('spreadsheet') || text.includes('sheet') || text.includes('excel')) return 'spreadsheet';
  if (text.includes('automation') || text.includes('workflow')) return 'automation';
  if (text.includes('landing')) return 'landing_page';
  if (text.includes('website') || text.includes('site')) return 'website';
  if (text.includes('dashboard') || text.includes('internal') || text.includes('system') || text.includes('app')) {
    return 'business_system';
  }
  return undefined;
}

function inferOutputTypeFromText(text: string): BuildSpec['outputType'] | undefined {
  if (text.includes('prototype')) return 'prototype';
  if (text.includes('prompt')) return 'build_prompt';
  if (text.includes('spreadsheet')) return 'spreadsheet';
  if (text.includes('code')) return 'code_files';
  if (text.includes('package') || text.includes('plan')) return 'implementation_plan';
  return undefined;
}

function normalizeEnumField(key: keyof BuildSpec, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return key === 'outputType' ? null : value;
  }

  if (key !== 'buildType' && key !== 'outputType') return value;

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[-\s/]+/g, '_');
  const text = String(value).trim().toLowerCase();

  if (key === 'buildType') {
    const aliases: Record<string, BuildSpec['buildType']> = {
      app: 'business_system',
      business_system: 'business_system',
      client_area: 'client_portal',
      client_dashboard: 'client_portal',
      client_portal: 'client_portal',
      customer_portal: 'client_portal',
      dashboard: 'business_system',
      internal_dashboard: 'business_system',
      internal_system: 'business_system',
      landing_page: 'landing_page',
      portal: 'client_portal',
      site: 'website',
      web_app: 'business_system',
    };
    const candidate = aliases[normalized] ?? normalized;
    const parsed = buildTypeSchema.safeParse(candidate);
    return parsed.success ? parsed.data : inferBuildTypeFromText(text);
  }

  const aliases: Record<string, BuildSpec['outputType']> = {
    build_package: 'implementation_plan',
    build_plan: 'implementation_plan',
    build_prompt: 'build_prompt',
    code: 'code_files',
    code_files: 'code_files',
    implementation_plan: 'implementation_plan',
    plan: 'implementation_plan',
    prompt: 'build_prompt',
    prototype: 'prototype',
    spreadsheet: 'spreadsheet',
    spreadsheet_plan: 'spreadsheet',
    working_prototype: 'prototype',
  };
  const candidate = aliases[normalized] ?? normalized;
  const parsed = outputTypeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : inferOutputTypeFromText(text);
}

export function applyPatch(spec: BuildSpec, patch: SpecPatchLike) {
  const next: BuildSpec = {
    ...spec,
    coreFeatures: [...spec.coreFeatures],
    dataToTrack: [...spec.dataToTrack],
    userRoles: [...spec.userRoles],
    integrations: [...spec.integrations],
    designPreferences: [...spec.designPreferences],
    technicalConstraints: [...spec.technicalConstraints],
    mustNotDo: [...spec.mustNotDo],
    assumptions: [...spec.assumptions],
    openQuestions: [...spec.openQuestions],
    readiness: { ...spec.readiness },
  };
  const changedPaths: string[] = [];

  for (const operation of patch.operations) {
    if (applyOperation(next, operation)) {
      changedPaths.push(operation.path);
    }
  }

  if (changedPaths.length > 0) {
    next.updatedAt = new Date().toISOString();
  }

  return { spec: buildSpecSchema.parse(next), changedPaths };
}

function applyOperation(spec: BuildSpec, operation: PatchOperation) {
  const key = operation.path.replace(/^\//, '') as keyof BuildSpec;
  const previous = spec[key];

  if (!(key in spec)) return false;

  if (operation.op === 'append') {
    if (!isStringArray(previous)) return false;
    const nextValue = uniqueAppend(previous, operation.value);
    if (nextValue.length === previous.length) return false;
    (spec[key] as string[]) = nextValue;
    return true;
  }

  if (operation.op === 'remove') {
    if (!Array.isArray(previous)) {
      if (previous === null || previous === undefined) return false;
      const nextValue = null;
      if (Object.is(previous, nextValue)) return false;
      (spec[key] as typeof nextValue) = nextValue;
      return true;
    }
    if (!isStringArray(previous)) return false;
    const removeValues = new Set(normalizeListValue(operation.value).map((value) => value.toLowerCase()));
    const nextValue = previous.filter((item) => !removeValues.has(String(item).toLowerCase()));
    if (nextValue.length === previous.length) return false;
    (spec[key] as string[]) = nextValue;
    return true;
  }

  const nextValue =
    operation.op === 'replace'
      ? normalizeEnumField(key, operation.value)
      : replaceIfAllowed(previous, normalizeEnumField(key, operation.value), operation.confidence);

  if (nextValue === undefined) return false;

  if (Object.is(previous, nextValue)) return false;

  (spec[key] as typeof nextValue) = nextValue;
  return true;
}

export function uniquePaths(paths: string[]) {
  return Array.from(new Set(paths));
}
