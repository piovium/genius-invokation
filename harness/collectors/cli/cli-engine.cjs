// Observation only: keep compiler calls and their return values unchanged.
const fs = require('node:fs');
// Volar temporarily virtualizes fs.readFileSync while compiling tsc. Artifact
// identity must hash disk bytes; compiledSha256 separately records that input.
const readDiskFile = fs.readFileSync.bind(fs);
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const directory = process.env.HARNESS_CLI_OBSERVATIONS;
if (!directory) throw new Error('Missing native CLI observation directory');
fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, `${process.pid}.jsonl`);
const event = value => fs.appendFileSync(file, `${JSON.stringify({ at: Date.now(), pid: process.pid,
  runNonce: process.env.HARNESS_NONCE, gateId: process.env.HARNESS_GATE, ...value })}\n`);
const artifact = file => ({ path: fs.realpathSync.native(file),
  sha256: crypto.createHash('sha256').update(readDiskFile(file)).digest('hex') });
event({ kind: 'start', parentPid: process.ppid, executable: artifact(process.execPath), argv: process.argv, execArgv: process.execArgv, cwd: process.cwd() });
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  const result = originalLoad.apply(this, arguments);
  if (/bridge\.node$/.test(request)) {
    event({ kind: 'native', module: artifact(Module._resolveFilename(request, parent, main)), parent: artifact(parent.filename) });
  }
  return result;
};
const originalCompile = Module.prototype._compile;
Module.prototype._compile = function(content, filename) {
  if (/(?:^|[\\/])lib[\\/](?:typescript|_?tsc)\.js$/.test(filename)) {
    event({ kind: 'compiler', module: artifact(filename), compiledSha256: crypto.createHash('sha256').update(content).digest('hex') });
  }
  return originalCompile.apply(this, arguments);
};
process.on('exit', code => event({ kind: 'exit', code }));
