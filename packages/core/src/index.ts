// @mcptap/core — testing primitive for MCP servers.

export { defineConfig, SCHEMA_VERSION } from './types.js';
export { VERSION } from './version.js';
export { spawnServer } from './server.js';
export { runTests } from './runner.js';
export { mcpLog, silenceStdoutLogging } from './log.js';
export { buildScoreReport, scoreTools, SCORE_SCHEMA_VERSION } from './score.js';
export {
  applyMasks,
  compareSnapshot,
  loadSnapshots,
  renderSnapshotDiff,
  saveSnapshots,
  serializeForSnapshot,
  snapshotFilePath,
} from './snapshot.js';

export type {
  AssertionTest,
  CallToolResult,
  Config,
  HttpServerSpawn,
  InProcessServerSpawn,
  McpServerLike,
  RunOutput,
  ServerHandle,
  ServerSpawn,
  SnapshotResultStatus,
  SnapshotTest,
  StdioServerSpawn,
  Test,
  TestResult,
  TestStatus,
  Tool,
  Transport,
} from './types.js';

export type { SnapshotMask } from './snapshot.js';
export type { RunOptions } from './runner.js';
export type { ScoreIssue, ScoreIssueCode, ScoreReport, ToolScore } from './score.js';
