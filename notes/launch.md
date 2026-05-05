# Launch notes

Drafts for the v0.1 launch motion. Adapt freely. Goal: get the OSS-as-distribution flywheel spinning, not pitch the paid surface (which doesn't exist yet).

## Pre-launch checklist

- [ ] `pnpm publish` the three packages: `@mcptap/core`, `mcptap`, `@mcptap/vitest` (run `pnpm -r publish --access public --no-git-checks` after `npm login`)
- [ ] Tag and release the GitHub Action: `git tag v0.1.0 && git push --tags`, then create release in GH UI
- [ ] Open a real PR in zoomdocs-mcp using the workflow snippet, confirm the comment posts (validates Action against published mcptap)
- [ ] Reserve `mcptap.dev` (Cloudflare or Porkbun, ~$15/yr) and update repo homepage
- [ ] Reserve `@mcptap` on X
- [ ] Add a public roadmap (issue or `ROADMAP.md`) so contributors see what's next

## X thread (build-in-public launch)

Draft. Adjust tone before sending. Keep first tweet sharp; rest is supporting.

> **Tweet 1 (the hook)**
> shipped mcptap today.
>
> npx mcptap init → auto-discovers your MCP server's tools and writes the config
> npx mcptap run → green tests
>
> Vitest, but it knows about MCP.
>
> github.com/mcptap/mcptap

> **Tweet 2 (the why)**
> Testing an MCP server today usually means clicking around in Claude Desktop and praying.
>
> The official Inspector is a manual GUI. Eval frameworks are runtime-focused. Nothing makes a TS MCP server author feel the way Vitest makes a TS library author feel.
>
> So I built that.

> **Tweet 3 (the demo — record a 30s screencast)**
> [video: cd into a real MCP server → npx mcptap init shows tools detected → mcptap run shows green checks → modify a tool description → mcptap run shows snapshot drift with diff]

> **Tweet 4 (the GitHub Action)**
> Drop this in your repo and every PR gets an auto-updating comment with results, snapshot drift, and tool-description quality scores.
>
> ```yaml
> - uses: mcptap/mcptap/packages/action@v1
> ```
>
> Free for CI. Forever. Runs on your minutes.

> **Tweet 5 (credit prior art — costs you nothing, makes you human)**
> Big credit to @j_lowin's "Stop Vibe-Testing" piece — kept it in mind the whole way.
>
> And @MCPJam for raising the bar on dev tooling. mcptap focuses on the deterministic, GitHub-native, free-for-CI slice; their hosted platform is great for teams.

> **Tweet 6 (the call)**
> If you maintain an MCP server: try `npx mcptap init` against it, send me what breaks. Replies open. DMs open.

## Show HN post

Title: `Show HN: Mcptap – Vitest-style test harness for MCP servers`

Body:

> Hey HN — solo dev shipping a credibility artifact and (maybe) future business.
>
> The pain: testing an MCP server today is "click around in Claude Desktop and hope." The official Inspector is a manual GUI. Eval frameworks are runtime-focused. There's nothing that makes a TypeScript MCP server author feel the way Vitest makes a TypeScript library author feel.
>
> So I built that.
>
> What's in the box:
> - `mcptap init` — auto-discovers your server's tools and writes a starter config
> - Schema-shape assertions and snapshot testing with smart masking (auto-handles UUIDs and timestamps)
> - In-process mode (10× faster than subprocess for tight TDD loops)
> - GitHub Action with a PR comment bot that shows snapshot diffs and tool-description quality scores
> - Stdio-safe logging helper for the well-known "console.log corrupts the wire" pain
>
> Validated end-to-end against my own MCP server (16 real tools, 17 generated tests, green from one command).
>
> OSS forever. The future paid surface is observability over locally-run tests (history, drift detection, alerts) — not hosted compute, since MCPJam already does that well.
>
> Not yet on the GitHub Action Marketplace because I want a few real users first. Repo, README, and a working example are at github.com/mcptap/mcptap.
>
> Direct prior art I borrowed from / didn't want to compete with:
> - Bellwether (@dotsetlabs) — schema-contract drift, also MIT
> - MCPJam — multi-server hosted platform with eval CI
> - Jeremiah Lowin's "Stop Vibe-Testing" piece, which named the problem
>
> Happy to talk about positioning, what I'd build next, or what's wrong with my heuristics. Skeptical eyes welcome.

## MCP Discord post

Channel: `#dev-tools` if it exists, otherwise `#general`. Keep it shorter than X — Discord rewards brevity.

> hey 👋 just shipped mcptap — Vitest-style testing for MCP servers
>
> `npx mcptap init` discovers your tools, generates real assertions + snapshot tests in 2 seconds. github.com/mcptap/mcptap
>
> would love feedback if you maintain a server. dms open.

## Health Report (week-1 content artifact, optional)

Content engine. Run mcptap against the top 25 public MCP servers, publish a summary. Repeat weekly. Becomes the "MCP Health Report" — shareable on X, link-bait, every failure is an inbound lead.

Format:

> **MCP Health Report — Week of YYYY-MM-DD**
>
> Ran `mcptap init && mcptap run --json && mcptap score --json` against the top 25 community MCP servers.
>
> Highlights:
> - 23 / 25 servers pass schema-shape assertions
> - Average tool-description quality: NN / 100
> - Most-flagged issue: NO_REQUIRED_FIELD on M tools
> - Token-cost-per-server median: NNN tokens
>
> Per-server table → [link]
>
> Want to fix yours? `npx mcptap init` and you're 30 seconds away.

## Reach-out list (low-pressure)

- **Bellwether** (Greg King at Dotset Labs, gmking.dev@gmail.com) — credit prior art, propose Action interop. Not competition, complement.
- **MCPJam team** — propose a "powered by mcptap CLI" badge or interop. They're going up-market; mcptap stays developer-first. Different ICPs.
- **Jeremiah Lowin** — `@j_lowin` on X. Cite the "Stop Vibe-Testing" piece in launch tweet, no DM needed unless the launch thread does numbers.
- **Top 10 community MCP server authors** — DM the launch thread with a personal note, not a copy-paste.

## What NOT to do at launch

- Don't pitch the paid product. It doesn't exist; nothing to charge for.
- Don't oversell — `mcptap` is a credibility artifact that *might* become a business. Frame as "I built the thing I wanted" not "I'm raising."
- Don't compete with MCPJam in the thread. Position alongside (different lane).
- Don't promise features. The README's "what ships" list is the contract; everything else is "we'll see."
- Don't auto-publish the GitHub Action to the Marketplace until 5+ real users have used it on real PRs. Mistakes there are expensive to undo.
