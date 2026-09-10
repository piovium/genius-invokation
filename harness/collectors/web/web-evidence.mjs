import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseStdio } from './web-observations.mjs';

export function parseNativeRun(file, text) {
  const rows = text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const identity = rows.find(row => row.kind === 'identity')?.detail;
  return { file, rows, pid: rows[0]?.pid, identity,
    input: parseStdio(rows, 'stdin'), output: parseStdio(rows, 'stdout'),
    stderr: Buffer.concat(rows.filter(row => row.kind === 'stderr').map(row => Buffer.from(row.detail.base64, 'base64'))).toString() };
}

export async function readNativeRuns(directory) {
  const files = (await readdir(directory)).filter(file => /^web-native-\d+\.jsonl$/.test(file)).sort();
  const runs = [];
  for (const file of files) {
    runs.push(parseNativeRun(file, await readFile(path.join(directory, file), 'utf8')));
  }
  return runs;
}
