// The mcptap agent skill — markdown content teaching coding agents
// (Claude Code, Cursor, Codex, Aider, etc.) how to use mcptap.
//
// Inlined as a TS module so it bundles into dist/ without a separate
// asset-copy build step. The same body is wrapped in different frontmatter
// depending on the target agent's format.

export const SKILL_BODY = `# mcptap — testing for MCP servers

Use mcptap to test and validate MCP (Model Context Protocol) servers.

## When to invoke mcptap

Run mcptap whenever:

- You create a new MCP server or scaffold MCP tools.
- You modify tool definitions (names, arguments, descriptions, schemas).
- You add or remove tools.
- You change the server's entry point or runtime.
- The user asks "is my server correct?", "test my MCP", "check my tools", or similar.

## Commands

| Command | When to run |
| --- | --- |
| \`npx mcptap init\` | First-time setup. Auto-discovers tools and generates \`mcptap.config.ts\`. |
| \`npx mcptap run\` | After any change. Runs schema + snapshot tests. Exit 0 = green, 1 = failure. |
| \`npx mcptap run --update\` | After intentional snapshot changes. Accepts the new snapshot. |
| \`npx mcptap score\` | Scores tool descriptions 0–100 with itemized issues. |
| \`npx mcptap score --min-score 70\` | CI gate: fail if any tool below threshold. |

## Workflow

1. **After creating or modifying an MCP server**, run \`npx mcptap run\`.
2. **If green**: commit and move on.
3. **If snapshot drift**: review the diff.
   - Was the change intentional (renamed tool, new description, new field)? Run \`npx mcptap run --update\`, then commit including the snapshot file.
   - Was it accidental? Fix the regression in code.
4. **Before publishing**: run \`npx mcptap score\`. Fix any tools scoring below 90.
5. **For CI**: add the GitHub Action workflow snippet (see README).

## Tool-description best practices (what \`mcptap score\` checks)

Fix any of these when flagged:

- **Length**: 20–500 characters. Too short → the LLM has no signal. Too long → token bloat.
- **Action verb opening**: Start with a clear verb — "Returns", "Creates", "Updates", "Searches", "Lists", "Fetches". Avoid "This tool…", "Handles…", "Manages…", "Various…".
- **Argument descriptions**: Every input parameter must have a \`description\` field, not just a type.
- **Declared \`required\`**: Always set \`inputSchema.required: [...]\` explicitly. Omitting it is ambiguous.
- **Token budget**: Keep each tool definition under ~200 tokens. The whole tool surface should fit under ~2000 tokens for a typical agent context budget.

## Good vs. bad descriptions

**Good** — clear, complete, fits the budget:

\`\`\`ts
server.registerTool('search_books', {
  description: 'Searches the catalog and returns up to 20 books matching the query string. Matches across title, author, and ISBN.',
  inputSchema: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string', description: 'Free-text search query.' },
      limit: { type: 'number', description: 'Max results (default 20, max 100).' },
    },
  },
}, async ({ query, limit = 20 }) => { /* ... */ });
\`\`\`

**Bad** — \`mcptap score\` will flag this:

\`\`\`ts
server.registerTool('search_books', {
  description: 'Handles search.', // VAGUE_OPENING (-10), DESCRIPTION_TOO_SHORT (-15)
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' }, // UNDESCRIBED_ARGS (-25)
    },
    // NO_REQUIRED_FIELD (-5)
  },
}, async ({ query }) => { /* ... */ });
\`\`\`

## Stdio-safe logging

If your MCP server uses stdio transport (most do), NEVER call \`console.log\` — it corrupts the JSON-RPC wire on stdout. Use mcptap's helpers:

\`\`\`ts
import { silenceStdoutLogging, mcpLog } from 'mcptap';

silenceStdoutLogging();  // reroutes all console.* to stderr forever
mcpLog('starting up');   // explicit stderr log
\`\`\`

## In-process mode

When your server module is importable (exposes a factory rather than auto-connecting stdio), mcptap can talk to it via \`InMemoryTransport\` instead of spawning a subprocess. ~10× faster, real stack traces, no flakiness.

\`\`\`ts
// mcptap.config.ts
import { defineConfig } from 'mcptap';

export default defineConfig({
  slug: 'my-server',
  server: {
    transport: 'in-process',
    factory: async () => (await import('./dist/index.js')).createServer(),
  },
  tests: [/* ... */],
});
\`\`\`

For this to work, the server module must export a factory and NOT auto-connect stdio at import time. Common pattern:

\`\`\`ts
export function createServer() {
  const server = new McpServer({ name: '...', version: '...' });
  server.registerTool(/* ... */);
  return server;
}

// Only run stdio when invoked directly
if (resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  await createServer().connect(new StdioServerTransport());
}
\`\`\`

## Repository

https://github.com/mcptap/mcptap
`;

export const SKILL_NAME = 'mcptap';
export const SKILL_DESCRIPTION = 'Test and validate MCP servers with mcptap.';
