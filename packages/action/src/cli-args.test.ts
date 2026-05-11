import { describe, expect, test } from 'vitest';
import { buildRunArgs, buildScoreArgs, envWithReporterApiKey } from './cli-args.js';

describe('action CLI argument construction', () => {
  test('does not pass reporter API keys as command-line arguments', () => {
    const args = buildRunArgs({
      config: 'mcptap.config.ts',
      filter: 'smoke',
      reportTo: 'dashboard',
      apiKey: 'secret-token',
    });

    expect(args).toEqual([
      'mcptap',
      'run',
      '--json',
      '--config',
      'mcptap.config.ts',
      '--filter',
      'smoke',
      '--report-to',
      'dashboard',
    ]);
    expect(args.join(' ')).not.toContain('secret-token');
    expect(args).not.toContain('--api-key');
  });

  test('passes reporter API keys via environment for the child process', () => {
    expect(envWithReporterApiKey('secret-token', { PATH: '/bin' })).toEqual({
      PATH: '/bin',
      MCPTAP_API_KEY: 'secret-token',
    });
  });

  test('score args include config and minimum score but no run reporter options', () => {
    expect(buildScoreArgs({ config: 'tap.ts', minScore: '85' })).toEqual([
      'mcptap',
      'score',
      '--json',
      '--config',
      'tap.ts',
      '--min-score',
      '85',
    ]);
  });
});
