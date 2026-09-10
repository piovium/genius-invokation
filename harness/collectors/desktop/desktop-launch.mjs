// Real VS Code launch planning and execution for the two measured modes.
//
// development path: the checkout's `packages/vscode` extension is loaded with
//   `--extensionDevelopmentPath`, so it is deliberately not installed.
// packed VSIX install: a real `.vsix` is installed with `--install-extension`
//   into an isolated `--extensions-dir` + `--user-data-dir`, and the editor is
//   then launched with no `--extensionDevelopmentPath` at all.
//
// The mode is part of the raw evidence so the validator can reject evidence
// that names one mode while the recorded arguments describe the other. The
// sealed executor bounds what it can — a job object with KILL_ON_JOB_CLOSE on
// win32, `process.kill(-pid)` on Linux — but on Linux it never returns the
// child pid and only signals the direct child's process group, so a `setsid`
// descendant of the editor escapes it. Every launch therefore also records the
// outcome of `desktop-linux-cleanup.mjs`, run from the `finally` below so a
// failed or timed-out launch is cleaned up just like a successful one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { cleanupLaunchTree } from './desktop-linux-cleanup.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export const launchModes = ['development-path', 'packed-vsix-install'];

export function desktopRuntime({ root, plan, platform = process.platform, arch = process.arch }) {
  const template = plan.runtime[platform];
  if (!template) throw new Error(`Unsupported desktop platform ${platform}-${arch}`);
  const relative = template.replace('{arch}', arch);
  const executable = path.join(root, relative);
  if (!fs.existsSync(executable)) throw new Error(`Missing prepared VS Code runtime: ${relative}`);
  return { platform, arch, version: plan.runtime.version, relative, executable };
}

/** Every argument the launch is allowed to carry, keyed by the mode it belongs to. */
export function launchArguments({ plan, mode, repository, profile, extensionsDirectory, workspace, vsix }) {
  if (!launchModes.includes(mode)) throw new Error(`Unknown desktop launch mode ${mode}`);
  const common = ['--new-window', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes',
    '--user-data-dir', profile, '--extensions-dir', extensionsDirectory];
  const tests = ['--extensionTestsPath', path.join(repository, plan.extension.testDriver)];
  const install = mode === 'packed-vsix-install'
    ? ['--install-extension', vsix, '--extensions-dir', extensionsDirectory, '--user-data-dir', profile]
    : null;
  const args = mode === 'development-path'
    ? [...common, '--disable-extensions', '--extensionDevelopmentPath', path.join(repository, plan.extension.developmentPath), ...tests, workspace]
    : [...common, ...tests, workspace];
  return { install, args };
}

export function extensionDevelopmentPathOf(args) {
  const at = args.indexOf('--extensionDevelopmentPath');
  return at < 0 ? null : args[at + 1] ?? '';
}
export function installExtensionOf(args) {
  const at = args.indexOf('--install-extension');
  return at < 0 ? null : args[at + 1] ?? '';
}

/**
 * The one place that decides which arguments each mode must and must not
 * carry. Both the collector and the validator apply it independently.
 */
export function assertLaunchArguments({ mode, args, install }) {
  if (!launchModes.includes(mode)) throw new Error(`Unknown desktop launch mode ${mode}`);
  const developmentPath = extensionDevelopmentPathOf(args);
  const installExtension = installExtensionOf(install ?? []);
  if (mode === 'development-path') {
    if (!developmentPath) throw new Error('The development path mode must set --extensionDevelopmentPath');
    if (install) throw new Error('The development path mode must not install an extension');
    if (installExtensionOf(args)) throw new Error('The development path mode must not pass --install-extension');
  } else {
    if (developmentPath) throw new Error('The packed VSIX mode must not set --extensionDevelopmentPath');
    if (!install || !installExtension) throw new Error('The packed VSIX mode must install a real .vsix');
    if (args.includes('--disable-extensions')) throw new Error('The packed VSIX mode must not disable installed extensions');
    if (installExtensionOf(args)) throw new Error('The install step must be separate from the measured launch');
  }
  return { developmentPath, installExtension };
}

export function desktopLaunchPlan({ plan, runtime, mode, args, install }) {
  return { mode, timeoutMs: 900000, logFiles: [...plan.logFiles],
    launch: { executable: runtime.executable, args },
    install: install ? { executable: runtime.executable, args: install } : null };
}

function writeSettings(profile, tsdk) {
  fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
  fs.writeFileSync(path.join(profile, 'User', 'settings.json'), `${JSON.stringify({
    'update.mode': 'none', 'extensions.autoUpdate': false, 'extensions.autoCheckUpdate': false,
    'telemetry.telemetryLevel': 'off', 'typescript.tsserver.log': 'verbose',
    'gts-language-server.trace.server': 'verbose', 'typescript.disableAutomaticTypeAcquisition': true,
    'security.workspace.trust.enabled': false, 'typescript.tsdk': tsdk,
  }, null, 2)}\n`);
}

/**
 * Execute the prepared runtime for one workspace and record the raw launch.
 * Nothing here decides acceptance, and a failing child stays failing.
 */
export async function launchDesktop({ core, root, contract, plan, directory, mode, workspacePath, targetFile, nonce, rounds, tsdk, vsix = null }) {
  const runtime = desktopRuntime({ root, plan });
  const repository = path.join(root, contract.repositories[plan.repository].path);
  fs.mkdirSync(directory, { recursive: true });
  const profile = path.join(directory, 'user-data');
  const extensionsDirectory = path.join(directory, 'extensions');
  if (fs.existsSync(profile) || fs.existsSync(extensionsDirectory)) {
    throw new Error('The desktop profile and extension directories must start cold');
  }
  fs.mkdirSync(extensionsDirectory, { recursive: true });
  writeSettings(profile, tsdk);
  const { install, args } = launchArguments({ plan, mode, repository, profile, extensionsDirectory, workspace: workspacePath, vsix });
  const checked = assertLaunchArguments({ mode, args, install });
  if (mode === 'packed-vsix-install' && !fs.existsSync(vsix)) {
    throw new Error(`The packed VSIX artifact is missing: ${vsix}`);
  }
  const files = desktopLaunchPlan({ plan, runtime, mode, args, install });
  const preload = fileURLToPath(new URL('./desktop-native-preload.cjs', import.meta.url));
  const testFile = path.join(repository, plan.extension.testDriver);
  const environment = {
    HARNESS_NONCE: nonce,
    GTS_VSCODE_REPORT: path.join(directory, 'report.json'),
    GTS_VSCODE_CYCLES: String(rounds),
    GTS_VSCODE_TARGET: targetFile,
    GTS_VSCODE_MEMORY_PRELOAD: preload,
    GTS_DESKTOP_NATIVE_DIRECTORY: path.join(directory, 'native'),
    TSGO_PROFILE: '1',
    TNB_TRACE_RPC: '1',
    TNB_TRACE_RPC_FILE: path.join(directory, 'tnb-rpc.log'),
  };
  const record = {
    runNonce: nonce, mode, runtime, executable: runtime.executable,
    executableSha256: sha256(fs.readFileSync(runtime.executable)),
    args, installArgs: install, install: null, command: null,
    developmentPath: checked.developmentPath, installExtension: checked.installExtension,
    installExtensionFile: vsix,
    installExtensionSha256: mode === 'packed-vsix-install' ? sha256(fs.readFileSync(vsix)) : null,
    profile, extensionsDirectory, workspacePath, repository, targetFile, rounds, tsdk, preload,
    preloadSha256: sha256(fs.readFileSync(preload)),
    testFile, testSha256: sha256(fs.readFileSync(testFile)),
    display: runtime.platform === 'linux' ? process.env.DISPLAY ?? null : null,
    inheritedGodebug: process.env.GODEBUG ?? null,
    timeoutMs: files.timeoutMs, environment,
    startedAtMs: Date.now(),
  };
  try {
    if (files.install) {
      record.install = await core.execute({
        executable: files.install.executable, args: files.install.args, cwd: repository,
        directory, label: 'desktop-install', timeoutMs: files.timeoutMs,
        limitBytes: contract.policy.reportLimitBytes, env: environment,
      });
    }
    record.command = await core.execute({
      executable: files.launch.executable, args: files.launch.args, cwd: repository,
      directory, label: 'desktop', timeoutMs: files.timeoutMs,
      limitBytes: contract.policy.reportLimitBytes, env: environment,
    });
  } finally {
    // Runs on success, failure and timeout alike. On Linux it finds the whole
    // launch by its isolated directories and proves it is gone; on Windows it
    // records that the sealed job object owns that termination.
    record.cleanup = await cleanupLaunchTree({ profile, extensionsDirectory, platform: runtime.platform });
  }
  record.completedAtMs = Date.now();
  record.logs = files.logFiles.map(file => ({
    file, sha256: fs.existsSync(path.join(directory, file)) ? sha256(fs.readFileSync(path.join(directory, file))) : null,
  }));
  fs.writeFileSync(path.join(directory, 'desktop-launch.json'), `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx', flush: true });
  if (core.processVerdict(record.command) !== 'PASS') {
    throw new Error(`The VS Code ${mode} launch failed: ${JSON.stringify({
      exitCode: record.command.exitCode, signal: record.command.signal, reason: record.command.reason,
    })}`);
  }
  if (record.logs.some(log => log.sha256 === null)) throw new Error('The VS Code launch is missing an expected raw log');
  return record;
}

