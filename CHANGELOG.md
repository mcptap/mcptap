# Changelog

All notable changes to mcptap are tracked here. The format roughly follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning
follows [SemVer](https://semver.org/) once we hit 1.0.

## [0.1.0] — 2026-05-11

First publicly published release. The "incredibly good" feature set from the
original spec is complete.

### Added

- **`mcptap init`** — auto-discovers your server's tools and writes a real
  starter config in one command. Detects MCP server entry from
  `package.json` (`main` / `module` / `exports` / `bin` / common build
  outputs). Graceful fallback to a placeholder config if the server can't be
  auto-spawned.
- **`mcptap run`** — schema-shape assertions and snapshot testing against
  any MCP server (stdio, streamable-http, or in-process transports).
  Supports `--config`, `--filter`, `--update`, `--json`, `--report-to`,
  `--api-key`.
- **`mcptap score`** — deterministic tool-description quality scoring with
  seven issue codes (no description, too short/long, vague opening,
  undescribed args, missing `required[]`, large/oversized token cost).
  Outputs a 0–100 score per tool with itemized issues. CI gate via
  `--min-score`.
- **Snapshot testing** with smart masking (auto-replaces UUIDs and ISO 8601
  timestamps), user-defined dot-path masks (`results.*.id`),
  `--update` to accept new snapshots, and a versioned snapshot file format.
- **In-process MCP client mode** via `InMemoryTransport`. ~10× faster than
  subprocess for tight TDD loops. Requires the server module to expose a
  factory.
- **GitHub Action** (`mcptap/mcptap/packages/action`) — runs
  `mcptap run` and `mcptap score`, writes a job summary, posts (or
  updates) a single PR comment with results, snapshot drifts, failure
  blocks, and tool-description quality table.
- **Vitest matchers** (`@mcptap/vitest`) — `toListTool(name)`,
  `toListTools(names[])`, `toCallTool(name, args, options)`.
- **Stdio-safe logging** — `mcpLog(...)` and `silenceStdoutLogging()`
  helpers fix the well-known "console.log corrupts the JSON-RPC wire" pain.
- **Versioned `mcptap-run.json` schema** (`schema_version: 1`) — stable
  contract for future dashboard ingestion. POST via `--report-to=<url>`.
- **Git meta enrichment** — `commit_sha`, `branch`, `repo_url` auto-detected
  from the current git workspace.

### Validated against

`@jcornudella/zoomdocs-mcp` — 16 real tools, 17 generated tests, all green;
average tool-description quality 99/100.

### Known limitations

- Hosted dashboard at `mcptap.dev` not yet live; `--report-to=dashboard`
  posts to `https://api.mcptap.dev/v1/runs` and fails gracefully when
  unreachable. The reporter never masks test exit codes.
- TS-source entry detection in `mcptap init` warns to build first;
  TypeScript stripping is deferred to v0.2.
