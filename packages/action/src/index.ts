import * as core from '@actions/core';
import * as github from '@actions/github';
import { spawn } from 'node:child_process';
import type { RunOutput, ScoreReport } from 'mcptap';
import { buildRunArgs, buildScoreArgs, envWithReporterApiKey } from './cli-args.js';
import { COMMENT_MARKER, renderPrComment } from './comment.js';

async function main(): Promise<void> {
  const config = core.getInput('config');
  const filter = core.getInput('filter');
  const reportTo = core.getInput('report-to');
  const apiKey = core.getInput('api-key');
  const postComment = core.getBooleanInput('comment');
  const wantScore = core.getBooleanInput('score');
  const minScore = core.getInput('min-score');
  const token = core.getInput('github-token');

  if (apiKey) core.setSecret(apiKey);

  // 1. mcptap run
  const runArgs = buildRunArgs({ config, filter, reportTo, apiKey });
  const cliEnv = envWithReporterApiKey(apiKey);

  core.startGroup('mcptap run');
  const runResult = await runCli(runArgs, cliEnv);
  core.endGroup();

  let run: RunOutput;
  try {
    run = JSON.parse(runResult.stdout);
  } catch (err) {
    core.setFailed(
      `Could not parse mcptap output as JSON. exit=${runResult.exitCode}. err=${(err as Error).message}`,
    );
    core.error(runResult.stdout.slice(0, 4000));
    return;
  }

  // 2. mcptap score (optional)
  let score: ScoreReport | undefined;
  if (wantScore) {
    const scoreArgs = buildScoreArgs({ config, minScore });

    core.startGroup('mcptap score');
    const scoreResult = await runCli(scoreArgs, cliEnv);
    core.endGroup();

    try {
      score = JSON.parse(scoreResult.stdout) as ScoreReport;
    } catch (err) {
      core.warning(
        `Could not parse score output as JSON; skipping score section. err=${(err as Error).message}`,
      );
    }

    // If --min-score was set and the score CLI exited non-zero, propagate that as a failure later.
    if (minScore && scoreResult.exitCode !== 0 && run.status === 'pass') {
      core.warning(
        `mcptap score exited ${scoreResult.exitCode} (min-score=${minScore}); marking run as failed.`,
      );
      run.status = 'fail';
    }
  }

  // Outputs
  core.setOutput('passed', run.totals.passed);
  core.setOutput('failed', run.totals.failed);
  core.setOutput('total', run.totals.total);
  core.setOutput('status', run.status);
  if (score) {
    core.setOutput('score-average', score.summary.average);
    core.setOutput('score-tokens', score.summary.total_tokens);
  }

  // Job summary (always)
  await core.summary.addRaw(renderPrComment(run, score)).write();

  // PR comment (only on pull_request events)
  if (postComment && github.context.payload.pull_request && token) {
    try {
      await postOrUpdateComment(token, run, score);
    } catch (err) {
      core.warning(`Failed to post PR comment: ${(err as Error).message}`);
    }
  }

  if (run.status !== 'pass') {
    core.setFailed(`${run.totals.failed} test(s) failed`);
  }
}

function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['--yes', ...args], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      core.info(chunk.toString().trimEnd());
    });
    child.on('close', (code) => {
      resolve({ stdout, exitCode: code ?? 1 });
    });
  });
}

async function postOrUpdateComment(
  token: string,
  run: RunOutput,
  score: ScoreReport | undefined,
): Promise<void> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const issue_number = github.context.payload.pull_request!.number;

  const body = renderPrComment(run, score);

  const existing = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const found = existing.data.find((c) => c.body?.includes(COMMENT_MARKER));

  if (found) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: found.id,
      body,
    });
    core.info(`Updated existing PR comment ${found.id}`);
  } else {
    const created = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
    core.info(`Posted new PR comment ${created.data.id}`);
  }
}

main().catch((err) => {
  core.setFailed((err as Error).message);
});
