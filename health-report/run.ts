// Health Report runner.
//
// For each server in servers.ts:
//   1. Spawn it via mcptap (subprocess via npx, stdio transport)
//   2. List its tools
//   3. Score the tool descriptions
//   4. Close cleanly
//
// Per-server failures are caught and reported; one bad server can't tank
// the whole run. The final markdown is written to:
//   output/<YYYY-MM-DD>.md  — dated snapshot
//   output/latest.md        — always the most recent report

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildScoreReport, spawnServer, type Tool } from 'mcptap';
import { SERVERS, type ServerEntry } from './servers.js';

const PER_SERVER_TIMEOUT_MS = 60_000;

type ServerOutcome =
  | {
      kind: 'ok';
      server: ServerEntry;
      tools: Tool[];
      scoreAverage: number;
      scoreTokens: number;
      durationMs: number;
    }
  | {
      kind: 'error';
      server: ServerEntry;
      error: string;
      durationMs: number;
    };

async function runOne(server: ServerEntry): Promise<ServerOutcome> {
  const startedAt = Date.now();
  console.error(`→ ${server.publisher}/${server.displayName}`);
  try {
    const tools = await withTimeout(
      async () => {
        const handle = await spawnServer({
          command: server.command,
          args: server.args,
        });
        try {
          return await handle.listTools();
        } finally {
          await handle.close().catch(() => {});
        }
      },
      PER_SERVER_TIMEOUT_MS,
      `timed out after ${PER_SERVER_TIMEOUT_MS}ms`,
    );

    const report = buildScoreReport(server.slug, tools);
    return {
      kind: 'ok',
      server,
      tools,
      scoreAverage: report.summary.average,
      scoreTokens: report.summary.total_tokens,
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      kind: 'error',
      server,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startedAt,
    };
  }
}

async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      fn(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function renderReport(outcomes: ServerOutcome[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const passed = outcomes.filter((o) => o.kind === 'ok').length;
  const failed = outcomes.filter((o) => o.kind === 'error').length;
  const total = outcomes.length;

  const okOutcomes = outcomes.filter(
    (o): o is Extract<ServerOutcome, { kind: 'ok' }> => o.kind === 'ok',
  );
  const avgScore =
    okOutcomes.length > 0
      ? Math.round(
          okOutcomes.reduce((s, o) => s + o.scoreAverage, 0) / okOutcomes.length,
        )
      : 0;
  const totalTokens = okOutcomes.reduce((s, o) => s + o.scoreTokens, 0);
  const totalTools = okOutcomes.reduce((s, o) => s + o.tools.length, 0);

  const lines: string[] = [];
  lines.push(`# MCP Health Report — ${today}`);
  lines.push('');
  lines.push(
    `Automated weekly run of [mcptap](https://github.com/mcptap/mcptap) ` +
      `against ${total} community MCP servers. Each server is spawned, ` +
      `\`tools/list\` is called, and tool descriptions are deterministically ` +
      `scored. No authenticated tool calls; this report measures *surface ` +
      `health*, not behavioral correctness.`,
  );
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push(`- Servers reachable: **${passed} / ${total}**`);
  lines.push(`- Total tools surfaced: **${totalTools}**`);
  lines.push(
    `- Average tool-description quality: **${avgScore} / 100**`,
  );
  lines.push(`- Total tokens across all surfaces: **${totalTokens.toLocaleString('en-US')}**`);
  lines.push('');

  lines.push('## Results');
  lines.push('');
  lines.push('| Server | Status | Tools | Score | Tokens | Duration |');
  lines.push('| --- | --- | --- | --- | --- | --- |');

  for (const o of outcomes) {
    const name = `\`${o.server.publisher}/${o.server.displayName}\``;
    if (o.kind === 'ok') {
      lines.push(
        `| ${name} | ✅ ok | ${o.tools.length} | ${gradeBadge(o.scoreAverage)} | ${o.scoreTokens} | ${formatDuration(o.durationMs)} |`,
      );
    } else {
      lines.push(
        `| ${name} | ❌ unreachable | — | — | — | ${formatDuration(o.durationMs)} |`,
      );
    }
  }
  lines.push('');

  // Per-server details for failures
  const failures = outcomes.filter(
    (o): o is Extract<ServerOutcome, { kind: 'error' }> => o.kind === 'error',
  );
  if (failures.length > 0) {
    lines.push('## Unreachable servers');
    lines.push('');
    for (const f of failures) {
      lines.push(`### \`${f.server.publisher}/${f.server.displayName}\``);
      lines.push('');
      lines.push('```');
      lines.push(f.error);
      lines.push('```');
      lines.push('');
      if (f.server.notes) {
        lines.push(`_${f.server.notes}_`);
        lines.push('');
      }
    }
  }

  // Per-server details for OK servers
  if (okOutcomes.length > 0) {
    lines.push('## Reachable servers');
    lines.push('');
    for (const o of okOutcomes) {
      lines.push(`### \`${o.server.publisher}/${o.server.displayName}\``);
      lines.push('');
      if (o.server.notes) lines.push(`_${o.server.notes}_`);
      lines.push('');
      lines.push(
        `- Tools (${o.tools.length}): ${o.tools.map((t) => '`' + t.name + '`').join(', ')}`,
      );
      lines.push(`- Average quality: ${gradeBadge(o.scoreAverage)}`);
      lines.push(`- Tokens (whole tool surface): ${o.scoreTokens}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(
    `_Run by [mcptap](https://github.com/mcptap/mcptap) on ${new Date().toISOString()}. ` +
      `Want your server here? Open an issue at ` +
      `[mcptap/mcptap/issues](https://github.com/mcptap/mcptap/issues)._`,
  );

  return lines.join('\n') + '\n';
}

function gradeBadge(score: number): string {
  if (score >= 85) return `🟢 ${score}`;
  if (score >= 65) return `🟡 ${score}`;
  return `🔴 ${score}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

async function main(): Promise<void> {
  console.error(`Running mcptap health report against ${SERVERS.length} servers...`);
  console.error('');

  const outcomes: ServerOutcome[] = [];
  for (const server of SERVERS) {
    outcomes.push(await runOne(server));
  }

  const markdown = renderReport(outcomes);
  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(dirname(fileURLToPath(import.meta.url)), 'output');
  mkdirSync(outDir, { recursive: true });

  const datedPath = join(outDir, `${today}.md`);
  const latestPath = join(outDir, 'latest.md');
  writeFileSync(datedPath, markdown, 'utf8');
  writeFileSync(latestPath, markdown, 'utf8');

  console.error('');
  console.error(`Report written:`);
  console.error(`  ${datedPath}`);
  console.error(`  ${latestPath}`);

  const failed = outcomes.filter((o) => o.kind === 'error').length;
  console.error('');
  console.error(`Done. ${outcomes.length - failed} ok, ${failed} unreachable.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
