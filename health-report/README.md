# MCP Health Report

Weekly automated mcptap run against a curated list of community MCP servers. Doubles as marketing artifact and ecosystem signal.

For each server, the workflow:

1. Spawns the server (via `npx -y <package>`)
2. Calls `tools/list`
3. Scores each tool description with `mcptap score`
4. Closes the server cleanly

No authenticated tool calls — the report measures *surface health* (does it boot, what does it advertise, is the language well-formed) rather than behavioral correctness (which would require API keys we don't want in CI logs).

## Layout

- `servers.ts` — the curated list. Add new entries as Joan validates each works.
- `run.ts` — the runner (TypeScript, loaded via jiti).
- `run.mjs` — tiny bootloader so we can keep `run.ts` in TS without a build step.
- `output/` — committed reports:
  - `output/YYYY-MM-DD.md` — dated snapshot
  - `output/latest.md` — most recent report (used in social posts)

## Running locally

```bash
cd health-report
node run.mjs
```

Takes ~30 seconds (mostly waiting for `npx` to fetch each server on first invocation; cached after).

## Schedule

`.github/workflows/health-report.yml` runs every Monday 09:00 UTC and opens a PR with the new report files. Joan reviews and merges. (Direct push to `main` would bypass branch protection; the PR keeps the audit trail.)

You can also trigger it manually from the Actions tab via "Run workflow".

## Adding a server

1. Find a TS/Node MCP server published on npm.
2. Verify it boots without secrets: `npx -y <package>` should connect over stdio and respond to `tools/list`.
3. Add an entry to `SERVERS` in `servers.ts`.
4. Run locally to confirm it shows up in the report.
5. Open a PR.

## Selection criteria

- TS/Node only for v0.1 (Python servers come later).
- Must boot without API keys or secrets.
- Recognizable publisher (Anthropic, well-known author, or popular community package).
- No servers that perform mutating side-effects at startup (e.g., creating files in shared paths).
