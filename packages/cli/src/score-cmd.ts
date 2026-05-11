import { defineCommand } from 'citty';
import kleur from 'kleur';
import { buildScoreReport, spawnServer, type ScoreReport, type ToolScore } from '@mcptap/core';
import { ConfigNotFoundError, loadConfig } from './config.js';
import { sanitizeTerminalText } from './terminal.js';

export const scoreCommand = defineCommand({
  meta: {
    name: 'score',
    description: 'Score the quality of your MCP tool descriptions.',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to mcptap.config.ts (auto-detected if omitted)',
    },
    json: {
      type: 'boolean',
      description: 'Output the score report as JSON',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Show all issues per tool',
      default: false,
    },
    'min-score': {
      type: 'string',
      description: 'Exit non-zero if any tool scores below this threshold (0–100)',
    },
  },
  async run({ args }) {
    let loaded;
    try {
      loaded = await loadConfig(args.config);
    } catch (err) {
      if (err instanceof ConfigNotFoundError) {
        console.error(kleur.red(err.message));
        process.exit(2);
      }
      throw err;
    }
    const { config } = loaded;

    const server = await spawnServer(config.server);
    let tools;
    try {
      tools = await server.listTools();
    } finally {
      await server.close();
    }

    const report = buildScoreReport(config.slug, tools);

    if (args.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else {
      renderScoreTerminal(report, { verbose: args.verbose });
    }

    const min = args['min-score'] ? Number(args['min-score']) : null;
    if (min !== null && Number.isFinite(min)) {
      const failing = report.tools.filter((t) => t.score < min);
      if (failing.length > 0) {
        console.error();
        console.error(
          kleur.red(
            `  ${failing.length} tool${failing.length === 1 ? '' : 's'} below --min-score=${min}: ${failing.map((t) => t.name).join(', ')}`,
          ),
        );
        process.exit(1);
      }
    }
  },
});

export function renderScoreTerminal(
  report: ScoreReport,
  opts: { verbose: boolean },
): void {
  console.log();
  console.log(`  ${kleur.bold('mcptap')} ${kleur.dim('score')} ${kleur.cyan(sanitizeTerminalText(report.slug))}`);
  console.log();

  const nameW = Math.max(4, ...report.tools.map((t) => sanitizeTerminalText(t.name).length));

  console.log(
    `  ${pad('Tool', nameW)}   ${pad('Score', 7)}  ${pad('Tokens', 7)}  Top issue`,
  );
  console.log(`  ${'─'.repeat(nameW + 7 + 7 + 30 + 6)}`);

  for (const tool of report.tools) {
    const top = tool.issues
      .slice()
      .sort((a, b) => b.penalty - a.penalty)[0];
    const topMsg = top
      ? `${kleur.dim(`−${top.penalty}`)} ${kleur.yellow(sanitizeTerminalText(top.message))}`
      : '';
    console.log(
      `  ${pad(sanitizeTerminalText(tool.name), nameW)}   ${scoreCell(tool)}  ${pad(String(tool.tokens), 7)}  ${topMsg}`,
    );
    if (opts.verbose) {
      for (const issue of tool.issues.slice(1)) {
        console.log(
          `  ${' '.repeat(nameW)}   ${' '.repeat(7)}  ${' '.repeat(7)}  ${kleur.dim(`−${issue.penalty}`)} ${kleur.yellow(sanitizeTerminalText(issue.message))}`,
        );
      }
    }
  }

  console.log();
  console.log(
    `  ${kleur.bold('average:')} ${gradeColor(report.summary.average)(`${report.summary.average}/100`)}` +
      `   ${kleur.dim(`${report.summary.total_tokens} tokens across ${report.summary.tool_count} tool${report.summary.tool_count === 1 ? '' : 's'}`)}`,
  );
  console.log();
}

function scoreCell(tool: ToolScore): string {
  const text = `${tool.score}/100`.padEnd(7);
  return gradeColor(tool.score)(text);
}

function gradeColor(score: number): (s: string) => string {
  if (score >= 85) return kleur.green;
  if (score >= 65) return kleur.yellow;
  return kleur.red;
}

function pad(s: string, width: number): string {
  if (s.length >= width) return s;
  return s + ' '.repeat(width - s.length);
}
