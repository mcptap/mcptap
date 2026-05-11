# @mcptap/core

> Runtime primitives for [mcptap](https://github.com/mcptap/mcptap) — a Vitest-style test harness for Model Context Protocol servers.

Most users want **[`mcptap`](https://www.npmjs.com/package/mcptap)** instead — it's the umbrella package that re-exports everything here plus ships the CLI.

This package is the low-level building block: types, the test runner, the snapshot logic, the score logic, the stdio-safe logging helpers. Useful if you want to drive mcptap programmatically (e.g., from your own test runner or build tool) without going through the CLI.

```ts
import { defineConfig, runTests, spawnServer } from '@mcptap/core';

const result = await runTests({
  slug: 'my-server',
  server: { command: 'node', args: ['./dist/index.js'] },
  tests: [/* ... */],
});

console.log(result.totals); // { passed, failed, skipped, total, ... }
```

See the [main README](https://github.com/mcptap/mcptap) for the full story and the CLI.

## License

MIT.
