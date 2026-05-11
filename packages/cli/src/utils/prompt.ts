// Thin wrapper around the `prompts` package that:
// - Auto-skips prompts in non-interactive environments (CI, agentic sessions,
//   non-TTY stdin) and returns the provided fallback.
// - On user cancel (Ctrl-C inside the prompt), exits cleanly with code 130.

import promptsLib from 'prompts';
import type { PromptObject, Answers } from 'prompts';
import { logger } from './logger.js';

// Same shape as react-doctor's list — both human-driven CI and agent-driven
// non-interactive shells flip this on.
const NON_INTERACTIVE_ENV_VARS = [
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'BUILDKITE',
  'JENKINS_URL',
  'TF_BUILD',
  'CODEBUILD_BUILD_ID',
  'TEAMCITY_VERSION',
  'BITBUCKET_BUILD_NUMBER',
  'CIRCLECI',
  'TRAVIS',
  'DRONE',
  'CLAUDECODE',
  'CLAUDE_CODE',
  'CURSOR_AGENT',
  'CODEX_CI',
  'OPENCODE',
  'AMP_HOME',
];

export function isNonInteractive(): boolean {
  if (!process.stdin.isTTY) return true;
  return NON_INTERACTIVE_ENV_VARS.some((name) => Boolean(process.env[name]));
}

const onCancel = (): boolean => {
  logger.break();
  logger.log('Cancelled.');
  logger.break();
  process.exit(130);
};

export async function prompt<T extends string = string>(
  questions: PromptObject<T> | PromptObject<T>[],
): Promise<Answers<T>> {
  return promptsLib(questions, { onCancel });
}

/**
 * Convenience for a single yes/no prompt. Auto-resolves to the fallback when
 * non-interactive.
 */
export async function confirm(message: string, fallback: boolean): Promise<boolean> {
  if (isNonInteractive()) return fallback;
  const answer = await prompt({
    type: 'confirm',
    name: 'value',
    message,
    initial: fallback,
  });
  return Boolean(answer.value);
}
