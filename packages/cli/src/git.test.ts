import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, test } from 'vitest';
import { detectGitMeta } from './git.js';

let cwdBefore = process.cwd();
let tmp: string | undefined;

afterEach(() => {
  process.chdir(cwdBefore);
  if (tmp) {
    rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  }
});

function initRepo(remoteUrl: string): void {
  cwdBefore = process.cwd();
  tmp = mkdtempSync(join(tmpdir(), 'mcptap-git-'));
  execFileSync('git', ['init', '-q'], { cwd: tmp });
  execFileSync('git', ['config', 'remote.origin.url', remoteUrl], { cwd: tmp });
  process.chdir(tmp);
}

describe('detectGitMeta', () => {
  test('redacts credentials from HTTPS remote URLs before reporting metadata', () => {
    initRepo('https://x-access-token:ghp_FAKESECRET123@example.com/org/repo.git');

    expect(detectGitMeta().repo_url).toBe('https://example.com/org/repo.git');
  });

  test('leaves SSH-style remote URLs intact', () => {
    initRepo('git@github.com:mcptap/mcptap.git');

    expect(detectGitMeta().repo_url).toBe('git@github.com:mcptap/mcptap.git');
  });
});
