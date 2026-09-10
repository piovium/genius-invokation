// Probe workspaces for the desktop gate, created inside the GTS checkout.
//
// L1 asks for cold starts of the real editor with the repository root and with
// `examples` open. Both need a GamingTS consumer the reviewed extension-host
// test can edit, break and restore, so this module creates one probe directory
// per workspace and removes it again. The probe holds the repository's own
// reviewed language-server fixture sources, and its project files mirror what
// `packages/language-server/__tests__/fixture.ts` writes for the stdio gate, so
// the gate exercises what the checkout ships instead of a private copy.
//
// Preparation and restoration happen inside one gate run. The ownership record
// is written before the first probe byte, so a crashed or timed-out run can
// still be recovered by an independent process.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DESKTOP_WORKSPACES = ['root-workspace', 'examples-workspace'];
/** Carries a non-ASCII prefix and a space, which L2-L3 require of the paths. */
export const PROBE_DIRECTORY = '临时 desktop fixture';
export const PROBE_SOURCES = ['current.gts', 'old_versions.gts', 'consumer.ts', 'component.tsx'];
const OWNER_FILE = 'desktop-owner.json';
const TARGET_FILE = 'desktop-target.json';
const SOURCES_FILE = 'desktop-sources.json';
/** The anchor the reviewed extension-host test edits, breaks and restores. */
const HEALTH_STATEMENT = 'health 10';

const portable = value => value.split(path.sep).join('/');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * The stable URI a probe file is described by in evidence.
 *
 * The raw report keeps the machine-specific `file:` spelling of every source;
 * this synthetic, machine-independent path is what the approved fixture
 * expectations name, and the trace maps the former onto the latter explicitly.
 */
export function logicalUri(workspaceId, file) {
  return `file:///workspace/${workspaceId}/${file}`;
}

/**
 * Read the reviewed fixture sources from the checkout itself.
 *
 * The module is imported from the GTS checkout rather than copied here, so a
 * probe that disagrees with `packages/language-server/__tests__/fixture.ts`
 * fails instead of testing a private copy of the sources.
 */
export async function loadFixtureSources({ repository, fixtureModule }) {
  const file = path.join(repository, fixtureModule);
  if (!fs.existsSync(file)) throw new Error(`The reviewed fixture module is missing: ${fixtureModule}`);
  const module = await import(pathToFileURL(file).href);
  const sources = module.fixtureSources;
  const reviewed = {};
  for (const name of PROBE_SOURCES) {
    if (typeof sources?.[name] !== 'string') {
      throw new Error(`The reviewed fixture module did not export ${name}`);
    }
    reviewed[name] = sources[name];
  }
  return reviewed;
}

/** Where one workspace's probe lives, in absolute and repository-relative terms. */
export function probeWorkspace({ repository, workspace }) {
  if (!workspace || !DESKTOP_WORKSPACES.includes(workspace.id)) {
    throw new Error(`Unknown desktop workspace: ${workspace?.id}`);
  }
  const parent = [workspace.relative, workspace.probeBase].filter(Boolean).join('/');
  const probeRelative = [parent, PROBE_DIRECTORY].filter(Boolean).join('/');
  const probePath = path.join(repository, ...probeRelative.split('/'));
  return {
    workspaceId: workspace.id,
    workspacePath: path.join(repository, ...(workspace.relative ? workspace.relative.split('/') : [])),
    probePath,
    probeRelative,
    provider: portable(path.relative(probePath, path.join(repository, 'examples/provider'))),
    runtime: portable(path.relative(probePath, path.join(repository, 'packages/runtime/dist/index.js'))),
  };
}

/** The probe texts: the reviewed fixture sources plus the project files. */
function probeFiles({ probe, fixtureSources }) {
  const sources = PROBE_SOURCES.map(name => {
    const text = fixtureSources[name];
    if (typeof text !== 'string') throw new Error(`Reviewed probe source is missing: ${name}`);
    return { name, text };
  });
  return [
    ...sources,
    { name: 'package.json', text: `${JSON.stringify({
      type: 'module',
      gamingTs: { providerImportSource: probe.provider, runtimeImportSource: probe.runtime },
    }, null, 2)}\n` },
    { name: 'tsconfig.json', text: `${JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: 'ESNext', module: 'Preserve',
        moduleResolution: 'Bundler', jsx: 'Preserve', types: ['node'], allowImportingTsExtensions: true },
      include: ['./*.ts', './*.tsx', './*.gts'],
    }, null, 2)}\n` },
  ];
}

/**
 * Create one workspace probe and its exact ownership and binding records.
 *
 * The ownership record is written first, so a failure halfway through still
 * leaves enough information for `restoreDesktopTarget` to undo the partial
 * directory. The target and source records are what the reviewed extension-host
 * test reads and what the validator later rebinds to the GTS checkout.
 */
export async function prepareDesktopTarget({ root, contract, plan, workspaceId, nonce, directory, fixtureSources }) {
  const repository = path.join(root, contract.repositories[plan.repository].path);
  const workspace = plan.workspaces.find(item => item.id === workspaceId);
  const probe = probeWorkspace({ repository, workspace });
  if (fs.existsSync(probe.probePath)) {
    throw new Error(`Refusing to reuse an existing probe directory: ${probe.probeRelative}`);
  }
  const files = probeFiles({ probe, fixtureSources });
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, OWNER_FILE), `${JSON.stringify({
    workspaceId, nonce, repository, probeRelative: probe.probeRelative,
    files: files.map(file => ({ name: file.name, sha256: sha256(Buffer.from(file.text)) })),
  }, null, 2)}\n`, { flag: 'wx' });
  fs.mkdirSync(probe.probePath);
  for (const file of files) {
    fs.writeFileSync(path.join(probe.probePath, file.name), file.text, { flag: 'wx' });
  }
  const paths = Object.fromEntries(files.map(file => [file.name, path.join(probe.probePath, file.name)]));
  const logicalUris = Object.fromEntries(files.map(file => [file.name, logicalUri(workspaceId, file.name)]));
  const target = {
    workspaceId, workspacePath: probe.workspacePath, probe: probe.probePath,
    healthStatement: HEALTH_STATEMENT, files: Object.fromEntries(PROBE_SOURCES.map(name => [name, paths[name]])),
  };
  const sources = plan.descriptors.map(descriptor => ({
    name: descriptor.name, file: descriptor.file, route: descriptor.route,
    fixtureId: `${workspaceId}/${descriptor.name}`,
    actualUri: pathToFileURL(paths[descriptor.file]).href, logicalUri: logicalUris[descriptor.file],
  }));
  const support = plan.probeSupport.map(name => ({
    name, file: paths[name], uri: pathToFileURL(paths[name]).href,
    sha256: sha256(fs.readFileSync(paths[name])),
  }));
  const targetFile = path.join(directory, TARGET_FILE);
  const sourcesFile = path.join(directory, SOURCES_FILE);
  fs.writeFileSync(targetFile, `${JSON.stringify(target, null, 2)}\n`, { flag: 'wx' });
  fs.writeFileSync(sourcesFile, `${JSON.stringify({ workspaceId, probe: probe.probePath, sources, support }, null, 2)}\n`, { flag: 'wx' });
  return { workspaceId, workspacePath: probe.workspacePath, probePath: probe.probePath,
    probeRelative: probe.probeRelative, targetFile, sourcesFile, target, files: paths, logicalUris, sources, support };
}

/**
 * Remove the probe this run created, and nothing else.
 *
 * The extension-host test rewrites the sources while it runs, so restoration
 * cannot compare contents. It instead requires every entry below the probe to
 * be one of the recorded files: an unexpected entry means something else is
 * using the path, and the directory is then left in place for review.
 */
export function restoreDesktopTarget(directory) {
  const ownerFile = path.join(directory, OWNER_FILE);
  if (!fs.existsSync(ownerFile)) return { workspaceId: null, probe: null, skipped: true, removed: [], reason: 'no probe was prepared' };
  const owner = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
  const probe = probePathOf(owner);
  if (!fs.existsSync(probe)) {
    return { workspaceId: owner.workspaceId ?? null, probe, skipped: true, removed: [], reason: 'probe is already gone' };
  }
  const unexpected = unexpectedEntries(probe, owner.files.map(file => file.name));
  if (unexpected.length) {
    throw new Error(`Refusing to remove ${owner.probeRelative}: unexpected entries ${unexpected.join(', ')}`);
  }
  const removed = owner.files.map(file => file.name);
  fs.rmSync(probe, { recursive: true, force: false });
  return { workspaceId: owner.workspaceId ?? null, probe, skipped: false, removed, reason: null };
}

/** Rebuild the absolute probe path from the ownership record alone. */
function probePathOf(owner) {
  if (typeof owner.repository !== 'string' || typeof owner.probeRelative !== 'string'
    || owner.probeRelative.includes('..') || path.isAbsolute(owner.probeRelative)) {
    throw new Error('Invalid desktop ownership record');
  }
  return path.resolve(owner.repository, ...owner.probeRelative.split('/'));
}

/** Entries below the probe that this run did not create, as probe-relative paths. */
export function unexpectedEntries(probe, expected, relative = '') {
  const allowed = new Set(expected);
  const unexpected = [];
  for (const entry of fs.readdirSync(path.join(probe, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) unexpected.push(`${name} (link)`);
    else if (entry.isDirectory()) unexpected.push(...unexpectedEntries(probe, expected, name));
    else if (!allowed.has(name)) unexpected.push(name);
  }
  return unexpected.sort();
}
