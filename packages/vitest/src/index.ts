// @mcptap/vitest — Vitest matchers for mcptap.
//
//   import '@mcptap/vitest';            // side-effect import registers matchers
//   await expect(server).toListTool('echo');
//   await expect(server).toListTools(['echo', 'add']);
//
// More matchers ship as the day-by-day plan progresses.

import { expect } from 'vitest';
import type { ServerHandle } from '@mcptap/core';

interface MatcherResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

function isServerHandle(value: unknown): value is ServerHandle {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ServerHandle).listTools === 'function'
  );
}

expect.extend({
  async toListTool(received: unknown, name: string): Promise<MatcherResult> {
    if (!isServerHandle(received)) {
      return {
        pass: false,
        message: () =>
          `expected a ServerHandle (with listTools/callTool/close), got ${typeof received}`,
      };
    }
    const tools = await received.listTools();
    const found = tools.some((t) => t.name === name);
    return {
      pass: found,
      actual: tools.map((t) => t.name),
      expected: name,
      message: () =>
        found
          ? `expected server NOT to list tool "${name}", but it did`
          : `expected server to list tool "${name}". Got: [${tools.map((t) => t.name).join(', ')}]`,
    };
  },

  async toListTools(received: unknown, names: string[]): Promise<MatcherResult> {
    if (!isServerHandle(received)) {
      return {
        pass: false,
        message: () => `expected a ServerHandle, got ${typeof received}`,
      };
    }
    const tools = await received.listTools();
    const actual = tools.map((t) => t.name).sort();
    const expected = [...names].sort();
    const pass =
      actual.length === expected.length &&
      actual.every((n, i) => n === expected[i]);
    return {
      pass,
      actual,
      expected,
      message: () =>
        pass
          ? `expected server NOT to list exactly [${expected.join(', ')}]`
          : `expected server to list exactly [${expected.join(', ')}]. Got: [${actual.join(', ')}]`,
    };
  },
});

interface MCPMatchers<R = unknown> {
  toListTool(name: string): Promise<R>;
  toListTools(names: string[]): Promise<R>;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends MCPMatchers<T> {}
  interface AsymmetricMatchersContaining extends MCPMatchers {}
}

export {};
