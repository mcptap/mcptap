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
  const repoUrl = tryGit(['config', '--get', 'remote.origin.url']);
  return {
    commit_sha: tryGit(['rev-parse', 'HEAD']),
    branch: tryGit(['rev-parse', '--abbrev-ref', 'HEAD']),
    repo_url: sanitizeGitRemoteUrl(repoUrl),
  };
}

function sanitizeGitRemoteUrl(remoteUrl: string | undefined): string | undefined {
  if (!remoteUrl) return undefined;

  try {
    const url = new URL(remoteUrl);
    if (url.username || url.password) {
      url.username = '';
      url.password = '';
      return url.toString();
    }
  } catch {
    // SCP-style remotes such as git@github.com:org/repo.git are not URLs.
  }

  return remoteUrl;
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
