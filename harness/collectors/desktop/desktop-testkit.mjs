// Test-only builder for internally consistent desktop evidence.
//
// It is never imported by the collector. It fabricates *raw* editor, native,
// launch and pack records so the validator's own re-derivation can be exercised
// in both directions, and it writes a small but real TNB checkout, a prepared
// VS Code runtime and a real ZIP-format `.vsix` so the on-disk checks have
// something real to read. Synthetic records are never acceptance evidence: only
// a real run through the sealed runner is.
//
// `commit()` writes every raw file and rebuilds the observation from the current
// in-memory state, exactly as the collector does, so a test can corrupt the raw
// records and re-commit to see whether the validator still accepts them.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchArguments } from './desktop-launch.mjs';
import { bindNativeServices, readNativeRuns, sha256, validateDesktopLifetimes } from './desktop-evidence.mjs';
import { assertIdentity, resolveCheckoutIdentity } from './desktop-identity.mjs';
import { auditEditorRequests, auditProtocol } from './desktop-protocol.mjs';
import { deriveDesktopTrace } from './desktop-observations.mjs';
import { deriveDesktopScenarios } from './desktop-scenarios.mjs';
import { inspectInstalledExtension, inspectVsix, installedExtensionDirectory, vsixOutputName } from './desktop-vsix.mjs';

export const TEST_NONCE = 'synthetic-desktop-selftest-not-acceptance';

const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const writeBytes = (file, bytes) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
const json = value => `${JSON.stringify(value, null, 2)}\n`;

export function cleanupRecord({ platform, profile, extensionsDirectory, pid }) {
  if (platform === 'linux') {
    return { platform, executed: true, owner: 'linux-cleanup-module', marker: { profile, extensionsDirectory },
      discovered: [pid], roots: [pid], results: [{ rootPid: pid, terminated: true, alive: [], reused: [] }],
      survivors: [], terminated: true };
  }
  return { platform, executed: false, owner: 'windows-job-object',
    reason: `The sealed executor owns process-tree termination through a Windows job object; the Linux cleanup module does not run on ${platform}.`,
    marker: { profile, extensionsDirectory } };
}

function writeSettings(profile, tsdk) {
  write(path.join(profile, 'User', 'settings.json'), json({
    'update.mode': 'none', 'extensions.autoUpdate': false, 'telemetry.telemetryLevel': 'off',
    'typescript.tsserver.log': 'verbose', 'typescript.tsdk': tsdk,
  }));
}

const crc32 = buffer => {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
};

/** Build a real ZIP archive (mixed stored/deflated) from a member map. */
export function buildZip(members) {
  const locals = [], centrals = [];
  let offset = 0;
  let index = 0;
  for (const [name, text] of Object.entries(members)) {
    const raw = Buffer.isBuffer(text) ? text : Buffer.from(text);
    const method = index++ % 2 === 0 ? 0 : 8;
    const content = method === 0 ? raw : zlib.deflateRawSync(raw);
    const nameBytes = Buffer.from(name);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(content.length, 18); local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, content);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8); central.writeUInt16LE(method, 10); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(content.length, 20); central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + content.length;
  }
  const centralSize = centrals.reduce((total, part) => total + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(members).length, 8);
  eocd.writeUInt16LE(Object.keys(members).length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, eocd]);
}

/** UTF-16 position of an absolute offset, counted the way the sealed probe does. */
function position(text, index) {
  const starts = [0];
  for (const match of text.matchAll(/\r\n|\n|\r/g)) starts.push(match.index + match[0].length);
  let line = 0;
  while (line + 1 < starts.length && starts[line + 1] <= index) line++;
  return { line, character: index - starts[line] };
}

/** One-based end position that a whole-document replacement needs. */
function endPosition(text) {
  const lines = text.split(/\r\n|\n|\r/);
  return { line: lines.length, offset: lines.at(-1).length + 1 };
}

function featurePositions(descriptor, text) {
  const anchor = descriptor.anchor ?? '';
  const at = anchor ? Math.max(0, text.indexOf(anchor)) : 0;
  const lines = text.split(/\r\n|\n|\r/);
  // The sealed probe counts UTF-16 coordinates per line, so a position that
  // lands on a line terminator is out of range and must fall back to the start.
  const safe = index => {
    const candidate = position(text, Math.max(0, Math.min(index, text.length)));
    return candidate.line < lines.length && candidate.character <= lines[candidate.line].length
      ? candidate : { line: 0, character: 0 };
  };
  return {
    hover: safe(at), definition: safe(at),
    completion: safe(at + 1), signature: safe(at + 1),
  };
}

const featureCommand = {
  hover: 'vscode.executeHoverProvider',
  definition: 'vscode.executeDefinitionProvider',
  completion: 'vscode.executeCompletionItemProvider',
  signature: 'vscode.executeSignatureHelpProvider',
};

/** The tsserver reply shape the raw VS Code command returns. */
export function diagnosticCommandsFor(items) {
  const body = items.map(item => ({
    category: 'error', code: item.code, text: item.message,
    startLocation: { line: item.range.start.line + 1, offset: item.range.start.character + 1 },
    endLocation: { line: item.range.end.line + 1, offset: item.range.end.character + 1 },
  }));
  return [
    { command: 'syntacticDiagnosticsSync', response: { type: 'response', success: true, command: 'syntacticDiagnosticsSync', body } },
    { command: 'semanticDiagnosticsSync', response: { type: 'response', success: true, command: 'semanticDiagnosticsSync', body: [] } },
  ];
}

/**
 * Build one complete, self-consistent gate observation.
 *
 * `rounds` is the number of real edit cycles to fabricate. Mutating the returned
 * state and calling `commit()` again rewrites every raw file and rebuilds the
 * observation, which is how the negative tests corrupt evidence on disk.
 */
export function buildDesktopFixture({ root, directory = path.join(root, 'run'), rounds, contract, expectations, plan,
  platform = process.platform, arch = process.arch, packed = true }) {
  const nonce = TEST_NONCE;
  const repository = path.join(root, contract.repositories[plan.repository].path);
  const pin = contract.tnbVersion;
  const nativePackage = plan.native.nativePackageTemplate.replace('{platform}', platform).replace('{arch}', arch);
  const preload = fileURLToPath(new URL('./desktop-native-preload.cjs', import.meta.url));
  const preloadSha256 = sha256(fs.readFileSync(preload));
  const extensionManifest = { name: plan.extension.packageName, publisher: 'Guyutongxue', version: '0.0.23', main: './dist/extension.js' };

  // A small but real checkout: identity, hashes and the VSIX all come from bytes.
  write(path.join(repository, 'package.json'), json({ name: '@gi-tcg/gts', private: true }));
  write(path.join(repository, 'examples', '.gitkeep'), '');
  const modulePath = path.join(repository, 'node_modules/typescript/lib/typescript.js');
  write(modulePath, 'module.exports = {};\n');
  write(path.join(repository, 'node_modules/typescript/package.json'), json({ name: 'typescript-native-bridge', version: pin, main: 'lib/typescript.js' }));
  const addonPath = path.join(repository, 'node_modules', nativePackage, plan.native.addonRelativePath);
  const addonBytes = Buffer.from('synthetic native addon bytes\n');
  writeBytes(addonPath, addonBytes);
  write(path.join(repository, 'node_modules', nativePackage, 'package.json'), json({ name: nativePackage, version: pin }));
  write(path.join(repository, plan.extension.manifest), json(extensionManifest));
  const driverPath = path.join(repository, plan.extension.testDriver);
  write(driverPath, '// synthetic review driver\n');
  const runtimePath = path.join(root, plan.runtime[platform].replace('{arch}', arch));
  write(runtimePath, 'synthetic Code executable\n');
  const managerPath = path.join(root, 'runtime', 'pnpm.cjs');
  write(managerPath, '// synthetic pinned manager\n');
  // The validator loads the sealed session probe from the run's own root, so
  // the synthetic root mirrors the harness layout and points at the real probe.
  const sessionProbe = fileURLToPath(new URL('../../probes/session-evidence.mjs', import.meta.url));
  write(path.join(root, 'harness/probes/session-evidence.mjs'),
    `export * from ${JSON.stringify(pathToFileURL(sessionProbe).href)};\n`);

  const identity = assertIdentity(resolveCheckoutIdentity({ root, contract, plan, platform, arch }),
    { contract, plan, platform, arch });

  const byId = new Map(expectations.fixtures.map(item => [item.id, item.fixture]));
  const support = {
    'package.json': json({ type: 'module', gamingTs: { providerImportSource: '../../../examples/provider' } }),
    'tsconfig.json': json({ compilerOptions: { strict: true, noEmit: true }, include: ['./*.gts'] }),
  };
  const legacyText = 'import { Barbara } from "./current.gts";\r\nexport const BarbaraLegacy: number = Barbara;\r\n';

  function buildLaunchRecord({ mode, host, vsix = null }) {
    const { workspacePath, workspaceDirectory } = host;
    const profile = path.join(workspaceDirectory, 'user-data');
    const extensionsDirectory = path.join(workspaceDirectory, 'extensions');
    fs.mkdirSync(profile, { recursive: true });
    fs.mkdirSync(extensionsDirectory, { recursive: true });
    const { install, args } = launchArguments({ plan, mode, repository, profile, extensionsDirectory, workspace: workspacePath, vsix });
    for (const name of ['desktop.stdout.log', 'desktop.stderr.log', 'desktop-install.stdout.log', 'desktop-install.stderr.log']) {
      write(path.join(workspaceDirectory, name), `${name}\n`);
    }
    writeSettings(profile, identity.tsdk);
    const elapsed = host.completedAtMs - host.startedAtMs;
    const command = (label, argv) => ({
      executable: runtimePath, args: argv, cwd: workspacePath,
      startedAt: new Date(host.startedAtMs).toISOString(), durationMs: elapsed,
      exitCode: 0, signal: null, reason: null, fatal: false, bytes: 4096,
      stdout: { file: `${label}.stdout.log` }, stderr: { file: `${label}.stderr.log` },
    });
    return {
      runNonce: nonce, mode,
      runtime: { platform, arch, version: plan.runtime.version, relative: plan.runtime[platform], executable: runtimePath },
      executable: runtimePath, executableSha256: sha256(fs.readFileSync(runtimePath)),
      args, installArgs: install,
      install: install ? { ...command('desktop-install', install), label: 'desktop-install' } : null,
      command: command('desktop', args),
      developmentPath: args.includes('--extensionDevelopmentPath') ? args[args.indexOf('--extensionDevelopmentPath') + 1] : null,
      installExtension: install ? install[install.indexOf('--install-extension') + 1] : null,
      installExtensionFile: mode === 'packed-vsix-install' ? vsix : null,
      installExtensionSha256: mode === 'packed-vsix-install' ? sha256(fs.readFileSync(vsix)) : null,
      profile, extensionsDirectory, workspacePath, repository,
      targetFile: path.join(workspaceDirectory, 'desktop-target.json'),
      rounds, tsdk: identity.tsdk, preload, preloadSha256,
      testFile: driverPath, testSha256: sha256(fs.readFileSync(driverPath)),
      display: platform === 'linux' ? ':99' : null, inheritedGodebug: null, timeoutMs: 900000,
      startedAtMs: host.startedAtMs, completedAtMs: host.completedAtMs,
      logs: ['desktop.stdout.log', 'desktop.stderr.log']
        .map(file => ({ file, sha256: sha256(fs.readFileSync(path.join(workspaceDirectory, file))) })),
      cleanup: cleanupRecord({ platform, profile, extensionsDirectory,
        pid: host.pids['gts-lsp'] }),
    };
  }

  function buildHost({ workspaceId, fixturePrefix, workspacePath, workspaceDirectory, probeBase, base }) {
    const sources = {
      'current.gts': byId.get(`${fixturePrefix}/GTS`).validText,
      'consumer.ts': byId.get(`${fixturePrefix}/TS`).validText,
      'component.tsx': byId.get(`${fixturePrefix}/TSX`).validText,
      'old_versions.gts': legacyText,
    };
    const probe = path.join(workspacePath, probeBase, `临时 desktop-${workspaceId}-${nonce.slice(0, 8)}`);
    const files = Object.fromEntries(plan.probeFiles.map(name => [name, path.join(probe, name)]));
    const logicalUris = Object.fromEntries(plan.probeFiles.map(name => [name, `file:///workspace/${workspaceId}/${name}`]));
    const workspaceUri = pathToFileURL(workspacePath).href;
    const pids = { 'gts-lsp': workspaceId === 'packed-vsix' ? 5301 : 4101, tsserver: workspaceId === 'packed-vsix' ? 5402 : 4202 };

    let clock = base;
    const tick = () => (clock += 1);
    const records = [];
    const record = value => { records.push({ at: tick(), ...value }); return records.at(-1); };
    const native = [];
    const nativeRow = (route, kind, detail) => {
      native.push({ schemaVersion: 1, runNonce: nonce, pid: pids[route], ppid: 4000, atMs: tick(), kind, detail });
      return native.at(-1);
    };

    record({ operation: 'workspace', uri: workspaceUri, targetFiles: files });
    for (const route of plan.native.requiredRoutes) {
      nativeRow(route, 'process', {
        argv: ['node.exe', path.posix.join('/gts', route === 'gts-lsp' ? 'server.js' : 'tsserver.js')],
        execArgv: [], cwd: workspacePath, execPath: 'node.exe',
        preload, preloadSha256, platform, nodeVersion: '26.8.2', electronVersion: '38.0.0',
        godebug: null, tnbGodebugReexec: null,
      });
      nativeRow(route, 'identity', {
        packageName: 'typescript-native-bridge', packageVersion: pin, sdkPath: identity.tsdk,
        modulePath, moduleSha256: identity.moduleSha256, manifestPath: identity.manifestPath,
        manifestSha256: identity.manifestSha256, exportedVersion: '7.0.2',
        native: [{ path: addonPath, sha256: identity.nativeAddonSha256 }],
      });
      nativeRow(route, 'stdout', { base64: Buffer.from(`TNB ACTIVE — typescript is the tsgo-backed fork\npid=${pids[route]}\n`).toString('base64') });
      nativeRow(route, 'counters', { rpcCount: 1, queryCount: 0, projectsLoaded: 1, rpcByMethod: [] });
    }

    let requestId = 0, sequence = 0;
    const opened = new Set();
    const deliveredText = new Map();
    const descriptors = plan.descriptors.map(descriptor => ({
      ...descriptor, fixture: byId.get(`${fixturePrefix}/${descriptor.name}`),
      actualUri: pathToFileURL(files[descriptor.file]).href,
    }));

    const deliver = (descriptor, version, text) => {
      const route = descriptor.route;
      if (route === 'gts-lsp') {
        if (!opened.has(descriptor.actualUri)) {
          opened.add(descriptor.actualUri);
          nativeRow(route, 'ipc-in', { message: { jsonrpc: '2.0', method: 'textDocument/didOpen',
            params: { textDocument: { uri: descriptor.actualUri, languageId: 'gaming-ts', version: 1, text } } } });
        }
        nativeRow(route, 'ipc-in', { message: { jsonrpc: '2.0', method: 'textDocument/didChange',
          params: { textDocument: { uri: descriptor.actualUri, version }, contentChanges: [{ text }] } } });
        return;
      }
      if (!opened.has(descriptor.actualUri)) {
        opened.add(descriptor.actualUri);
        deliveredText.set(descriptor.actualUri, text);
        nativeRow(route, 'ipc-in', { message: { seq: (sequence += 1), type: 'request', command: 'updateOpen',
          arguments: { openFiles: [{ file: descriptor.actualUri, fileContent: text, projectRootPath: workspacePath }] } } });
        return;
      }
      const previous = deliveredText.get(descriptor.actualUri) ?? text;
      nativeRow(route, 'ipc-in', { message: { seq: (sequence += 1), type: 'request', command: 'updateOpen',
        arguments: { changedFiles: [{ fileName: descriptor.actualUri,
          textChanges: [{ start: { line: 1, offset: 1 }, end: endPosition(previous), newText: text }] }] } } });
      deliveredText.set(descriptor.actualUri, text);
    };

    const observePhase = (descriptor, cycle, phase, origin) => {
      const expected = descriptor.fixture;
      const text = phase === 'bad' ? expected.badText : expected.validText;
      const version = tick();
      deliver(descriptor, version, text);
      record({ operation: 'observation', name: descriptor.name, route: descriptor.route, kind: 'source',
        uri: descriptor.actualUri, version, text, cycle, phase, origin });
      const id = ++requestId;
      record({ operation: 'diagnostic request', name: descriptor.name, route: descriptor.route,
        uri: descriptor.actualUri, version, requestId: id });
      const items = phase === 'bad'
        ? [{ code: expected.diagnostic.code, message: `ts: ${expected.diagnostic.messageIncludes}`,
            severity: 1, range: structuredClone(expected.diagnostic.range) }]
        : [];
      const raw = descriptor.route === 'gts-lsp' ? { kind: 'full', items } : diagnosticCommandsFor(items);
      record({ operation: 'raw diagnostics', name: descriptor.name, route: descriptor.route,
        uri: descriptor.actualUri, version, requestId: id, value: raw });
      if (descriptor.route === 'gts-lsp') {
        nativeRow(descriptor.route, 'ipc-out', { message: { jsonrpc: '2.0', id, result: raw } });
      } else {
        nativeRow(descriptor.route, 'ipc-out', { message: { seq: (sequence += 1), type: 'response',
          command: 'syntacticDiagnosticsSync', request_seq: id, success: true, body: [] } });
      }
      record({ operation: 'observation', name: descriptor.name, route: descriptor.route, kind: 'diagnostics',
        uri: descriptor.actualUri, version, requestId: id, response: items.map(item => ({ ...item })) });
      if (phase === 'bad') return version;
      const positions = featurePositions(descriptor, text);
      for (const feature of ['hover', 'definition', 'completion', 'signature']) {
        const featureId = ++requestId;
        record({ operation: 'feature request', name: descriptor.name, uri: descriptor.actualUri, version,
          requestId: featureId, command: featureCommand[feature], feature, position: positions[feature] });
        const response = feature === 'hover'
          ? { contents: [{ kind: 'markdown', value: `const value: ${expected.features.hover}<never>` }] }
          : feature === 'definition'
            ? [{ uri: expected.features.definition.uri, range: structuredClone(expected.features.definition.range) }]
            : feature === 'completion'
              ? { items: [{ label: expected.features.completion }, { label: 'unrelated' }] }
              : { signatures: [{ label: `fn(value: ${expected.features.signature}): void` }], activeSignature: 0, activeParameter: 0 };
        record({ operation: 'observation', name: descriptor.name, route: descriptor.route, kind: 'feature',
          uri: descriptor.actualUri, version, requestId: featureId, feature, position: positions[feature], response });
      }
      return version;
    };

    for (const descriptor of descriptors) {
      observePhase(descriptor, 'initial', 'valid', 'open');
      observePhase(descriptor, 'initial', 'bad', 'editor');
      observePhase(descriptor, 'initial', 'restored', 'editor');
      for (const phase of ['bad', 'restored']) {
        const text = phase === 'bad' ? descriptor.fixture.badText : descriptor.fixture.validText;
        record({ operation: 'filesystem write', name: descriptor.name, uri: descriptor.actualUri, phase, sha256: sha256(text) });
        observePhase(descriptor, 'external', phase, 'filesystem');
      }
      record({ operation: 'fixture', name: descriptor.name, route: descriptor.route,
        uri: descriptor.actualUri, validText: descriptor.fixture.validText, badText: descriptor.fixture.badText });
    }

    const gts = descriptors.find(item => item.name === 'GTS');
    const consumers = descriptors.filter(item => item.name !== 'GTS');
    const mismatch = { code: plan.expectedDiagnostics.dependencyChange, source: 'ts', severity: 1,
      message: "Type 'string' is not assignable to type 'number'." };
    for (let cycle = 0; cycle < rounds; cycle++) {
      const badVersion = observePhase(gts, cycle + 1, 'bad', 'editor');
      record({ operation: 'GTS invalid', cycle, uri: gts.actualUri, version: badVersion,
        diagnostic: { code: plan.expectedDiagnostics.propertyTypeError, source: 'ts', severity: 1,
          message: `ts: ${gts.fixture.diagnostic.messageIncludes}`, range: structuredClone(gts.fixture.diagnostic.range) } });
      const goodVersion = observePhase(gts, cycle + 1, 'restored', 'editor');
      record({ operation: 'GTS repair/query', cycle, uri: gts.actualUri, version: goodVersion, diagnostics: [],
        hover: [{ contents: [{ kind: 'markdown', value: `const value: ${gts.fixture.features.hover}<never>` }] }] });
      record({ operation: 'unsaved cross-file invalid', cycle, uri: gts.actualUri, version: tick(),
        tsVersion: tick(), tsxVersion: tick(),
        ts: { ...mismatch, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 1 } } },
        tsx: { ...mismatch, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } } });
      record({ operation: 'unsaved cross-file repair', cycle, version: tick() });
      for (const descriptor of consumers) {
        observePhase(descriptor, cycle + 1, 'bad', 'editor');
        record({ operation: `${descriptor.name} invalid/query`, cycle, uri: descriptor.actualUri, version: tick(), hover: [],
          diagnostic: { code: descriptor.fixture.diagnostic.code, source: 'ts', severity: 1,
            message: `ts: ${descriptor.fixture.diagnostic.messageIncludes}`,
            range: structuredClone(descriptor.fixture.diagnostic.range) } });
        observePhase(descriptor, cycle + 1, 'restored', 'editor');
        record({ operation: `${descriptor.name} repair`, cycle, uri: descriptor.actualUri, version: tick() });
      }
    }
    const closeCycle = rounds;
    record({ operation: 'before close', cycle: closeCycle, version: tick(), dirty: false });
    record({ operation: 'close/reopen', trigger: 'close tabs then change language mode', cycle: closeCycle, version: tick() });
    record({ operation: 'syntax error', version: tick(), diagnostic: { code: plan.expectedDiagnostics.syntaxError,
      source: 'ts', severity: 1, message: 'Expression expected.',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } } });
    record({ operation: 'invalid import', version: tick(), diagnostic: { code: plan.expectedDiagnostics.invalidImport[0],
      source: 'ts', severity: 1, message: `Cannot find module './${plan.expectedDiagnostics.invalidImportName}'.`,
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } } });
    record({ operation: 'external disk edit', version: tick(),
      diagnostic: { ...mismatch, range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } } } });
    record({ operation: 'external disk repair', version: tick() });

    for (const route of plan.native.requiredRoutes) {
      nativeRow(route, 'counters', { rpcCount: 1 + rounds, queryCount: rounds, projectsLoaded: 1, rpcByMethod: [] });
      nativeRow(route, 'exit', { code: 0 });
    }

    const nativeByPid = new Map();
    for (const row of native) {
      const rows = nativeByPid.get(row.pid) ?? [];
      rows.push(row);
      nativeByPid.set(row.pid, rows);
    }
    return {
      workspaceId, workspacePath, workspaceDirectory, workspaceUri, probe,
      probeRelative: path.relative(repository, probe).split(path.sep).join('/'),
      files, logicalUris, sources, pids, nativeByPid,
      report: { runNonce: nonce, startedAtMs: base, completedAtMs: clock + 100,
        vscode: plan.runtime.version, cycles: rounds, records },
      startedAtMs: base, completedAtMs: clock + 100,
      sourceBindings: descriptors.map(descriptor => ({ name: descriptor.name, route: descriptor.route,
        fixtureId: `${fixturePrefix}/${descriptor.name}`, actualUri: descriptor.actualUri,
        logicalUri: logicalUris[descriptor.file] })),
    };
  }

  function buildPackedHost({ base }) {
    const workspace = plan.workspaces[0];
    const host = buildHost({ workspaceId: 'packed-vsix', fixturePrefix: workspace.id,
      workspacePath: path.join(repository, workspace.relative),
      workspaceDirectory: path.join(directory, 'packed-vsix'),
      probeBase: workspace.probeBase, base });
    const target = `${platform}-${arch === 'arm' ? 'armhf' : arch}`;
    const members = {
      'extension/package.json': json({ ...extensionManifest, engines: { vscode: '^1.137.0' } }),
      'extension/dist/extension.js': '// synthetic packed extension bundle\n',
      'extension/dist/server.js': '// synthetic packed server bundle\n',
      'extension/language-configuration.json': json({ comments: { lineComment: '//' } }),
      'extension/syntaxes/GamingTS.tmLanguage.json': json({ scopeName: 'source.gts', patterns: [] }),
      'extension/node_modules/typescript/package.json': json({ name: 'typescript-native-bridge', version: pin, main: 'lib/typescript.js' }),
      'extension/node_modules/@volar/typescript/lib/node/proxyCreateProgram.js': '// synthetic volar host hook\n',
      'extension.vsixmanifest': `<?xml version="1.0" encoding="utf-8"?>\n<PackageManifest Version="2.0.0"><Metadata>`
        + `<Identity Language="en-US" Publisher="${extensionManifest.publisher}" Id="${extensionManifest.name}"`
        + ` Version="${extensionManifest.version}" TargetPlatform="${target}" /></Metadata></PackageManifest>\n`,
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types" />\n',
    };
    for (const name of plan.packed.pluginPackages) {
      members[`extension/node_modules/${name}/${plan.packed.pluginBundle}`] = `// synthetic ${name} bundle\n`;
    }
    members[`extension/node_modules/${nativePackage}/${plan.native.addonRelativePath}`] = addonBytes;
    host.members = members;
    host.vsixPath = path.join(host.workspaceDirectory, vsixOutputName({ manifest: extensionManifest, platform, arch }));
    host.packLogs = ['desktop-pack.stdout.log', 'desktop-pack.stderr.log'];
    host.managerPath = managerPath;
    return host;
  }

  function commit() {
    const capture = relative => ({ file: relative, sha256: sha256(fs.readFileSync(path.join(directory, relative))) });
    const executions = [];
    for (const host of fixture.hosts) {
      const workspaceDirectory = host.workspaceDirectory;
      const nativeDirectory = path.join(workspaceDirectory, 'native');
      fs.rmSync(nativeDirectory, { recursive: true, force: true });
      fs.rmSync(host.probe, { recursive: true, force: true });
      write(path.join(workspaceDirectory, 'report.json'), json(host.report));
      for (const [pid, rows] of host.nativeByPid) {
        write(path.join(nativeDirectory, `desktop-native-${pid}.jsonl`), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
      }
      write(path.join(workspaceDirectory, 'desktop-sources.json'), json({
        workspaceId: host.workspaceId, probe: host.probe, sources: host.sourceBindings, support,
      }));
      write(path.join(workspaceDirectory, 'desktop-target.json'), json({
        workspacePath: host.workspacePath, healthStatement: 'health 10', files: host.files,
        logicalUris: host.logicalUris, probe: host.probeRelative,
      }));
      write(path.join(workspaceDirectory, 'desktop-recovery.json'), json({
        skipped: false, workspaceId: host.workspaceId, probe: host.probe,
        removed: plan.probeFiles, modified: [], recoveredAtMs: host.completedAtMs,
      }));
      const launch = buildLaunchRecord({ mode: 'development-path', host });
      write(path.join(workspaceDirectory, 'desktop-launch.json'), json(launch));
      const nativeRuns = readNativeRuns(nativeDirectory, nonce, contract.policy.reportLimitBytes);
      const services = bindNativeServices({ nativeRuns, report: host.report, version: pin,
        activation: plan.native.activationPattern, routes: plan.native.requiredRoutes });
      executions.push({
        workspaceId: host.workspaceId, workspacePath: host.workspacePath, workspaceUri: host.workspaceUri,
        probe: host.probeRelative, sourceBindings: host.sourceBindings, sources: host.sourceBindings, support,
        report: host.report, reportFile: `${host.workspaceId}/report.json`,
        reportSha256: sha256(fs.readFileSync(path.join(workspaceDirectory, 'report.json'))),
        sourcesFile: capture(`${host.workspaceId}/desktop-sources.json`),
        targetFile: capture(`${host.workspaceId}/desktop-target.json`),
        launchFile: capture(`${host.workspaceId}/desktop-launch.json`),
        launch, nativeRuns, services,
      });
    }

    let packedVsix = { mode: 'packed-vsix-install',
      unavailable: 'the product pack script produced no artifact for this run',
      pack: null, vsix: null, package: null, install: null, installed: null,
      services: null, launch: null, report: null };
    if (fixture.packedHost) {
      const host = fixture.packedHost;
      const packedDirectory = host.workspaceDirectory;
      const nativeDirectory = path.join(packedDirectory, 'native');
      fs.rmSync(nativeDirectory, { recursive: true, force: true });
      fs.rmSync(host.probe, { recursive: true, force: true });
      writeBytes(host.vsixPath, buildZip(host.members));
      const installedRoot = path.join(packedDirectory, 'extensions',
        `${extensionManifest.publisher}.${extensionManifest.name}-${extensionManifest.version}`.toLowerCase());
      fs.rmSync(installedRoot, { recursive: true, force: true });
      for (const [name, text] of Object.entries(host.members)) {
        if (!name.startsWith('extension/')) continue;
        const relative = name.slice('extension/'.length);
        const content = relative === 'package.json'
          ? Buffer.from(json({ ...JSON.parse(text),
              __metadata: { installedTimestamp: host.completedAtMs, source: path.basename(host.vsixPath) } }))
          : (Buffer.isBuffer(text) ? text : Buffer.from(text));
        writeBytes(path.join(installedRoot, relative), content);
      }
      write(path.join(packedDirectory, 'report.json'), json(host.report));
      for (const [pid, rows] of host.nativeByPid) {
        write(path.join(nativeDirectory, `desktop-native-${pid}.jsonl`), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
      }
      write(path.join(packedDirectory, 'desktop-sources.json'), json({
        workspaceId: host.workspaceId, probe: host.probe, sources: host.sourceBindings, support,
      }));
      write(path.join(packedDirectory, 'desktop-target.json'), json({
        workspacePath: host.workspacePath, healthStatement: 'health 10', files: host.files,
        logicalUris: host.logicalUris, probe: host.probeRelative,
      }));
      write(path.join(packedDirectory, 'desktop-recovery.json'), json({
        skipped: false, workspaceId: host.workspaceId, probe: host.probe,
        removed: plan.probeFiles, modified: [], recoveredAtMs: host.completedAtMs,
      }));
      const launch = buildLaunchRecord({ mode: 'packed-vsix-install', host, vsix: host.vsixPath });
      write(path.join(packedDirectory, 'desktop-launch.json'), json(launch));
      const vsix = { file: `packed-vsix/${path.basename(host.vsixPath)}`,
        sha256: sha256(fs.readFileSync(host.vsixPath)), bytes: fs.statSync(host.vsixPath).size };
      const vsixPackage = inspectVsix({ file: host.vsixPath, expectedSha256: vsix.sha256, plan, identity });
      const installedDirectory = installedExtensionDirectory({ extensionsDirectory: launch.extensionsDirectory, plan });
      const installed = inspectInstalledExtension({ extensionPath: installedDirectory.directory, vsix: vsixPackage, plan });
      const nativeRuns = readNativeRuns(nativeDirectory, nonce, contract.policy.reportLimitBytes);
      const services = bindNativeServices({ nativeRuns, report: host.report, version: pin,
        activation: plan.native.activationPattern, routes: plan.native.requiredRoutes });
      write(path.join(packedDirectory, host.packLogs[0]), `Packaged ${host.vsixPath}\nSHA256 ${vsix.sha256}\n`);
      write(path.join(packedDirectory, host.packLogs[1]), '');
      packedVsix = {
        mode: 'packed-vsix-install', unavailable: null, vsix,
        pack: { label: plan.extension.packLabel, output: path.basename(host.vsixPath),
          command: { executable: process.execPath,
            args: [host.managerPath, '--filter', plan.extension.packageName, 'run',
              plan.extension.packScript, host.vsixPath],
            cwd: repository, startedAt: new Date(host.startedAtMs).toISOString(),
            durationMs: host.completedAtMs - host.startedAtMs, exitCode: 0, signal: null, reason: null,
            fatal: false, bytes: 512, stdout: { file: host.packLogs[0] }, stderr: { file: host.packLogs[1] } },
          stdout: capture(`packed-vsix/${host.packLogs[0]}`), stderr: capture(`packed-vsix/${host.packLogs[1]}`) },
        package: { version: vsixPackage.version, targetPlatform: vsixPackage.targetPlatform,
          members: Object.keys(vsixPackage.members).length },
        install: { args: launch.installArgs, command: launch.install },
        installed: { extensionPath: installed.extensionPath, version: installed.version, files: installed.files },
        services: Object.fromEntries(Object.entries(services).map(([route, service]) => [route, {
          pid: service.pid, packageName: service.observedIdentity.packageName,
          packageVersion: service.observedIdentity.packageVersion, sdkPath: service.observedIdentity.sdkPath,
          addonSha256: service.observedIdentity.native[0].sha256,
        }])),
        launch: capture('packed-vsix/desktop-launch.json'),
        report: capture('packed-vsix/report.json'),
        native: nativeRuns.map(run => ({ file: `packed-vsix/native/${run.file}`, sha256: run.sha256, pid: run.pid })),
        installedExtensionPath: installedDirectory.directory,
      };
    }

    const { trace, bindings } = deriveDesktopTrace({ executions, expectations, nonce, rounds, plan });
    const observation = {
      gateId: 'desktop', runNonce: nonce, platform, arch, rounds, completedRounds: rounds,
      launchModes: Object.keys(plan.launchModes),
      processCleanup: { platform, module: 'harness/collectors/desktop/desktop-linux-cleanup.mjs',
        recordedIn: 'each desktop-launch.json cleanup field' },
      identity,
      executions: executions.map(execution => ({
        workspaceId: execution.workspaceId, workspaceUri: execution.workspaceUri, probe: execution.probe,
        workspacePath: execution.workspacePath,
        report: { file: execution.reportFile, sha256: execution.reportSha256 },
        sources: execution.sourcesFile, target: execution.targetFile, launch: execution.launchFile,
        native: execution.nativeRuns.map(run => ({ file: `${execution.workspaceId}/native/${run.file}`,
          sha256: run.sha256, pid: run.pid })),
      })),
      trace, bindings,
      scenarios: deriveDesktopScenarios({ executions, packedVsix, plan, rounds }),
      protocolBindings: executions.map(execution => ({ workspaceId: execution.workspaceId,
        bindings: auditProtocol({ nativeRuns: execution.nativeRuns, report: execution.report,
          services: execution.services }) })),
      featureRequests: executions.map(execution => ({ workspaceId: execution.workspaceId,
        requests: auditEditorRequests(execution.report) })),
      processLifetimes: validateDesktopLifetimes(executions.map(execution => ({
        workspaceId: execution.workspaceId, launch: execution.launch, nativeRuns: execution.nativeRuns }))),
      packedVsix, executedHosts: executions.length,
    };
    Object.assign(fixture, { observation, executions, packedVsix });
    return observation;
  }

  const fixture = { root, directory, repository, nonce, plan, contract, expectations, identity,
    platform, arch, rounds, hosts: [], packedHost: null,
    observation: null, executions: [], packedVsix: null, commit };

  let base = Date.now();
  for (const workspace of plan.workspaces) {
    const host = buildHost({ workspaceId: workspace.id, fixturePrefix: workspace.id,
      workspacePath: path.join(repository, workspace.relative),
      workspaceDirectory: path.join(directory, workspace.id),
      probeBase: workspace.probeBase, base });
    fixture.hosts.push(host);
    base = host.completedAtMs + 1000;
  }
  if (packed) fixture.packedHost = buildPackedHost({ base });
  return fixture;
}
