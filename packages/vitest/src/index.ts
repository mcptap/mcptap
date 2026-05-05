// @mcptap/vitest — Vitest matchers for mcptap.
//
//   import '@mcptap/vitest';
//
//   await expect(server).toListTool('echo');
//   await expect(server).toListTools(['echo', 'add']);
//   await expect(server).toCallTool('echo', { text: 'hi' });
//   await expect(server).toCallTool('echo', { text: 'hi' }, { containsText: 'hi' });

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

  async toCallTool(
    received: unknown,
    name: string,
    args?: Record<string, unknown>,
    options?: { containsText?: string; isError?: boolean },
  ): Promise<MatcherResult> {
    if (!isServerHandle(received)) {
      return {
        pass: false,
        message: () => `expected a ServerHandle, got ${typeof received}`,
      };
    }
    let result;
    try {
      result = await received.callTool(name, args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        pass: false,
        message: () => `callTool("${name}") threw: ${msg}`,
      };
    }

    // Default expectation: not an error response.
    const wantError = options?.isError ?? false;
    if (Boolean(result.isError) !== wantError) {
      return {
        pass: false,
        actual: result,
        message: () =>
          wantError
            ? `expected callTool("${name}") to return isError: true, got isError: ${Boolean(result.isError)}`
            : `expected callTool("${name}") to succeed, got isError: true (content: ${JSON.stringify(result.content)})`,
      };
    }

    if (options?.containsText !== undefined) {
      const text = result.content
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n');
      if (!text.includes(options.containsText)) {
        return {
          pass: false,
          actual: text,
          expected: options.containsText,
          message: () =>
            `expected callTool("${name}") result to contain "${options.containsText}". Got: ${JSON.stringify(text)}`,
        };
      }
    }

    return {
      pass: true,
      actual: result,
      message: () => `expected callTool("${name}") NOT to succeed, but it did`,
    };
  },
});

interface MCPMatchers<R = unknown> {
  toListTool(name: string): Promise<R>;
  toListTools(names: string[]): Promise<R>;
  toCallTool(
    name: string,
    args?: Record<string, unknown>,
    options?: { containsText?: string; isError?: boolean },
  ): Promise<R>;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends MCPMatchers<T> {}
  interface AsymmetricMatchersContaining extends MCPMatchers {}
}

export {};
