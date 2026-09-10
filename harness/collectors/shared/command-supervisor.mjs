import assert from 'node:assert/strict';
import { restoreVitestResultCaches } from './vitest-result-cache.mjs';

export const recoveryReserveMs = 5000;

// The existing executor owns process-tree termination. This parent only
// reserves cleanup time and restores durable, explicit result-cache metadata.
export async function executeWithCacheRecovery({ execute, gateTimeoutMs, cacheDirectory, ...commandOptions }) {
  assert.ok(Number.isSafeInteger(gateTimeoutMs) && gateTimeoutMs > recoveryReserveMs, 'Gate has no recovery budget');
  const timeoutMs = gateTimeoutMs - recoveryReserveMs;
  const startedAt = new Date().toISOString();
  let command;
  let recoveryError = null;
  try {
    command = await execute({ ...commandOptions, timeoutMs });
  } finally {
    try { restoreVitestResultCaches(cacheDirectory); }
    catch (error) {
      const causes = error instanceof AggregateError ? error.errors : [error];
      recoveryError = causes.map(error => error.stack ?? String(error)).join('\n');
    }
  }
  return { command, timeoutMs, startedAt, finishedAt: new Date().toISOString(), recoveryError };
}
