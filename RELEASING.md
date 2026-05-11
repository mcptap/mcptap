# Releasing

How to publish a new mcptap release. v0.1.0 is the inaugural release.

## Pre-flight

```bash
# 1. Make sure main is clean and up to date
git checkout main && git pull
git status   # must be clean

# 2. Make sure CI is green for the commit you're releasing
gh run list --limit 1   # latest run on main must say "success"

# 3. Run the dogfood locally one more time
pnpm test
pnpm build
(cd examples/sample-server && rm -rf __mcptap_snapshots__ && node ../../packages/cli/bin/mcptap.mjs run)

# 4. (First time only) authenticate with npm
npm whoami            # if this errors, run `npm login`
# 2FA: npm will prompt during publish
```

## Bump version

The packages publish at the same version in lockstep. Bump all three in one step:

```bash
# from repo root
pnpm -r --filter='./packages/core' --filter='./packages/cli' --filter='./packages/vitest' \
  exec npm version <new-version> --no-git-tag-version

# also bump the CHANGELOG.md heading
$EDITOR CHANGELOG.md

# commit the bump
git add packages/*/package.json CHANGELOG.md
git commit -m "release: vX.Y.Z"
git push
```

## Publish

```bash
# Runs test, clean, build, then publishes all three packages with --access public
pnpm publish:all
```

This publishes `@mcptap/core`, `mcptap`, and `@mcptap/vitest` in dependency order. pnpm rewrites `workspace:*` deps to concrete versions automatically.

If 2FA is required, npm will prompt for an OTP. If your terminal is non-interactive (e.g., CI), set `NPM_CONFIG_OTP=<code>` or use a granular access token.

## Tag and GitHub Release

```bash
git tag vX.Y.Z
git push --tags

# Create the GitHub release with notes pulled from CHANGELOG.md
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file CHANGELOG.md --verify-tag
```

The Action consumes the tag — users pin via `uses: mcptap/mcptap/packages/action@vX.Y.Z`. Make sure `packages/action/dist/index.js` is the bundle you want shipped before tagging; it's committed to the repo.

## Post-release sanity check

```bash
# in a fresh, throwaway directory:
mkdir /tmp/mcptap-postrelease-check && cd $_
npm init -y
npm install --no-save mcptap@latest

# can the binary run?
npx mcptap --version   # should print X.Y.Z

# (in a real MCP server project)
cd ~/zoomdocs-mcp
npx mcptap@latest init --force
npx mcptap@latest run
```

If `npx mcptap init` works and `mcptap run` shows green tests, the cold-install path is live. Anything broken here is a registry / metadata problem worth a patch release.

## Rollback

You can `npm unpublish <pkg>@<version>` within **72 hours** of publishing. After that, the version is permanent — publish a fix as a new patch version instead. Yanking via `npm deprecate <pkg>@<version> "reason"` is also available indefinitely.

## Cadence

Aim for short, frequent releases (weekly or per-feature) until the API stabilizes. Bump:

- **patch** (`0.1.x`) for bug fixes, doc tweaks, internal refactors
- **minor** (`0.x.0`) for new features, additive API changes
- **major** (`1.x.0`) for breaking changes — reserve until the public API has shaken out
