import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  CallToolResult,
  InProcessServerSpawn,
  McpServerLike,
  ServerHandle,
  ServerSpawn,
  Tool,
} from './types.js';

const MCPTAP_CLIENT_INFO = {
  name: 'mcptap',
  version: '0.0.0',
};

/**
 * Spawn an MCP server (or connect to one in-process) and return a ServerHandle.
 *
 * Three transports supported:
 * - stdio: spawn a child process and pipe JSON-RPC over its stdin/stdout
 * - streamable-http: open a streaming HTTP connection to a remote server
 * - in-process: import the user's server module and connect via InMemoryTransport
 */
export async function spawnServer(spec: ServerSpawn): Promise<ServerHandle> {
  if (spec.transport === 'in-process') {
    return spawnInProcess(spec);
  }

  const transport =
    spec.transport === 'streamable-http'
      ? new StreamableHTTPClientTransport(new URL(spec.url), {
          requestInit: spec.headers ? { headers: spec.headers } : undefined,
        })
      : new StdioClientTransport({
          command: spec.command,
          args: spec.args ?? [],
          env: spec.env,
          cwd: spec.cwd,
        });

  const client = new Client(MCPTAP_CLIENT_INFO);
  await client.connect(transport);
  return wrap(client);
}

async function spawnInProcess(spec: InProcessServerSpawn): Promise<ServerHandle> {
  const userServer = await spec.factory();
  const target = unwrapServer(userServer);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await target.connect(serverTransport);

  const client = new Client(MCPTAP_CLIENT_INFO);
  await client.connect(clientTransport);

  return wrap(client, async () => {
    if (typeof target.close === 'function') {
      await target.close();
    }
  });
}

function unwrapServer(value: unknown): {
  connect: (t: unknown) => Promise<void>;
  close?: () => Promise<void>;
} {
  if (value && typeof value === 'object') {
    const v = value as McpServerLike;
    if (typeof v.connect === 'function') {
      return v as { connect: (t: unknown) => Promise<void>; close?: () => Promise<void> };
    }
    if (v.server && typeof v.server.connect === 'function') {
      return v.server;
    }
  }
  throw new Error(
    'in-process factory returned a value that does not look like an MCP server (no .connect method)',
  );
}

function wrap(client: Client, extraClose?: () => Promise<void>): ServerHandle {
  return {
    async listTools(): Promise<Tool[]> {
      const result = await client.listTools();
      return result.tools as Tool[];
    },
    async callTool(name, args): Promise<CallToolResult> {
      const result = await client.callTool({ name, arguments: args ?? {} });
      return result as CallToolResult;
    },
    async close() {
      await client.close();
      if (extraClose) {
        try {
          await extraClose();
        } catch {
          // user-side close errors shouldn't mask successful client close
        }
      }
    },
  };
}
