// Derive the sealed desktop scenario inventory from raw records.
//
// The caller separately audits the raw native protocol, the fixed semantic
// expectations and the actual GTS locations. No scenario is declared from an
// unexecuted checklist, a status label or a summary: every binding below cites
// the report records, source hashes, URI/version links and native identities
// that an actual editor run produced.
import assert from 'node:assert/strict';
import { sha256 } from './desktop-evidence.mjs';
import { fileKey } from './desktop-protocol.mjs';

/** Scenarios that only exist because one workspace was opened and measured. */
const workspaceScenarios = ['root-workspace', 'examples-workspace', 'syntax-error', 'property-type-error',
  'invalid-import', 'unsaved-edit', 'external-disk-edit', 'close-reopen', 'dependency-change',
  'unicode-crlf-space-path', 'electron-extension-host'];
const packedScenario = 'packed-vsix-install';

/** What the packed and installed extension produced, as raw references. */
function packedBinding(packed) {
  if (packed.unavailable) return { mode: packed.mode, unavailable: packed.unavailable, missing: true };
  return {
    mode: packed.mode,
    vsix: { file: packed.vsix.file, sha256: packed.vsix.sha256, bytes: packed.vsix.bytes },
    package: packed.package,
    installArgs: packed.install?.args ?? null,
    installed: packed.installed,
    services: packed.services,
    native: packed.native,
    report: packed.report,
    launch: packed.launch,
  };
}

export function deriveDesktopScenarios({ executions, packedVsix, plan, rounds }) {
  assert.ok(Number.isSafeInteger(rounds) && rounds > 0, 'Invalid desktop round count');
  const ids = [...workspaceScenarios, packedScenario];
  for (const id of ids) assert.ok(plan.scenarios.includes(id), `The sealed plan dropped the ${id} scenario`);
  const runs = executions;
  assert.deepEqual(runs.map(run => run.workspaceId).sort(), plan.workspaces.map(workspace => workspace.id).sort(),
    'Missing or repeated desktop workspace');
  assert.equal(new Set(runs.map(run => run.reportFile)).size, runs.length, 'Desktop workspaces reused a report');
  assert.equal(new Set(runs.map(run => fileKey(run.workspaceUri))).size, runs.length, 'Desktop workspaces reused a location');
  const scenarios = new Map(ids.map(id => [id, []]));
  for (const run of runs) {
    const { report, sources, services, workspaceId, reportFile, workspaceUri } = run;
    assert.equal(report.cycles, rounds, 'Subset desktop rounds');
    assert.ok(typeof reportFile === 'string' && reportFile.length > 0);
    const records = report.records;
    const matching = predicate => records.flatMap((row, index) => predicate(row) ? [{ row, index }] : []);
    const unique = (predicate, label) => {
      const values = matching(predicate);
      assert.equal(values.length, 1, `Missing or repeated ${label}`);
      return values[0];
    };
    const operation = name => unique(row => row.operation === name, name);
    const cycles = name => {
      const values = matching(row => row.operation === name);
      assert.deepEqual(values.map(value => value.row.cycle), Array.from({ length: rounds }, (_, index) => index), `Missing or repeated ${name} rounds`);
      return values;
    };
    const workspace = operation('workspace');
    assert.equal(fileKey(workspace.row.uri), fileKey(workspaceUri), 'Workspace URI changed');
    assert.deepEqual(sources.map(source => source.name).sort(), ['GTS', 'TS', 'TSX'], 'Missing or repeated source binding');
    const documents = new Map();
    for (const source of sources) {
      const descriptor = unique(row => row.operation === 'fixture' && row.name === source.name, `${source.name} fixture`);
      assert.equal(descriptor.row.route, source.route);
      assert.equal(fileKey(descriptor.row.uri), fileKey(source.actualUri), 'Fixture URI changed');
      assert.ok(typeof descriptor.row.validText === 'string' && typeof descriptor.row.badText === 'string');
      assert.notEqual(descriptor.row.validText, descriptor.row.badText, 'Invalid fixture did not change source');
      const snapshots = matching(row => row.operation === 'observation' && row.kind === 'source' && row.name === source.name);
      const expected = [['initial', 'valid', 'open'], ['initial', 'bad', 'editor'], ['initial', 'restored', 'editor'],
        ['external', 'bad', 'filesystem'], ['external', 'restored', 'filesystem'],
        ...Array.from({ length: rounds }, (_, index) => [[index + 1, 'bad', 'editor'], [index + 1, 'restored', 'editor']]).flat()];
      assert.equal(snapshots.length, expected.length, `Missing or repeated ${source.name} source snapshots`);
      for (const [index, [cycle, phase, origin]] of expected.entries()) {
        const { row } = snapshots[index];
        assert.deepEqual([row.cycle, row.phase, row.origin], [cycle, phase, origin], `${source.name} source lifecycle changed`);
        assert.equal(row.route, source.route); assert.equal(fileKey(row.uri), fileKey(source.actualUri), 'Source observation URI changed');
        assert.ok(Number.isSafeInteger(row.version) && row.version > 0);
        assert.equal(row.text, phase === 'bad' ? descriptor.row.badText : descriptor.row.validText, 'Source observation text changed');
      }
      const service = services[source.route];
      assert.ok(service && Number.isSafeInteger(service.pid) && service.pid > 0, 'Missing native service');
      assert.equal(service.identity.packageName, 'typescript-native-bridge'); assert.equal(service.identity.checker, 'tsgo');
      assert.equal(service.identity.packageVersion, service.observedIdentity.packageVersion);
      assert.ok(service.observedIdentity.native.length > 0, 'Missing loaded native addon');
      assert.ok(typeof service.process.electronVersion === 'string' && service.process.electronVersion, 'Missing real Electron identity');
      assert.ok(['win32', 'linux'].includes(service.process.platform));
      assert.ok(typeof service.file === 'string' && service.file && /^[a-f0-9]{64}$/.test(service.sha256));
      documents.set(source.name, { source, descriptor, snapshots, service });
    }
    const gts = documents.get('GTS');
    const binding = (selected, names = ['GTS', 'TS', 'TSX']) => {
      const docs = names.map(name => documents.get(name));
      const routes = [...new Set(docs.map(doc => doc.source.route))];
      return { workspaceId, reportFile, workspaceUri,
        recordIndexes: [...new Set(selected.map(value => value.index))].sort((a, b) => a - b),
        documents: docs.map(({ source, descriptor }) => ({ name: source.name, route: source.route,
          uri: source.actualUri, fixtureRecordIndex: descriptor.index,
          validSourceSha256: sha256(descriptor.row.validText), badSourceSha256: sha256(descriptor.row.badText) })),
        nativeBindings: routes.map(route => { const service = services[route]; return {
          route, pid: service.pid, nativeFile: service.file, nativeSha256: service.sha256,
          platform: service.process.platform, electronVersion: service.process.electronVersion,
          execPath: service.process.execPath, packageVersion: service.observedIdentity.packageVersion,
          moduleSha256: service.observedIdentity.moduleSha256, addons: structuredClone(service.observedIdentity.native),
        }; }) };
    };
    const add = (id, selected, names) => {
      assert.ok(selected.length > 0, `No executed records for ${id}`);
      scenarios.get(id).push(binding(selected, names));
    };
    add(workspaceId, [workspace, ...[...documents.values()].flatMap(doc => [doc.descriptor, doc.snapshots[0]])]);
    const syntax = operation('syntax error'), missingImport = operation('invalid import');
    assert.equal(syntax.row.diagnostic.code, 1109);
    assert.ok([2307, 2882].includes(missingImport.row.diagnostic.code));
    assert.match(missingImport.row.diagnostic.message, /missing-dependency\.gts/);
    add('syntax-error', [syntax], ['GTS']); add('invalid-import', [missingImport], ['GTS']);

    const invalid = cycles('GTS invalid'), repaired = cycles('GTS repair/query');
    for (let cycle = 0; cycle < rounds; cycle++) {
      const bad = gts.snapshots.find(value => value.row.cycle === cycle + 1 && value.row.phase === 'bad');
      const good = gts.snapshots.find(value => value.row.cycle === cycle + 1 && value.row.phase === 'restored');
      assert.equal(invalid[cycle].row.diagnostic.code, 2345);
      assert.deepEqual(repaired[cycle].row.diagnostics, []);
      for (const [actual, expected] of [[invalid[cycle], bad], [repaired[cycle], good]]) {
        assert.equal(fileKey(actual.row.uri), fileKey(gts.source.actualUri), 'Property scenario URI changed');
        assert.equal(actual.row.version, expected.row.version, 'Property scenario source version changed');
      }
    }
    add('property-type-error', [...invalid, ...repaired, ...gts.snapshots.filter(value => Number.isInteger(value.row.cycle))], ['GTS']);
    const editorSnapshots = [...documents.values()].flatMap(doc => doc.snapshots.filter(value => value.row.origin === 'editor'));
    add('unsaved-edit', editorSnapshots);

    const writes = matching(row => row.operation === 'filesystem write');
    assert.equal(writes.length, 6, 'Missing or repeated external filesystem writes');
    for (const [name, doc] of documents) for (const phase of ['bad', 'restored']) {
      const write = unique(row => row.operation === 'filesystem write' && row.name === name && row.phase === phase, `${name} ${phase} filesystem write`);
      assert.equal(fileKey(write.row.uri), fileKey(doc.source.actualUri), 'Filesystem write URI changed');
      assert.equal(write.row.sha256, sha256(phase === 'bad' ? doc.descriptor.row.badText : doc.descriptor.row.validText), 'Filesystem source bytes changed');
    }
    add('external-disk-edit', [operation('external disk edit'), operation('external disk repair'), ...writes,
      ...[...documents.values()].flatMap(doc => doc.snapshots.filter(value => value.row.origin === 'filesystem'))]);
    const beforeClose = operation('before close'), reopened = operation('close/reopen');
    assert.ok(beforeClose.index < reopened.index); assert.equal(beforeClose.row.dirty, false);
    assert.equal(beforeClose.row.cycle, reopened.row.cycle);
    add('close-reopen', [beforeClose, reopened], ['GTS']);
    const dependentBad = cycles('unsaved cross-file invalid'), dependentGood = cycles('unsaved cross-file repair');
    for (let cycle = 0; cycle < rounds; cycle++) {
      const bad = dependentBad[cycle], good = dependentGood[cycle];
      assert.equal(fileKey(bad.row.uri), fileKey(gts.source.actualUri), 'Dependency scenario URI changed');
      assert.equal(bad.row.ts.code, 2322); assert.equal(bad.row.tsx.code, 2322);
      assert.ok(bad.index < good.index && bad.row.version < good.row.version, 'Dependency repair did not follow its edit');
    }
    add('dependency-change', [...dependentBad, ...dependentGood]);

    assert.match(gts.descriptor.row.validText, /[^\x00-\x7f]/, 'Missing Unicode source');
    for (const doc of documents.values()) {
      assert.match(doc.descriptor.row.validText, /\r\n/, 'Missing CRLF source');
      assert.ok(!/(?<!\r)\n/.test(doc.descriptor.row.validText), 'Source contains unreviewed LF bytes');
    }
    assert.ok([...documents.values()].some(doc => /[^\x00-\x7f]/.test(fileKey(doc.source.actualUri))
      && fileKey(doc.source.actualUri).includes(' ')), 'Missing Unicode path containing spaces');
    add('unicode-crlf-space-path', [...documents.values()].flatMap(doc => [doc.descriptor, doc.snapshots[0]]));
    assert.equal(report.vscode, plan.runtime.version);
    add('electron-extension-host', [workspace, ...[...documents.values()].map(doc => doc.descriptor)]);
  }
  assert.ok(packedVsix && typeof packedVsix.mode === 'string', 'The packed VSIX record is missing');
  assert.equal(packedVsix.mode, packedScenario, 'The packed VSIX record names another mode');
  scenarios.get(packedScenario).push(packedBinding(packedVsix));
  return ids.map(id => {
    const bindings = scenarios.get(id);
    // A scenario named after a workspace is bound by the one run that opened
    // that workspace; every other scenario has to be covered in each of them.
    const workspaceNamed = plan.workspaces.some(workspace => workspace.id === id);
    if (id === packedScenario) {
      assert.ok(bindings.length === 1, 'Missing packed-VSIX coverage');
    } else {
      assert.equal(bindings.length, workspaceNamed ? 1 : plan.workspaces.length,
        `Missing ${id} workspace coverage`);
    }
    return { id, bindings };
  });
}
