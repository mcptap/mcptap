import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { spawnServer, type Tool } from '@mcptap/core';
import { highlighter, logger } from './utils/logger.js';
import { sanitizeTerminalText } from './terminal.js';
import { confirm, isNonInteractive } from './utils/prompt.js';
import { spinner } from './utils/spinner.js';

export type Detected = {
  packageName: string;
  slug: string;
  command: string;
  args: string[];
  warnings: string[];
};

const TARGET_FILENAME = 'mcptap.config.ts';

const COMMON_BUILD_ENTRIES = [
  'dist/index.js',
  'dist/index.mjs',
  'build/index.js',
  'build/index.mjs',
  'out/index.js',
  'lib/index.js',
  'index.js',
  'index.mjs',
  'server.js',
  'server.mjs',
];

export async function runInit(opts: { force?: boolean } = {}): Promise<void> {
  const cwd = process.cwd();
  logger.break();
  logger.log(`  ${highlighter.bold('mcptap')} ${highlighter.dim('init')}`);
  logger.break();

  const targetPath = join(cwd, TARGET_FILENAME);
  if (existsSync(targetPath) && !opts.force) {
    if (isNonInteractive()) {
      logger.error(
        `  ✗ ${TARGET_FILENAME} already exists. Pass ${highlighter.bold('--force')} to overwrite.`,
      );
      logger.break();
      process.exit(2);
    }
    const proceed = await confirm(
      `${TARGET_FILENAME} already exists. Overwrite?`,
      false,
    );
    if (!proceed) {
      logger.dim(`  Aborted. Existing ${TARGET_FILENAME} unchanged.`);
      logger.break();
      process.exit(0);
    }
  }

  const detectSpinner = spinner('Detecting MCP server...');
  const detected = detect(cwd);
  if (!detected) {
    detectSpinner.fail('No MCP server detected in this directory.');
    logger.dim(
      `    Expected: package.json with @modelcontextprotocol/sdk and a runnable entry point.`,
    );
    logger.dim(
      `    For a remote server, scaffold manually — the docs have a streamable-http example.`,
    );
    logger.break();
    process.exit(2);
  }
  detectSpinner.succeed(`Detected: ${highlighter.info(sanitizeTerminalText(detected.packageName))}`);

  logger.log(
    `  ${highlighter.success('✓')} Entry: ${highlighter.dim(sanitizeTerminalText(`${detected.command} ${detected.args.join(' ')}`))}`,
  );
  for (const w of detected.warnings) {
    logger.log(`  ${highlighter.warn('!')} ${highlighter.warn(sanitizeTerminalText(w))}`);
  }

  const spawnSpinner = spinner('Spawning server to discover tools...');
  let tools: Tool[] = [];
  let spawnFailure: Error | null = null;
  try {
    const server = await spawnServer({
      command: detected.command,
      args: detected.args,
    });
    try {
      tools = await server.listTools();
    } finally {
      await server.close();
    }
  } catch (err) {
    spawnFailure = err instanceof Error ? err : new Error(String(err));
  }

  if (spawnFailure) {
    spawnSpinner.warn(`Could not spawn the server`);
    logger.dim(`    ${sanitizeTerminalText(spawnFailure.message)}`);
    logger.dim(`    Writing a placeholder config — edit before running.`);
    writeFileSync(targetPath, placeholderConfig(detected), 'utf8');
    logger.log(
      `  ${highlighter.success('✓')} Wrote ${TARGET_FILENAME} ${highlighter.dim('(placeholder)')}`,
    );
    logger.break();
    logger.log(`  ${highlighter.dim('→')} Edit, then run: ${highlighter.bold('npx mcptap run')}`);
    logger.break();
    return;
  }
  spawnSpinner.succeed(
    `Found ${highlighter.bold(String(tools.length))} tool${tools.length === 1 ? '' : 's'}: ` +
      highlighter.info(tools.map((t) => sanitizeTerminalText(t.name)).join(', ')),
  );

  const writeSpinner = spinner('Writing mcptap.config.ts...');
  const config = generateConfig(detected, tools);
  writeFileSync(targetPath, config, 'utf8');
  const testCount = tools.length + 1;
  writeSpinner.succeed(
    `Wrote ${TARGET_FILENAME} ${highlighter.dim(`(${testCount} test${testCount === 1 ? '' : 's'})`)}`,
  );

  printNextSteps(cwd);
}

function printNextSteps(cwd: string): void {
  const pm = detectPackageManager(cwd);
  const installCmd = `${pm} add -D mcptap`;
  const installed = hasMcptapInstalled(cwd);

  logger.break();
  if (!installed) {
    logger.log(
      `  ${highlighter.dim('→')} Install mcptap so the config can import \`defineConfig\`:`,
    );
    logger.log(`     ${highlighter.bold(installCmd)}`);
    logger.break();
    logger.log(`  ${highlighter.dim('→')} Then run: ${highlighter.bold('npx mcptap run')}`);
  } else {
    logger.log(`  ${highlighter.dim('→')} Run: ${highlighter.bold('npx mcptap run')}`);
  }
  logger.break();
}

function detectPackageManager(cwd: string): 'pnpm' | 'npm' | 'yarn' | 'bun' {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

function hasMcptapInstalled(cwd: string): boolean {
  return existsSync(join(cwd, 'node_modules', 'mcptap', 'package.json'));
}

function detect(cwd: string): Detected | null {
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return null;

  let pkg: PkgShape;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as PkgShape;
  } catch {
    return null;
  }

  const warnings: string[] = [];
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (!deps['@modelcontextprotocol/sdk']) {
    warnings.push('@modelcontextprotocol/sdk not in dependencies — proceeding anyway');
  }

  const entry = pickEntry(pkg, cwd);
  if (!entry) {
    return null;
  }

  let command = 'node';
  let args = [normalizeRel(entry.path)];
  if (entry.kind === 'ts') {
    warnings.push(
      `Entry ${entry.path} is TypeScript. Build first (e.g. \`pnpm build\`) or replace command with "tsx"/"bun".`,
    );
  }

  const packageName = pkg.name ?? basename(cwd);
  const slug = toSlug(packageName);

  return {
    packageName,
    slug,
    command,
    args,
    warnings,
  };
}

type PkgShape = {
  name?: string;
  main?: string;
  module?: string;
  exports?: unknown;
  bin?: string | Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type Entry = { path: string; kind: 'js' | 'ts' };

function pickEntry(pkg: PkgShape, cwd: string): Entry | null {
  const candidates: string[] = [];
  if (pkg.main) candidates.push(pkg.main);
  if (pkg.module) candidates.push(pkg.module);
  const exp = extractDotExport(pkg.exports);
  if (exp) candidates.push(exp);
  if (pkg.bin && typeof pkg.bin === 'string') candidates.push(pkg.bin);
  if (pkg.bin && typeof pkg.bin === 'object') {
    for (const v of Object.values(pkg.bin)) candidates.push(v);
  }
  for (const c of COMMON_BUILD_ENTRIES) candidates.push(c);

  for (const c of candidates) {
    const resolved = resolve(cwd, c);
    if (existsSync(resolved)) {
      return { path: c, kind: classify(c) };
    }
  }
  // Last resort: a TS file that we'd need to build first
  for (const c of ['src/index.ts', 'src/index.mts', 'src/server.ts']) {
    if (existsSync(resolve(cwd, c))) {
      return { path: c, kind: 'ts' };
    }
  }
  return null;
}

function extractDotExport(exports: unknown): string | undefined {
  if (typeof exports === 'string') return exports;
  if (!exports || typeof exports !== 'object') return undefined;
  const obj = exports as Record<string, unknown>;
  const dot = obj['.'];
  if (typeof dot === 'string') return dot;
  if (dot && typeof dot === 'object') {
    const dotObj = dot as Record<string, unknown>;
    if (typeof dotObj.import === 'string') return dotObj.import;
    if (typeof dotObj.default === 'string') return dotObj.default;
    if (dotObj.import && typeof dotObj.import === 'object') {
      const imp = dotObj.import as Record<string, unknown>;
      if (typeof imp.default === 'string') return imp.default;
    }
  }
  return undefined;
}

function classify(p: string): 'js' | 'ts' {
  if (p.endsWith('.ts') || p.endsWith('.mts') || p.endsWith('.cts')) return 'ts';
  return 'js';
}

function normalizeRel(p: string): string {
  if (p.startsWith('./') || p.startsWith('/')) return p;
  return './' + p;
}

function toSlug(name: string): string {
  return name
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function generateConfig(detected: Detected, tools: Tool[]): string {
  const argsLiteral = JSON.stringify(detected.args);
  const toolAssertions = tools
    .map(
      (t) =>
        `    {
      name: ${jsString(`lists tool: ${t.name}`)},
      assert: async (server) => {
        const tools = await server.listTools();
        if (!tools.find((tool) => tool.name === ${jsString(t.name)})) {
          throw new Error(${jsString(`${t.name} missing from tool list`)});
        }
      },
    },`,
    )
    .join('\n');

  return `import { defineConfig } from 'mcptap';

// Generated by \`mcptap init\` — edit freely.

export default defineConfig({
  slug: ${jsString(detected.slug)},
  server: {
    command: ${jsString(detected.command)},
    args: ${argsLiteral},
  },
  tests: [
${toolAssertions}
    {
      name: 'tool surface snapshot',
      snapshot: true,
      run: async (server) => server.listTools(),
    },
  ],
});
`;
}

function placeholderConfig(detected: Detected): string {
  return `import { defineConfig } from 'mcptap';

// Generated by \`mcptap init\` — server could not be auto-spawned.
// Fill in real tests below before running.

export default defineConfig({
  slug: ${jsString(detected.slug)},
  server: {
    command: ${jsString(detected.command)},
    args: ${JSON.stringify(detected.args)},
  },
  tests: [
    {
      name: 'lists at least one tool',
      assert: async (server) => {
        const tools = await server.listTools();
        if (tools.length === 0) {
          throw new Error('expected at least one tool');
        }
      },
    },
  ],
});
`;
}

function jsString(value: string): string {
  return JSON.stringify(value);
}
