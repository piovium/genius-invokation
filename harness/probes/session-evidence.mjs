#!/usr/bin/env node
/**
 * Validates observations produced by an approved real session collector.
 * This checks trace semantics only. A PASS is NOT execution provenance and
 * must be bound to the collector command, logs and source hashes by the runner.
 * See ../session-evidence.example.json for the complete schema and examples.
 */
import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROUTES = new Set(["gts-lsp", "tsserver", "browser-local", "backend-tnb"]);
const FEATURES = ["hover", "definition", "completion", "signature"];
const CASES = new Set(["desktop", "web", "memory"]);
export const EDIT_ROUNDS = 100;
const hash = (text) => createHash("sha256").update(text).digest("hex");
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const string = (value) => typeof value === "string" && value.trim().length > 0;
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export function validateTrace(trace, caseName, { rounds = EDIT_ROUNDS, nonce, tnbVersion, expectations } = {}) {
  const failures = [];
  const blocked = [];
  const metrics = {};
  const check = (ok, message) => { if (!ok) failures.push(message); return !!ok; };
  const unavailable = (value, location) => {
    if (object(value) && string(value.unavailable)) {
      blocked.push(`${location}: ${value.unavailable}`);
      return true;
    }
    return false;
  };
  const record = (value, at) => check(object(value), `${at}: expected an object`);
  const nonempty = (value, at) => check(string(value), `${at}: expected nonempty text`);
  const number = (value, at) => check(finite(value) && value >= 0, `${at}: expected a finite nonnegative number`);
  const array = (value, at, min = 0) => check(Array.isArray(value) && value.length >= min, `${at}: expected an array with at least ${min} observations`);
  const keys = (value, permitted, at) => {
    if (!object(value)) return;
    for (const key of Object.keys(value)) check(permitted.includes(key), `${at}: unknown field ${key}`);
  };
  const rangeValid = (range, text, at) => {
    if (!record(range, at) || typeof text !== "string") return false;
    keys(range, ["start", "end"], at);
    const lines = text.split(/\r\n|\n|\r/);
    let ok = true;
    for (const edge of ["start", "end"]) {
      const p = range[edge];
      if (!record(p, `${at}.${edge}`)) { ok = false; continue; }
      keys(p, ["line", "character"], `${at}.${edge}`);
      ok = check(integer(p.line) && integer(p.character) && p.line < lines.length && p.character <= lines[p.line]?.length,
        `${at}.${edge}: range is outside UTF-16 source coordinates`) && ok;
    }
    if (ok) ok = check(range.start.line < range.end.line || range.start.line === range.end.line && range.start.character <= range.end.character,
      `${at}: reversed range`);
    return ok;
  };
  const snapshot = (value, at) => {
    if (!record(value, at)) return false;
    keys(value, ["uri", "version", "text", "sha256"], at);
    return [nonempty(value.uri, `${at}.uri`), check(integer(value.version), `${at}: missing source version`),
      check(typeof value.text === "string", `${at}: missing source text`),
      check(typeof value.text === "string" && value.sha256 === hash(value.text), `${at}: source hash mismatch`)].every(Boolean);
  };
  const result = () => ({
    status: failures.length ? "FAIL" : blocked.length ? "BLOCKED" : "PASS",
    case: caseName,
    verification: "trace-semantics-only; execution provenance must be checked by the runner",
    details: [...failures, ...blocked],
    metrics,
  });

  if (!check(CASES.has(caseName), `unknown case ${String(caseName)}`) || !record(trace, "trace")) return result();
  if (unavailable(trace, "trace")) return result();
  keys(trace, ["schemaVersion", "case", "runNonce", "sessions", "switches", "outages", "memory", "problems"], "trace");
  check(trace.schemaVersion === 1, "trace: schemaVersion must be 1");
  check(trace.case === caseName, "trace: case does not match --case");
  nonempty(trace.runNonce, "trace.runNonce");
  if (nonce !== undefined) check(trace.runNonce === nonce, "trace: nonce does not match this collector run");
  if (!check(integer(rounds) && rounds >= 1, "rounds must be a positive integer")) return result();
  if (array(trace.problems, "trace.problems")) {
    check(trace.problems.length === 0, `trace contains runtime problems: ${JSON.stringify(trace.problems)}`);
  }
  if (!expectations) {
    blocked.push("Missing approved expectations: the runner must supply the separately reviewed and sealed fixture file.");
    return result();
  }
  if (!record(expectations, "expectations")) return result();
  check(expectations.schemaVersion === 1 && expectations.case === caseName, "expectations: wrong schema or case");
  keys(expectations, caseName === "memory" ? ["schemaVersion", "case", "command", "totalMemoryKind"] : ["schemaVersion", "case", "fixtures"], "expectations");
  const expectedFixtures = new Map();
  if (caseName !== "memory") {
    if (!string(tnbVersion)) {
      blocked.push("Missing expected TNB version: the runner must pass the exact contract pin, not a version inferred from this trace.");
      return result();
    }
    check(/^\d+\.\d+\.\d+-bridge\.\d+\.tsgo\./.test(tnbVersion), "expected TNB version is not an exact bridge pin");
    if (!array(expectations.fixtures, "expectations.fixtures", 1)) return result();
    for (const fixture of expectations.fixtures) {
      if (!record(fixture, "expectations.fixture")) continue;
      keys(fixture, ["id", "routes", "fixture"], "expectations.fixture");
      nonempty(fixture.id, "expectations.fixture.id");
      check(!expectedFixtures.has(fixture.id), "expectations: duplicate fixture ID");
      if (array(fixture.routes, "expectations.fixture.routes", 1)) {
        check(new Set(fixture.routes).size === fixture.routes.length && fixture.routes.every((route) => ROUTES.has(route)), "expectations: duplicate/unknown required route");
      }
      record(fixture.fixture, "expectations.fixture.fixture");
      expectedFixtures.set(fixture.id, fixture);
    }
  } else {
    nonempty(expectations.command, "expectations.command");
    check(["rss", "working-set"].includes(expectations.totalMemoryKind), "expectations: memory kind is not approved");
  }

  if (caseName === "memory") {
    check(trace.sessions === undefined && trace.switches === undefined && trace.outages === undefined, "memory: unexpected session/web observations");
    if (!record(trace.memory, "memory")) return result();
    if (unavailable(trace.memory, "memory")) return result();
    keys(trace.memory, ["runs"], "memory");
    if (!array(trace.memory.runs, "memory.runs", 2)) return result();
    const labels = new Set();
    let sourceFingerprint;
    let memoryKind;
    for (const [index, run] of trace.memory.runs.entries()) {
      const at = `memory.runs[${index}]`;
      if (!record(run, at)) continue;
      keys(run, ["label", "sourceFingerprint", "command", "measurement", "processes", "samples", "exitCode", "completedAtMs", "stderr"], at);
      check(["baseline", "candidate"].includes(run.label) && !labels.has(run.label), `${at}: expected unique baseline/candidate label`);
      labels.add(run.label);
      nonempty(run.command, `${at}.command`);
      check(run.command === expectations.command, `${at}: measured command differs from approved expectation`);
      check(/^[a-f0-9]{64}$/.test(run.sourceFingerprint ?? ""), `${at}: sourceFingerprint must be SHA-256`);
      sourceFingerprint ??= run.sourceFingerprint;
      check(sourceFingerprint === run.sourceFingerprint, `${at}: baseline and candidate source sets differ`);
      check(run.exitCode === 0, `${at}: measured command did not exit successfully`);
      number(run.completedAtMs, `${at}.completedAtMs`);
      check(typeof run.stderr === "string", `${at}: raw stderr is missing`);
      check(!/\bpanic:|heap out of memory|fatal error|allocation failed|timed?\s*out|timeout/i.test(run.stderr ?? ""), `${at}: panic/OOM/timeout in stderr`);
      if (!record(run.measurement, `${at}.measurement`)) continue;
      if (unavailable(run.measurement, `${at}.measurement`)) continue;
      keys(run.measurement, ["tool", "totalMemoryKind", "unit", "intervalMs", "limitations", "processCoverage"], `${at}.measurement`);
      nonempty(run.measurement.tool, `${at}.measurement.tool`);
      check(["rss", "working-set"].includes(run.measurement.totalMemoryKind), `${at}: total memory must be RSS or working-set`);
      check(run.measurement.totalMemoryKind === expectations.totalMemoryKind, `${at}: memory kind differs from approved expectation`);
      memoryKind ??= run.measurement.totalMemoryKind;
      check(memoryKind === run.measurement.totalMemoryKind, `${at}: incomparable total-memory measures`);
      check(run.measurement.unit === "bytes", `${at}: all memory observations must use bytes`);
      check(finite(run.measurement.intervalMs) && run.measurement.intervalMs > 0, `${at}: sampling interval is missing`);
      nonempty(run.measurement.limitations, `${at}.measurement.limitations`);
      check(run.measurement.processCoverage === "entire-checker-process-tree", `${at}: checker child/native processes must be included`);
      if (!array(run.processes, `${at}.processes`, 1) || !array(run.samples, `${at}.samples`, 2)) continue;
      const processes = new Map();
      for (const p of run.processes) {
        if (!record(p, `${at}.process`)) continue;
        keys(p, ["pid", "name", "runtime", "parentPid", "startedAtMs", "endedAtMs"], `${at}.process`);
        check(integer(p.pid) && p.pid > 0 && !processes.has(p.pid), `${at}: invalid or duplicate process ID`);
        nonempty(p.name, `${at}.process.name`);
        check(["v8", "native"].includes(p.runtime), `${at}: process runtime must identify V8/native`);
        check(p.parentPid === null || integer(p.parentPid), `${at}: parentPid is missing`);
        number(p.startedAtMs, `${at}.process.startedAtMs`);
        number(p.endedAtMs, `${at}.process.endedAtMs`);
        check(p.startedAtMs < p.endedAtMs && p.endedAtMs <= run.completedAtMs, `${at}: invalid process lifetime`);
        processes.set(p.pid, p);
      }
      check([...processes.values()].filter((p) => p.parentPid === null).length === 1, `${at}: expected one checker process-tree root`);
      check([...processes.values()].some((p) => p.runtime === "v8"), `${at}: no measured V8 host`);
      for (const p of processes.values()) check(p.parentPid === null || processes.has(p.parentPid), `${at}: untracked parent process`);
      for (const p of processes.values()) {
        const ancestors = new Set([p.pid]);
        let parent = processes.get(p.parentPid);
        while (parent) {
          if (!check(!ancestors.has(parent.pid), `${at}: cyclic process ancestry`)) break;
          ancestors.add(parent.pid); parent = processes.get(parent.parentPid);
        }
      }
      const observedPids = new Set();
      let lastAt = -1, peakTotal = 0, peakHeap = 0;
      for (const [sampleIndex, sample] of run.samples.entries()) {
        const sat = `${at}.samples[${sampleIndex}]`;
        if (!record(sample, sat)) continue;
        keys(sample, ["atMs", "processes"], sat);
        check(finite(sample.atMs) && sample.atMs > lastAt && sample.atMs <= run.completedAtMs, `${sat}: unordered/out-of-run timestamp`);
        if (lastAt >= 0) check(sample.atMs - lastAt <= run.measurement.intervalMs * 2, `${sat}: sample gap exceeds twice the declared interval`);
        lastAt = sample.atMs;
        if (!array(sample.processes, `${sat}.processes`, 1)) continue;
        const samplePids = new Set();
        let total = 0, heap = 0;
        for (const p of sample.processes) {
          if (!record(p, `${sat}.process`)) continue;
          keys(p, ["pid", "totalBytes", "jsHeapUsedBytes"], `${sat}.process`);
          const metadata = processes.get(p.pid);
          check(!!metadata && !samplePids.has(p.pid), `${sat}: unknown/duplicate measured process`);
          check(!!metadata && sample.atMs >= metadata.startedAtMs && sample.atMs < metadata.endedAtMs, `${sat}: memory sampled outside observed process lifetime`);
          samplePids.add(p.pid); observedPids.add(p.pid);
          if (unavailable(p.totalBytes, `${sat}.totalBytes`)) continue;
          check(finite(p.totalBytes) && p.totalBytes > 0, `${sat}: total process memory is missing`);
          if (metadata?.runtime === "v8") {
            if (unavailable(p.jsHeapUsedBytes, `${sat}.jsHeapUsedBytes`)) continue;
            number(p.jsHeapUsedBytes, `${sat}.jsHeapUsedBytes`);
            heap += p.jsHeapUsedBytes;
          } else check(p.jsHeapUsedBytes === undefined, `${sat}: native-only process cannot report a V8 heap`);
          total += p.totalBytes;
        }
        for (const p of processes.values()) if (p.startedAtMs <= sample.atMs && sample.atMs < p.endedAtMs) {
          check(samplePids.has(p.pid), `${sat}: live process ${p.pid} omitted from measured total`);
        }
        peakTotal = Math.max(peakTotal, total); peakHeap = Math.max(peakHeap, heap);
      }
      for (const pid of processes.keys()) check(observedPids.has(pid), `${at}: process ${pid} never measured`);
      const first = run.samples[0]?.atMs, last = run.samples.at(-1)?.atMs;
      check(first <= Math.min(...[...processes.values()].map((p) => p.startedAtMs)) + run.measurement.intervalMs * 2,
        `${at}: sampling missed process startup`);
      check(run.completedAtMs - last <= run.measurement.intervalMs * 2, `${at}: sampling stopped before command completion`);
      metrics[run.label] = { peakProcessTreeBytes: peakTotal, peakJsHeapUsedBytes: peakHeap, samples: run.samples.length };
    }
    check(labels.has("baseline") && labels.has("candidate") && labels.size === 2, "memory: baseline and candidate are both required");
    if (metrics.baseline && metrics.candidate) metrics.comparison = {
      totalBytesSaved: metrics.baseline.peakProcessTreeBytes - metrics.candidate.peakProcessTreeBytes,
      jsHeapBytesSaved: metrics.baseline.peakJsHeapUsedBytes - metrics.candidate.peakJsHeapUsedBytes,
      interpretation: "Measured samples, not an exact peak. No fixed 4 GiB ceiling or unapproved improvement threshold is applied.",
    };
    return result();
  }

  if (!array(trace.sessions, "sessions", 2)) return result();
  const sessions = new Map();
  for (const [index, session] of trace.sessions.entries()) {
    const at = `sessions[${index}]`;
    if (!record(session, at)) continue;
    if (unavailable(session, at)) continue;
    keys(session, ["id", "route", "identity", "fixtureId", "fixture", "observations", "closedAtMs"], at);
    nonempty(session.id, `${at}.id`);
    check(!sessions.has(session.id), `${at}: duplicate session identity`);
    check(ROUTES.has(session.route), `${at}: unknown route`);
    check(caseName === "desktop" ? ["gts-lsp", "tsserver"].includes(session.route) : ["browser-local", "backend-tnb"].includes(session.route), `${at}: route outside requested case`);
    sessions.set(session.id, session);
    if (record(session.identity, `${at}.identity`)) {
      const identity = session.identity;
      keys(identity, ["packageName", "packageVersion", "sdkPath", "nativeLibraryPath", "nativeLoadLog", "checker"], `${at}.identity`);
      nonempty(identity.sdkPath, `${at}.identity.sdkPath`);
      if (session.route === "browser-local") {
        check(identity.packageName === "typescript" && identity.packageVersion === "6.0.3" && identity.checker === "typescript-js", `${at}: browser SDK must be pinned stock TypeScript 6.0.3`);
        check(!/(@latest\b|\/latest\/)/i.test(identity.sdkPath ?? ""), `${at}: unpinned browser SDK path`);
        check(identity.nativeLibraryPath === undefined && identity.nativeLoadLog === undefined, `${at}: local route must not claim a native load`);
      } else {
        check(identity.packageName === "typescript-native-bridge" && /^\d+\.\d+\.\d+-bridge\.\d+\.tsgo\./.test(identity.packageVersion ?? "") && identity.checker === "tsgo", `${at}: service did not resolve the expected TNB/tsgo engine`);
        check(identity.packageVersion === tnbVersion, `${at}: TNB version differs from the exact contract pin`);
        check(string(identity.nativeLibraryPath) && /bridge\.(node|dylib|so|dll)$/i.test(identity.nativeLibraryPath), `${at}: native library observation is missing`);
        check(string(identity.nativeLoadLog) && /TNB ACTIVE/.test(identity.nativeLoadLog), `${at}: raw TNB activation/load log is missing`);
      }
    }
    const fixture = session.fixture;
    if (!record(fixture, `${at}.fixture`)) continue;
    const approved = expectedFixtures.get(session.fixtureId);
    check(!!approved && Array.isArray(approved.routes) && approved.routes.includes(session.route), `${at}: fixture/route is not in approved expectations`);
    check(!!approved && equal(approved.fixture, fixture), `${at}: fixture or feature expectations differ from separately approved source`);
    keys(fixture, ["uri", "validText", "badText", "diagnostic", "features"], `${at}.fixture`);
    check(string(fixture.uri) && /^file:\/\//.test(fixture.uri), `${at}: fixture requires a file URI`);
    check(session.route === "tsserver" ? /\.tsx?$/.test(fixture.uri ?? "") : /\.gts$/.test(fixture.uri ?? ""), `${at}: wrong fixture language for service`);
    nonempty(fixture.validText, `${at}.fixture.validText`); nonempty(fixture.badText, `${at}.fixture.badText`);
    check(fixture.validText !== fixture.badText, `${at}: bad fixture must change source`);
    if (record(fixture.diagnostic, `${at}.fixture.diagnostic`)) {
      keys(fixture.diagnostic, ["code", "messageIncludes", "range"], `${at}.fixture.diagnostic`);
      check(string(fixture.diagnostic.code) || integer(fixture.diagnostic.code), `${at}: expected diagnostic code is missing`);
      nonempty(fixture.diagnostic.messageIncludes, `${at}.fixture.diagnostic.messageIncludes`);
      rangeValid(fixture.diagnostic.range, fixture.badText, `${at}.fixture.diagnostic.range`);
    }
    if (record(fixture.features, `${at}.fixture.features`)) {
      keys(fixture.features, FEATURES, `${at}.fixture.features`);
      for (const name of ["hover", "completion", "signature"]) nonempty(fixture.features[name], `${at}.fixture.features.${name}`);
      const definition = fixture.features.definition;
      if (record(definition, `${at}.fixture.features.definition`)) {
        keys(definition, ["uri", "range", "sourceText"], `${at}.fixture.features.definition`);
        nonempty(definition.uri, `${at}.fixture.features.definition.uri`);
        nonempty(definition.sourceText, `${at}.fixture.features.definition.sourceText`);
        rangeValid(definition.range, definition.sourceText, `${at}.fixture.features.definition.range`);
      }
    }
    if (!array(session.observations, `${at}.observations`, 1)) continue;
    let current, lastTime = -1, lastVersion = -1;
    const requestIds = new Set(), cycles = new Map();
    for (const [oi, observation] of session.observations.entries()) {
      const oat = `${at}.observations[${oi}]`;
      if (!record(observation, oat)) continue;
      check(observation.sessionId === session.id, `${oat}: wrong session identity`);
      check(observation.sequence === oi + 1, `${oat}: duplicate/missing/out-of-order sequence`);
      check(finite(observation.atMs) && observation.atMs >= lastTime, `${oat}: invalid observation time`);
      lastTime = observation.atMs;
      if (session.closedAtMs !== undefined) check(observation.atMs <= session.closedAtMs, `${oat}: observation after session closed`);
      check(observation.uri === fixture.uri, `${oat}: observation belongs to another source URI`);
      check(integer(observation.version), `${oat}: missing source version`);
      if (observation.kind === "source") {
        keys(observation, ["sequence", "sessionId", "atMs", "kind", "uri", "version", "text", "phase", "cycle", "origin"], oat);
        check(observation.version > lastVersion, `${oat}: stale/duplicate source version`);
        lastVersion = observation.version;
        check(["valid", "bad", "restored"].includes(observation.phase), `${oat}: unknown source phase`);
        check(observation.text === (observation.phase === "bad" ? fixture.badText : fixture.validText), `${oat}: source differs from expected fixture`);
        const cycle = observation.cycle;
        check(cycle === "initial" || cycle === "external" || integer(cycle) && cycle >= 1 && cycle <= rounds, `${oat}: unknown edit cycle`);
        check(observation.origin === (cycle === "external" ? "filesystem" : observation.phase === "valid" ? "open" : "editor"), `${oat}: missing actual editor/filesystem source origin`);
        const phases = cycles.get(cycle) ?? new Map();
        check(!phases.has(observation.phase), `${oat}: duplicate source phase in cycle`);
        current = { source: observation, diagnostics: 0, features: new Set() };
        phases.set(observation.phase, current); cycles.set(cycle, phases);
      } else if (["diagnostics", "feature"].includes(observation.kind)) {
        keys(observation, observation.kind === "diagnostics"
          ? ["sequence", "sessionId", "atMs", "kind", "uri", "version", "requestId", "response"]
          : ["sequence", "sessionId", "atMs", "kind", "uri", "version", "requestId", "feature", "position", "response"], oat);
        if (!check(!!current, `${oat}: response without opened source`)) continue;
        check(observation.version === current.source.version, `${oat}: stale document diagnostics/feature response`);
        const requestKey = `${typeof observation.requestId}:${observation.requestId}`;
        check((string(observation.requestId) || integer(observation.requestId)) && !requestIds.has(requestKey), `${oat}: missing/duplicate request identity`);
        requestIds.add(requestKey);
        if (observation.kind === "diagnostics") {
          current.diagnostics++;
          check(current.diagnostics === 1, `${oat}: duplicate diagnostic response for one source version`);
          if (!array(observation.response, `${oat}.response`)) continue;
          for (const diagnostic of observation.response) {
            if (!record(diagnostic, `${oat}.diagnostic`)) continue;
            check(string(diagnostic.code) || integer(diagnostic.code), `${oat}: diagnostic code missing`);
            nonempty(diagnostic.message, `${oat}.diagnostic.message`);
            check([1, 2, 3, 4].includes(diagnostic.severity), `${oat}: diagnostic severity missing`);
            rangeValid(diagnostic.range, current.source.text, `${oat}.diagnostic.range`);
            check(!/__gts_/.test(diagnostic.message ?? ""), `${oat}: generated GTS symbol leaked in diagnostics`);
          }
          if (current.source.phase === "bad") {
            check(observation.response.some((d) => object(d) && d.severity === 1 && d.code === fixture.diagnostic?.code &&
              typeof d.message === "string" && d.message.includes(fixture.diagnostic?.messageIncludes) && equal(d.range, fixture.diagnostic?.range)),
            `${oat}: expected true error and exact source span were not observed`);
          } else check(!observation.response.some((d) => d?.severity === 1), `${oat}: valid/restored source has error diagnostics`);
        } else {
          check(FEATURES.includes(observation.feature), `${oat}: unknown language feature`);
          check(!current.features.has(observation.feature), `${oat}: duplicate feature response`);
          current.features.add(observation.feature);
          rangeValid({ start: observation.position, end: observation.position }, current.source.text, `${oat}.position`);
          const response = observation.response, expected = fixture.features?.[observation.feature];
          if (observation.feature === "hover") {
            const content = response?.contents;
            const values = (Array.isArray(content) ? content : [content]).map((v) => typeof v === "string" ? v : v?.value).filter((v) => typeof v === "string");
            const text = values.join("\n");
            check(string(text) && string(expected) && text.includes(expected) && !/__gts_|:\s*any\b/.test(text), `${oat}: empty/incorrect/any hover response`);
          } else if (observation.feature === "definition") {
            const locations = Array.isArray(response) ? response : response ? [response] : [];
            check(locations.some((v) => (v?.uri ?? v?.targetUri) === expected?.uri && equal(v?.range ?? v?.targetSelectionRange, expected?.range)), `${oat}: definition did not resolve to the expected source location`);
          } else if (observation.feature === "completion") {
            const items = Array.isArray(response) ? response : response?.items;
            check(Array.isArray(items) && items.some((v) => v?.label === expected) && !items.some((v) => /__gts_/.test(v?.label ?? "")), `${oat}: empty/incorrect/generated completion response`);
          } else if (observation.feature === "signature") {
            check(Array.isArray(response?.signatures) && response.signatures.some((v) => string(v?.label) && string(expected) && v.label.includes(expected)) &&
              !response.signatures.some((v) => /__gts_/.test(v?.label ?? "")), `${oat}: empty/incorrect signature help response`);
          }
        }
      } else check(false, `${oat}: unknown/error/panic/timeout observation kind ${String(observation.kind)}`);
    }
    const requiredCycles = caseName === "desktop" ? ["initial", "external", ...Array.from({ length: rounds }, (_, i) => i + 1)] : ["initial"];
    for (const cycle of requiredCycles) {
      const phases = cycles.get(cycle);
      if (!check(!!phases, `${at}: missing measured ${cycle} edit cycle`)) continue;
      const requiredPhases = cycle === "initial" ? ["valid", "bad", "restored"] : ["bad", "restored"];
      let previousSequence = -1;
      for (const phase of requiredPhases) {
        const observed = phases.get(phase);
        if (!check(!!observed, `${at}: ${cycle} lacks ${phase} source observation`)) continue;
        check(observed.source.sequence > previousSequence, `${at}: ${cycle} source phases are out of order`);
        previousSequence = observed.source.sequence;
        check(observed.diagnostics === 1, `${at}: ${cycle}/${phase} lacks completed diagnostic response`);
        if (phase !== "bad") for (const feature of FEATURES) check(observed.features.has(feature), `${at}: ${cycle}/${phase} lacks ${feature} result`);
      }
    }
    for (const [cycle, phases] of cycles) if (!requiredCycles.includes(cycle)) {
      check(false, `${at}: uncontracted cycle ${cycle}`);
    }
    if (session.closedAtMs !== undefined) number(session.closedAtMs, `${at}.closedAtMs`);
  }

  const routes = new Set([...sessions.values()].map((s) => s.route));
  for (const [id, approved] of expectedFixtures) for (const route of approved.routes ?? []) {
    check([...sessions.values()].some((session) => session.fixtureId === id && session.route === route), `missing approved scenario ${id}/${route}`);
  }
  for (const route of caseName === "desktop" ? ["gts-lsp", "tsserver"] : ["browser-local", "backend-tnb"]) {
    check(routes.has(route), `missing required route ${route}`);
  }
  if (caseName === "desktop") {
    check(trace.switches === undefined && trace.outages === undefined && trace.memory === undefined, "desktop: unexpected web/memory observations");
    metrics.editRoundsPerService = rounds;
    return result();
  }
  check(trace.memory === undefined, "web: unexpected memory observations");

  const latestSource = (session, atMs) => session?.observations?.filter((o) => o.kind === "source" && o.atMs <= atMs).at(-1);
  const matchesSession = (value, session, atMs, at) => {
    if (!snapshot(value, at)) return;
    const source = latestSource(session, atMs);
    check(!!source && value.uri === source.uri && value.version === source.version && value.text === source.text, `${at}: snapshot not bound to current observed session source`);
  };
  const directions = new Set(), retired = new Set();
  if (array(trace.switches, "switches", 2)) for (const [index, change] of trace.switches.entries()) {
    const at = `switches[${index}]`;
    if (!record(change, at)) continue;
    keys(change, ["fromSessionId", "toSessionId", "startedAtMs", "readyAtMs", "before", "after", "retired", "diagnostics"], at);
    const from = sessions.get(change.fromSessionId), to = sessions.get(change.toSessionId);
    if (!check(!!from && !!to && from !== to, `${at}: unknown/reused switch session`)) continue;
    check(!retired.has(from.id) && !retired.has(to.id), `${at}: reused disposed session`);
    retired.add(from.id);
    check(from.route !== to.route, `${at}: route did not change`);
    directions.add(`${from.route}->${to.route}`);
    check(finite(change.startedAtMs) && finite(change.readyAtMs) && change.startedAtMs < change.readyAtMs, `${at}: missing switch timing`);
    matchesSession(change.before, from, change.startedAtMs, `${at}.before`);
    matchesSession(change.after, to, change.readyAtMs, `${at}.after`);
    check(change.before?.text === change.after?.text && change.before?.uri === change.after?.uri, `${at}: source lost during route switch`);
    if (record(change.retired, `${at}.retired`)) {
      keys(change.retired, ["clientStoppedAtMs", "workerTerminatedAtMs", "socketClosedAtMs", "diagnosticsAfterStop"], `${at}.retired`);
      const stop = change.retired.clientStoppedAtMs;
      check(finite(stop) && change.startedAtMs <= stop && stop <= change.readyAtMs && from.closedAtMs === stop, `${at}: old language client was not disposed before readiness`);
      const transportStop = from.route === "browser-local" ? change.retired.workerTerminatedAtMs : change.retired.socketClosedAtMs;
      check(finite(transportStop) && change.startedAtMs <= transportStop && transportStop <= change.readyAtMs, `${at}: old worker/socket was not disposed`);
      if (array(change.retired.diagnosticsAfterStop, `${at}.retired.diagnosticsAfterStop`)) check(change.retired.diagnosticsAfterStop.length === 0, `${at}: stale diagnostics arrived after old client disposal`);
    }
    if (record(change.diagnostics, `${at}.diagnostics`)) {
      keys(change.diagnostics, ["ownerSessionId", "uri", "version", "response"], `${at}.diagnostics`);
      check(change.diagnostics.ownerSessionId === to.id && change.diagnostics.uri === change.after?.uri && change.diagnostics.version === change.after?.version, `${at}: diagnostics belong to stale session/source`);
      const actual = to.observations?.find((o) => o.kind === "diagnostics" && o.version === change.after?.version && o.atMs <= change.readyAtMs);
      check(!!actual && equal(actual.response, change.diagnostics.response), `${at}: displayed diagnostics not backed by a response from the new session`);
    }
  }
  check(directions.has("browser-local->backend-tnb") && directions.has("backend-tnb->browser-local"), "web: both switch directions must be observed");
  if (array(trace.outages, "outages", 1)) for (const [index, outage] of trace.outages.entries()) {
    const at = `outages[${index}]`;
    if (!record(outage, at)) continue;
    keys(outage, ["sessionId", "disconnectedAtMs", "source", "observations", "reconnectedSessionId", "reconnectedAtMs", "reconnectedSource"], at);
    const from = sessions.get(outage.sessionId), to = sessions.get(outage.reconnectedSessionId);
    check(from?.route === "backend-tnb" && to?.route === "backend-tnb" && from !== to, `${at}: backend reconnect must open a fresh backend session`);
    check(finite(outage.disconnectedAtMs) && finite(outage.reconnectedAtMs) && outage.disconnectedAtMs < outage.reconnectedAtMs, `${at}: missing disconnect/reconnect timing`);
    matchesSession(outage.source, from, outage.disconnectedAtMs, `${at}.source`);
    matchesSession(outage.reconnectedSource, to, outage.reconnectedAtMs, `${at}.reconnectedSource`);
    check(outage.source?.text === outage.reconnectedSource?.text, `${at}: source lost during backend reconnection`);
    check(from?.closedAtMs === outage.disconnectedAtMs, `${at}: disconnected backend session was not closed`);
    if (array(outage.observations, `${at}.observations`, 2)) {
      let lastTime = outage.disconnectedAtMs - 1;
      for (const observation of outage.observations) {
        if (!record(observation, `${at}.observation`)) continue;
        keys(observation, ["atMs", "sessionId", "activeRoute", "visibleError", "sourceSha256"], `${at}.observation`);
        check(finite(observation.atMs) && observation.atMs > lastTime && observation.atMs < outage.reconnectedAtMs && observation.atMs >= outage.disconnectedAtMs, `${at}: invalid outage observation timestamp`);
        lastTime = observation.atMs;
        check(observation.sessionId === from?.id && observation.activeRoute === "backend-tnb", `${at}: silent route fallback during backend outage`);
        nonempty(observation.visibleError, `${at}.visibleError`);
        check(observation.sourceSha256 === outage.source?.sha256, `${at}: source lost during outage`);
      }
    }
    check(![...sessions.values()].some((s) => s.route === "browser-local" && s.observations?.some((o) => o.atMs > outage.disconnectedAtMs && o.atMs < outage.reconnectedAtMs)), `${at}: browser route started during backend outage without an explicit switch`);
  }
  metrics.sessionCount = sessions.size;
  return result();
}

export async function main(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index], value = argv[index + 1];
    if (!["--input", "--case", "--rounds", "--nonce", "--tnb-version", "--expectations"].includes(name) || !value || options[name] !== undefined) {
      return { status: "FAIL", details: ["Usage: node session-evidence.mjs --input <trace.json> --case desktop|web|memory --expectations <approved.json> [--tnb-version <exact pin>] [--rounds <positive integer>] [--nonce <run nonce>]"] };
    }
    options[name] = value;
  }
  if (!options["--input"]) return { status: "BLOCKED", details: ["Missing --input: an approved real collector must produce a trace; example JSON is not execution evidence."] };
  if (!CASES.has(options["--case"])) return { status: "FAIL", details: ["--case must be desktop, web or memory"] };
  let content;
  try { content = await readFile(options["--input"], "utf8"); }
  catch (error) { return { status: "BLOCKED", details: [`Cannot read session observations: ${error.message}`] }; }
  let trace;
  try { trace = JSON.parse(content); }
  catch (error) { return { status: "FAIL", details: [`Malformed trace JSON: ${error.message}`] }; }
  if (!options["--expectations"]) return { status: "BLOCKED", details: ["Missing --expectations: real collector scenarios must be separately reviewed and sealed by the runner."] };
  let expectationText, expectations;
  try { expectationText = await readFile(options["--expectations"], "utf8"); }
  catch (error) { return { status: "BLOCKED", details: [`Cannot read approved expectations: ${error.message}`] }; }
  try { expectations = JSON.parse(expectationText); }
  catch (error) { return { status: "FAIL", details: [`Malformed approved expectations JSON: ${error.message}`] }; }
  try { return validateTrace(trace, options["--case"], {
    rounds: options["--rounds"] === undefined ? EDIT_ROUNDS : Number(options["--rounds"]),
    nonce: options["--nonce"],
    tnbVersion: options["--tnb-version"],
    expectations,
  }); }
  catch (error) { return { status: "FAIL", details: [`Malformed trace structure: ${error.message}`] }; }
}

if (process.argv[1] && realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url))) {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === "PASS" ? 0 : result.status === "BLOCKED" ? 2 : 1;
}
