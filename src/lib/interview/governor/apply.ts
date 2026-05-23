import { buildSpecSchema, type BuildSpec, type FieldSource, type SpecConflict } from '../schema';
import { assessGovernorReadiness, createAssumption, nextGovernorQuestion } from './readiness';
import {
  allowlistedPatchPathSchema,
  type GovernorApplyOptions,
  type GovernorPatchOperation,
  type PatchDecision,
  type PatchPath,
  type ProposedPatch,
} from './schemas';

const sourceAuthority: Record<FieldSource, number> = {
  system_default: 1,
  model_inferred: 2,
  imported_context: 3,
  user_explicit: 4,
  user_confirmed: 5,
};

const arrayPaths = new Set<PatchPath>([
  '/coreFeatures',
  '/dataToTrack',
  '/userRoles',
  '/integrations',
  '/designPreferences',
  '/technicalConstraints',
  '/mustNotDo',
  '/assumptions',
]);

function now() {
  return new Date().toISOString();
}

function normalizeListValue(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function readValue(spec: BuildSpec, path: PatchPath) {
  return spec[path.slice(1) as keyof BuildSpec];
}

function writeValue(spec: BuildSpec, path: PatchPath, value: unknown) {
  const key = path.slice(1) as keyof BuildSpec;
  (spec[key] as typeof value) = value;
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && value !== '';
}

function makeConflict(
  path: PatchPath,
  existingValue: unknown,
  incomingValue: unknown,
  existingSource: FieldSource,
  incomingSource: FieldSource,
  operation: GovernorPatchOperation,
): SpecConflict {
  return {
    id: `conflict_${operation.sourceMessageId}_${path.slice(1)}`,
    path,
    existingValue,
    incomingValue,
    existingSource,
    incomingSource,
    evidence: operation.evidence,
    sourceMessageId: operation.sourceMessageId,
    status: 'unresolved',
    createdAt: now(),
  };
}

function inferBuildTypeFromText(value: unknown): BuildSpec['buildType'] | undefined {
  const text = String(value).toLowerCase();
  if (text.includes('portal')) return 'client_portal';
  if (text.includes('spreadsheet') || text.includes('sheet')) return 'spreadsheet';
  if (text.includes('automation') || text.includes('workflow')) return 'automation';
  if (text.includes('landing')) return 'landing_page';
  if (text.includes('website') || text.includes('site')) return 'website';
  if (text.includes('dashboard') || text.includes('internal') || text.includes('system') || text.includes('app')) {
    return 'business_system';
  }
  return undefined;
}

function inferOutputTypeFromText(value: unknown): BuildSpec['outputType'] | undefined {
  const text = String(value).toLowerCase();
  if (text.includes('prototype')) return 'prototype';
  if (text.includes('prompt')) return 'build_prompt';
  if (text.includes('spreadsheet')) return 'spreadsheet';
  if (text.includes('code')) return 'code_files';
  if (text.includes('package') || text.includes('plan')) return 'implementation_plan';
  return undefined;
}

function normalizeEnum(path: PatchPath, value: unknown) {
  if (path === '/buildType') return inferBuildTypeFromText(value) ?? value;
  if (path === '/outputType') return inferOutputTypeFromText(value) ?? value;
  return value;
}

export function toProposedPatch(
  patch: { operations: Array<{ op: string; path: string; value?: unknown; confidence: number; evidence?: string[]; sourceMessageId?: string }>; summary: string },
  sourceMessageId: string,
): { proposed: ProposedPatch; decisions: PatchDecision[] } {
  const operations: GovernorPatchOperation[] = [];
  const decisions: PatchDecision[] = [];

  for (const operation of patch.operations) {
    const parsedPath = allowlistedPatchPathSchema.safeParse(operation.path);
    const base = {
      op: operation.op,
      path: parsedPath.success ? parsedPath.data : '/assumptions',
      value: operation.value,
      confidence: operation.confidence,
      evidence: operation.evidence ?? [],
      sourceMessageId: operation.sourceMessageId ?? sourceMessageId,
    } as GovernorPatchOperation;

    if (!parsedPath.success || !['set', 'append', 'remove', 'replace'].includes(operation.op)) {
      decisions.push({
        operation: base,
        decision: 'rejected',
        reason: `Path or op is not allowlisted: ${operation.path}`,
      });
      continue;
    }

    operations.push(base);
  }

  return { proposed: { operations, summary: patch.summary }, decisions };
}

export function applyPatchOperation(
  spec: BuildSpec,
  operation: GovernorPatchOperation,
  source: FieldSource,
): PatchDecision {
  const path = operation.path;
  let appliedPath = path;
  let incomingValue = normalizeEnum(path, operation.value);

  if (path === '/outputType' && incomingValue === operation.value) {
    const reroutedBuildType = inferBuildTypeFromText(operation.value);
    if (reroutedBuildType) {
      appliedPath = '/buildType';
      incomingValue = reroutedBuildType;
    }
  }

  if (arrayPaths.has(appliedPath)) {
    const previous = readValue(spec, appliedPath);
    if (!Array.isArray(previous)) {
      return { operation, decision: 'rejected', reason: `${appliedPath} is not an array field.` };
    }
    const removeValues = new Set(normalizeListValue(incomingValue).map((item) => item.toLowerCase()));
    const seen = new Set(previous.map((item) => String(item).toLowerCase()));
    const nextValue =
      operation.op === 'remove'
        ? previous.filter((item) => !removeValues.has(String(item).toLowerCase()))
        : [...previous, ...normalizeListValue(incomingValue).filter((item) => !seen.has(item.toLowerCase()))];
    writeValue(spec, appliedPath, nextValue);
    return {
      operation,
      decision: appliedPath === path ? 'accepted' : 'rerouted',
      reason: appliedPath === path ? 'Applied array operation.' : `Rerouted ${path} to ${appliedPath}.`,
      appliedPath,
      appliedValue: nextValue,
    };
  }

  const previous = readValue(spec, appliedPath);
  const metadata = spec.fieldMetadata?.[appliedPath];
  const previousSource = metadata?.source ?? (hasValue(previous) ? 'system_default' : source);
  const lowerAuthority = sourceAuthority[source] < sourceAuthority[previousSource];

  if (incomingValue === undefined) {
    return { operation, decision: 'rejected', reason: `Value could not be normalized for ${path}.` };
  }

  if (lowerAuthority && hasValue(previous) && !sameValue(previous, incomingValue)) {
    const conflict = makeConflict(appliedPath, previous, incomingValue, previousSource, source, operation);
    spec.conflicts = [...(spec.conflicts ?? []), conflict];
    return {
      operation,
      decision: 'needs_confirmation',
      reason: `${source} cannot overwrite ${previousSource} without user confirmation.`,
      appliedPath,
      conflictId: conflict.id,
    };
  }

  if (operation.op === 'remove') {
    writeValue(spec, appliedPath, null);
  } else if (operation.op === 'replace' || operation.op === 'set' || !hasValue(previous) || operation.confidence >= 0.82) {
    writeValue(spec, appliedPath, incomingValue);
  } else {
    return { operation, decision: 'rejected', reason: 'Confidence too low to overwrite existing value.' };
  }

  spec.fieldMetadata = {
    ...(spec.fieldMetadata ?? {}),
    [appliedPath]: {
      source,
      confidence: operation.confidence,
      evidence: operation.evidence,
      sourceMessageId: operation.sourceMessageId,
      updatedAt: now(),
    },
  };

  return {
    operation,
    decision: appliedPath === path ? 'accepted' : 'rerouted',
    reason: appliedPath === path ? 'Applied operation.' : `Rerouted ${path} to ${appliedPath}.`,
    appliedPath,
    appliedValue: incomingValue,
  };
}

export function runSpecGovernor(
  currentSpec: BuildSpec,
  patch: { operations: Array<{ op: string; path: string; value?: unknown; confidence: number; evidence?: string[]; sourceMessageId?: string }>; summary: string },
  options: GovernorApplyOptions,
) {
  const spec = buildSpecSchema.parse({
    ...currentSpec,
    fieldMetadata: currentSpec.fieldMetadata ?? {},
    conflicts: currentSpec.conflicts ?? [],
    assumptionLedger: currentSpec.assumptionLedger ?? [],
    coreFeatures: [...currentSpec.coreFeatures],
    dataToTrack: [...currentSpec.dataToTrack],
    userRoles: [...currentSpec.userRoles],
    integrations: [...currentSpec.integrations],
    designPreferences: [...currentSpec.designPreferences],
    technicalConstraints: [...currentSpec.technicalConstraints],
    mustNotDo: [...currentSpec.mustNotDo],
    assumptions: [...currentSpec.assumptions],
  });
  const { proposed, decisions } = toProposedPatch(patch, options.sourceMessageId);

  for (const operation of proposed.operations) {
    decisions.push(applyPatchOperation(spec, operation, options.source));
  }

  const needsDefaultAssumption = decisions.some((decision) => decision.decision === 'rejected');
  if (needsDefaultAssumption) {
    const assumption = createAssumption(
      'A provider suggestion was ignored because it was outside the governed spec contract.',
      options.evidenceFallback ?? 'Spec Governor validation',
      ['/assumptions'],
      false,
    );
    spec.assumptionLedger = [...(spec.assumptionLedger ?? []), assumption];
    spec.assumptions = Array.from(new Set([...spec.assumptions, assumption.statement]));
  }

  const readiness = assessGovernorReadiness(spec);
  spec.governorReadiness = readiness;
  spec.updatedAt = now();

  return {
    spec: buildSpecSchema.parse(spec),
    decisions,
    conflicts: spec.conflicts ?? [],
    assumptions: spec.assumptionLedger ?? [],
    readiness,
    nextQuestion: nextGovernorQuestion(spec),
  };
}
