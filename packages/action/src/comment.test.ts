import { describe, expect, test } from 'vitest';
import { renderPrComment } from './comment.js';
import type { RunOutput, ScoreReport } from 'mcptap';

function baseRun(overrides: Partial<RunOutput> = {}): RunOutput {
  return {
    schema_version: 1,
    id: 'run-1',
    slug: 'demo</h3><img src=x onerror=alert(1)> @team',
    status: 'fail',
    started_at: '2026-05-11T00:00:00.000Z',
    finished_at: '2026-05-11T00:00:00.001Z',
    duration_ms: 1,
    server: { transport: 'stdio' },
    meta: {
      mcptap_version: '0.1.0',
      branch: 'feature/[link](https://evil.test) @octocat',
      commit_sha: 'abc1234`oops',
    },
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
        name: '</b></summary><img src=x onerror=alert(1)> [click](https://evil.test) @octocat',
        status: 'fail',
        duration_ms: 1,
        started_at: '2026-05-11T00:00:00.000Z',
        finished_at: '2026-05-11T00:00:00.001Z',
        error: {
          message: '```\n### escaped fence\n![track](https://evil.test/pixel)\n```',
        },
      },
    ],
    ...overrides,
  };
}

describe('renderPrComment hardening', () => {
  test('escapes untrusted inline fields so generated comments do not render attacker HTML, links, or mentions', () => {
    const md = renderPrComment(baseRun());

    expect(md).not.toContain('<img src=x');
    expect(md).not.toContain('</summary><img');
    expect(md).not.toContain('[click](https://evil.test)');
    expect(md).not.toContain('[link](https://evil.test)');
    expect(md).not.toContain(' @octocat');
    expect(md).not.toContain(' @team');
    expect(md).toContain('&lt;img src=x');
    expect(md).toContain('&#64;octocat');
  });

  test('uses a long enough code fence for untrusted multiline error and diff content', () => {
    const run = baseRun({
      results: [
        {
          name: 'snapshot drift',
          status: 'fail',
          duration_ms: 1,
          started_at: '2026-05-11T00:00:00.000Z',
          finished_at: '2026-05-11T00:00:00.001Z',
          snapshot: {
            status: 'mismatch',
            diff: '```\n+ ![track](https://evil.test/pixel)\n```',
          },
          error: { message: 'snapshot mismatch' },
        },
      ],
    });

    const md = renderPrComment(run);

    expect(md).toContain('````diff\n```\n+ ![track](https://evil.test/pixel)\n```\n````');
  });

  test('escapes score report fields in table cells', () => {
    const score: ScoreReport = {
      schema_version: 1,
      slug: 'demo',
      generated_at: '2026-05-11T00:00:00.000Z',
      summary: { average: 50, total_tokens: 10, tool_count: 1 },
      tools: [
        {
          name: '`bad|tool` [x](https://evil.test)',
          score: 50,
          tokens: 10,
          issues: [
            {
              code: 'NO_DESCRIPTION',
              penalty: 25,
              message: '</td><img src=x onerror=alert(1)> [fix](https://evil.test) @octocat',
            },
          ],
        },
      ],
    };

    const md = renderPrComment(baseRun({ status: 'pass', totals: { passed: 1, failed: 0, skipped: 0, total: 1, snapshots_created: 0, snapshots_updated: 0 } }), score);

    expect(md).not.toContain('<img src=x');
    expect(md).not.toContain('[fix](https://evil.test)');
    expect(md).not.toContain(' @octocat');
    expect(md).toContain('&lt;/td&gt;&lt;img src=x');
    expect(md).toContain('&#64;octocat');
  });
});
