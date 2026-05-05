import { execFileSync } from 'node:child_process';

export type GitMeta = {
  commit_sha?: string;
  branch?: string;
  repo_url?: string;
};

/**
 * Best-effort git enrichment. Silently returns empty fields if git is unavailable
 * or the cwd is not a git repo.
 */
export function detectGitMeta(): GitMeta {
  return {
    commit_sha: tryGit(['rev-parse', 'HEAD']),
    branch: tryGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    repo_url: tryGit(['config', '--get', 'remote.origin.url']),
  };
}

function tryGit(args: string[]): string | undefined {
  try {
    const out = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1500,
    }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}
