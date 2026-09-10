// Validator for the desktop gate.
//
// Nothing here trusts a status, a counter or a summary. Every conclusion is
// re-derived from the raw report records, the raw native process logs, the
// launch records, the packed VSIX bytes and the on-disk GTS checkout that the
// sealed contract names. The collector only records.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertLaunchArguments, desktopRuntime } from './desktop-launch.mjs';
import { bindNativeServices, evidenceFile, readJsonFile, readNativeRuns, readRawEvidence, sha256, validateDesktopLifetimes } from './desktop-evidence.mjs';
import { assertIdentity, resolveCheckoutIdentity } from './desktop-identity.mjs';
import { auditEditorRequests, auditProtocol, fileKey } from './desktop-protocol.mjs';
import { deriveCycles, deriveDesktopTrace } from './desktop-observations.mjs';
import { deriveDesktopScenarios } from './desktop-scenarios.mjs';
import { inspectInstalledExtension, inspectVsix, installedExtensionDirectory } from './desktop-vsix.mjs';

const here = new URL('./', import.meta.url);
const statusFields = ['status', 'result', 'outcome', 'verdict', 'pass', 'fail', 'passed', 'failed', 'success'];
// The retired acceptance target. Its presence anywhere in a desktop observation
// means the collector is still bound to the old workspace pair.
const retiredTargets = ['packages/data', 'worktrees/genius-invokation', 'data-workspace'];

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

/**
 * The retired acceptance target must not be named anywhere, and every measured
 * workspace must still be the GTS checkout the sealed contract binds.
 */
function assertRebinding(observation, plan, repository) {
  const text = JSON.stringify(observation);
  for (const retired of retiredTargets) {
    assert(!text.includes(retired), `The observation still refers to the retired desktop target ${retired}`);
  }
  for (const execution of observation.executions) {
    const workspace = plan.workspaces.find(item => item.id === execution.workspaceId);
    assert(workspace, `Unknown desktop workspace ${execution.workspaceId}`);
    assert(path.resolve(execution.workspacePath) === path.resolve(repository, workspace.relative),
      `${execution.workspaceId}: the measured workspace is outside the GTS binding`);
  }
}

function loadExecution(directory, execution, { contract, plan, nonce, identity, root }) {
  const workspaceDirectory = path.join(directory, execution.workspaceId);
  const report = readRawEvidence(directory, execution.report);
  const reportValue = readJsonFile(report.file);
  const sources = readRawEvidence(directory, execution.sources);
  const target = readRawEvidence(directory, execution.target);
  const launch = readRawEvidence(directory, execution.launch);
  assert(reportValue.runNonce === nonce, `${execution.workspaceId}: the report belongs to another run`);
  assert(reportValue.cycles === contract.policy.desktopEditRounds,
    `${execution.workspaceId}: the report claims ${reportValue.cycles} rounds instead of ${contract.policy.desktopEditRounds}`);
  assert(reportValue.vscode === plan.runtime.version,
    `${execution.workspaceId}: the extension host is VS Code ${reportValue.vscode}`);
  const nativeRuns = readNativeRuns(path.join(workspaceDirectory, 'native'), nonce, contract.policy.reportLimitBytes);
  const declared = new Map(execution.native.map(item => [path.basename(item.file), item]));
  assert(declared.size === nativeRuns.length, `${execution.workspaceId}: the declared native logs do not match the files on disk`);
  for (const run of nativeRuns) {
    const item = declared.get(run.file);
    assert(item, `${execution.workspaceId}: undeclared native log ${run.file}`);
    assert(item.sha256 === run.sha256, `${execution.workspaceId}: native log ${run.file} changed`);
  }
  const services = bindNativeServices({
    nativeRuns, report: reportValue, version: contract.tnbVersion,
    activation: plan.native.activationPattern, routes: plan.native.requiredRoutes,
  });
  for (const [route, service] of Object.entries(services)) {
    assert(service.observedIdentity.moduleSha256 === identity.moduleSha256,
      `${execution.workspaceId}: the ${route} service loaded another compiler module`);
    assert(service.observedIdentity.manifestSha256 === identity.manifestSha256,
      `${execution.workspaceId}: the ${route} service loaded another compiler manifest`);
    assert(service.observedIdentity.native.length === 1
      && service.observedIdentity.native[0].sha256 === identity.nativeAddonSha256,
      `${execution.workspaceId}: the ${route} service loaded another native addon`);
    assert(path.resolve(service.observedIdentity.native[0].path) === path.resolve(identity.nativeAddonPath),
      `${execution.workspaceId}: the ${route} service loaded an addon from another checkout`);
  }
  const targetValue = readJsonFile(target.file);
  const sourcesValue = readJsonFile(sources.file);
  assert(path.resolve(targetValue.workspacePath) === path.resolve(execution.workspacePath),
    `${execution.workspaceId}: the prepared target names another workspace`);
  assert(sourcesValue.workspaceId === execution.workspaceId, `${execution.workspaceId}: the sources record belongs to another workspace`);
  const workspaceRoot = path.resolve(execution.workspacePath);
  assert(Array.isArray(sourcesValue.sources) && sourcesValue.sources.length > 0,
    `${execution.workspaceId}: the sources record binds no measured source`);
  for (const source of sourcesValue.sources) {
    const prepared = path.resolve(fileURLToPath(source.actualUri));
    assert(prepared === workspaceRoot || prepared.startsWith(workspaceRoot + path.sep),
      `${execution.workspaceId}: the measured source ${source.name} is outside its workspace`);
    assert(typeof source.logicalUri === 'string' && source.logicalUri.startsWith('file:///workspace/'),
      `${execution.workspaceId}: a measured source is not bound to its reviewed logical spelling`);
  }
  const recovery = readJsonFile(evidenceFile(directory, `${execution.workspaceId}/desktop-recovery.json`));
  assert(recovery.skipped === false && recovery.workspaceId === execution.workspaceId,
    `${execution.workspaceId}: the measured workspace was not restored`);
  assert(!fs.existsSync(sourcesValue.probe), `${execution.workspaceId}: the probe project was left behind`);
  for (const name of recovery.removed ?? []) {
    assert(!fs.existsSync(path.join(sourcesValue.probe, name)), `${execution.workspaceId}: ${name} was left behind`);
  }
  const launchValue = readJsonFile(launch.file);
  assert(launchValue.mode === 'development-path', `${execution.workspaceId}: unexpected launch mode ${launchValue.mode}`);
  assertLaunchArguments({ mode: launchValue.mode, args: launchValue.args, install: launchValue.installArgs });
  const runtime = desktopRuntime({ root, plan });
  assert(path.resolve(launchValue.executable) === path.resolve(runtime.executable),
    `${execution.workspaceId}: the launch used another VS Code executable`);
  assert(launchValue.executableSha256 === sha256(fs.readFileSync(runtime.executable)),
    `${execution.workspaceId}: the VS Code executable changed`);
  assert(path.resolve(launchValue.workspacePath) === path.resolve(execution.workspacePath),
    `${execution.workspaceId}: the launch opened another workspace`);
  assert(path.resolve(launchValue.targetFile) === path.join(workspaceDirectory, 'desktop-target.json'),
    `${execution.workspaceId}: the launch read another target file`);
  assert(launchValue.rounds === contract.policy.desktopEditRounds,
    `${execution.workspaceId}: the launch measured another round count`);
  const preload = fileURLToPath(new URL('./desktop-native-preload.cjs', here));
  assert(path.resolve(launchValue.preload) === path.resolve(preload)
    && launchValue.preloadSha256 === sha256(fs.readFileSync(preload)),
    `${execution.workspaceId}: the native preload is not the reviewed observer`);
  const driver = path.join(identity.repository, plan.extension.testDriver);
  assert(path.resolve(launchValue.testFile) === path.resolve(driver)
    && launchValue.testSha256 === sha256(fs.readFileSync(driver)),
    `${execution.workspaceId}: the extension test driver changed`);
  const command = launchValue.command;
  assert(command && command.exitCode === 0 && !command.reason && !command.signal && !command.fatal,
    `${execution.workspaceId}: the recorded launch command did not succeed`);
  assert(launchValue.cleanup?.platform === process.platform,
    `${execution.workspaceId}: the launch carries another platform's cleanup record`);
  assertLaunchCleanup(launchValue, execution.workspaceId);
  const logReference = name => ({ file: `${execution.workspaceId}/${name}`,
    sha256: launchValue.logs?.find(log => log.file === name)?.sha256 });
  const stdout = readRawEvidence(directory, logReference('desktop.stdout.log'));
  readRawEvidence(directory, logReference('desktop.stderr.log'));
  assert(!/panic:|heap out of memory/i.test(stdout.text()), `${execution.workspaceId}: the extension host reported a fatal error`);
  return {
    workspaceId: execution.workspaceId, workspacePath: execution.workspacePath,
    workspaceUri: pathToFileURL(execution.workspacePath).href, probe: execution.probe,
    sourceBindings: sourcesValue.sources, sources: sourcesValue.sources, support: sourcesValue.support,
    report: reportValue, reportFile: execution.report.file, reportSha256: execution.report.sha256,
    launch: launchValue, nativeRuns, services,
  };
}

/**
 * A launch is only accepted when its process tree is accounted for: verifiably
 * terminated on Linux, or explicitly owned by the sealed Windows job object.
 * A Linux launch with no cleanup record never passes.
 */
export function assertLaunchCleanup(launch, label) {
  const cleanup = launch.cleanup;
  assert(cleanup && typeof cleanup.platform === 'string',
    `${label}: the launch has no process-cleanup record for this platform`);
  if (cleanup.platform === 'linux') {
    assert(cleanup.executed === true && cleanup.owner === 'linux-cleanup-module',
      `${label}: the Linux launch tree was not cleaned up`);
    assert(cleanup.terminated === true && (cleanup.survivors ?? []).length === 0,
      `${label}: processes of this launch survived cleanup`);
    assert((cleanup.discovered ?? []).length > 0, `${label}: no process of the Linux launch was ever discovered`);
  } else {
    assert(cleanup.executed === false && cleanup.owner === 'windows-job-object',
      `${label}: a non-Linux launch must record that the job object owns termination`);
    assert(typeof cleanup.reason === 'string' && cleanup.reason.length > 0,
      `${label}: an unexecuted cleanup must state why it did not run`);
  }
}

function validatePackedVsix({ packed, directory, plan, contract, nonce, identity, root }) {
  assert(packed.mode === 'packed-vsix-install', 'The packed VSIX evidence names another mode');
  // The measured extension must be one this run built from this checkout. A
  // `.vsix` that merely existed on disk is never accepted in its place, so the
  // pack command, its exit status and its raw output are all required.
  const pack = packed.pack;
  assert(pack && typeof pack.label === 'string' && pack.label === plan.extension.packLabel,
    'The packed VSIX evidence records no product pack step');
  assert(pack.command && pack.command.exitCode === 0 && !pack.command.reason
    && !pack.command.signal && !pack.command.fatal,
  `The product pack script did not succeed: ${JSON.stringify({
    exitCode: pack.command?.exitCode, signal: pack.command?.signal, reason: pack.command?.reason,
  })}`);
  const packArgs = pack.command.args ?? [];
  assert(path.isAbsolute(pack.command.executable), 'The pack step did not run the pinned Node runtime');
  assert(path.isAbsolute(packArgs[0] ?? '') && packArgs[1] === '--filter'
    && packArgs[2] === plan.extension.packageName && packArgs[3] === 'run'
    && packArgs[4] === plan.extension.packScript,
  `The pack step did not run the product pack script: ${JSON.stringify(packArgs)}`);
  const vsix = readRawEvidence(directory, packed.vsix);
  assert(path.basename(pack.output ?? '') === path.basename(vsix.file),
    'The recorded pack output is not the VSIX the run measured');
  readRawEvidence(directory, pack.stdout);
  readRawEvidence(directory, pack.stderr);
  const vsixPackage = inspectVsix({ file: vsix.file, expectedSha256: packed.vsix.sha256, plan, identity });
  const launch = readJsonFile(readRawEvidence(directory, packed.launch).file);
  assert(launch.mode === 'packed-vsix-install', 'The packed VSIX launch names another mode');
  const checked = assertLaunchArguments({ mode: launch.mode, args: launch.args, install: launch.installArgs });
  assert(path.resolve(checked.installExtension) === path.resolve(vsix.file), 'The recorded launch installed another VSIX');
  assert(path.resolve(launch.installExtensionFile ?? '') === path.resolve(vsix.file), 'The launch record names another VSIX artifact');
  assert(launch.installExtensionSha256 === packed.vsix.sha256, 'The installed VSIX changed after it was recorded');
  assert(launch.install && launch.install.exitCode === 0 && !launch.install.reason
    && !launch.install.signal && !launch.install.fatal,
  'The packed VSIX was never installed into the isolated extension directory');
  assert(same(launch.installArgs, launch.install.args), 'The recorded install command is not the recorded install arguments');
  assert(launch.command && launch.command.exitCode === 0 && !launch.command.reason && !launch.command.signal && !launch.command.fatal,
    'The packed VSIX launch command did not succeed');
  assert(launch.cleanup?.platform === process.platform,
    "packed-vsix-install: the launch carries another platform cleanup record");
  assertLaunchCleanup(launch, 'packed-vsix-install');
  assert(path.resolve(launch.executable) === path.resolve(desktopRuntime({ root, plan }).executable)
    || launch.executableSha256 === sha256(fs.readFileSync(launch.executable)),
    'The packed VSIX launch used an unverified VS Code executable');
  const installedDirectory = installedExtensionDirectory({ extensionsDirectory: launch.extensionsDirectory, plan });
  const installed = inspectInstalledExtension({ extensionPath: installedDirectory.directory, vsix: vsixPackage, plan });
  assert(installed.version === vsixPackage.version, 'The installed extension version differs from the VSIX');
  const packedReport = readRawEvidence(directory, packed.report);
  const packedValue = readJsonFile(packedReport.file);
  assert(packedValue.runNonce === nonce && packedValue.cycles === contract.policy.desktopEditRounds
    && packedValue.vscode === plan.runtime.version,
  'The packed VSIX host report is not a complete run of this gate');
  const nativeRuns = readNativeRuns(path.join(directory, 'packed-vsix/native'), nonce, contract.policy.reportLimitBytes);
  const services = bindNativeServices({
    nativeRuns, report: packedValue, version: contract.tnbVersion,
    activation: plan.native.activationPattern, routes: plan.native.requiredRoutes,
  });
  for (const [route, service] of Object.entries(services)) {
    assert(service.observedIdentity.native.length === 1
      && service.observedIdentity.native[0].sha256 === identity.nativeAddonSha256,
    `The installed extension's ${route} service loaded another native addon`);
    assert(service.observedIdentity.packageVersion === contract.tnbVersion,
      `The installed extension's ${route} service loaded another compiler`);
  }
  assert(packed.package?.version === vsixPackage.version, 'The recorded VSIX package identity changed');
  assert(same(packed.installed?.files, installed.files), 'The installed extension inventory changed');
  for (const [route, service] of Object.entries(packed.services ?? {})) {
    assert(service.pid === services[route]?.pid && service.addonSha256 === identity.nativeAddonSha256,
      `The recorded packed ${route} service disagrees with the raw native log`);
  }
  const recovery = readJsonFile(evidenceFile(directory, 'packed-vsix/desktop-recovery.json'));
  assert(recovery.skipped === false, 'The packed VSIX workspace was not restored');
  const target = readJsonFile(evidenceFile(directory, 'packed-vsix/desktop-target.json'));
  assert(!fs.existsSync(target.probe) || !path.isAbsolute(target.probe), 'The packed VSIX probe project was left behind');
  return { vsixPackage, installed, services };
}

export async function validate(observation, { contract, expectations, root, directory, gate, nonce }) {
  try {
    assert(gate.id === 'desktop' && observation.gateId === 'desktop', 'The observation belongs to another gate');
    for (const field of statusFields) {
      assert(!(field in observation), `The collector wrote a "${field}" field; it must only record raw evidence`);
    }
    assert(observation.error === undefined, `The collector reported an error: ${observation.failures?.[0] ?? 'unknown'}`);
    assert(observation.platform === process.platform, 'The observation was produced on another platform');
    const plan = readJsonFile(fileURLToPath(new URL('./desktop-plan.json', here)));
    const rounds = contract.policy.desktopEditRounds;
    assert(observation.rounds === rounds && observation.completedRounds === rounds,
      `The observation does not record the sealed ${rounds}-round default`);
    assert(same(observation.launchModes, Object.keys(plan.launchModes)),
      'Both sealed launch modes must be declared by the collector');
    assert(observation.processCleanup?.module === 'harness/collectors/desktop/desktop-linux-cleanup.mjs',
      'The observation carries no process-cleanup record');

    let identity;
    try {
      identity = assertIdentity(resolveCheckoutIdentity({ root, contract, plan }), { contract, plan });
    } catch (error) {
      return { status: 'BLOCKED', reason: `The pinned engine is unavailable in the GTS checkout: ${error.message}` };
    }
    assert(observation.identity?.moduleSha256 === identity.moduleSha256
      && observation.identity?.nativeAddonSha256 === identity.nativeAddonSha256
      && observation.identity?.sdkPath === identity.sdkPath
      && observation.identity?.packageVersion === identity.packageVersion,
    'The recorded compiler identity differs from the checkout');
    assert(Array.isArray(observation.executions) && observation.executions.length === plan.workspaces.length,
      `Expected ${plan.workspaces.length} measured workspaces`);
    assertRebinding(observation, plan, identity.repository);

    const executions = [];
    for (const execution of observation.executions) {
      executions.push(loadExecution(directory, execution, { contract, plan, nonce, identity, root }));
    }
    const derived = deriveDesktopTrace({ executions, expectations, nonce, rounds, plan });
    assert(same(observation.trace, derived.trace), 'The recorded session trace is not what the raw records imply');
    assert(same(observation.bindings, derived.bindings), 'The recorded session bindings differ from the raw records');
    for (const session of derived.trace.sessions) deriveCycles(session, rounds);

    const protocolBindings = executions.map(execution => ({
      workspaceId: execution.workspaceId,
      bindings: auditProtocol({ nativeRuns: execution.nativeRuns, report: execution.report, services: execution.services }),
    }));
    assert(same(observation.protocolBindings, protocolBindings), 'The native protocol replay disagrees with the recorded bindings');
    const featureRequests = executions.map(execution => ({
      workspaceId: execution.workspaceId, requests: auditEditorRequests(execution.report),
    }));
    assert(same(observation.featureRequests, featureRequests), 'The editor feature requests disagree with the recorded answers');
    const processLifetimes = validateDesktopLifetimes(executions.map(execution => ({
      workspaceId: execution.workspaceId, launch: execution.launch, nativeRuns: execution.nativeRuns,
    })));
    assert(same(observation.processLifetimes, processLifetimes), 'The recorded process lifetimes disagree with the raw logs');
    assert(observation.executedHosts === plan.workspaces.length, 'The number of measured hosts does not match the sealed workspaces');

    const { validateTrace } = await import(pathToFileURL(path.join(root, 'harness/probes/session-evidence.mjs')).href);
    const semantics = validateTrace(derived.trace, 'desktop', { rounds, nonce, tnbVersion: contract.tnbVersion, expectations });
    if (semantics.status !== 'PASS') {
      return { status: semantics.status, reason: `session probe: ${semantics.details?.join('; ')}` };
    }

    const packed = observation.packedVsix;
    if (!packed || typeof packed.mode !== 'string') return { status: 'FAIL', reason: 'The packed VSIX evidence is missing' };
    if (packed.unavailable) {
      return { status: 'BLOCKED', reason: `packed-vsix-install could not run: ${packed.unavailable}` };
    }
    validatePackedVsix({ packed, directory, plan, contract, nonce, identity, root });

    const scenarios = deriveDesktopScenarios({ executions, packedVsix: packed, plan, rounds });
    assert(same(observation.scenarios, scenarios), 'The recorded scenarios disagree with the raw records');
    for (const id of contract.policy.desktopScenarios) {
      assert(scenarios.some(scenario => scenario.id === id), `The ${id} scenario has no raw evidence`);
    }
    return {
      status: 'PASS',
      reason: `Two development-path hosts and one installed-VSIX host in the GTS checkout: ${rounds} real edit cycles per service, `
        + 'exact TNB native identity, replayed protocol diagnostics and all sealed scenarios verified',
    };
  } catch (error) {
    return { status: 'FAIL', reason: error.stack ?? String(error) };
  }
}

export { fileKey };



