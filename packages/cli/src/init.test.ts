import { describe, expect, test } from 'vitest';
import { generateConfig } from './init.js';

describe('generateConfig hardening', () => {
  test('emits tool names as escaped JavaScript string literals', () => {
    const toolName = "bad'\n}); console.log('pwn')//";

    const config = generateConfig(
      {
        packageName: 'demo',
        slug: 'demo',
        command: 'node',
        args: ['./dist/index.js'],
        warnings: [],
      },
      [{ name: toolName, inputSchema: {} }],
    );

    expect(config).toContain(`name: ${JSON.stringify(`lists tool: ${toolName}`)}`);
    expect(config).toContain(`tool.name === ${JSON.stringify(toolName)}`);
    expect(config).toContain(`new Error(${JSON.stringify(`${toolName} missing from tool list`)})`);
    expect(config).not.toContain("bad'\n}); console.log('pwn')//");
  });
});
