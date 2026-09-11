// Real VS Code launch planning and execution for the two measured modes.
//
// development path: the checkout's `packages/vscode` extension is loaded with
//   `--extensionDevelopmentPath`, so it is deliberately not installed.
// packed VSIX install: a real `.vsix` is installed with `--install-extension`
//   into an isolated `--extensions-dir` + `--user-data-dir`, and the installed
//   directory is then handed to the editor as `--extensionDevelopmentPath`.
//
// That last step is not optional. VS Code runs an extension test driver only
// when the environment carries both `extensionDevelopmentLocationURI` and
// `extensionTestsLocationURI`, and the first can only come from
// `--extensionDevelopmentPath`; a launch that installs without naming a
// development path therefore never starts the driver at all. Naming the
// installed directory keeps the measured code the VSIX's own bytes, because
// the collector proves the installed tree equals the archive before launching.
//
// The install runs the editor's CLI entry rather than the app binary: the
// binary ignores `--install-extension` and merely opens a window.
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
import { installedExtensionDirectory } from './desktop-vsix.mjs';

const launchTimeoutMs = 900000;

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function desktopRuntime({ root, plan, platform = process.platform, arch = process.arch }) {
  const template = plan.runtime[platform];
  const cliTemplate = plan.runtime.cliEntry?.[platform];
  if (!template || !cliTemplate) throw new Error(`Unsupported desktop platform ${platform}-${arch}`);
  const resolve = (name, value) => {
    const relative = value.replace('{arch}', arch);
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) throw new Error(`Missing prepared VS Code ${name}: ${relative}`);
    return { relative, absolute };
  };
  const executable = resolve('runtime', template);
  const cli = resolve('CLI entry', cliTemplate);
  return { platform, arch, version: plan.runtime.version,
    relative: executable.relative, executable: executable.absolute,
    cliRelative: cli.relative, cliExecutable: cli.absolute };
}

/** The launch arguments, assembled from the sealed plan's per-mode rules. */
export function launchArguments({ plan, mode, repository, profile, extensionsDirectory, workspace, vsix, installedExtension = null }) {
  if (!plan.launchModes[mode]) throw new Error(`Unknown desktop launch mode ${mode}`);
  if (mode !== 'development-path' && !installedExtension) {
    throw new Error(`The ${mode} launch needs the directory the editor installed into`);
  }
  const common = ['--new-window', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes',
    '--user-data-dir', profile, '--extensions-dir', extensionsDirectory,
    '--extensionTestsPath', path.join(repository, plan.extension.testDriver)];
  const modeArgs = mode === 'development-path'
    ? ['--disable-extensions', '--extensionDevelopmentPath', path.join(repository, plan.extension.developmentPath)]
    : ['--extensionDevelopmentPath', installedExtension];
  return { install: installArguments({ plan, mode, profile, extensionsDirectory, vsix }),
    args: [...common, ...modeArgs, workspace] };
}

/** The separate install invocation, or null for the mode that installs nothing. */
export function installArguments({ plan, mode, profile, extensionsDirectory, vsix }) {
  if (!plan.launchModes[mode]?.installArgs) return null;
  return ['--install-extension', vsix, '--extensions-dir', extensionsDirectory, '--user-data-dir', profile];
}

export function extensionDevelopmentPathOf(args) {
  const at = args.indexOf('--extensionDevelopmentPath');
  return at < 0 ? null : args[at + 1] ?? '';
}
export function installExtensionOf(args) {
  const at = args.indexOf('--install-extension');
  return at < 0 ? null : args[at + 1] ?? '';
}

/** Every flag an argument vector carries must be declared, and none forbidden. */
function assertArgumentNames({ mode, args, allowed, required, forbidden }) {
  for (const token of args) {
    if (token.startsWith('--') && !allowed.has(token)) {
      throw new Error(`The ${mode} launch carries an undeclared argument ${token}`);
    }
  }
  for (const token of required) {
    if (!args.includes(token)) throw new Error(`The ${mode} launch must carry ${token}`);
  }
  for (const token of forbidden) {
    if (args.includes(token)) throw new Error(`The ${mode} launch must not carry ${token}`);
  }
}

/** The install step's own arguments: present exactly for the mode that installs. */
export function assertInstallArguments({ plan, mode, install }) {
  const rules = plan.launchModes[mode];
  if (!rules) throw new Error(`Unknown desktop launch mode ${mode}`);
  if (!rules.installArgs) {
    if (install) throw new Error(`The ${mode} mode must not install an extension`);
    return null;
  }
  if (!install) throw new Error(`The ${mode} mode must install a real .vsix`);
  assertArgumentNames({ mode, args: install, allowed: new Set(rules.installArgs),
    required: rules.installArgs, forbidden: [] });
  const installExtension = installExtensionOf(install);
  if (!installExtension) throw new Error(`The ${mode} mode must install a real .vsix`);
  return installExtension;
}

/**
 * The one place that decides which arguments each mode must and must not
 * carry. Both the collector and the validator apply it independently, and both
 * read the sealed plan instead of keeping a second copy of its rules.
 */
export function assertLaunchArguments({ plan, mode, args, install }) {
  const rules = plan.launchModes[mode];
  if (!rules) throw new Error(`Unknown desktop launch mode ${mode}`);
  assertArgumentNames({ mode, args, allowed: new Set([...plan.commonArgs, ...rules.args]),
    required: [...plan.commonArgs, ...rules.args], forbidden: rules.forbiddenArgs ?? [] });
  return { developmentPath: extensionDevelopmentPathOf(args),
    installExtension: assertInstallArguments({ plan, mode, install }) };
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
  if (mode === 'packed-vsix-install' && !fs.existsSync(vsix)) {
    throw new Error(`The packed VSIX artifact is missing: ${vsix}`);
  }
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
    cliExecutable: runtime.cliExecutable, cliExecutableSha256: sha256(fs.readFileSync(runtime.cliExecutable)),
    args: null, installArgs: null, install: null, command: null,
    developmentPath: null, installExtension: null, installedExtensionPath: null,
    installExtensionFile: vsix,
    installExtensionSha256: mode === 'packed-vsix-install' ? sha256(fs.readFileSync(vsix)) : null,
    profile, extensionsDirectory, workspacePath, repository, targetFile, rounds, tsdk, preload,
    preloadSha256: sha256(fs.readFileSync(preload)),
    testFile, testSha256: sha256(fs.readFileSync(testFile)),
    display: runtime.platform === 'linux' ? process.env.DISPLAY ?? null : null,
    inheritedGodebug: process.env.GODEBUG ?? null,
    timeoutMs: launchTimeoutMs, environment,
    startedAtMs: Date.now(),
  };
  try {
    record.installArgs = installArguments({ plan, mode, profile, extensionsDirectory, vsix });
    // The install runs first because its result names the directory the editor
    // must then load: the packed mode measures the installed bytes, not the
    // checkout, and VS Code refuses to start a test driver without a
    // development path.
    assertInstallArguments({ plan, mode, install: record.installArgs });
    if (record.installArgs) {
      record.install = await core.execute({
        executable: runtime.cliExecutable, args: record.installArgs, cwd: repository,
        directory, label: 'desktop-install', timeoutMs: launchTimeoutMs,
        limitBytes: contract.policy.reportLimitBytes,
        env: { ...environment, ELECTRON_RUN_AS_NODE: '1' },
      });
      if (core.processVerdict(record.install) !== 'PASS') {
        throw new Error(`The packed VSIX install failed: ${JSON.stringify({
          exitCode: record.install.exitCode, signal: record.install.signal, reason: record.install.reason })}`);
      }
      record.installedExtensionPath = installedExtensionDirectory({ extensionsDirectory, plan }).directory;
    }
    const { args } = launchArguments({ plan, mode, repository, profile, extensionsDirectory,
      workspace: workspacePath, vsix, installedExtension: record.installedExtensionPath });
    const checked = assertLaunchArguments({ plan, mode, args, install: record.installArgs });
    record.args = args;
    record.developmentPath = checked.developmentPath;
    record.installExtension = checked.installExtension;
    record.command = await core.execute({
      executable: runtime.executable, args, cwd: repository,
      directory, label: 'desktop', timeoutMs: launchTimeoutMs,
      limitBytes: contract.policy.reportLimitBytes, env: environment,
    });
  } finally {
    // Runs on success, failure and timeout alike. On Linux it finds the whole
    // launch by its isolated directories and proves it is gone; on Windows it
    // records that the sealed job object owns that termination.
    record.cleanup = await cleanupLaunchTree({ profile, extensionsDirectory, platform: runtime.platform });
  }
  record.completedAtMs = Date.now();
  record.logs = plan.logFiles.map(file => ({
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
