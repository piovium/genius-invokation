import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { startExperimentServer } from "./helpers.mjs";
import { runAuthExperiments } from "./auth.mjs";
import { runAckExperiments } from "./ack.mjs";
import { runAdapterExperiments } from "./adapter.mjs";

const repository = fileURLToPath(new URL("../../../", import.meta.url));
const { values } = parseArgs({ options: { output: { type: "string" }, help: { type: "boolean" } } });
if (values.help) {
  console.log("node scripts/server-harness/experiments/run.mjs [--output <report.json>]\nRequires Node 24+ and the isolated ws dependency. Missing Node or any failed case exits 1; no mocked fallback.");
  process.exit(0);
}
const output = resolve(repository, values.output ?? "temp/server-harness/experiments/report.json");
const report = {
  schemaVersion: 1, kind: "real-websocket-protocol-experiment", startedAt: new Date().toISOString(),
  platform: process.platform, architecture: process.arch, clientRuntime: process.version,
  framing: { gamePayload: "binary protobuf", controlMessages: "JSON", envelopeVersion: 1 },
  productionMigrated: false, productionMemoryVerified: false, results: {}, errors: [],
};
let server;
try {
  server = await startExperimentServer();
  report.serverRuntime = server.runtime;
  for (const [name, run] of [["authentication", runAuthExperiments], ["acknowledgement", runAckExperiments], ["harnessAdapter", runAdapterExperiments]]) {
    console.log(`[experiment] ${name}`);
    report.results[name] = await run(server);
  }
} catch (error) { report.errors.push(error.message); }
finally { if (server) await server.stop().catch((error) => report.errors.push(error.message)); }

try {
  report.revision = process.env.HARNESS_REVISION || execFileSync("git", ["rev-parse", "HEAD"], { cwd: repository, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch { report.revision = null; }
const sourceHash = createHash("sha256");
async function fingerprint(path) {
  for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory()) await fingerprint(resolve(path, entry.name));
    else if (/\.(mjs|json)$/.test(entry.name)) {
      sourceHash.update(resolve(path, entry.name).slice(repository.length).replaceAll("\\", "/"));
      sourceHash.update((await readFile(resolve(path, entry.name), "utf8")).replaceAll("\r\n", "\n"));
    }
  }
}
await fingerprint(resolve(repository, "scripts/server-harness"));
report.harnessSourceSha256 = sourceHash.digest("hex");
report.caseCount = Object.values(report.results).reduce((count, result) => count + result.cases.length, 0);
report.passed = report.errors.length === 0 && Object.keys(report.results).length === 3 && Object.values(report.results).every((result) => result.passed && result.cases.length > 0);
report.finishedAt = new Date().toISOString();
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(`[experiment] ${report.passed ? "passed" : "failed"}: ${report.caseCount} cases; ${output}`);
process.exitCode = report.passed ? 0 : 1;
