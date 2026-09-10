import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exitCodes = { PASS: 0, FAIL: 1, BLOCKED: 2 };

function normalizeFiles(repo, files, label) {
  if (!Array.isArray(files)) {
    throw new Error(`${label}.files must be an array`);
  }
  const seen = new Set();
  for (const file of files) {
    if (typeof file !== 'string' || !file || file.includes('\0')) {
      throw new Error(`${label} contains an invalid path`);
    }
    // Backslashes in evidence are path separators even on a Linux verifier.
    const portable = file.replaceAll('\\', '/');
    if ((/^[A-Za-z]:/.test(portable) || portable.startsWith('//'))
      && !path.isAbsolute(portable)) {
      throw new Error(`${label} contains an outside-root path: ${file}`);
    }
    const absolute = path.resolve(repo, portable);
    const relative = path.relative(repo, absolute);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`)
      || path.isAbsolute(relative)) {
      throw new Error(`${label} contains an outside-root path: ${file}`);
    }
    const normalized = relative.split(path.sep).join('/');
    if (!normalized.toLowerCase().endsWith('.gts')) {
      throw new Error(`${label} must contain GTS paths only: ${file}`);
    }
    const key = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    if (seen.has(key)) {
      throw new Error(`${label} contains a duplicate path: ${file}`);
    }
    seen.add(key);
  }
  return seen;
}

/** Compare exact sets, never counts. Observations must be actual program GTS paths. */
export function compareCoverage({ repo, baseline, actual, observed }) {
  try {
    if (!path.isAbsolute(repo)) {
      throw new Error('repo must be an absolute path');
    }
    const expected = normalizeFiles(repo, baseline, 'inventory');
    if (!expected.size) {
      throw new Error('inventory must contain at least one GTS file');
    }
    const disk = normalizeFiles(repo, actual, 'source inventory');
    const program = observed === undefined
      ? undefined : normalizeFiles(repo, observed, 'observed program');
    const difference = (left, right) => [...left].filter(file => !right.has(file)).sort();
    const details = {
      baselineCount: expected.size,
      sourceCount: disk.size,
      missingSources: difference(expected, disk),
      unexpectedSources: difference(disk, expected),
      observedCount: program?.size ?? null,
      missingProgramFiles: program ? difference(expected, program) : null,
      unexpectedProgramFiles: program ? difference(program, expected) : null,
    };
    if (details.missingSources.length || details.unexpectedSources.length
      || details.missingProgramFiles?.length || details.unexpectedProgramFiles?.length) {
      return { status: 'FAIL', details };
    }
    if (!program) {
      return { status: 'BLOCKED', details: {
        ...details,
        reason: 'Actual program GTS coverage was not observed; disk inventory cannot prove checking.',
      } };
    }
    return { status: 'PASS', details };
  } catch (error) {
    return { status: 'FAIL', details: { reason: error.message } };
  }
}

export function sourceInventory(repo) {
  const files = [];
  const root = fs.realpathSync.native(repo);
  const active = new Set();
  function contained(file) {
    const real = fs.realpathSync.native(file);
    const relative = path.relative(root, real);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Source inventory link escapes repository: ${file}`);
    }
    return real;
  }
  function visit(directory) {
    const real = contained(directory);
    if (active.has(real)) throw new Error(`Source inventory has a symbolic-link cycle: ${directory}`);
    active.add(real);
    try {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const file = path.join(directory, entry.name);
        const stat = entry.isSymbolicLink() ? fs.statSync(contained(file)) : entry;
        if (stat.isDirectory()) visit(file);
        else if (stat.isFile() && entry.name.toLowerCase().endsWith('.gts')) {
          files.push(path.relative(repo, file));
        }
      }
    } finally { active.delete(real); }
  }
  visit(repo);
  return files.sort();
}

export function probeCoverage({ repo, inventory, observed }) {
  if (!repo || !path.isAbsolute(repo) || !inventory) {
    return { status: 'FAIL', details: {
      reason: 'Usage: coverage.mjs --repo <absolute directory> --inventory <json> [--observed <json>]',
    } };
  }
  let baseline;
  let program;
  try {
    baseline = JSON.parse(fs.readFileSync(inventory, 'utf8'));
    if (observed) program = JSON.parse(fs.readFileSync(observed, 'utf8'));
  } catch (error) {
    return { status: error.code === 'ENOENT' ? 'BLOCKED' : 'FAIL',
      details: { reason: error.message } };
  }
  if (observed && !Array.isArray(program?.files)) {
    return { status: 'FAIL', details: { reason: 'observed.files must be an array' } };
  }
  try {
    const result = compareCoverage({ repo, baseline: baseline?.files,
      actual: sourceInventory(repo), observed: program?.files });
    result.details.inventory = path.resolve(inventory);
    result.details.observed = observed ? path.resolve(observed) : null;
    result.details.sourceInventoryExcludes = ['.git', 'node_modules'];
    return result;
  } catch (error) {
    return { status: 'BLOCKED', details: { reason: error.message } };
  }
}

if (process.argv[1] && fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const options = {};
  let result;
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    if (!args[index].startsWith('--') || !['repo', 'inventory', 'observed'].includes(key)
      || !args[index + 1] || options[key]) {
      result = { status: 'FAIL', details: { reason: `Invalid argument: ${args[index]}` } };
      break;
    }
    options[key] = args[index + 1];
  }
  result ??= probeCoverage(options);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCodes[result.status];
}