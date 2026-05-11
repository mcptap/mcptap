// Reads this package's version from package.json at runtime so it can never
// drift from the published artifact.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // After build: <pkg>/dist/version.js → <pkg>/package.json
    const pkgPath = join(here, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const VERSION = readVersion();
