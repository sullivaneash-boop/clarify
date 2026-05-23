import { buildSpecSchema, type BuildSpec, type PatchOperation } from './schema';

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

function replaceIfAllowed(currentValue: unknown, value: unknown, confidence: number) {
  if (currentValue === null || currentValue === undefined || currentValue === '' || confidence >= 0.82) {
    return value;
  }

  return currentValue;
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
    if (!Array.isArray(previous)) return false;
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
    const removeValues = new Set(normalizeListValue(operation.value).map((value) => value.toLowerCase()));
    const nextValue = previous.filter((item) => !removeValues.has(String(item).toLowerCase()));
    if (nextValue.length === previous.length) return false;
    (spec[key] as string[]) = nextValue;
    return true;
  }

  const nextValue =
    operation.op === 'replace'
      ? operation.value
      : replaceIfAllowed(previous, operation.value, operation.confidence);

  if (Object.is(previous, nextValue)) return false;

  (spec[key] as typeof nextValue) = nextValue;
  return true;
}

export function uniquePaths(paths: string[]) {
  return Array.from(new Set(paths));
}
