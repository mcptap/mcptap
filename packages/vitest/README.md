# @mcptap/vitest

> Vitest matchers for [mcptap](https://github.com/mcptap/mcptap) — a Vitest-style test harness for Model Context Protocol servers.

```bash
pnpm add -D mcptap @mcptap/vitest
```

```ts
import { describe, expect, test } from 'vitest';
import { spawnServer } from 'mcptap';
import '@mcptap/vitest';

describe('my MCP server', () => {
  test('tool surface', async () => {
    const server = await spawnServer({
      command: 'node',
      args: ['./dist/index.js'],
    });

    await expect(server).toListTool('echo');
    await expect(server).toListTools(['echo', 'add']);
    await expect(server).toCallTool('echo', { text: 'hi' }, { containsText: 'hi' });

    await server.close();
  });
});
```

## Matchers

- `toListTool(name)` — server's `tools/list` includes `name`
- `toListTools(names[])` — server lists exactly these tools (order-insensitive)
- `toCallTool(name, args?, options?)` — `tools/call` succeeds; `options.containsText` and `options.isError` for finer assertions

See the [main README](https://github.com/mcptap/mcptap) for the full story and the CLI (`mcptap run`, `mcptap init`, `mcptap score`).

## License

MIT.
