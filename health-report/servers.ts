// Curated list of community MCP servers the Health Report runs against.
//
// Selection rules:
// - Must boot without requiring secrets/auth (we don't want to leak tokens
//   into CI logs, and we don't want to fail purely-config-bound servers
//   on missing API keys).
// - TypeScript / Node servers only for v0.1 (Python servers come later
//   once we have a portable runner).
// - Prefer servers with clear ownership (Anthropic, recognized authors)
//   so the report represents the ecosystem fairly.
//
// Anthropic packages live under the `@modelcontextprotocol/` scope. Some
// require config (paths, URLs); those receive sensible CI-safe defaults.
// Servers that require API keys are skipped for v0.1 but tracked in the
// inventory so we can re-evaluate later.

export type ServerEntry = {
  slug: string;
  displayName: string;
  publisher: string;
  command: string;
  args: string[];
  notes?: string;
};

export const SERVERS: ServerEntry[] = [
  {
    slug: 'mcp-filesystem',
    displayName: 'filesystem',
    publisher: '@modelcontextprotocol',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    notes: 'Read/write/list files under a sandboxed root.',
  },
  {
    slug: 'mcp-everything',
    displayName: 'everything',
    publisher: '@modelcontextprotocol',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    notes: 'Reference server demonstrating every MCP capability.',
  },
  {
    slug: 'mcp-memory',
    displayName: 'memory',
    publisher: '@modelcontextprotocol',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    notes: 'Knowledge-graph memory persisted to a JSON file.',
  },
  {
    slug: 'mcp-sequentialthinking',
    displayName: 'sequential-thinking',
    publisher: '@modelcontextprotocol',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    notes: 'Structured multi-step reasoning tool.',
  },
  {
    slug: 'zoomdocs-mcp',
    displayName: 'zoomdocs-mcp',
    publisher: '@jcornudella',
    command: 'npx',
    args: ['-y', '@jcornudella/zoomdocs-mcp'],
    notes: 'Joan’s own MCP server — included as a control sample.',
  },
];
