# mcptap

> Vitest, but it knows about MCP.

[![ci](https://github.com/mcptap/mcptap/actions/workflows/ci.yml/badge.svg)](https://github.com/mcptap/mcptap/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/mcptap/mcptap/blob/main/LICENSE)

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
      - uses: mcptap/mcptap/packages/action@v0.1.0
```

The Action posts (or updates) a single PR comment with the result table, snapshot diffs, failure blocks, and tool-description quality scores. Free for CI — runs on your GitHub Actions minutes.

## In-process mode (10× faster)

When your server is importable, mcptap can talk to it via `InMemoryTransport` instead of spawning a subprocess.

```ts
defineConfig({
  slug: 'my-server',
  server: {
    transport: 'in-process',
    factory: async () => (await import('./dist/index.js')).createServer(),
  },
  // ...
});
```

## Stdio-safe logging

```ts
import { silenceStdoutLogging, mcpLog } from 'mcptap';

silenceStdoutLogging();   // reroutes console.* to stderr forever
mcpLog('starting up');    // explicit stderr log
```

## Tool-description quality

```bash
npx mcptap score                 # terminal report
npx mcptap score --json          # for CI ingestion
npx mcptap score --min-score 70  # fail if any tool below threshold
```

## Vitest matchers

```bash
pnpm add -D @mcptap/vitest
```

```ts
import '@mcptap/vitest';
await expect(server).toListTool('echo');
await expect(server).toListTools(['echo', 'add']);
await expect(server).toCallTool('echo', { text: 'hi' }, { containsText: 'hi' });
```

## Why

Today, testing an MCP server means clicking around in Claude Desktop and praying. The official Inspector is a manual GUI. Eval frameworks are runtime-focused. Nothing makes a TypeScript MCP server author feel the way Vitest makes a TypeScript library author feel.

mcptap is what that should feel like.

## License

MIT. See [github.com/mcptap/mcptap](https://github.com/mcptap/mcptap) for source, issues, and contributing.
