import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const clean = text => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const normalize = value => value.replaceAll('\\', '/');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const textDigest = text => digest(text.replaceAll('\r\n', '\n').trimEnd());
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const manifestPattern = /^(?:(?:packages|examples)\/[^/]+\/|docs\/)?package\.json$/;
const testPattern = /\.(?:test|spec)(?:-d)?\.[cm]?[jt]sx?$/;
const check = (ok, reason) => { if (!ok) throw new Error(reason); };
// Event kinds that must carry the identity of the artifact they actually loaded.
const observedEventKinds = ['entry', 'vitest', 'compiler', 'native'];

export function testSummaries(stdout) {
  // pnpm 11 prefixes each raw Vitest line with "<workspace> test: ".
  const lines = clean(stdout).split(/\r?\n/).map(line => line.replace(/^(?:packages\/[^/]+|examples\/[^/]+|docs) test:\s*/, ''));
  const summaries = lines.map(line => line.match(/^\s*Tests\s+(.+)$/)?.[1]).filter(Boolean);
  const files = lines.map(line => line.match(/^\s*Test Files\s+(.+)$/)?.[1]).filter(Boolean);
  const count = (rows, kind) => rows.reduce((sum, row) => sum + Number(row.match(new RegExp(`(\\d+) ${kind}\\b`))?.[1] ?? 0), 0);
  return { executedTests: count(summaries, 'passed') + count(summaries, 'failed'), failedTests: count(summaries, 'failed'),
    skippedTests: count(summaries, 'skipped') + count(summaries, 'todo'), passedFiles: count(files, 'passed'),
    failedFiles: count(files, 'failed'), skippedFiles: count(files, 'skipped') + count(files, 'todo'), summaries, files };
}

export function validateBuildLog(stdout, stderr) {
  check(!/unhandledRejection|Unhandled (?:Errors|Rejection|Source Error)|TypeCheckError:|\berror TS\d+|Prerendered\s+0\s+pages/i.test(`${stdout}\n${stderr}`),
    'Build reported an unhandled, type, or empty prerender failure');
}

export function testCacheEntries(repo, packages) {
  const cache = 'node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json';
  return packages.map(pkg => {
    const directory = fs.realpathSync.native(path.join(repo, pkg.path));
    const files = pkg.files.map(file => normalize(path.relative(directory, path.join(repo, file))));
    // Both unchanged custom-loader Vitest commands share its default results
    // cache. The browser suite remains a separately validated three-test gate.
    if (pkg.path === 'packages/custom-data-loader') {
      const browserTest = '__tests__/language-service.browser.mjs';
      check(fs.statSync(path.join(directory, browserTest)).isFile(), 'Missing known browser suite');
      files.push(browserTest);
    }
    return { root: directory, file: path.join(directory, cache), keys: [...new Set(files)].sort().map(file => `:${file}`) };
  });
}

export async function packageInventory(root, repo, spec, gate, expectations) {
  const { git, sourcePaths } = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);
  const originalPaths = git(repo, ['ls-tree', '-r', '--name-only', spec.base]).split('\n');
  const currentPaths = sourcePaths(repo);
  const kind = gate.id.endsWith('build') ? 'build' : 'test';
  for (const file of originalPaths.filter(file => manifestPattern.test(file))) {
    const original = JSON.parse(git(repo, ['show', `${spec.base}:${file}`]));
    const current = JSON.parse(fs.readFileSync(path.join(repo, file)));
    for (const [name, script] of Object.entries(original.scripts ?? {})) {
      if (new RegExp(`^${kind}(?::|$)`).test(name) || kind === 'build' && name.startsWith('.filter')) {
        check(current.scripts?.[name] === script, `Original ${file} ${name} script changed`);
      }
    }
  }
  const configPattern = kind === 'test' ? /(?:^|\/)vitest(?:\.[^/]+)?\.config\.[cm]?[jt]s$|(?:^|\/)tsconfig\.vitest\.json$/
    : /(?:^|\/)(?:tsdown|vite)\.config\.[cm]?[jt]s$/;
  const selected = kind === 'build' ? expectations.buildPackages[gate.repository] : null;
  // The reviewed Vitest typecheck configurations are test configuration too.
  const typedConfigFiles = kind === 'test' ? (expectations.typecheck?.[gate.repository]?.configFiles ?? []) : [];
  for (const file of originalPaths.filter(file => configPattern.test(file) || typedConfigFiles.includes(file))) {
    if (selected && !selected.some(pkg => file.startsWith(`${pkg.path}/`)) && file.includes('/')) continue;
    check(fs.existsSync(path.join(repo, file))
      && fs.readFileSync(path.join(repo, file), 'utf8').replaceAll('\r\n', '\n').trimEnd()
        === git(repo, ['show', `${spec.base}:${file}`]).replaceAll('\r\n', '\n'),
      `Original ${kind} configuration changed: ${file}`);
  }
  if (kind === 'test') {
    const originalConfigs = originalPaths.filter(file => configPattern.test(file));
    check(currentPaths.filter(file => configPattern.test(file)).every(file => originalConfigs.includes(file)),
      'An added Vitest configuration could change original discovery');
  }
  const currentPackages = currentPaths.filter(file => file !== 'package.json' && manifestPattern.test(file)).map(file => ({
    path: normalize(path.dirname(file)),
    manifest: JSON.parse(fs.readFileSync(path.join(repo, file))),
  }));
  if (kind === 'build') {
    if (gate.repository === 'gts') check(same(currentPackages.filter(pkg => pkg.manifest.scripts?.build).map(pkg => pkg.path).sort(),
      selected.map(pkg => pkg.path).sort()), 'GTS build selection changed');
    return selected.map(item => {
      const pkg = currentPackages.find(pkg => pkg.path === item.path);
      check(pkg?.manifest.scripts?.build, 'Missing selected build package');
      return { ...item, name: pkg.manifest.name, script: pkg.manifest.scripts.build };
    });
  }
  return currentPackages.filter(pkg => pkg.manifest.scripts?.test).map(pkg => {
    const originalFiles = originalPaths.filter(file => file.startsWith(`${pkg.path}/`) && testPattern.test(file));
    check(originalFiles.every(file => currentPaths.includes(file) && fs.existsSync(path.join(repo, file))),
      'An original test file was removed');
    for (const file of originalFiles) {
      const original = textDigest(git(repo, ['show', `${spec.base}:${file}`]));
      const current = textDigest(fs.readFileSync(path.join(repo, file), 'utf8'));
      const reviewed = expectations.originalTestChanges?.[gate.repository]?.[file];
      check(current === original || reviewed?.before === original && reviewed.after === current,
        `Original test body changed without exact review: ${file}`);
    }
    const files = currentPaths.filter(file => file.startsWith(`${pkg.path}/`) && testPattern.test(file)).sort();
    check(files.length > 0, `Test package contains no discoverable files: ${pkg.path}`);
    return { path: pkg.path, name: pkg.manifest.name, script: pkg.manifest.scripts.test, files,
      minimumTests: expectations.testMinimums[gate.repository]?.[pkg.path] ?? 1 };
  }).sort((left, right) => left.path.localeCompare(right.path));
}

export function outputInventory(repo, packages, allowMissing = false) {
  const results = [];
  function add(file) {
    const full = path.join(repo, file);
    if (!fs.existsSync(full)) {
      check(allowMissing, `Missing build artifact: ${file}`);
      results.push({ file, missing: true });
      return;
    }
    const stat = fs.statSync(full);
    check(stat.isFile(), `Not an artifact file: ${file}`);
    results.push({ file, size: stat.size, mtimeMs: stat.mtimeMs, sha256: digest(fs.readFileSync(full)) });
  }
  function walk(directory) {
    const found = [];
    if (!fs.existsSync(directory)) return found;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isSymbolicLink()) throw new Error('Unexpected linked build output');
      if (entry.isDirectory()) found.push(...walk(path.join(directory, entry.name)));
      else if (entry.isFile()) found.push(path.join(directory, entry.name));
    }
    return found;
  }
  for (const pkg of packages) {
    for (const file of new Set([...(pkg.outputs ?? []), ...(pkg.declarations ?? []).map(declaration => declaration.file)])) {
      add(`${pkg.path}/${file}`);
    }
    for (const directory of pkg.directories ?? []) {
      const files = walk(path.join(repo, pkg.path, directory));
      check(allowMissing || files.length > 0, `Empty build output directory: ${pkg.path}/${directory}`);
      for (const file of files) add(normalize(path.relative(repo, file)));
    }
  }
  return results.sort((left, right) => left.file.localeCompare(right.file));
}

export function validateTestProcess(events, pkg, repo) {
  const start = events[0];
  const end = events.at(-1);
  check(start.isMainThread && start.cwd === path.join(repo, pkg.path) && start.packageName === pkg.name
    && start.lifecycle === 'test' && start.script === pkg.script, 'Vitest package lifecycle differs');
  check(end.kind === 'exit' && end.code === 0, 'Vitest process did not exit successfully');
  check(events.some(event => event.kind === 'vitest' && /[\\/]vitest[\\/]vitest\.mjs$/.test(event.module.path)),
    'Package did not load the actual Vitest CLI');
  const stdout = events.filter(event => event.kind === 'stdout')
    .map(event => Buffer.from(event.base64, 'base64').toString('utf8')).join('');
  const stderr = events.filter(event => event.kind === 'stderr')
    .map(event => Buffer.from(event.base64, 'base64').toString('utf8')).join('');
  const report = testSummaries(stdout);
  check(report.summaries.length === 1 && report.files.length === 1 && report.executedTests >= pkg.minimumTests
    && report.passedFiles >= pkg.files.length && !report.failedTests && !report.skippedTests
    && !report.failedFiles && !report.skippedFiles, `Missing, failed, skipped, or reduced tests in ${pkg.path}`);
  check(!/Unhandled (?:Errors|Rejection|Source Error)|TypeCheckError:|^\s*Errors\s+[1-9]/m.test(clean(`${stdout}\n${stderr}`)),
    `Unhandled Vitest/typecheck failure in ${pkg.path}`);
  check(clean(stdout).split(/\r?\n/).some(line => /\bRUN\s+v\S+\s+/.test(line)
      && normalize(line).trim().endsWith(normalize(path.join(repo, pkg.path)))),
    'Vitest root differs from package');
  return { stdout, stderr, report };
}

export async function validate(evidence, { root, directory, contract, gate, expectations, nonce }) {
  try {
    const { inside, hashFile, readJson, stable, processVerdict, fatalPattern } = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);
    expectations ??= readJson(new URL('./command-expectations.json', import.meta.url));
    check(['gts-build', 'gts-tests', 'main-build', 'main-tests'].includes(gate.id), 'Unexpected command gate');
    check(evidence.runNonce === nonce && evidence.gateId === gate.id && evidence.platform === process.platform,
      'Wrong command provenance');
    const { recoveryReserveMs } = await import(new URL('../shared/command-supervisor.mjs', import.meta.url));
    const supervisor = evidence.supervisor;
    const supervisorTimeout = gate.timeoutMs - recoveryReserveMs;
    check(supervisor?.timeoutMs === supervisorTimeout && !supervisor.recoveryError && !evidence.error,
      'Collector supervisor failed or changed its reserved recovery budget');
    const local = readJson(path.join(root, 'harness/local.json'));
    const node = path.resolve(root, local.node);
    const spec = contract.repositories[gate.repository];
    const manager = path.resolve(root, local[spec.manager]);
    const repo = inside(root, spec.path);
    const command = evidence.command;
    const collector = fileURLToPath(new URL('./command-collector.mjs', import.meta.url));
    async function verifyCommand(cmd, args, label, timeout = gate.timeoutMs) {
      check(cmd?.executable === node && stable(cmd.args) === stable(args) && cmd.cwd === fs.realpathSync.native(repo)
        && processVerdict(cmd) === 'PASS' && cmd.durationMs > 0 && cmd.durationMs <= timeout
        && Number.isFinite(Date.parse(cmd.startedAt)), 'Fixed build/test command did not pass');
      const logs = {};
      for (const stream of ['stdout', 'stderr']) {
        check(cmd[stream].file === `${label}.${stream}.log`, 'Wrong command log');
        const file = inside(directory, cmd[stream].file);
        check(await hashFile(file) === cmd[stream].sha256, 'Command log hash changed');
        logs[stream] = fs.readFileSync(file, 'utf8');
      }
      check(!fatalPattern.test(`${logs.stdout}${logs.stderr}`), 'Build/test contains fatal output');
      return logs;
    }
    await verifyCommand(supervisor.command, [collector, '--collector-child', nonce], `${gate.id}-collector`, supervisorTimeout);
    for (const [key, file] of [['childObservation', 'command-child-observation.json'],
      ['childLifetime', 'command-child-lifetime.json']]) {
      check(supervisor[key]?.file === file && supervisor[key].sha256 === await hashFile(inside(directory, file)),
        'Missing or changed supervised child evidence');
    }
    const childObservation = readJson(inside(directory, supervisor.childObservation.file));
    const { supervisor: omittedSupervisor, ...outerObservation } = evidence;
    check(stable(childObservation) === stable(outerObservation), 'Supervisor changed the child observation');
    const childLifetime = readJson(inside(directory, supervisor.childLifetime.file));
    const supervisorStart = Date.parse(supervisor.startedAt);
    const supervisorEnd = Date.parse(supervisor.finishedAt);
    const processStart = Date.parse(supervisor.command.startedAt);
    const processEnd = processStart + supervisor.command.durationMs;
    const childStart = Date.parse(childLifetime.startedAt);
    const childEnd = Date.parse(childLifetime.finishedAt);
    check([supervisorStart, supervisorEnd, childStart, childEnd].every(Number.isFinite)
      && supervisorStart <= processStart && processStart <= childStart && childStart <= childEnd
      && childEnd <= processEnd + 100 && processEnd <= supervisorEnd + 100
      && supervisorEnd - supervisorStart <= gate.timeoutMs,
      'Supervised child lifetime is not contained in the fixed gate budget');
    check(childLifetime.runNonce === nonce && childLifetime.gateId === gate.id
      && childLifetime.executable === fs.realpathSync.native(node)
      && stable(childLifetime.args) === stable([collector, '--collector-child', nonce])
      && childLifetime.cwd === fs.realpathSync.native(repo)
      && Number.isSafeInteger(childLifetime.pid) && childLifetime.pid > 0
      && Number.isSafeInteger(childLifetime.parentPid) && childLifetime.parentPid > 0,
      'Supervised child identity, cwd or nonce differs');
    if (process.platform === 'win32') {
      const invocation = readJson(inside(directory, `${gate.id}-collector.invocation.json`));
      check(invocation.executable === supervisor.command.executable
        && stable(invocation.args) === stable(supervisor.command.args)
        && fs.realpathSync.native(invocation.cwd) === supervisor.command.cwd,
        'Supervisor invocation differs from the actual process executor');
    }
    check(Date.parse(command.startedAt) >= childStart
      && Date.parse(command.startedAt) + command.durationMs <= childEnd + 100,
      'Original build/test command is outside its supervised child lifetime');
    const logs = await verifyCommand(command, [manager, ...gate.args], `${gate.id}-execution`);
    const packages = await packageInventory(root, repo, spec, gate, expectations);
    check(stable(packages) === stable(evidence.packages), 'Original/current package inventory differs');
    const observationDir = inside(directory, 'command-observations');
    const names = fs.readdirSync(observationDir).sort().map(file => `command-observations/${file}`);
    check(Array.isArray(evidence.observations) && names.length > 0
      && same(evidence.observations.map(observation => observation.file), names),
      'Missing, duplicate, or omitted process observations');
    const processes = [];
    const preloadHash = await hashFile(collector);
    const nodeHash = await hashFile(node);
    async function verifyArtifact(item) {
      check(item && item.path === fs.realpathSync.native(item.path) && await hashFile(item.path) === item.sha256,
        'Executed artifact identity changed');
    }
    async function verifyNative(item, compilerFile) {
      await verifyArtifact(item);
      const packageFile = path.join(path.dirname(compilerFile), '../package.json');
      const manifest = readJson(packageFile);
      check(manifest.name === 'typescript-native-bridge' && manifest.version === contract.tnbVersion,
        'Loaded compiler is not pinned TNB');
      const nativeName = `@typescript-native-bridge/${process.platform}-${process.arch}`;
      const nativeManifest = createRequire(packageFile).resolve(`${nativeName}/package.json`);
      const nativePackage = readJson(nativeManifest);
      check(nativePackage.name === nativeName && nativePackage.version === contract.tnbVersion
        && item.path === fs.realpathSync.native(path.join(path.dirname(nativeManifest), 'native/bridge.node')),
        'Native artifact differs from the actual pinned SDK dependency');
    }
    for (const observation of evidence.observations) {
      check(/^command-observations\/\d+-\d+-[a-f0-9-]{36}\.(?:jsonl|rpc\.log)$/.test(observation.file),
        'Unexpected observation filename');
      const full = inside(directory, observation.file);
      check(await hashFile(full) === observation.sha256, 'Process observation hash changed');
      if (!observation.file.endsWith('.jsonl')) continue;
      const events = fs.readFileSync(full, 'utf8').trim().split('\n').map(JSON.parse);
      const start = events[0];
      check(start?.kind === 'start' && events.filter(event => event.kind === 'start').length === 1
        && start.executable.path === fs.realpathSync.native(node) && start.executable.sha256 === nodeHash
        && start.preload.path === fs.realpathSync.native(collector) && start.preload.sha256 === preloadHash,
        'Wrong process/observer identity');
      check(Number.isSafeInteger(start.pid) && start.pid > 0 && Number.isSafeInteger(start.threadId) && start.threadId >= 0
        && observation.file === `command-observations/${start.pid}-${start.threadId}-${start.instanceId}.jsonl`
        && events.every((event, index) => event.pid === start.pid && event.threadId === start.threadId
          && event.instanceId === start.instanceId && event.runNonce === nonce && event.gateId === gate.id
          && Number.isSafeInteger(event.at)
          && event.at >= Date.parse(command.startedAt) && event.at <= Date.parse(command.startedAt) + command.durationMs + 100
          && (!index || event.at >= events[index - 1].at)),
        'Wrong process observation provenance/timing');
      if (start.entry) await verifyArtifact(start.entry);
      for (const event of events) if (observedEventKinds.includes(event.kind)) {
        await verifyArtifact(event.module);
        if (event.kind === 'compiler') {
          check(/^[a-f0-9]{64}$/.test(event.compiledSha256), 'Missing actual compiled input hash');
          const manifest = readJson(path.join(path.dirname(event.module.path), '../package.json'));
          check(manifest.name === 'typescript-native-bridge' && manifest.version === contract.tnbVersion,
            'A build/test compiler resolved to an unpinned or stock SDK');
        }
        if (event.kind === 'native') {
          await verifyArtifact(event.parent);
          check(events.some(candidate => candidate.kind === 'compiler' && candidate.module.path === event.parent.path
            && candidate.at <= event.at), 'Native addon not loaded by observed compiler');
          await verifyNative(event.module, event.parent.path);
        }
      }
      processes.push(events);
    }
    if (gate.id.endsWith('tests')) {
      const { validateVitestResultCacheEvidence } = await import(new URL('../shared/vitest-result-cache.mjs', import.meta.url));
      validateVitestResultCacheEvidence(path.join(directory, 'test-result-cache'), testCacheEntries(repo, packages));
      check(!/Unhandled (?:Errors|Rejection|Source Error)|TypeCheckError:/.test(`${logs.stdout}${logs.stderr}`),
        'Unhandled Vitest failure');
      for (const pkg of packages) {
        const candidates = processes.filter(events => events[0].isMainThread && events[0].cwd === path.join(repo, pkg.path)
          && events.some(event => event.kind === 'vitest'));
        check(candidates.length === 1, `Missing/duplicate actual Vitest process for ${pkg.path}`);
        validateTestProcess(candidates[0], pkg, repo);
      }
      if (gate.id === 'main-tests') {
        const config = path.join(repo, expectations.typecheck.main.config);
        const typedFiles = packages.flatMap(pkg => pkg.files).filter(file => /\.(?:test|spec)-d\.[cm]?[jt]sx?$/.test(file));
        check(expectations.typecheck.main.typedFiles.every(file => typedFiles.includes(file)), 'Original typed tests omitted');
        const typedPackages = packages.filter(pkg => pkg.files.some(file => typedFiles.includes(file)));
        for (const pkg of typedPackages) {
          const candidates = processes.filter(events => {
            const start = events[0];
            const args = start.argv.slice(2);
            const project = args.indexOf('-p');
            return start.isMainThread && start.cwd === path.join(repo, pkg.path) && start.entry
              && /[\\/]typescript(?:-native-bridge)?[\\/]bin[\\/]tsc$/.test(start.entry.path) && project >= 0
              && path.resolve(args[project + 1]) === config && args.includes('--noEmit');
          });
          check(candidates.length >= 1, 'Original Vitest native typechecker missing');
          const completed = candidates.filter(events => events.at(-1).kind === 'exit' && events.at(-1).code === 0
            && events.some(event => event.kind === 'native'));
          check(completed.length === 1, 'Native Vitest typecheck did not complete exactly once');
          const traces = completed[0].filter(event => event.kind === 'rpcTrace');
          check(traces.length === 1, 'Missing existing TNB RPC trace');
          const trace = fs.readFileSync(inside(observationDir, traces[0].file), 'utf8');
          const entries = [...trace.matchAll(/^\d+ ENTER (\d+) pid=(\d+) sess=\S+ (?:BIN|JSON) getSemanticDiagnostics$/gm)];
          check(entries.some(match => Number(match[2]) === completed[0][0].pid
            && new RegExp(`^\\d+ EXIT ${match[1]} getSemanticDiagnostics ms=\\d+$`, 'm').test(trace)),
            'Typechecker did not execute native semantic diagnostics');
        }
      }
    } else {
      validateBuildLog(logs.stdout, logs.stderr);
      for (const pkg of packages) for (const tool of pkg.tools) {
        check(processes.some(events => {
          const start = events[0];
          return start.isMainThread && start.cwd === path.join(repo, pkg.path) && start.packageName === pkg.name
            && /^build(?::|$)/.test(start.lifecycle ?? '') && start.entry && normalize(start.entry.path).endsWith(`/${tool}`)
            && events.some(event => event.kind === 'entry' && event.module.path === start.entry.path)
            && events.at(-1).kind === 'exit' && events.at(-1).code === 0;
        }), `Selected build tool did not execute: ${pkg.path} ${tool}`);
      }
      check(processes.some(events => events.some(event => event.kind === 'native')), 'Build did not load native TNB');
      const actual = outputInventory(repo, packages);
      check(actual.every(output => output.size > 0) && stable(actual) === stable(evidence.afterOutputs),
        'Missing/empty/changed real build artifacts');
      check(Array.isArray(evidence.beforeOutputs), 'Missing before-build artifact observations');
      const { consumerSource, consumerConfig } = await import(new URL('./command-collector.mjs', import.meta.url));
      check(fs.readFileSync(inside(directory, 'public-consumer.ts'), 'utf8') === consumerSource(packages, repo),
        'Public consumer was changed or reduced');
      check(stable(readJson(inside(directory, 'public-consumer.tsconfig.json'))) === stable(consumerConfig),
        'Public consumer configuration changed');
      const consumerLogs = await verifyCommand(evidence.consumer, [collector], 'public-consumer', Math.min(gate.timeoutMs, 300000));
      check(Date.parse(evidence.consumer.startedAt) >= childStart
        && Date.parse(evidence.consumer.startedAt) + evidence.consumer.durationMs <= childEnd + 100,
        'Public consumer is outside its supervised child lifetime');
      const result = JSON.parse(consumerLogs.stdout.trim());
      check(result.diagnostics?.length === 0 && result.rpcDelta > 0 && result.native?.length > 0,
        'Public declaration consumption failed or did not execute native checks');
      await verifyArtifact(result.source);
      await verifyArtifact(result.config);
      await verifyArtifact(result.compiler);
      await verifyArtifact(result.manifest);
      for (const native of result.native) await verifyNative(native, result.compiler.path);
      const require = createRequire(path.join(repo, 'package.json'));
      check(result.compiler.path === fs.realpathSync.native(require.resolve('typescript'))
        && result.manifest.name === 'typescript-native-bridge' && result.manifest.version === contract.tnbVersion
        && result.source.path === fs.realpathSync.native(path.join(directory, 'public-consumer.ts')),
        'Public consumer used wrong source or compiler');
    }
    return { status: 'PASS', reason: gate.id.endsWith('tests')
      ? `${packages.length} packages executed their original Vitest commands with complete test coverage`
      : `${packages.length} original package builds and their public declaration consumers passed` };
  } catch (error) { return { status: 'FAIL', reason: error.message }; }
}
