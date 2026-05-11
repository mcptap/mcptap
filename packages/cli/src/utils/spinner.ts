// Single-instance ora spinner. Returns a handle with succeed/fail/info/stop.
// Auto no-ops when the logger is silent (e.g. --json mode) or when stdout
// is not a TTY (CI logs).

import ora, { type Ora } from 'ora';
import { isLoggerSilent } from './logger.js';

type SpinnerHandle = {
  succeed: (text?: string) => void;
  fail: (text?: string) => void;
  info: (text?: string) => void;
  warn: (text?: string) => void;
  stop: () => void;
  update: (text: string) => void;
};

const noop: SpinnerHandle = {
  succeed: () => {},
  fail: () => {},
  info: () => {},
  warn: () => {},
  stop: () => {},
  update: () => {},
};

let current: Ora | null = null;

export function spinner(text: string): SpinnerHandle {
  if (isLoggerSilent()) return noop;
  if (!process.stdout.isTTY) {
    // Non-TTY: print the start line plainly, return a handle that prints terminations.
    process.stdout.write(`  · ${text}\n`);
    return {
      succeed: (t) => process.stdout.write(`  ✓ ${t ?? text}\n`),
      fail: (t) => process.stdout.write(`  ✗ ${t ?? text}\n`),
      info: (t) => process.stdout.write(`  ⓘ ${t ?? text}\n`),
      warn: (t) => process.stdout.write(`  ! ${t ?? text}\n`),
      stop: () => {},
      update: () => {},
    };
  }

  if (current) {
    current.stop();
    current = null;
  }

  current = ora({ text, indent: 2 }).start();
  const owned = current;

  const finish = (method: 'succeed' | 'fail' | 'info' | 'warn', t?: string): void => {
    if (current !== owned) return;
    owned[method](t ?? text);
    current = null;
  };

  return {
    succeed: (t) => finish('succeed', t),
    fail: (t) => finish('fail', t),
    info: (t) => finish('info', t),
    warn: (t) => finish('warn', t),
    stop: () => {
      if (current !== owned) return;
      owned.stop();
      current = null;
    },
    update: (t) => {
      if (current !== owned) return;
      owned.text = t;
    },
  };
}
