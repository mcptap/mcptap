import { defineCommand, runMain } from 'citty';
import { runTests } from '@mcptap/core';
import { ConfigNotFoundError, loadConfig } from './config.js';
import { detectGitMeta } from './git.js';
import { runInit } from './init.js';
import { installCommand } from './install-cmd.js';
import { reportTerminal } from './reporter.js';
import { reportToDashboard, resolveReporterUrl } from './reporter-dashboard.js';
import { scoreCommand } from './score-cmd.js';
import { logger, setLoggerSilent } from './utils/logger.js';
import { VERSION } from './version.js';

// EPIPE: piping `mcptap` into something that closes early (e.g. `... | head`)
// must exit cleanly, not dump a stack trace.
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
});

// Graceful Ctrl-C / SIGTERM: print a single line and exit 130 — never a
// stack trace from a half-finished promise.
const onCancel = (): never => {
  logger.break();
  logger.log('Cancelled.');
  logger.break();
  process.exit(130);
};
process.on('SIGINT', onCancel);
process.on('SIGTERM', onCancel);

const runCommand = defineCommand({
  meta: {
    name: 'run',
    description: 'Run mcptap tests against an MCP server.',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to mcptap.config.ts (auto-detected if omitted)',
    },
    filter: {
      type: 'string',
      description: 'Only run tests whose name contains this substring',
    },
    update: {
      type: 'boolean',
      description: 'Update snapshot files when they mismatch',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Print run output as JSON instead of the terminal report',
      default: false,
    },
    'report-to': {
      type: 'string',
      description:
        'POST the run output to a URL (or "dashboard" for the hosted mcptap.dev endpoint)',
    },
    'api-key': {
      type: 'string',
      description: 'Bearer token for the --report-to endpoint (or env MCPTAP_API_KEY)',
    },
  },
  async run({ args }) {
    if (args.json) setLoggerSilent(true);

    let loaded;
    try {
      loaded = await loadConfig(args.config);
    } catch (err) {
      if (err instanceof ConfigNotFoundError) {
        logger.error(err.message);
        logger.dim('  hint: run `mcptap init` to scaffold one');
        process.exit(2);
      }
      throw err;
    }
    const { config, path } = loaded;

    const run = await runTests(config, {
      filter: args.filter,
      configPath: path,
      updateSnapshots: args.update,
      meta: { mcptap_version: VERSION, ...detectGitMeta() },
    });

    if (args.json) {
      process.stdout.write(JSON.stringify(run, null, 2) + '\n');
    } else {
      reportTerminal(run, path);
    }

    const reportTo = args['report-to'];
    if (reportTo) {
      const apiKey = args['api-key'] ?? process.env.MCPTAP_API_KEY;
      await reportToDashboard(resolveReporterUrl(reportTo), run, apiKey);
    }

    process.exit(run.status === 'pass' ? 0 : 1);
  },
});

const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold mcptap.config.ts in the current project.',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Overwrite an existing mcptap.config.ts',
      default: false,
    },
  },
  async run({ args }) {
    await runInit({ force: args.force });
  },
});

const main = defineCommand({
  meta: {
    name: 'mcptap',
    version: VERSION,
    description: 'Vitest, but it knows about MCP.',
  },
  subCommands: {
    run: runCommand,
    init: initCommand,
    score: scoreCommand,
    install: installCommand,
  },
});

runMain(main);
