import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

export async function validate(evidence, { root, directory, contract, gate, expectations, nonce }) {
  try {
    const { hashFile, inside, readJson, stable, processVerdict, fatalPattern } = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);
    const { compareCoverage, sourceInventory } = await import(pathToFileURL(path.join(root, 'harness/probes/coverage.mjs')).href);
    if (evidence.runNonce !== nonce || evidence.gateId !== gate.id || evidence.platform !== process.platform) throw new Error('CLI observation belongs to another execution');
    const localFile = path.join(root, 'harness/local.json');
    const local = fs.existsSync(localFile) ? readJson(localFile) : {};
    const configuredNode = fs.realpathSync.native(local.node ? path.resolve(root, local.node) : process.execPath);
    const nodeHash = await hashFile(configuredNode);
    const baseline = readJson(inside(root, 'harness/baselines/main.json'));
    const repo = inside(root, contract.repositories.main.path);
    const expected = gate.id === 'data'
      ? Array.from({ length: contract.policy.dataRuns }, () => baseline.checkPackages.find(pkg => pkg.name === '@gi-tcg/data'))
      : baseline.checkPackages;
    if (!['data', 'checks'].includes(gate.id) || !Array.isArray(evidence.runs) || evidence.runs.length !== expected.length) {
      throw new Error('Missing complete independent CLI check runs');
    }
    const seenPids = new Set();
    for (const [index, run] of evidence.runs.entries()) {
      const pkg = expected[index];
      const cwd = inside(repo, pkg.path);
      if (run.name !== pkg.name || run.path !== pkg.path || run.check !== pkg.command) throw new Error('Check list/command/order differs from baseline');
      const require = createRequire(path.join(cwd, 'package.json'));
      const sdkPath = require.resolve('typescript');
      const sdkPackage = require.resolve('typescript/package.json');
      const sdkMetadata = readJson(sdkPackage);
      const nativeManifest = createRequire(sdkPackage).resolve(`@typescript-native-bridge/${process.platform}-${process.arch}/package.json`);
      const nativeMetadata = readJson(nativeManifest);
      const nativePath = fs.realpathSync.native(path.join(path.dirname(nativeManifest), 'native/bridge.node'));
      if (nativeMetadata.version !== contract.tnbVersion || nativeMetadata.name !== `@typescript-native-bridge/${process.platform}-${process.arch}`) throw new Error('Native package pin differs from SDK');
      if (sdkMetadata.name !== 'typescript-native-bridge' || sdkMetadata.version !== contract.tnbVersion
        || run.sdk.modulePath !== sdkPath || run.sdk.moduleSha256 !== await hashFile(sdkPath)
        || run.sdk.packagePath !== sdkPackage || run.sdk.name !== sdkMetadata.name || run.sdk.version !== sdkMetadata.version) {
        throw new Error('CLI SDK artifact identity differs from actual package context');
      }
      const gts = pkg.command.startsWith('gtsc');
      const manifest = gts ? require.resolve('@gi-tcg/gtsc/package.json') : sdkPackage;
      const entry = path.resolve(path.dirname(manifest), readJson(manifest).bin[gts ? 'gtsc' : 'tsc']);
      const command = run.command;
      const label = `${gate.id}-${index}`;
      const preload = fileURLToPath(new URL('./cli-engine.cjs', import.meta.url));
      const args = [`--max-old-space-size=${expectations.heapMiB}`, '--require', preload, entry, ...expectations.flags];
      if (processVerdict(command) !== 'PASS' || fs.realpathSync.native(command.executable) !== configuredNode || stable(command.args) !== stable(args)
        || command.cwd !== fs.realpathSync.native(cwd)
        || command.stdout.file !== `${label}.stdout.log` || command.stderr.file !== `${label}.stderr.log`
        || run.cli.path !== entry || run.cli.sha256 !== await hashFile(entry)) throw new Error('Unexpected or failed CLI command');
      const stdout = fs.readFileSync(inside(directory, command.stdout.file), 'utf8');
      const stderr = fs.readFileSync(inside(directory, command.stderr.file), 'utf8');
      for (const stream of ['stdout', 'stderr']) if (command[stream].sha256 !== await hashFile(inside(directory, command[stream].file))) throw new Error('Raw CLI output hash differs from executed command');
      if (!Number.isFinite(Date.parse(command.startedAt)) || !(command.durationMs > 0 && command.durationMs <= gate.timeoutMs)) throw new Error('Invalid CLI execution timing');
      if (fatalPattern.test(stdout + stderr) || /error TS\d+/.test(stdout + stderr)) throw new Error('CLI contains errors or panic');
      const profiles = [...stderr.matchAll(/^\[tsgo-profile\] (.+)$/gm)];
      const semantic = profiles.filter(profile => Number(profile[1].match(/getSemanticDiagnostics=(\d+)\//)?.[1] ?? 0) >= expectations.minimumSemanticCalls);
      if (semantic.length !== 1 || !/TNB ACTIVE/.test(stderr)
        || Number(semantic[0][1].match(/\brpc=(\d+)\//)?.[1] ?? 0) < 1) {
        throw new Error('CLI did not execute native semantic checks');
      }
      if (!Array.isArray(run.nativeFiles) || !run.nativeFiles.length || new Set(run.nativeFiles).size !== run.nativeFiles.length) throw new Error('Missing/duplicate CLI process observations');
      const actualNativeFiles = fs.readdirSync(inside(directory, `${label}-native`)).map(file => `${label}-native/${file}`).sort();
      if (stable([...run.nativeFiles].sort()) !== stable(actualNativeFiles)) throw new Error('CLI process observations omit actual child files');
      const observedProcesses = [];
      let nativeLoads = 0;
      for (const nativeFile of run.nativeFiles) {
      if (!new RegExp(`^${label}-native/\\d+\\.jsonl$`).test(nativeFile)) throw new Error('Native observations belong to another run');
      const events = fs.readFileSync(inside(directory, nativeFile), 'utf8').trim().split('\n').map(line => JSON.parse(line));
      const starts = events.filter(event => event.kind === 'start');
      const ends = events.filter(event => event.kind === 'exit');
      const natives = events.filter(event => event.kind === 'native');
      const compilers = events.filter(event => event.kind === 'compiler');
      const sdkDirectory = fs.realpathSync.native(path.dirname(sdkPath));
      for (const compiler of compilers) {
        if (path.dirname(compiler.module.path) !== sdkDirectory || !['typescript.js', '_tsc.js', 'tsc.js'].includes(path.basename(compiler.module.path))
          || compiler.module.sha256 !== await hashFile(compiler.module.path) || !/^[a-f0-9]{64}$/.test(compiler.compiledSha256)) throw new Error('CLI loaded a different compiler SDK');
      }
      if (starts.length !== 1 || ends.length !== 1 || ends[0].code !== 0
        || seenPids.has(starts[0].pid) || events.some(event => event.pid !== starts[0].pid || event.runNonce !== nonce || event.gateId !== gate.id)
        || stable(starts[0].argv.slice(1)) !== stable([entry, ...expectations.flags]) || starts[0].cwd !== command.cwd
        || starts[0].executable.path !== fs.realpathSync.native(command.executable)
        || starts[0].executable.sha256 !== nodeHash
        || events[0] !== starts[0] || events.at(-1) !== ends[0]
        || events.some((event, i) => event.at < Date.parse(command.startedAt) || event.at > Date.parse(command.startedAt) + command.durationMs + 100 || i > 0 && event.at < events[i - 1].at)) throw new Error('Incomplete independent native process lifetime/identity');
      seenPids.add(starts[0].pid);
      observedProcesses.push(starts[0]);
      for (const event of natives) {
        if (event.module.path !== nativePath || event.module.sha256 !== await hashFile(nativePath)
          || !compilers.some(compiler => compiler.module.path === event.parent.path && compiler.at <= event.at)
          || event.parent.sha256 !== await hashFile(event.parent.path)) throw new Error('Native addon is not loaded by the actual CLI compiler SDK');
      }
      nativeLoads += natives.length;
      }
      if (!nativeLoads || observedProcesses.filter(start => !observedProcesses.some(parent => parent.pid === start.parentPid)).length !== 1) {
        throw new Error('Native CLI observations do not form one executed process tree');
      }
      const startsByPid = new Map(observedProcesses.map(start => [start.pid, start]));
      for (const start of observedProcesses) {
        const chain = new Set();
        let cursor = start;
        while (cursor) {
          if (chain.has(cursor.pid)) throw new Error('Cycle in CLI process observations');
          chain.add(cursor.pid); cursor = startsByPid.get(cursor.parentPid);
        }
      }
      const files = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => /\.gts$/i.test(line));
      if (stable(files) !== stable(run.programFiles)) throw new Error('Claimed program list differs from actual CLI output');
      if (pkg.name === '@gi-tcg/data') {
        const coverage = compareCoverage({ repo, baseline: baseline.files, actual: sourceInventory(repo), observed: files });
        if (coverage.status !== 'PASS') return { status: coverage.status, reason: JSON.stringify(coverage.details) };
      }
    }
    return { status: 'PASS', reason: `${evidence.runs.length} independent native CLI checks passed; actual data program covers the exact GTS inventory` };
  } catch (error) { return { status: 'FAIL', reason: error.message }; }
}
