import {
  ConfidenceSchema,
  JSONPatchSchema,
  SpecDocSchema,
  SpecLineSchema,
  type Confidence,
  type JSONPatch,
  type SpecDoc,
  type SpecLine,
} from './schemas';

type PatchContainer = Record<string, unknown> | unknown[];

function cloneSpec(spec: SpecDoc) {
  return SpecDocSchema.parse(JSON.parse(JSON.stringify(spec)));
}

function decodePointer(path: string) {
  if (path === '') return [];
  if (!path.startsWith('/')) {
    throw new Error(`Invalid JSON patch path: ${path}`);
  }

  return path
    .slice(1)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getAtPath(root: unknown, parts: string[]) {
  return parts.reduce<unknown>((current, part) => {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        throw new Error(`Array index out of bounds at /${parts.join('/')}`);
      }
      return current[index];
    }

    if (isRecord(current) && part in current) {
      return current[part];
    }

    throw new Error(`Path does not exist: /${parts.join('/')}`);
  }, root);
}

function getParent(root: unknown, parts: string[]) {
  if (parts.length === 0) {
    throw new Error('Root patch operations are handled before parent lookup');
  }

  const parent = parts.length === 1 ? root : getAtPath(root, parts.slice(0, -1));
  if (!Array.isArray(parent) && !isRecord(parent)) {
    throw new Error(`Patch parent is not a container: /${parts.slice(0, -1).join('/')}`);
  }

  return {
    parent: parent as PatchContainer,
    key: parts[parts.length - 1],
  };
}

function assertPatchValue(patch: JSONPatch) {
  if (patch.op !== 'remove' && !('value' in patch)) {
    throw new Error(`Patch ${patch.op} requires a value at ${patch.path}`);
  }
}

function applyOne(root: SpecDoc, patch: JSONPatch) {
  JSONPatchSchema.parse(patch);
  assertPatchValue(patch);

  const parts = decodePointer(patch.path);

  if (parts.length === 0) {
    if (patch.op === 'remove') throw new Error('Cannot remove the full spec document');
    return SpecDocSchema.parse(patch.value);
  }

  const { parent, key } = getParent(root, parts);

  if (Array.isArray(parent)) {
    if (patch.op === 'add') {
      if (key === '-') {
        parent.push(patch.value);
        return root;
      }

      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index > parent.length) {
        throw new Error(`Cannot add at array index ${key}`);
      }
      parent.splice(index, 0, patch.value);
      return root;
    }

    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
      throw new Error(`Cannot ${patch.op} array index ${key}`);
    }

    if (patch.op === 'replace') parent[index] = patch.value;
    if (patch.op === 'remove') parent.splice(index, 1);
    return root;
  }

  if (patch.op === 'add' || patch.op === 'replace') {
    if (patch.op === 'replace' && !(key in parent)) {
      throw new Error(`Cannot replace missing path: ${patch.path}`);
    }
    parent[key] = patch.value;
    return root;
  }

  if (!(key in parent)) {
    throw new Error(`Cannot remove missing path: ${patch.path}`);
  }
  delete parent[key];
  return root;
}

export function applySpecPatch(spec: SpecDoc, patch: JSONPatch[]) {
  const next = patch.reduce((draft, operation) => applyOne(draft, operation), cloneSpec(spec));
  return SpecDocSchema.parse(next);
}

export function previewSpecPatch(spec: SpecDoc, patch: JSONPatch[]) {
  return applySpecPatch(spec, patch);
}

export function validateSpecPatch(spec: SpecDoc, patch: JSONPatch[]) {
  try {
    applySpecPatch(spec, patch);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Patch validation failed',
    };
  }
}

export function createInversePatch(before: SpecDoc, after: SpecDoc): JSONPatch[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{ op: 'replace', path: '', value: before }];
}

export function withPatchConfidence(patch: JSONPatch[], confidence: Confidence) {
  return patch.map((operation) => {
    if (operation.op === 'remove') return operation;

    if (operation.path.startsWith('/architecture/confidence/')) {
      return { ...operation, value: confidence };
    }

    const parsedLine = SpecLineSchema.safeParse(operation.value);
    if (parsedLine.success) {
      return {
        ...operation,
        value: {
          ...parsedLine.data,
          confidence,
        },
      };
    }

    return operation;
  });
}

function readableArchitectureValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'enabled' : 'off';
  if (typeof value === 'string') return value.replace(/-/g, ' ');
  return 'updated';
}

function titleCase(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lineText(value: unknown) {
  const parsed = SpecLineSchema.safeParse(value);
  if (parsed.success) return parsed.data.text;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'enabled' : 'off';
  return 'updated';
}

function sectionLabel(path: string) {
  const section = decodePointer(path)[0] ?? 'Spec';
  const labels: Record<string, string> = {
    users: 'User role',
    features: 'Feature',
    dataModel: 'Data model',
    integrations: 'Integration',
    outOfScope: 'Out of scope',
    risks: 'Risk',
    openQuestions: 'Open question',
    oneLiner: 'Direction',
    projectName: 'Project',
  };
  return labels[section] ?? titleCase(section);
}

export function humanizePatch(patch: JSONPatch[]) {
  return patch
    .filter((operation) => !operation.path.startsWith('/architecture/confidence/'))
    .map((operation) => {
      const mark = operation.op === 'add' ? '+' : operation.op === 'remove' ? '-' : '~';
      const parts = decodePointer(operation.path);

      if (parts[0] === 'architecture') {
        return `${mark} ${titleCase(parts[1] ?? 'Architecture')}: ${readableArchitectureValue(operation.value)}`;
      }

      return `${mark} ${sectionLabel(operation.path)}: ${lineText(operation.value)}`;
    });
}

export function hasConfidence(value: unknown): value is SpecLine {
  return SpecLineSchema.safeParse(value).success;
}

export function isConfidence(value: unknown): value is Confidence {
  return ConfidenceSchema.safeParse(value).success;
}

