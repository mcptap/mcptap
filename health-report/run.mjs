#!/usr/bin/env node
// Bootloader: loads run.ts via jiti so we can keep the runner in TypeScript
// without a build step. On Node 22+ this could be replaced with
// `node --experimental-strip-types ./run.ts`.

import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
await jiti.import('./run.ts');
