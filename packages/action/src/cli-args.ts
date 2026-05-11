export type RunCliInputs = {
  config?: string;
  filter?: string;
  reportTo?: string;
  /** Used only to decide env injection; never emitted as an argv value. */
  apiKey?: string;
};

export type ScoreCliInputs = {
  config?: string;
  minScore?: string;
};

export function buildRunArgs(inputs: RunCliInputs): string[] {
  const runArgs = ['mcptap', 'run', '--json'];
  if (inputs.config) runArgs.push('--config', inputs.config);
  if (inputs.filter) runArgs.push('--filter', inputs.filter);
  if (inputs.reportTo) runArgs.push('--report-to', inputs.reportTo);
  return runArgs;
}

export function buildScoreArgs(inputs: ScoreCliInputs): string[] {
  const scoreArgs = ['mcptap', 'score', '--json'];
  if (inputs.config) scoreArgs.push('--config', inputs.config);
  if (inputs.minScore) scoreArgs.push('--min-score', inputs.minScore);
  return scoreArgs;
}

export function envWithReporterApiKey(
  apiKey: string | undefined,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  if (!apiKey) return baseEnv;
  return { ...baseEnv, MCPTAP_API_KEY: apiKey };
}
