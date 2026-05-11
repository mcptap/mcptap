// Single source of CLI output. Every other module goes through this so
// `--json` mode and CI quiet-modes are one toggle, not scattered branches.

import kleur from 'kleur';

let silent = false;

export function setLoggerSilent(value: boolean): void {
  silent = value;
}

export function isLoggerSilent(): boolean {
  return silent;
}

const join = (parts: unknown[]): string => parts.map(String).join(' ');

export const highlighter = {
  error: kleur.red,
  warn: kleur.yellow,
  info: kleur.cyan,
  success: kleur.green,
  dim: kleur.dim,
  bold: kleur.bold,
};

export const logger = {
  error(...parts: unknown[]): void {
    if (silent) return;
    process.stderr.write(highlighter.error(join(parts)) + '\n');
  },
  warn(...parts: unknown[]): void {
    if (silent) return;
    process.stderr.write(highlighter.warn(join(parts)) + '\n');
  },
  info(...parts: unknown[]): void {
    if (silent) return;
    process.stdout.write(highlighter.info(join(parts)) + '\n');
  },
  success(...parts: unknown[]): void {
    if (silent) return;
    process.stdout.write(highlighter.success(join(parts)) + '\n');
  },
  dim(...parts: unknown[]): void {
    if (silent) return;
    process.stdout.write(highlighter.dim(join(parts)) + '\n');
  },
  log(...parts: unknown[]): void {
    if (silent) return;
    process.stdout.write(join(parts) + '\n');
  },
  break(): void {
    if (silent) return;
    process.stdout.write('\n');
  },
};
