import { randomUUID } from 'node:crypto';
import { spawnServer } from './server.js';
import {
  compareSnapshot,
  loadSnapshots,
  renderSnapshotDiff,
  saveSnapshots,
} from './snapshot.js';
import {
  SCHEMA_VERSION,
  type Config,
  type RunOutput,
  type ServerHandle,
  type SnapshotResultStatus,
  type Test,
  type TestResult,
  type Transport,
} from './types.js';
import { VERSION as MCPTAP_VERSION } from './version.js';

const DEFAULT_TIMEOUT_MS = 30_000;

export type RunOptions = {
  meta?: RunOutput['meta'];
  /** Substring filter against test name, case-sensitive. */
  filter?: string;
  /** Path to the config file — required when any test uses snapshots. */
  configPath?: string;
  /** When true, mismatched snapshots are overwritten and reported as `updated`. */
  updateSnapshots?: boolean;
};

/**
 * Run all tests in a config against a freshly-spawned server.
 *
 * Default isolation: shared server across the whole suite, tests run sequentially.
 * MCP servers are often single-client / stateful; concurrent or per-test isolation
 * is opt-in (future Test.isolation field).
 */
export async function runTests(
  config: Config,
  options: RunOptions = {},
): Promise<RunOutput> {
  const id = randomUUID();
  const startedAt = new Date();
  const transport: Transport =
    config.server.transport === 'streamable-http' ? 'streamable-http' : 'stdio';

  const filtered = options.filter
    ? config.tests.filter((t) => t.name.includes(options.filter!))
    : config.tests;

  const hasSnapshots = filtered.some(isSnapshotTest);
  if (hasSnapshots && !options.configPath) {
    throw new Error(
      'snapshot tests require options.configPath so snapshots can be persisted next to the config',
    );
  }

  const snapshotFile = hasSnapshots ? loadSnapshots(options.configPath!) : null;

  let server: ServerHandle | null = null;
  const results: TestResult[] = [];
  let suiteError: Error | null = null;

  try {
    server = await spawnServer(config.server);
  } catch (err) {
    suiteError = err instanceof Error ? err : new Error(String(err));
  }

  if (server) {
    for (const test of filtered) {
      results.push(
        await runOne(test, server, snapshotFile, options.updateSnapshots ?? false),
      );
    }
  } else if (suiteError) {
    for (const test of filtered) {
      const now = new Date().toISOString();
      results.push({
        name: test.name,
        description: test.description,
        status: 'fail',
        duration_ms: 0,
        started_at: now,
        finished_at: now,
        error: {
          message: `failed to spawn server: ${suiteError.message}`,
          stack: suiteError.stack,
        },
      });
    }
  }

  if (server) {
    try {
      await server.close();
    } catch {
      // swallow close errors — don't mask test failures
    }
  }

  if (snapshotFile && options.configPath) {
    saveSnapshots(options.configPath, snapshotFile);
  }

  const finishedAt = new Date();
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;
  const snapshotsCreated = results.filter(
    (r) => r.snapshot?.status === 'created',
  ).length;
  const snapshotsUpdated = results.filter(
    (r) => r.snapshot?.status === 'updated',
  ).length;

  return {
    schema_version: SCHEMA_VERSION,
    id,
    slug: config.slug,
    status: failed > 0 ? 'fail' : 'pass',
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    server: { transport },
    meta: {
      mcptap_version: MCPTAP_VERSION,
      ...options.meta,
    },
    totals: {
      passed,
      failed,
      skipped,
      total: results.length,
      snapshots_created: snapshotsCreated,
      snapshots_updated: snapshotsUpdated,
    },
    results,
  };
}

function isSnapshotTest(test: Test): test is Extract<Test, { snapshot: true }> {
  return 'snapshot' in test && test.snapshot === true;
}

async function runOne(
  test: Test,
  server: ServerHandle,
  snapshotFile: ReturnType<typeof loadSnapshots> | null,
  update: boolean,
): Promise<TestResult> {
  const startedAt = new Date();
  const timeout = test.timeout ?? DEFAULT_TIMEOUT_MS;

  try {
    if (isSnapshotTest(test)) {
      if (!snapshotFile) {
        throw new Error('internal: snapshot file not loaded for snapshot test');
      }
      const value = await runWithTimeout(
        () => Promise.resolve(test.run(server)),
        timeout,
      );
      const outcome = compareSnapshot(test.name, value, snapshotFile, {
        mask: test.mask,
        update,
      });

      const finishedAt = new Date();
      const base = {
        name: test.name,
        description: test.description,
        duration_ms: finishedAt.getTime() - startedAt.getTime(),
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
      };

      if (outcome.kind === 'matched') {
        return { ...base, status: 'pass', snapshot: { status: 'matched' } };
      }
      if (outcome.kind === 'created') {
        return { ...base, status: 'pass', snapshot: { status: 'created' } };
      }
      if (outcome.kind === 'updated') {
        return {
          ...base,
          status: 'pass',
          snapshot: {
            status: 'updated',
            diff: renderSnapshotDiff(outcome.previous, outcome.serialized),
          },
        };
      }
      // mismatch
      const diff = renderSnapshotDiff(outcome.expected, outcome.actual);
      return {
        ...base,
        status: 'fail',
        snapshot: { status: 'mismatch', diff },
        error: {
          message: `snapshot did not match. Run with --update to accept the new snapshot.\n${diff}`,
        },
      };
    }

    // assertion test
    await runWithTimeout(
      () => Promise.resolve(test.assert(server)),
      timeout,
    );
    const finishedAt = new Date();
    return {
      name: test.name,
      description: test.description,
      status: 'pass',
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
    };
  } catch (err) {
    const finishedAt = new Date();
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      name: test.name,
      description: test.description,
      status: 'fail',
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

async function runWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`test timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
