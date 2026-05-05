// Minimal MCP server fixture for smoke-testing mcptap.
//
// Exposes a `createServer` factory so this file can be:
//   - run directly: `node server.mjs` (auto-connects stdio for subprocess mode)
//   - imported:     `import { createServer } from './server.mjs'` (for in-process mode)
//
// Tools:
//   - echo(text): returns the text back
//   - add(a, b):  returns a + b

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

export function createServer() {
  const server = new McpServer({
    name: 'sample-server',
    version: '0.0.0',
  });

  server.registerTool(
    'echo',
    {
      description: 'Echoes the input text back to the caller.',
      inputSchema: { text: z.string() },
    },
    async ({ text }) => ({
      content: [{ type: 'text', text }],
    }),
  );

  server.registerTool(
    'add',
    {
      description: 'Adds two numbers and returns the sum.',
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [{ type: 'text', text: String(a + b) }],
    }),
  );

  return server;
}

// Auto-run as a stdio server when invoked directly (e.g. `node server.mjs`).
// When imported, this block is skipped and only `createServer` is exported.
const thisFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && resolvePath(process.argv[1]) === thisFile;
if (isMain) {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  await createServer().connect(new StdioServerTransport());
}
