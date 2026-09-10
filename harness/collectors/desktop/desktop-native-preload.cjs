// Passive observation of the real Electron language-service processes.
//
// The extension test driver `--require`s this file into every process whose
// entry point is `server.js` or `tsserver.js`. It loads no SDK and fabricates
// nothing: it records the process identity, the compiler the service actually
// loaded, the native addon it dlopen'd, raw stdout/stderr, the IPC it exchanged
// and the TNB RPC counters the pin exposes.
//
// One file per operating-system process. A restarted process writes a second
// `process` row into the same file, which the reader rejects on purpose.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isMainThread } = require('node:worker_threads');

if (isMainThread && process.env.GTS_DESKTOP_NATIVE_DIRECTORY) {
  const directory = process.env.GTS_DESKTOP_NATIVE_DIRECTORY;
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, `desktop-native-${process.pid}.jsonl`);
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const record = (kind, detail) => fs.appendFileSync(target, `${JSON.stringify({
    schemaVersion: 1, runNonce: process.env.HARNESS_NONCE, pid: process.pid,
    ppid: process.ppid, atMs: Date.now(), kind, detail,
  })}\n`);

  record('process', {
    argv: process.argv, execArgv: process.execArgv, cwd: process.cwd(), execPath: process.execPath,
    preload: __filename, preloadSha256: hash(__filename), platform: process.platform,
    nodeVersion: process.versions.node, electronVersion: process.versions.electron,
    godebug: process.env.GODEBUG ?? null, tnbGodebugReexec: process.env.TNB_GODEBUG_REEXEC ?? null,
  });

  // Observe TNB's product bootstrap without changing its argv, environment,
  // descriptors, result or parent/child lifetime.
  const childProcess = require('node:child_process');
  const spawnSync = childProcess.spawnSync;
  childProcess.spawnSync = function (executable, args, options) {
    record('spawn-sync-start', {
      executable, args, godebug: options?.env?.GODEBUG ?? null,
      tnbGodebugReexec: options?.env?.TNB_GODEBUG_REEXEC ?? null, channelFd: options?.env?.NODE_CHANNEL_FD ?? null,
    });
    const result = spawnSync.apply(this, arguments);
    record('spawn-sync-end', {
      pid: result.pid, status: result.status, signal: result.signal,
      error: result.error ? String(result.error) : null,
    });
    return result;
  };

  let sdk, identity;
  function sample() {
    sdk ??= Object.values(require.cache).find(module => /[\\/]lib[\\/]typescript\.js$/.test(module.filename)
      && typeof module.exports?.getTsgoProfileStats === 'function');
    if (!sdk) return;
    const native = Object.values(require.cache).filter(module => /[\\/]bridge\.node$/.test(module.filename));
    if (!identity && native.length) {
      const manifestPath = path.resolve(path.dirname(sdk.filename), '../package.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      identity = {
        packageName: manifest.name, packageVersion: manifest.version,
        sdkPath: path.dirname(fs.realpathSync(sdk.filename)), modulePath: fs.realpathSync(sdk.filename),
        moduleSha256: hash(sdk.filename), manifestPath, manifestSha256: hash(manifestPath),
        exportedVersion: sdk.exports.version,
        native: native.map(module => ({ path: fs.realpathSync(module.filename), sha256: hash(module.filename) })),
      };
      record('identity', identity);
    }
    const stats = sdk.exports.getTsgoProfileStats();
    record('counters', {
      rpcCount: stats.rpcCount, queryCount: stats.queryCount, projectsLoaded: stats.projectsLoaded,
      rpcByMethod: [...(stats.rpcByMethod ?? new Map()).entries()],
    });
  }

  for (const [name, stream] of [['stdout', process.stdout], ['stderr', process.stderr]]) {
    const original = stream.write;
    stream.write = function (chunk, encoding) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      record(name, { base64: bytes.toString('base64') });
      const result = original.apply(this, arguments);
      sample();
      return result;
    };
  }

  const emit = process.emit;
  process.emit = function (name, ...args) {
    if (name === 'message') record('ipc-in', { message: args[0] });
    return emit.call(this, name, ...args);
  };
  if (process.send) {
    const send = process.send;
    process.send = function (message) {
      record('ipc-out', { message });
      const result = send.apply(this, arguments);
      sample();
      return result;
    };
  }

  setInterval(sample, 250).unref();
  process.once('exit', code => { sample(); record('exit', { code }); });
}
