import kleur from 'kleur';
import type { RunOutput, TestResult } from '@mcptap/core';
import { sanitizeTerminalText } from './terminal.js';

const PASS = kleur.green('✓');
const FAIL = kleur.red('✗');
const SKIP = kleur.dim('○');
const NEW = kleur.yellow('+');
const UPDATED = kleur.cyan('↻');

export function reportTerminal(run: RunOutput, configPath: string): void {
  const head = `${kleur.bold('mcptap')} ${kleur.dim('run')} ${kleur.cyan(sanitizeTerminalText(run.slug))}`;
  const cfg = kleur.dim(`(${sanitizeTerminalText(configPath.replace(process.cwd() + '/', ''))})`);
  console.log();
  console.log(`${head}  ${cfg}`);
  console.log();

  for (const r of run.results) {
    const tag = snapshotTag(r);
    console.log(
      `  ${glyph(r)} ${sanitizeTerminalText(r.name)}${tag} ${kleur.dim(`(${formatDuration(r.duration_ms)})`)}`,
    );
    if (r.status === 'fail' && r.error) {
      printError(r);
    }
  }

  console.log();
  console.log(summary(run));
  console.log();
}

function glyph(r: TestResult): string {
  if (r.status === 'pass') {
    if (r.snapshot?.status === 'created') return NEW;
    if (r.snapshot?.status === 'updated') return UPDATED;
    return PASS;
  }
  if (r.status === 'fail') return FAIL;
  return SKIP;
}

function snapshotTag(r: TestResult): string {
  if (!r.snapshot) return '';
  switch (r.snapshot.status) {
    case 'created':
      return ' ' + kleur.yellow().italic('snapshot created');
    case 'updated':
      return ' ' + kleur.cyan().italic('snapshot updated');
    case 'mismatch':
      return ' ' + kleur.red().italic('snapshot drift');
    case 'matched':
      return ' ' + kleur.dim('snapshot');
    default:
      return '';
  }
}

function summary(run: RunOutput): string {
  const { passed, failed, skipped, total, snapshots_created, snapshots_updated } =
    run.totals;
  const dur = kleur.dim(`(${formatDuration(run.duration_ms)})`);

  const snapBits: string[] = [];
  if (snapshots_created > 0) {
    snapBits.push(kleur.yellow(`${snapshots_created} created`));
  }
  if (snapshots_updated > 0) {
    snapBits.push(kleur.cyan(`${snapshots_updated} updated`));
  }
  const snapNote =
    snapBits.length > 0 ? `  ${kleur.dim('snapshots:')} ${snapBits.join(', ')}` : '';

  if (failed > 0) {
    return (
      `  ${kleur.red().bold(`${failed} failed`)}, ${kleur.green(`${passed} passed`)}` +
      (skipped > 0 ? `, ${kleur.dim(`${skipped} skipped`)}` : '') +
      ` of ${total} ${dur}${snapNote}`
    );
  }
  return (
    `  ${kleur.green().bold(`${passed} passed`)}` +
    (skipped > 0 ? `, ${kleur.dim(`${skipped} skipped`)}` : '') +
    ` of ${total} ${dur}${snapNote}`
  );
}

function printError(r: TestResult): void {
  if (!r.error) return;
  const msg = sanitizeTerminalText(r.error.message)
    .split('\n')
    .map((l) => '      ' + l)
    .join('\n');
  console.log(kleur.red(msg));
}

function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

