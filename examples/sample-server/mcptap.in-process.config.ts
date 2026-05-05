import { defineConfig } from 'mcptap';

// Demonstrates in-process mode: no subprocess, no stdio, no JSON-RPC over pipes.
// mcptap imports the server module directly and connects via InMemoryTransport.
//
// Pros: ~10× faster, real stack traces, no flakiness
// Cost: server module must export a factory (not auto-connect at import)
//
// Run with: node ../../packages/cli/bin/mcptap.mjs run --config mcptap.in-process.config.ts

export default defineConfig({
  slug: 'sample-server-in-process',
  server: {
    transport: 'in-process',
    factory: async () => {
      const { createServer } = await import('./server.mjs');
      return createServer();
    },
  },
  tests: [
    {
      name: 'lists expected tools',
      assert: async (server) => {
        const tools = await server.listTools();
        const names = tools.map((t) => t.name).sort();
        if (names.join(',') !== 'add,echo') {
          throw new Error(`expected ['add','echo'], got [${names.join(',')}]`);
        }
      },
    },
    {
      name: 'echo round-trips',
      assert: async (server) => {
        const result = await server.callTool('echo', { text: 'hello in-process' });
        if (result.content[0]?.text !== 'hello in-process') {
          throw new Error(`expected 'hello in-process', got: ${JSON.stringify(result)}`);
        }
      },
    },
    {
      name: 'add returns the sum',
      assert: async (server) => {
        const result = await server.callTool('add', { a: 100, b: 23 });
        if (result.content[0]?.text !== '123') {
          throw new Error(`expected '123', got: ${JSON.stringify(result)}`);
        }
      },
    },
  ],
});
