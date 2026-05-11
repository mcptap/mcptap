import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

export type SnapshotMask = {
  /**
   * Dot-path patterns to mask. `*` matches any key or array index.
   * Examples: `id`, `results.*.id`, `meta.timestamps.*`
   */
  paths?: string[];
  /**
   * Disable smart defaults (auto-mask UUIDs and ISO timestamps).
   * Default: enabled.
   */
  smartDefaults?: boolean;
};

const SNAPSHOT_FILE_VERSION = 1 as const;

type SnapshotFile = {
  schema_version: typeof SNAPSHOT_FILE_VERSION;
  snapshots: Record<string, string>;
};

function emptySnapshotFile(): SnapshotFile {
  return {
    schema_version: SNAPSHOT_FILE_VERSION,
    snapshots: Object.create(null) as Record<string, string>,
  };
}

export type SnapshotOutcome =
  | { kind: 'matched' }
  | { kind: 'created'; serialized: string }
  | { kind: 'updated'; serialized: string; previous: string }
  | { kind: 'mismatch'; expected: string; actual: string };

/**
 * Returns the snapshot file path for a given config path.
 * Convention: `<config-dir>/__mcptap_snapshots__/<config-stem>.snap.json`
 */
export function snapshotFilePath(configPath: string): string {
  const dir = dirname(configPath);
  const stem = basename(configPath, extname(configPath));
  return join(dir, '__mcptap_snapshots__', `${stem}.snap.json`);
}

export function loadSnapshots(configPath: string): SnapshotFile {
  const p = snapshotFilePath(configPath);
  if (!existsSync(p)) {
    return emptySnapshotFile();
  }
  const raw = readFileSync(p, 'utf8');
  const parsed = JSON.parse(raw) as SnapshotFile;
  if (
    parsed.schema_version !== SNAPSHOT_FILE_VERSION ||
    typeof parsed.snapshots !== 'object' ||
    parsed.snapshots === null
  ) {
    throw new Error(`malformed snapshot file at ${p}`);
  }

  const file = emptySnapshotFile();
  for (const [key, value] of Object.entries(parsed.snapshots)) {
    if (typeof value !== 'string') {
      throw new Error(`malformed snapshot file at ${p}`);
    }
    file.snapshots[key] = value;
  }
  return file;
}

export function saveSnapshots(configPath: string, file: SnapshotFile): void {
  const p = snapshotFilePath(configPath);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(file, null, 2) + '\n', 'utf8');
}

/**
 * Apply masks (smart defaults + user paths) and return a stable serialized form.
 * Object keys are sorted; JSON is pretty-printed with 2-space indent.
 */
export function serializeForSnapshot(value: unknown, mask?: SnapshotMask): string {
  const masked = applyMasks(value, mask);
  return JSON.stringify(sortKeys(masked), null, 2);
}

export function applyMasks(value: unknown, mask?: SnapshotMask): unknown {
  let v = clone(value);
  if (mask?.smartDefaults !== false) {
    v = walk(v, smartReplace);
  }
  if (mask?.paths) {
    for (const path of mask.paths) {
      v = maskPath(v, path);
    }
  }
  return v;
}

function smartReplace(val: unknown): unknown {
  if (typeof val === 'string') {
    if (UUID_RE.test(val)) return '<UUID>';
    if (ISO_TS_RE.test(val)) return '<TIMESTAMP>';
  }
  return val;
}

function maskPath(value: unknown, path: string): unknown {
  const segments = path.split('.').filter((s) => s.length > 0);
  return descend(value, segments, 0);
}

function descend(value: unknown, segs: string[], i: number): unknown {
  if (i >= segs.length) return '<MASKED>';
  if (value === null || typeof value !== 'object') return value;
  const seg = segs[i]!;

  if (Array.isArray(value)) {
    if (seg === '*') {
      return value.map((item) => descend(item, segs, i + 1));
    }
    const idx = Number(seg);
    if (Number.isInteger(idx) && idx >= 0 && idx < value.length) {
      const next = [...value];
      next[idx] = descend(next[idx], segs, i + 1);
      return next;
    }
    return value;
  }

  const obj = value as Record<string, unknown>;
  if (seg === '*') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = descend(v, segs, i + 1);
    }
    return out;
  }
  if (!(seg in obj)) return value;
  return { ...obj, [seg]: descend(obj[seg], segs, i + 1) };
}

function walk(value: unknown, fn: (v: unknown) => unknown): unknown {
  const replaced = fn(value);
  if (replaced !== value) return replaced;
  if (Array.isArray(value)) return value.map((item) => walk(item, fn));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = walk(v, fn);
    }
    return out;
  }
  return value;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

function clone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Compare an actual value against the stored snapshot for a test.
 * Returns the outcome but does NOT persist; persistence is the caller's job
 * so that all snapshot writes can be batched at end of run.
 */
export function compareSnapshot(
  testName: string,
  actualValue: unknown,
  file: SnapshotFile,
  options: { mask?: SnapshotMask; update?: boolean } = {},
): SnapshotOutcome {
  const actualSerialized = serializeForSnapshot(actualValue, options.mask);

  if (!Object.hasOwn(file.snapshots, testName)) {
    Object.defineProperty(file.snapshots, testName, {
      value: actualSerialized,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    return { kind: 'created', serialized: actualSerialized };
  }

  // hasOwn was true above; the indexed read is guaranteed to be a string.
  const expected = file.snapshots[testName] as string;

  if (expected === actualSerialized) {
    return { kind: 'matched' };
  }

  if (options.update) {
    file.snapshots[testName] = actualSerialized;
    return { kind: 'updated', serialized: actualSerialized, previous: expected };
  }

  return { kind: 'mismatch', expected, actual: actualSerialized };
}

/**
 * Render a simple unified-style diff between expected and actual snapshot strings.
 * Returns a multi-line string. No external diff library (keeps deps lean).
 */
export function renderSnapshotDiff(expected: string, actual: string): string {
  const eLines = expected.split('\n');
  const aLines = actual.split('\n');
  const max = Math.max(eLines.length, aLines.length);
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const e = eLines[i];
    const a = aLines[i];
    if (e === a) {
      out.push('  ' + (e ?? ''));
    } else {
      if (e !== undefined) out.push('- ' + e);
      if (a !== undefined) out.push('+ ' + a);
    }
  }
  return out.join('\n');
}
