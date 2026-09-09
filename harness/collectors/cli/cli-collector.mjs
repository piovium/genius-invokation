import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const e = process.env;
const { execute, readJson, writeJson, hashFile, processVerdict } = await import(pathToFileURL(path.join(e.HARNESS_ROOT, 'harness/core.mjs')).href);
const contract = readJson(path.join(e.HARNESS_ROOT, 'harness/contract.json'));
const baseline = readJson(path.join(e.HARNESS_ROOT, 'harness/baselines/main.json'));
const repo = path.join(e.HARNESS_ROOT, contract.repositories.main.path);
const here = path.dirname(fileURLToPath(import.meta.url));
const gate = contract.gates.find(gate => gate.id === e.HARNESS_GATE);
if (!['checks', 'data'].includes(gate?.id)) throw new Error('CLI collector is only registered for data/checks');
const runs = [];
const rows = gate.id === 'data' ? Array.from({ length: contract.policy.dataRuns }, () => baseline.checkPackages.find(pkg => pkg.name === '@gi-tcg/data'))
  : baseline.checkPackages;
for (const [index, pkg] of rows.entries()) {
  const cwd = path.join(repo, pkg.path);
  const manifest = readJson(path.join(cwd, 'package.json'));
  if (manifest.name !== pkg.name || manifest.scripts.check !== pkg.command) throw new Error('Check manifest drifted');
  const require = createRequire(path.join(cwd, 'package.json'));
  const sdkFile = require.resolve('typescript');
  const sdkPackage = require.resolve('typescript/package.json');
  const sdk = { ...readJson(sdkPackage), modulePath: sdkFile, moduleSha256: await hashFile(sdkFile), packagePath: sdkPackage };
  if (sdk.name !== 'typescript-native-bridge' || sdk.version !== contract.tnbVersion) throw new Error('Check resolves wrong engine');
  // The baseline scripts have exactly these two forms. Keep the same CLI and
  // flags; listFiles supplies actual program membership without altering checks.
  if (!['gtsc --noEmit', 'tsc --noEmit'].includes(pkg.command)) throw new Error('Unreviewed check command');
  const gts = pkg.command.startsWith('gtsc');
  const cliManifest = gts ? require.resolve('@gi-tcg/gtsc/package.json') : sdkPackage;
  const cliPackage = readJson(cliManifest);
  const entry = path.resolve(path.dirname(cliManifest), cliPackage.bin[gts ? 'gtsc' : 'tsc']);
  const label = `${gate.id}-${index}`;
  const nativeDirectory = path.join(e.HARNESS_RUN_DIRECTORY, `${label}-native`);
  const args = ['--max-old-space-size=4096', '--require', path.join(here, 'cli-engine.cjs'), entry, '--noEmit', '--pretty', 'false', '--listFiles'];
  const command = await execute({ executable: e.HARNESS_NODE, args, cwd,
    directory: e.HARNESS_RUN_DIRECTORY, label, timeoutMs: gate.timeoutMs,
    limitBytes: contract.policy.reportLimitBytes,
    env: { HARNESS_CLI_OBSERVATIONS: nativeDirectory, TSGO_PROFILE: '1' } });
  for (const stream of ['stdout', 'stderr']) command[stream].sha256 = await hashFile(path.join(e.HARNESS_RUN_DIRECTORY, command[stream].file));
  const stdout = fs.readFileSync(path.join(e.HARNESS_RUN_DIRECTORY, command.stdout.file), 'utf8');
  const programFiles = stdout.split(/\r?\n/).map(line => line.trim()).filter(line => /\.gts$/i.test(line));
  const nativeFiles = fs.existsSync(nativeDirectory) ? fs.readdirSync(nativeDirectory).filter(file => file.endsWith('.jsonl')) : [];
  runs.push({ name: pkg.name, path: pkg.path, check: pkg.command, sdk, cli: { path: entry, sha256: await hashFile(entry) },
    command, programFiles, nativeFiles: nativeFiles.map(file => `${label}-native/${file}`) });
  console.log(`${label} ${pkg.name}: ${processVerdict(command)}`);
}
writeJson(e.HARNESS_OUTPUT, { runNonce: e.HARNESS_NONCE, gateId: gate.id, controlDigest: e.HARNESS_SEAL,
  sourceDigest: e.HARNESS_SOURCE_DIGEST, platform: process.platform, runs });
if (runs.some(run => processVerdict(run.command) !== 'PASS')) process.exitCode = 1;
