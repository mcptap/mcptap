import kleur from 'kleur';
import type { RunOutput } from '@mcptap/core';

const DASHBOARD_DEFAULT_URL = 'https://api.mcptap.dev/v1/runs';

/**
 * Resolve the `--report-to` flag value to a concrete URL.
 * The magic value `dashboard` resolves to the canonical hosted endpoint.
 */
export function resolveReporterUrl(value: string): string {
  if (value === 'dashboard') return DASHBOARD_DEFAULT_URL;
  return value;
}

/**
 * POST a run output to the configured reporter endpoint.
 * Best-effort: logs to stderr on failure but never throws — reporter
 * failures must not mask test failures.
 */
export async function reportToDashboard(
  url: string,
  run: RunOutput,
  apiKey: string | undefined,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(run),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(
        kleur.dim(`  ${kleur.yellow('!')} reporter: ${url} responded ${res.status}`),
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(kleur.dim(`  ${kleur.yellow('!')} reporter: ${message}`));
  }
}
