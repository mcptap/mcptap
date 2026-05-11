import { afterEach, describe, expect, test, vi } from 'vitest';
import { reportTerminal } from './reporter.js';
import type { RunOutput } from '@mcptap/core';

const oscLink = '\u001b]8;;https://evil.test\u0007click\u001b]8;;\u0007';

function runOutput(): RunOutput {
  return {
    schema_version: 1,
    id: 'run-1',
    slug: `demo-${oscLink}`,
    status: 'fail',
    started_at: '2026-05-11T00:00:00.000Z',
    finished_at: '2026-05-11T00:00:00.001Z',
    duration_ms: 1,
    server: { transport: 'stdio' },
    meta: { mcptap_version: '0.1.0' },
    totals: {
      passed: 0,
      failed: 1,
      skipped: 0,
      total: 1,
      snapshots_created: 0,
      snapshots_updated: 0,
    },
    results: [
      {
        name: `malicious ${oscLink}`,
        status: 'fail',
        duration_ms: 1,
        started_at: '2026-05-11T00:00:00.000Z',
        finished_at: '2026-05-11T00:00:00.001Z',
        error: { message: `boom ${oscLink}` },
      },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reportTerminal hardening', () => {
  test('renders untrusted fields without raw terminal control sequences', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    reportTerminal(runOutput(), '/repo/mcptap.config.ts');

    const output = log.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(output).not.toContain('\u001b]8;;https://evil.test');
    expect(output).not.toContain('\u0007');
    expect(output).toContain('\\x1b]8;;https://evil.test');
    expect(output).toContain('\\x07');
  });
});
