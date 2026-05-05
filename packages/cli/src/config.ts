import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import type { Config } from '@mcptap/core';

const CANDIDATE_NAMES = [
  'mcptap.config.ts',
  'mcptap.config.mts',
  'mcptap.config.js',
  'mcptap.config.mjs',
];

export async function loadConfig(maybePath: string | undefined): Promise<{
  config: Config;
  path: string;
}> {
  const cwd = process.cwd();
  const path = resolveConfigPath(maybePath, cwd);

  if (!path) {
    throw new ConfigNotFoundError(
      `no mcptap config found. Looked for: ${CANDIDATE_NAMES.join(', ')} in ${cwd}`,
    );
  }

  const jiti = createJiti(pathToFileURL(cwd + '/').href, {
    interopDefault: true,
    moduleCache: false,
  });

  const mod = await jiti.import<Config | { default: Config }>(path);
  const config = (mod as { default?: Config }).default ?? (mod as Config);

  if (!config || typeof config !== 'object' || !('slug' in config)) {
    throw new Error(
      `config at ${path} did not export a valid mcptap config (must have { slug, server, tests })`,
    );
  }

  return { config: config as Config, path };
}

function resolveConfigPath(maybe: string | undefined, cwd: string): string | null {
  if (maybe) {
    const p = isAbsolute(maybe) ? maybe : resolve(cwd, maybe);
    return existsSync(p) ? p : null;
  }
  for (const name of CANDIDATE_NAMES) {
    const p = resolve(cwd, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export class ConfigNotFoundError extends Error {
  readonly code = 'MCPTAP001_CONFIG_NOT_FOUND' as const;
}
