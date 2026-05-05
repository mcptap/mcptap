import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import kleur from 'kleur';
import { spawnServer, type Tool } from '@mcptap/core';

type Detected = {
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
  console.log();
  console.log(`  ${kleur.bold('mcptap')} ${kleur.dim('init')}`);
  console.log();

  const targetPath = join(cwd, TARGET_FILENAME);
  if (existsSync(targetPath) && !opts.force) {
    console.error(
      `  ${kleur.red('✗')} ${TARGET_FILENAME} already exists. Pass ${kleur.bold('--force')} to overwrite.`,
    );
    console.log();
    process.exit(2);
  }

  const detected = detect(cwd);
  if (!detected) {
    console.error(
      `  ${kleur.red('✗')} No MCP server detected in this directory.`,
    );
    console.error(
      kleur.dim(
        `    Expected: package.json with @modelcontextprotocol/sdk and a runnable entry point.`,
      ),
    );
    console.error(
      kleur.dim(
        `    For a remote server, scaffold manually — the docs have a streamable-http example.`,
      ),
    );
    console.log();
    process.exit(2);
  }

  console.log(`  ${kleur.green('✓')} Detected: ${kleur.cyan(detected.packageName)}`);
  console.log(
    `  ${kleur.green('✓')} Entry: ${kleur.dim(`${detected.command} ${detected.args.join(' ')}`)}`,
  );
  for (const w of detected.warnings) {
    console.log(`  ${kleur.yellow('!')} ${kleur.yellow(w)}`);
  }

  console.log(`  ${kleur.cyan('⏵')} Spawning server to discover tools...`);

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
    console.log(
      `  ${kleur.yellow('!')} Could not spawn the server: ${kleur.dim(spawnFailure.message)}`,
    );
    console.log(kleur.dim(`    Writing a placeholder config — edit before running.`));
    writeFileSync(targetPath, placeholderConfig(detected), 'utf8');
    console.log(`  ${kleur.green('✓')} Wrote ${TARGET_FILENAME} ${kleur.dim('(placeholder)')}`);
    console.log();
    console.log(`  ${kleur.dim('→')} Edit, then run: ${kleur.bold('npx mcptap run')}`);
    console.log();
    return;
  }

  console.log(
    `  ${kleur.green('✓')} Found ${kleur.bold(String(tools.length))} tool${tools.length === 1 ? '' : 's'}: ` +
      kleur.cyan(tools.map((t) => t.name).join(', ')),
  );

  const config = generateConfig(detected, tools);
  writeFileSync(targetPath, config, 'utf8');
  const testCount = tools.length + 1;
  console.log(
    `  ${kleur.green('✓')} Wrote ${TARGET_FILENAME} ${kleur.dim(`(${testCount} test${testCount === 1 ? '' : 's'})`)}`,
  );

  printNextSteps(cwd);
}

function printNextSteps(cwd: string): void {
  const pm = detectPackageManager(cwd);
  const installCmd = `${pm} add -D mcptap`;
  const installed = hasMcptapInstalled(cwd);

  console.log();
  if (!installed) {
    console.log(`  ${kleur.dim('→')} Install mcptap so the config can import \`defineConfig\`:`);
    console.log(`     ${kleur.bold(installCmd)}`);
    console.log();
    console.log(`  ${kleur.dim('→')} Then run: ${kleur.bold('npx mcptap run')}`);
  } else {
    console.log(`  ${kleur.dim('→')} Run: ${kleur.bold('npx mcptap run')}`);
  }
  console.log();
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

function generateConfig(detected: Detected, tools: Tool[]): string {
  const argsLiteral = JSON.stringify(detected.args);
  const toolAssertions = tools
    .map(
      (t) =>
        `    {
      name: 'lists tool: ${escape(t.name)}',
      assert: async (server) => {
        const tools = await server.listTools();
        if (!tools.find((tool) => tool.name === '${escape(t.name)}')) {
          throw new Error('${escape(t.name)} missing from tool list');
        }
      },
    },`,
    )
    .join('\n');

  return `import { defineConfig } from 'mcptap';

// Generated by \`mcptap init\` — edit freely.

export default defineConfig({
  slug: '${detected.slug}',
  server: {
    command: '${detected.command}',
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
  slug: '${detected.slug}',
  server: {
    command: '${detected.command}',
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

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
