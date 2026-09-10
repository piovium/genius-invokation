// Passive observation inside the actual GTS --stdio child. Never loads an SDK.
const fs = require('node:fs');
const readDiskFile = fs.readFileSync.bind(fs);
const path = require('node:path');
const crypto = require('node:crypto');
if (process.argv.includes('--stdio') && process.env.GTS_BROWSER_NATIVE_DIRECTORY) {
  const directory = process.env.GTS_BROWSER_NATIVE_DIRECTORY;
  const target = path.join(directory, `web-native-${process.pid}.jsonl`);
  const hash = file => crypto.createHash('sha256').update(readDiskFile(file)).digest('hex');
  const record = (kind, detail) => fs.appendFileSync(target, JSON.stringify({
    schemaVersion: 1, runNonce: process.env.HARNESS_NONCE, pid: process.pid,
    ppid: process.ppid, atMs: Date.now(), kind, detail,
  }) + '\n');
  record('process', { argv: process.argv, cwd: process.cwd(), execPath: process.execPath,
    preload: __filename, preloadSha256: hash(__filename), platform: process.platform });
  let sdk, identity;
  function sample() {
    sdk ??= Object.values(require.cache).find(module =>
      /[\\/]lib[\\/]typescript\.js$/.test(module.filename) &&
      typeof module.exports?.getTsgoProfileStats === 'function');
    if (!sdk) return;
    const native = Object.values(require.cache).filter(module => /[\\/]bridge\.node$/.test(module.filename));
    if (!identity && native.length) {
      const manifestPath = path.resolve(path.dirname(sdk.filename), '../package.json');
      const manifest = JSON.parse(readDiskFile(manifestPath, 'utf8'));
      identity = { packageName: manifest.name, packageVersion: manifest.version,
        sdkPath: path.dirname(fs.realpathSync(sdk.filename)), modulePath: fs.realpathSync(sdk.filename),
        moduleSha256: hash(sdk.filename), manifestPath, manifestSha256: hash(manifestPath),
        exportedVersion: sdk.exports.version,
        native: native.map(module => ({ path: fs.realpathSync(module.filename), sha256: hash(module.filename) })) };
      record('identity', identity);
    }
    const stats = sdk.exports.getTsgoProfileStats();
    record('counters', { rpcCount: stats.rpcCount, queryCount: stats.queryCount,
      projectsLoaded: stats.projectsLoaded,
      rpcByMethod: [...stats.rpcByMethod.entries()] });
  }
  for (const [name, stream] of [['stdout', process.stdout], ['stderr', process.stderr]]) {
    const original = stream.write;
    stream.write = function(chunk, encoding, callback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      record(name, { base64: bytes.toString('base64') });
      const result = original.apply(this, arguments);
      sample();
      return result;
    };
  }
  const emit = process.stdin.emit;
  process.stdin.emit = function(name, ...args) {
    if (name === 'data') record('stdin', { base64: Buffer.from(args[0]).toString('base64') });
    return emit.call(this, name, ...args);
  };
  setInterval(sample, 250).unref();
  process.once('exit', code => { sample(); record('exit', { code }); });
}
