import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { main, validateTrace } from "../probes/session-evidence.mjs";

// Synthetic parser fixtures only. They never constitute real execution receipts.
const nonce = "synthetic-unit-test-not-production-evidence";
const tnbVersion = "6.0.3-bridge.16.tsgo.7.0.2";
const sha = (text) => createHash("sha256").update(text).digest("hex");
const range = (line, start, end) => ({ start: { line, character: start }, end: { line, character: end } });
const validText = "export function double(value: number) { return value * 2; }\nexport const answer: number = double(1);\n";
const badText = validText.replace("double(1)", 'double("wrong")');

function session(id, route, start = 0, rounds = 2) {
  const uri = `file:///workspace/example.${route === "tsserver" ? "ts" : "gts"}`;
  const fixture = {
    uri, validText, badText,
    diagnostic: { code: 2345, messageIncludes: "not assignable", range: range(1, 36, 43) },
    features: {
      hover: "double(value: number): number", completion: "double", signature: "double(value: number): number",
      definition: { uri, range: range(0, 16, 22), sourceText: validText },
    },
  };
  const identity = route === "browser-local" ? {
    packageName: "typescript", packageVersion: "6.0.3", sdkPath: "https://cdn.jsdelivr.net/npm/typescript@6.0.3/lib", checker: "typescript-js",
  } : {
    packageName: "typescript-native-bridge", packageVersion: "6.0.3-bridge.16.tsgo.7.0.2", sdkPath: "C:/fixture/node_modules/typescript/lib", checker: "tsgo",
    nativeLibraryPath: "C:/fixture/node_modules/typescript/lib/bridge.node", nativeLoadLog: "TNB ACTIVE — typescript is the tsgo-backed fork",
  };
  const observations = [];
  let version = 0;
  const emit = (value) => observations.push({ sessionId: id, sequence: observations.length + 1, atMs: start + observations.length + 1, uri, version, ...value });
  const phase = (cycle, phase) => {
    version++;
    emit({ kind: "source", text: phase === "bad" ? badText : validText, phase, cycle, origin: cycle === "external" ? "filesystem" : phase === "valid" ? "open" : "editor" });
    emit({ kind: "diagnostics", requestId: `diagnostic-${version}`, response: phase === "bad" ? [
      { code: 2345, message: "Argument of type string is not assignable to parameter of type number.", severity: 1, range: range(1, 36, 43) },
    ] : [] });
    if (phase === "bad") return;
    const responses = {
      hover: { contents: { kind: "markdown", value: "function double(value: number): number" } },
      definition: [{ uri, range: range(0, 16, 22) }],
      completion: { isIncomplete: false, items: [{ label: "double", kind: 3 }] },
      signature: { signatures: [{ label: "double(value: number): number" }], activeSignature: 0 },
    };
    for (const [feature, response] of Object.entries(responses)) {
      emit({ kind: "feature", feature, requestId: `${feature}-${version}`, position: { line: 1, character: 31 }, response });
    }
  };
  for (const p of ["valid", "bad", "restored"]) phase("initial", p);
  if (route === "gts-lsp" || route === "tsserver") {
    for (const cycle of ["external", ...Array.from({ length: rounds }, (_, i) => i + 1)]) {
      phase(cycle, "bad"); phase(cycle, "restored");
    }
  }
  return { id, route, identity, fixtureId: route === "tsserver" ? "ts-example" : "gts-example", fixture, observations };
}

function snapshot(session) {
  const source = session.observations.filter((o) => o.kind === "source").at(-1);
  return { uri: source.uri, version: source.version, text: source.text, sha256: sha(source.text) };
}

function webTrace() {
  const a = session("local-1", "browser-local", 0);
  const b = session("backend-1", "backend-tnb", 30);
  const c = session("backend-2", "backend-tnb", 60);
  const d = session("local-2", "browser-local", 100);
  a.closedAtMs = 20; b.closedAtMs = 50; c.closedAtMs = 90;
  const change = (from, to, startedAtMs, readyAtMs) => ({
    fromSessionId: from.id, toSessionId: to.id, startedAtMs, readyAtMs,
    before: snapshot(from), after: snapshot(to),
    retired: {
      clientStoppedAtMs: from.closedAtMs,
      [from.route === "browser-local" ? "workerTerminatedAtMs" : "socketClosedAtMs"]: from.closedAtMs,
      diagnosticsAfterStop: [],
    },
    diagnostics: { ownerSessionId: to.id, uri: to.fixture.uri, version: snapshot(to).version, response: [] },
  });
  return {
    schemaVersion: 1, case: "web", runNonce: nonce, problems: [], sessions: [a, b, c, d],
    switches: [change(a, b, 15, 45), change(c, d, 85, 115)],
    outages: [{
      sessionId: b.id, disconnectedAtMs: 50, source: snapshot(b),
      observations: [51, 59].map((atMs) => ({ atMs, sessionId: b.id, activeRoute: "backend-tnb", visibleError: "检查服务连接已断开，请重试。", sourceSha256: sha(validText) })),
      reconnectedSessionId: c.id, reconnectedAtMs: 80, reconnectedSource: snapshot(c),
    }],
  };
}

function desktopTrace(rounds = 2) {
  return { schemaVersion: 1, case: "desktop", runNonce: nonce, problems: [], sessions: [session("gts-1", "gts-lsp", 0, rounds), session("ts-1", "tsserver", 0, rounds)] };
}

function memoryTrace() {
  return {
    schemaVersion: 1, case: "memory", runNonce: nonce, problems: [], memory: {
      runs: ["baseline", "candidate"].map((label) => ({
        label, sourceFingerprint: sha(validText), command: "pnpm --filter @gi-tcg/data check", exitCode: 0, completedAtMs: 30, stderr: "",
        measurement: { tool: "synthetic measurement fixture", totalMemoryKind: "working-set", unit: "bytes", intervalMs: 10, limitations: "Sampling can miss peaks between observations.", processCoverage: "entire-checker-process-tree" },
        processes: [{ pid: 42, name: "node gtsc", runtime: "v8", parentPid: null, startedAtMs: 0, endedAtMs: 30 }],
        samples: [0, 10, 20].map((atMs) => ({ atMs, processes: [{ pid: 42, totalBytes: label === "baseline" ? 10000 : 7000, jsHeapUsedBytes: label === "baseline" ? 5000 : 2000 }] })),
      })),
    },
  };
}

function expectationsFor(caseName) {
  if (caseName === "memory") return { schemaVersion: 1, case: caseName, command: "pnpm --filter @gi-tcg/data check", totalMemoryKind: "working-set" };
  const fixtures = [{ id: "gts-example", routes: caseName === "web" ? ["browser-local", "backend-tnb"] : ["gts-lsp"], fixture: session("fixture-only", "gts-lsp").fixture }];
  if (caseName === "desktop") fixtures.push({ id: "ts-example", routes: ["tsserver"], fixture: session("fixture-only", "tsserver").fixture });
  return { schemaVersion: 1, case: caseName, fixtures };
}
const validate = (trace, options = {}) => validateTrace(trace, trace.case, { rounds: 2, nonce, tnbVersion, expectations: expectationsFor(trace.case), ...options });
const fail = (trace, pattern) => {
  const result = validate(trace);
  assert.equal(result.status, "FAIL", JSON.stringify(result));
  if (pattern) assert.match(result.details.join("\n"), pattern);
};

test("complete desktop observations validate both services, filesystem edits and explicit edit rounds", () => {
  const result = validate(desktopTrace());
  assert.equal(result.status, "PASS", JSON.stringify(result));
  assert.match(result.verification, /trace-semantics-only/);
  assert.equal(result.metrics.editRoundsPerService, 2);
});

test("default desktop gate requires 100 real cycles; summary counter cannot replace them", () => {
  assert.equal(validateTrace(desktopTrace(), "desktop", { tnbVersion, expectations: expectationsFor("desktop") }).status, "FAIL");
  const trace = desktopTrace(); trace.sessions[0].passedRounds = 100;
  fail(trace, /unknown field passedRounds/);
  assert.equal(validateTrace(desktopTrace(100), "desktop", { tnbVersion, expectations: expectationsFor("desktop") }).status, "PASS");
});

test("complete web observations validate both routes, both switches, outage and reconnect", () => {
  const result = validate(webTrace());
  assert.equal(result.status, "PASS", JSON.stringify(result));
});

test("missing required browser route cannot pass", () => {
  const trace = webTrace(); trace.sessions = trace.sessions.filter((s) => s.route !== "browser-local");
  fail(trace, /missing required route browser-local/);
});

test("stale document diagnostics cannot count as successful checking", () => {
  const trace = desktopTrace(); trace.sessions[0].observations.find((o) => o.kind === "diagnostics").version = 0;
  fail(trace, /stale document/);
});

test("empty completion is not evidence of a working language service", () => {
  const trace = webTrace(); trace.sessions[1].observations.find((o) => o.feature === "completion").response.items = [];
  fail(trace, /empty\/incorrect\/generated completion/);
});

test("stock TypeScript cannot pretend to be TNB by setting a checker label", () => {
  const trace = desktopTrace(); trace.sessions[0].identity.packageName = "typescript"; trace.sessions[0].identity.packageVersion = "6.0.3";
  fail(trace, /expected TNB\/tsgo/);
});

test("missing activation/native library evidence cannot count as TNB", () => {
  const trace = webTrace(); delete trace.sessions[1].identity.nativeLibraryPath;
  fail(trace, /native library observation/);
});

test("source loss on switch fails even if altered text has a fresh matching hash", () => {
  const trace = webTrace(); trace.switches[0].after.text = "lost"; trace.switches[0].after.sha256 = sha("lost");
  fail(trace, /source lost/);
});

test("backend outage cannot silently switch to browser route", () => {
  const trace = webTrace(); trace.outages[0].observations[1].activeRoute = "browser-local";
  fail(trace, /silent route fallback/);
});

test("undisposed worker and stale markers are failures", () => {
  const trace = webTrace(); delete trace.switches[0].retired.workerTerminatedAtMs;
  trace.switches[0].retired.diagnosticsAfterStop.push({ message: "stale" });
  fail(trace, /old worker\/socket was not disposed/);
});

test("empty bad diagnostics and wrong error spans cannot pass", () => {
  for (const mutation of [
    (o) => { o.response = []; },
    (o) => { o.response[0].range.end.character--; },
  ]) {
    const trace = desktopTrace(); mutation(trace.sessions[0].observations.find((o) => o.kind === "diagnostics" && o.response.length));
    fail(trace, /exact source span/);
  }
});

test("duplicate session and request identities are rejected", () => {
  const trace = webTrace(); trace.sessions[1].id = trace.sessions[0].id;
  fail(trace, /duplicate session identity/);
  const trace2 = desktopTrace(); trace2.sessions[0].observations.find((o) => o.feature === "hover").requestId = "diagnostic-1";
  fail(trace2, /duplicate request identity/);
});

test("unknown observations and explicit timeout/panic observations fail", () => {
  for (const kind of ["pass", "timeout", "panic"]) {
    const trace = desktopTrace(); trace.sessions[0].observations[0].kind = kind;
    fail(trace, /unknown\/error\/panic\/timeout/);
  }
});

test("pass-only summary is rejected", () => {
  const result = validateTrace({ status: "PASS", passed: 100 }, "desktop");
  assert.equal(result.status, "FAIL"); assert.match(result.details.join("\n"), /unknown field status/);
});

test("memory requires measured JS heap and process totals with comparable sources", () => {
  const result = validate(memoryTrace());
  assert.equal(result.status, "PASS", JSON.stringify(result));
  assert.equal(result.metrics.comparison.totalBytesSaved, 3000);
  const trace = memoryTrace(); delete trace.memory.runs[1].samples[0].processes[0].jsHeapUsedBytes;
  fail(trace, /jsHeapUsedBytes/);
});

test("memory covers every process and rejects omitted native child memory", () => {
  const trace = memoryTrace(); trace.memory.runs[1].processes.push({ pid: 43, parentPid: 42, name: "native checker child", runtime: "native", startedAtMs: 0, endedAtMs: 30 });
  fail(trace, /live process 43 omitted/);
});

test("memory rejects impossible process lifetimes and cyclic process ancestry", () => {
  const trace = memoryTrace(); trace.memory.runs[0].processes[0].startedAtMs = 1;
  fail(trace, /outside observed process lifetime/);
  const trace2 = memoryTrace(); trace2.memory.runs[0].processes[0].parentPid = 42;
  fail(trace2, /cyclic process ancestry/);
});

test("unavailable measurement blocks and never becomes zero-memory success", () => {
  const trace = memoryTrace(); trace.memory.runs[1].samples[1].processes[0].totalBytes = { unavailable: "sampler access denied" };
  const result = validate(trace);
  assert.equal(result.status, "BLOCKED", JSON.stringify(result)); assert.match(result.details.join("\n"), /sampler access denied/);
});

test("memory rejects process failures, gaps and incomplete metric units", () => {
  const trace = memoryTrace(); trace.memory.runs[1].stderr = "panic: invalid memory address";
  fail(trace, /panic\/OOM\/timeout/);
  const trace2 = memoryTrace(); trace2.memory.runs[1].measurement.unit = "MiB";
  fail(trace2, /must use bytes/);
  const trace3 = memoryTrace(); trace3.memory.runs[1].measurement.intervalMs = 1;
  fail(trace3, /sample gap/);
});

test("memory has no invented 4 GiB ceiling or unapproved percentage threshold", () => {
  const trace = memoryTrace(); for (const run of trace.memory.runs) for (const sample of run.samples) sample.processes[0].totalBytes = 8 * 1024 ** 3;
  assert.equal(validate(trace).status, "PASS");
});

test("allocated JS heap can exceed resident bytes on a paged process", () => {
  const trace = memoryTrace(); trace.memory.runs[0].samples[0].processes[0].jsHeapUsedBytes = 11000;
  assert.equal(validate(trace).status, "PASS");
});

test("a previous run nonce is rejected", () => {
  const trace = webTrace(); trace.runNonce = "previous-run";
  fail(trace, /nonce does not match/);
});

test("missing external approval and pin block instead of trusting trace-provided expectations", () => {
  assert.equal(validateTrace(webTrace(), "web", { tnbVersion }).status, "BLOCKED");
  assert.equal(validateTrace(webTrace(), "web", { expectations: expectationsFor("web") }).status, "BLOCKED");
  const trace = webTrace(); trace.sessions[0].fixture.features.completion = "invented";
  trace.sessions[0].observations.filter((o) => o.feature === "completion").forEach((o) => { o.response.items = [{ label: "invented" }]; });
  fail(trace, /separately approved source/);
  const trace2 = desktopTrace(); trace2.sessions[0].identity.packageVersion = "6.0.3-bridge.15.tsgo.7.0.2";
  fail(trace2, /exact contract pin/);
});

test("fixture comparison preserves semantics when JSON object keys are reordered", () => {
  const trace = webTrace(); trace.sessions[0].fixture = Object.fromEntries(Object.entries(trace.sessions[0].fixture).reverse());
  assert.equal(validate(trace).status, "PASS");
});

test("CLI reports missing inputs as BLOCKED and malformed JSON as FAIL", async () => {
  assert.equal((await main(["--case", "web"])).status, "BLOCKED");
  assert.equal((await main(["--case", "web", "--input", "does-not-exist.trace.json"])).status, "BLOCKED");
  const dir = await mkdtemp(join(tmpdir(), "gts-trace-test-"));
  try {
    const input = join(dir, "trace.json");
    await writeFile(input, "{broken json");
    const probe = fileURLToPath(new URL("../probes/session-evidence.mjs", import.meta.url));
    const invalid = spawnSync(process.execPath, [probe, "--input", input, "--case", "web"], { encoding: "utf8" });
    assert.equal(invalid.status, 1); assert.equal(JSON.parse(invalid.stdout).status, "FAIL");
    await writeFile(input, JSON.stringify(memoryTrace()));
    const approved = join(dir, "approved.json");
    await writeFile(approved, JSON.stringify(expectationsFor("memory")));
    const success = spawnSync(process.execPath, [probe, "--input", input, "--case", "memory", "--nonce", nonce, "--expectations", approved], { encoding: "utf8" });
    assert.equal(success.status, 0, success.stdout); assert.equal(JSON.parse(success.stdout).status, "PASS");
    const missing = spawnSync(process.execPath, [probe, "--case", "web"], { encoding: "utf8" });
    assert.equal(missing.status, 2); assert.equal(JSON.parse(missing.stdout).status, "BLOCKED");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("malformed trace structures are reported rather than accepted", async () => {
  const dir = await mkdtemp(join(tmpdir(), "gts-malformed-trace-test-"));
  try {
    const input = join(dir, "trace.json");
    const approved = join(dir, "approved.json");
    await writeFile(approved, JSON.stringify(expectationsFor("web")));
    for (const trace of [null, [], { schemaVersion: 1, case: "web", runNonce: nonce, problems: [], sessions: [null, {}] }]) {
      await writeFile(input, JSON.stringify(trace));
      assert.equal((await main(["--input", input, "--case", "web", "--expectations", approved, "--tnb-version", tnbVersion])).status, "FAIL");
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
