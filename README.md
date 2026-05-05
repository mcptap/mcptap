# mcptap

> Vitest, but it knows about MCP.

Tap into your MCP server. Test, snapshot, and ship — without leaving your terminal.

## Quickstart

```bash
# In your MCP server project:
npx mcptap init        # auto-discovers tools, generates a real config
pnpm add -D mcptap     # install the framework
npx mcptap run         # green tests
```

## Config

```ts
// mcptap.config.ts
import { defineConfig } from 'mcptap';

export default defineConfig({
  slug: 'my-server',
  server: {
    command: 'node',
    args: ['./dist/index.js'],
  },
  tests: [
    {
      name: 'lists expected tools',
      assert: async (server) => {
        const tools = await server.listTools();
        if (!tools.find((t) => t.name === 'search_books')) {
          throw new Error('search_books missing from tool list');
        }
      },
    },
    {
      name: 'tool surface snapshot',
      snapshot: true,
      run: async (server) => server.listTools(),
    },
  ],
});
```

## In CI — GitHub Action

```yaml
# .github/workflows/mcptap.yml
name: mcptap
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: mcptap/mcptap/packages/action@v1
```

The Action posts (or updates) a single PR comment with the result table, snapshot diffs, and failure details. Free-forever for CI — runs on your GitHub Actions minutes, not ours.

## In-process mode (10× faster)

When your server code is importable, mcptap can talk to it via `InMemoryTransport` instead of spawning a subprocess. No JSON-RPC over pipes, real stack traces, no flakiness.

```ts
// mcptap.config.ts
export default defineConfig({
  slug: 'my-server',
  server: {
    transport: 'in-process',
    factory: async () => {
      const { createServer } = await import('./dist/index.js');
      return createServer();
    },
  },
  tests: [/* ... */],
});
```

Requires your server module to export a factory (a function that returns the server instance) rather than auto-connecting stdio at import time. Common pattern:

```ts
// server.ts
export function createServer() {
  const server = new McpServer({ name: '...', version: '...' });
  server.registerTool(/* ... */);
  return server;
}

// optional: still run as a stdio server when invoked directly
if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  await createServer().connect(new StdioServerTransport());
}
```

Subprocess mode (`command: 'node', args: ['./dist/index.js']`) keeps working — pick whichever fits your loop.

## Stdio-safe logging

The most-cited pain for MCP authors: a stray `console.log` corrupts the JSON-RPC wire on stdout. mcptap ships a one-liner fix:

```ts
import { silenceStdoutLogging, mcpLog } from 'mcptap';

silenceStdoutLogging();   // reroutes all console.* to stderr forever
mcpLog('starting up');    // explicit stderr log
```

## Vitest matchers

```ts
import '@mcptap/vitest';
await expect(server).toListTool('echo');
await expect(server).toListTools(['echo', 'add']);
```

## Why

Today, testing an MCP server means clicking around in Claude Desktop and praying. The official Inspector is a manual GUI. Eval frameworks are runtime-focused. Nothing makes a TypeScript MCP server author feel the way Vitest makes a TypeScript library author feel.

mcptap is what that should feel like.

## Status

**Pre-1.0.** Schema-shape assertions, snapshot testing with smart masking, the `init` magic, the GitHub Action, and stdio-safe logging all work. Forthcoming: tool-description quality scoring (`mcptap score`), in-process MCP client mode, and a hosted observability dashboard at mcptap.dev.

The OSS surface is free forever. Run history, cross-PR drift detection, alerts, and cross-model regression matrices are the paid layer (later).

## License

MIT
