// Public types for @mcptap/core.

import type { SnapshotMask } from './snapshot.js';

export type Transport = 'stdio' | 'streamable-http' | 'in-process';

export type StdioServerSpawn = {
  transport?: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export type HttpServerSpawn = {
  transport: 'streamable-http';
  url: string;
  headers?: Record<string, string>;
};

/**
 * In-process server: instead of spawning a subprocess and talking JSON-RPC over
 * stdio, mcptap connects directly to the user's MCP server instance via
 * InMemoryTransport. ~10× faster, better stack traces, no port collisions.
 *
 * The factory should return an MCP server instance with a `connect(transport)`
 * method (i.e. an `Server` or `McpServer` from @modelcontextprotocol/sdk).
 *
 *   factory: async () => (await import('./dist/index.js')).createServer()
 */
export type InProcessServerSpawn = {
  transport: 'in-process';
  factory: () => Promise<McpServerLike> | McpServerLike;
};

export type McpServerLike = {
  connect(transport: unknown): Promise<void>;
  close?(): Promise<void>;
  // McpServer wraps a `server` field; support that shape too.
  server?: {
    connect(transport: unknown): Promise<void>;
    close?(): Promise<void>;
  };
};

export type ServerSpawn = StdioServerSpawn | HttpServerSpawn | InProcessServerSpawn;

export type Tool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: unknown;
};

export type CallToolResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
  structuredContent?: unknown;
};

export type ServerHandle = {
  listTools(): Promise<Tool[]>;
  callTool(name: string, args?: Record<string, unknown>): Promise<CallToolResult>;
  close(): Promise<void>;
};

type TestBase = {
  name: string;
  description?: string;
  timeout?: number;
};

export type AssertionTest = TestBase & {
  assert: (server: ServerHandle) => Promise<void> | void;
};

export type SnapshotTest = TestBase & {
  snapshot: true;
  run: (server: ServerHandle) => unknown | Promise<unknown>;
  mask?: SnapshotMask;
};

export type Test = AssertionTest | SnapshotTest;

export type Config = {
  slug: string;
  server: ServerSpawn;
  tests: Test[];
};

export type TestStatus = 'pass' | 'fail' | 'skip';

export type SnapshotResultStatus = 'matched' | 'created' | 'updated' | 'mismatch';

export type TestResult = {
  name: string;
  description?: string;
  status: TestStatus;
  duration_ms: number;
  started_at: string;
  finished_at: string;
  error?: { message: string; stack?: string };
  snapshot?: {
    status: SnapshotResultStatus;
    diff?: string;
  };
};

// Load-bearing seam #1: stable, versioned run output schema.
// The future hosted dashboard will ingest exactly this shape.
// Bump SCHEMA_VERSION on breaking changes; add fields freely.
export const SCHEMA_VERSION = 1 as const;

export type RunOutput = {
  schema_version: typeof SCHEMA_VERSION;
  id: string;
  slug: string;
  status: 'pass' | 'fail';
  started_at: string;
  finished_at: string;
  duration_ms: number;
  server: { transport: Transport };
  meta: {
    commit_sha?: string;
    branch?: string;
    repo_url?: string;
    mcptap_version: string;
  };
  totals: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    snapshots_created: number;
    snapshots_updated: number;
  };
  results: TestResult[];
};

export function defineConfig(config: Config): Config {
  return config;
}
