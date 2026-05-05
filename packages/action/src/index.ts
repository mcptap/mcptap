import * as core from '@actions/core';
import * as github from '@actions/github';
import { spawn } from 'node:child_process';
import type { RunOutput } from 'mcptap';
import { COMMENT_MARKER, renderPrComment } from './comment.js';

async function main(): Promise<void> {
  const config = core.getInput('config');
  const filter = core.getInput('filter');
  const reportTo = core.getInput('report-to');
  const apiKey = core.getInput('api-key');
  const postComment = core.getBooleanInput('comment');
  const token = core.getInput('github-token');

  const args = ['mcptap', 'run', '--json'];
  if (config) args.push('--config', config);
  if (filter) args.push('--filter', filter);
  if (reportTo) args.push('--report-to', reportTo);
  if (apiKey) args.push('--api-key', apiKey);

  core.startGroup('mcptap run');
  const { stdout, exitCode } = await runCli(args);
  core.endGroup();

  let run: RunOutput;
  try {
    run = JSON.parse(stdout);
  } catch (err) {
    core.setFailed(
      `Could not parse mcptap output as JSON. exit=${exitCode}. err=${(err as Error).message}`,
    );
    core.error(stdout.slice(0, 4000));
    return;
  }

  // Outputs
  core.setOutput('passed', run.totals.passed);
  core.setOutput('failed', run.totals.failed);
  core.setOutput('total', run.totals.total);
  core.setOutput('status', run.status);

  // Job summary (always written)
  await core.summary.addRaw(renderPrComment(run)).write();

  // PR comment (only on pull_request events)
  if (postComment && github.context.payload.pull_request && token) {
    try {
      await postOrUpdateComment(token, run);
    } catch (err) {
      core.warning(`Failed to post PR comment: ${(err as Error).message}`);
    }
  }

  if (run.status !== 'pass') {
    core.setFailed(`${run.totals.failed} test(s) failed`);
  }
}

function runCli(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['--yes', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      core.info(text.trimEnd());
    });
    child.on('close', (code) => {
      if (stderr.length === 0 && stdout.length > 0) {
        // streamed nothing on stderr, mirror stdout (excluding JSON tail) to log
      }
      resolve({ stdout, exitCode: code ?? 1 });
    });
  });
}

async function postOrUpdateComment(token: string, run: RunOutput): Promise<void> {
  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const issue_number = github.context.payload.pull_request!.number;

  const body = renderPrComment(run);

  // Find existing comment by marker
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
