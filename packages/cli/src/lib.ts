// Library entry for the umbrella `mcptap` package.
// Re-exports the public API of @mcptap/core so users can write:
//
//   import { defineConfig } from 'mcptap';
//
// instead of installing two packages.

export {
  defineConfig,
  SCHEMA_VERSION,
  SCORE_SCHEMA_VERSION,
  applyMasks,
  buildScoreReport,
  scoreTools,
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
  InProcessServerSpawn,
  McpServerLike,
  RunOptions,
  RunOutput,
  ScoreIssue,
  ScoreIssueCode,
  ScoreReport,
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
  ToolScore,
  Transport,
} from '@mcptap/core';
