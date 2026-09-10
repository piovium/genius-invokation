// Registered collector for the desktop gate.
//
// It opens the GTS checkout in real VS Code, twice in development mode (the
// repository root and `examples/`) and once from a `.vsix` this run packed from
// the same checkout. It records raw reports, native process logs, launch
// records, pack output and hashes, then derives the sealed session trace.
//
// It never computes PASS/FAIL and never writes a status field. The validator
// re-derives every conclusion from these raw records and the on-disk checkout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchDesktop } from './desktop-launch.mjs';
import { bindNativeServices, readJsonFile, readNativeRuns, sha256, validateDesktopLifetimes } from './desktop-evidence.mjs';
import { assertIdentity, resolveCheckoutIdentity } from './desktop-identity.mjs';
import { auditEditorRequests, auditProtocol } from './desktop-protocol.mjs';
import { deriveDesktopTrace } from './desktop-observations.mjs';
import { deriveDesktopScenarios } from './desktop-scenarios.mjs';
import { inspectInstalledExtension, inspectVsix, installedExtensionDirectory, packVsix, vsixOutputName } from './desktop-vsix.mjs';
import { loadFixtureSources, prepareDesktopTarget, restoreDesktopTarget } from './desktop-target.mjs';

const e = process.env;
const here = new URL('./', import.meta.url);
const envelope = {
  runNonce: e.HARNESS_NONCE, gateId: e.HARNESS_GATE, controlDigest: e.HARNESS_SEAL,
  sourceDigest: e.HARNESS_SOURCE_DIGEST, platform: process.platform, arch: process.arch,
};
const launchTimeoutMs = 900000;

function rawReport(directory, name, prefix) {
  const file = path.join(directory, name);
  const bytes = fs.readFileSync(file);
  return { value: JSON.parse(bytes.toString('utf8')),
    reference: { file: `${prefix}/${name}`, sha256: sha256(bytes) } };
}

/** A run-directory-relative reference to a raw record this collector just wrote. */
function reference(directory, name) {
  return { file: `${path.basename(directory)}/${name}`,
    sha256: sha256(fs.readFileSync(path.join(directory, name))) };
}

async function collectExecution({ core, root, contract, plan, directory, workspace, nonce, rounds, tsdk, fixtureSources }) {
  const workspaceDirectory = path.join(directory, workspace.id);
  const prepared = await prepareDesktopTarget({ root, contract, plan, workspaceId: workspace.id, nonce,
    directory: workspaceDirectory, fixtureSources });
  try {
    const launch = await launchDesktop({
      core, root, contract, plan, directory: workspaceDirectory, mode: 'development-path',
      workspacePath: prepared.workspacePath, targetFile: prepared.targetFile, nonce, rounds, tsdk,
    });
    const report = rawReport(workspaceDirectory, 'report.json', workspace.id);
    const nativeRuns = readNativeRuns(path.join(workspaceDirectory, 'native'), nonce, contract.policy.reportLimitBytes);
    const services = bindNativeServices({ nativeRuns, report: report.value, version: contract.tnbVersion,
      activation: plan.native.activationPattern, routes: plan.native.requiredRoutes });
    return {
      workspaceId: workspace.id, workspacePath: prepared.workspacePath,
      workspaceUri: pathToFileURL(prepared.workspacePath).href, probe: prepared.target.probe,
      sourceBindings: prepared.sources, sources: prepared.sources, support: prepared.support,
      report: report.value, reportFile: report.reference.file, reportSha256: report.reference.sha256,
      sourcesFile: reference(workspaceDirectory, 'desktop-sources.json'),
      targetFile: reference(workspaceDirectory, 'desktop-target.json'),
      launchFile: reference(workspaceDirectory, 'desktop-launch.json'),
      launch, nativeRuns, services,
    };
  } finally {
    const recovery = restoreDesktopTarget(workspaceDirectory);
    fs.writeFileSync(path.join(workspaceDirectory, 'desktop-recovery.json'),
      `${JSON.stringify({ ...recovery, recoveredAtMs: Date.now() }, null, 2)}\n`);
  }
}

/**
 * Pack the extension this checkout ships, install it into an isolated
 * extensions directory and measure that installed copy in a real editor.
 *
 * A missing or failing pack is recorded as an explicit unmet dependency, never
 * as a pass: the gate must not infer packaging success from a development-path
 * launch.
 */
async function collectPackedVsix({ core, root, contract, plan, directory, nonce, rounds, tsdk, fixtureSources, identity }) {
  const repository = path.join(root, contract.repositories[plan.repository].path);
  const packedDirectory = path.join(directory, 'packed-vsix');
  const unavailable = reason => ({
    mode: 'packed-vsix-install', unavailable: reason,
    vsix: null, package: null, install: null, installed: null, services: null, launch: null, report: null, native: [],
  });
  fs.mkdirSync(packedDirectory, { recursive: true });
  let manifest;
  try {
    manifest = readJsonFile(path.join(repository, plan.extension.manifest));
  } catch (error) {
    return unavailable(`the extension manifest is unavailable: ${error.message}`);
  }
  const vsixPath = path.join(packedDirectory, vsixOutputName({ manifest }));
  let pack;
  try {
    pack = await packVsix({ core, repository, plan, directory: packedDirectory, output: vsixPath,
      timeoutMs: launchTimeoutMs, limitBytes: contract.policy.reportLimitBytes });
  } catch (error) {
    return unavailable(`the product pack script could not run: ${error.message}`);
  }
  if (core.processVerdict(pack) !== 'PASS') {
    return unavailable(`the product pack script did not succeed: ${JSON.stringify({
      exitCode: pack.exitCode, signal: pack.signal, reason: pack.reason })}`);
  }
  const vsixSha256 = await core.hashFile(vsixPath);
  let vsixPackage;
  try {
    vsixPackage = inspectVsix({ file: vsixPath, expectedSha256: vsixSha256, plan, identity });
  } catch (error) {
    return unavailable(`the packed VSIX could not be read: ${error.message}`);
  }
  const vsix = { file: `packed-vsix/${path.basename(vsixPath)}`, sha256: vsixSha256, bytes: fs.statSync(vsixPath).size };

  // The raw bytes of the product's own pack step are part of the evidence: the
  // validator requires them, so a `.vsix` that merely existed on disk can never
  // stand in for an artifact this run built.
  const packLog = name => {
    const file = path.join(packedDirectory, name);
    return fs.existsSync(file) ? reference(packedDirectory, name) : null;
  };
  const packStdout = packLog(`${plan.extension.packLabel}.stdout.log`);
  const packStderr = packLog(`${plan.extension.packLabel}.stderr.log`);
  if (!packStdout || !packStderr) {
    return unavailable('the product pack script left no raw output in the run directory');
  }
  const prepared = await prepareDesktopTarget({ root, contract, plan, workspaceId: 'root-workspace', nonce,
    directory: packedDirectory, fixtureSources });
  try {
    const launch = await launchDesktop({
      core, root, contract, plan, directory: packedDirectory, mode: 'packed-vsix-install',
      workspacePath: prepared.workspacePath, targetFile: prepared.targetFile, nonce, rounds, tsdk, vsix: vsixPath,
    });
    const installedDirectory = installedExtensionDirectory({ extensionsDirectory: launch.extensionsDirectory, plan });
    const installed = inspectInstalledExtension({ extensionPath: installedDirectory.directory, vsix: vsixPackage, plan });
    const report = rawReport(packedDirectory, 'report.json', 'packed-vsix');
    const nativeRuns = readNativeRuns(path.join(packedDirectory, 'native'), nonce, contract.policy.reportLimitBytes);
    const services = bindNativeServices({ nativeRuns, report: report.value, version: contract.tnbVersion,
      activation: plan.native.activationPattern, routes: plan.native.requiredRoutes });
    return {
      mode: 'packed-vsix-install', unavailable: null, vsix,
      pack: { label: plan.extension.packLabel, command: pack, output: vsixPath, sha256: vsixSha256,
        stdout: packStdout, stderr: packStderr },
      package: { version: vsixPackage.version, targetPlatform: vsixPackage.targetPlatform,
        members: Object.keys(vsixPackage.members).length },
      install: { args: launch.installArgs, command: launch.install },
      installed: { extensionPath: installed.extensionPath, version: installed.version, files: installed.files },
      services: Object.fromEntries(Object.entries(services).map(([route, service]) => [route, {
        pid: service.pid, packageName: service.observedIdentity.packageName,
        packageVersion: service.observedIdentity.packageVersion, sdkPath: service.observedIdentity.sdkPath,
        addonSha256: service.observedIdentity.native[0].sha256,
      }])),
      launch: { file: 'packed-vsix/desktop-launch.json',
        sha256: sha256(fs.readFileSync(path.join(packedDirectory, 'desktop-launch.json'))) },
      report: { file: report.reference.file, sha256: report.reference.sha256 },
      native: nativeRuns.map(run => ({ file: `packed-vsix/native/${run.file}`, sha256: run.sha256, pid: run.pid })),
    };
  } finally {
    const recovery = restoreDesktopTarget(packedDirectory);
    fs.writeFileSync(path.join(packedDirectory, 'desktop-recovery.json'),
      `${JSON.stringify({ ...recovery, recoveredAtMs: Date.now() }, null, 2)}\n`);
  }
}

async function main() {
  const observation = { ...envelope };
  try {
    for (const name of ['HARNESS_ROOT', 'HARNESS_RUN_DIRECTORY', 'HARNESS_OUTPUT', 'HARNESS_NONCE', 'HARNESS_GATE']) {
      if (!e[name]) throw new Error(`Missing ${name}`);
    }
    if (e.HARNESS_GATE !== 'desktop') throw new Error(`The desktop collector was requested for ${e.HARNESS_GATE}`);
    const root = e.HARNESS_ROOT, directory = e.HARNESS_RUN_DIRECTORY;
    const contract = readJsonFile(path.join(root, 'harness/contract.json'));
    const expectations = readJsonFile(fileURLToPath(new URL('./desktop-expectations.json', here)));
    const plan = readJsonFile(fileURLToPath(new URL('./desktop-plan.json', here)));
    const core = await import(pathToFileURL(path.join(root, 'harness/core.mjs')).href);
    const identity = assertIdentity(resolveCheckoutIdentity({ root, contract, plan }), { contract, plan });
    const fixtureSources = await loadFixtureSources({ repository: identity.repository, fixtureModule: plan.fixtureModule });
    const rounds = contract.policy.desktopEditRounds;

    const executions = [];
    for (const workspace of plan.workspaces) {
      executions.push(await collectExecution({ core, root, contract, plan, directory, workspace,
        nonce: e.HARNESS_NONCE, rounds, tsdk: identity.tsdk, fixtureSources }));
    }
    const packedVsix = await collectPackedVsix({ core, root, contract, plan, directory, nonce: e.HARNESS_NONCE,
      rounds, tsdk: identity.tsdk, fixtureSources, identity });

    const { trace, bindings } = deriveDesktopTrace({ executions, expectations, nonce: e.HARNESS_NONCE, rounds, plan });
    Object.assign(observation, {
      expectationsSha256: sha256(fs.readFileSync(fileURLToPath(new URL('./desktop-expectations.json', here)))),
      planSha256: sha256(fs.readFileSync(fileURLToPath(new URL('./desktop-plan.json', here)))),
      rounds,
      launchModes: Object.keys(plan.launchModes),
      identity,
      processCleanup: {
        platform: process.platform,
        module: 'harness/collectors/desktop/desktop-linux-cleanup.mjs',
        recordedIn: 'each desktop-launch.json cleanup field',
      },
      executions: executions.map(execution => ({
        workspaceId: execution.workspaceId, workspaceUri: execution.workspaceUri, probe: execution.probe,
        workspacePath: execution.workspacePath,
        report: { file: execution.reportFile, sha256: execution.reportSha256 },
        sources: execution.sourcesFile, target: execution.targetFile, launch: execution.launchFile,
        native: execution.nativeRuns.map(run => ({
          file: `${execution.workspaceId}/native/${run.file}`, sha256: run.sha256, pid: run.pid,
        })),
      })),
      trace,
      bindings,
      scenarios: deriveDesktopScenarios({ executions, packedVsix, plan, rounds }),
      protocolBindings: executions.map(execution => ({
        workspaceId: execution.workspaceId,
        bindings: auditProtocol({ nativeRuns: execution.nativeRuns, report: execution.report, services: execution.services }),
      })),
      featureRequests: executions.map(execution => ({
        workspaceId: execution.workspaceId, requests: auditEditorRequests(execution.report),
      })),
      processLifetimes: validateDesktopLifetimes(executions.map(execution => ({
        workspaceId: execution.workspaceId, launch: execution.launch, nativeRuns: execution.nativeRuns,
      }))),
      packedVsix,
      executedHosts: executions.length,
      completedRounds: rounds,
    });
    for (const execution of executions) {
      if (execution.services['gts-lsp'] === undefined || execution.services.tsserver === undefined) {
        throw new Error(`${execution.workspaceId}: the measured host did not exercise both language services`);
      }
    }
    console.log(`desktop: ${executions.length} development hosts, ${trace.sessions.length} sessions, ` +
      `${rounds} rounds, packed-vsix=${packedVsix.unavailable ? 'unavailable' : 'measured'}`);
  } catch (error) {
    observation.error = error.stack ?? String(error);
    observation.failures = [error.message];
    process.stderr.write(`${observation.error}\n`);
    process.exitCode = 1;
  } finally {
    if (e.HARNESS_OUTPUT) fs.writeFileSync(e.HARNESS_OUTPUT, `${JSON.stringify(observation, null, 2)}\n`, { flag: 'wx' });
  }
}

await main();
