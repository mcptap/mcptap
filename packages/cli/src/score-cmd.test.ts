import { afterEach, describe, expect, test, vi } from 'vitest';
import { renderScoreTerminal } from './score-cmd.js';
import type { ScoreReport } from '@mcptap/core';

const oscLink = '\u001b]8;;https://evil.test\u0007click\u001b]8;;\u0007';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderScoreTerminal hardening', () => {
  test('renders MCP-provided tool fields without raw terminal control sequences', () => {
    const report: ScoreReport = {
      schema_version: 1,
      slug: `demo-${oscLink}`,
      generated_at: '2026-05-11T00:00:00.000Z',
      tools: [
        {
          name: `tool-${oscLink}`,
          score: 75,
          tokens: 10,
          issues: [
            {
              code: 'NO_DESCRIPTION',
              penalty: 25,
              message: `issue-${oscLink}`,
            },
          ],
        },
      ],
      summary: { average: 75, total_tokens: 10, tool_count: 1 },
    };
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    renderScoreTerminal(report, { verbose: true });

    const output = log.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(output).not.toContain('\u001b]8;;https://evil.test');
    expect(output).not.toContain('\u0007');
    expect(output).toContain('\\x1b]8;;https://evil.test');
    expect(output).toContain('\\x07');
  });
});
