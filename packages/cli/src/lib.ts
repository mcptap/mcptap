// Library entry for the umbrella `mcptap` package.
// Re-exports the public API of @mcptap/core so users can write:
//
//   import { defineConfig } from 'mcptap';
//
// instead of installing two packages.

export {
  defineConfig,
  SCHEMA_VERSION,
  applyMasks,
  serializeForSnapshot,
  spawnServer,
  runTests,
  mcpLog,
  silenceStdoutLogging,
} from '@mcptap/core';

export type {
  AssertionTest,
  CallToolResult,
  Config,
  HttpServerSpawn,
  RunOptions,
  RunOutput,
  ServerHandle,
  ServerSpawn,
  SnapshotMask,
  SnapshotResultStatus,
  SnapshotTest,
  StdioServerSpawn,
  Test,
  TestResult,
  TestStatus,
  Tool,
  Transport,
} from '@mcptap/core';
