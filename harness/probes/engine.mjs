import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const exitCodes = { PASS: 0, FAIL: 1, BLOCKED: 2 };

export function verifyIdentity(metadata, expectedVersion) {
  if (metadata?.name !== "typescript-native-bridge") {
    return { status: "FAIL", details: {
      reason: "Resolved typescript is not typescript-native-bridge.",
      actualName: metadata?.name ?? null,
    } };
  }
  if (!expectedVersion || metadata.version !== expectedVersion) {
    return { status: "FAIL", details: {
      reason: "TNB must match the exact expected version.",
      expectedVersion: expectedVersion ?? null,
      actualVersion: metadata.version ?? null,
    } };
  }
  // Identity alone is deliberately not a PASS verdict.
  return { status: "BLOCKED", details: {
    reason: "Package identity matches; semantic and native execution evidence is still required.",
    identityMatches: true,
  } };
}

function artifact(file) {
  const resolvedPath = fs.realpathSync(file);
  return { path: resolvedPath, sha256: createHash("sha256")
    .update(fs.readFileSync(resolvedPath)).digest("hex") };
}

function resolveEngine(repo, version) {
  const require = createRequire(path.join(repo, "package.json"));
  const modulePath = require.resolve("typescript");
  const packagePath = require.resolve("typescript/package.json");
  const metadata = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const identity = verifyIdentity(metadata, version);
  return { require, modulePath, identity, details: {
    context: repo,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    packageName: metadata.name,
    packageVersion: metadata.version,
    module: artifact(modulePath),
    package: artifact(packagePath),
  } };
}

function unavailable(error) {
  return ["MODULE_NOT_FOUND", "ERR_MODULE_NOT_FOUND", "ENOENT", "ERR_DLOPEN_FAILED"]
    .includes(error.code)
    || /bridge shared library not found|vendored native-preview not found/.test(error.message);
}

function runSemanticWorker(repo, version, scratch) {
  let evidence = {};
  try {
    const resolved = resolveEngine(repo, version);
    evidence = resolved.details;
    if (!resolved.identity.details.identityMatches) return resolved.identity;
    const ts = resolved.require(resolved.modulePath);
    if (typeof ts.getTsgoProfileStats !== "function") {
      return { status: "BLOCKED", details: { ...evidence,
        reason: "Installed TNB does not expose native RPC counters; engine execution is unproven." } };
    }
    const sourcePath = path.join(scratch, "fixture.ts");
    const configPath = path.join(scratch, "tsconfig.json");
    fs.writeFileSync(configPath, JSON.stringify({ compilerOptions: {
      target: "ES2022", module: "ESNext", moduleResolution: "Bundler",
      strict: true, noEmit: true, types: [],
    }, files: ["fixture.ts"] }));
    const source = 'export const probeValue: number = "native-engine-witness";\n';
    const fixed = "export const probeValue: number = 7;\n";
    const stats = () => {
      const value = ts.getTsgoProfileStats();
      return { rpcCount: value.rpcCount, projectsLoaded: value.projectsLoaded };
    };
    const diagnostics = (text) => {
      fs.writeFileSync(sourcePath, text);
      const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic(diagnostic) {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        },
      });
      if (!parsed || parsed.errors.length) throw new Error("Semantic fixture config failed to parse.");
      const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
      const result = ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
        code: diagnostic.code,
        category: diagnostic.category,
        file: diagnostic.file ? path.resolve(diagnostic.file.fileName) : null,
        start: diagnostic.start ?? null,
        length: diagnostic.length ?? null,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      }));
      program.dispose?.();
      return result;
    };
    const before = stats();
    const negative = diagnostics(source);
    const afterNegative = stats();
    const positive = diagnostics(fixed);
    const afterPositive = stats();
    const loadedNative = Object.keys(resolved.require.cache)
      .filter((file) => path.basename(file).toLowerCase() === "bridge.node")
      .map(artifact);
    evidence = { ...evidence, compilerVersion: ts.version,
      fixture: { invalidSource: source, fixedSource: fixed, negative, positive },
      native: loadedNative, counters: { before, afterNegative, afterPositive },
      scope: "Resolved compiler API only; this does not prove GTS, CLI, LSP, or tsserver integration.",
    };
    const canonical = (file) => process.platform === "win32" ? file?.toLowerCase() : file;
    const witness = negative.length === 1 && negative[0].code === 2322
      && negative[0].category === ts.DiagnosticCategory.Error
      && canonical(negative[0].file) === canonical(sourcePath)
      && negative[0].start === source.indexOf("probeValue")
      && negative[0].length === "probeValue".length;
    if (!witness || positive.length) {
      return { status: "FAIL", details: { ...evidence,
        reason: "Semantic error must be reported at its source span, then disappear after repair." } };
    }
    if (!loadedNative.length || !(afterNegative.rpcCount > before.rpcCount)
      || !(afterPositive.rpcCount > afterNegative.rpcCount)) {
      return { status: "FAIL", details: { ...evidence,
        reason: "Semantic results lack loaded bridge.node and increasing native RPC evidence." } };
    }
    return { status: "PASS", details: evidence };
  } catch (error) {
    return { status: unavailable(error) ? "BLOCKED" : "FAIL",
      details: { ...evidence, reason: error.message, code: error.code ?? null } };
  }
}

export function probeEngine({ repo, version, timeoutMs = 60000 }) {
  if (!repo || !path.isAbsolute(repo) || !version
    || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    return { status: "FAIL", details: {
      reason: "Usage: engine.mjs --repo <absolute package context> --version <exact TNB version>",
    } };
  }
  try {
    if (!fs.statSync(repo).isDirectory()) throw new Error("repo is not a directory");
    const resolved = resolveEngine(repo, version);
    if (!resolved.identity.details.identityMatches) {
      return { ...resolved.identity, details: { ...resolved.details, ...resolved.identity.details } };
    }
  } catch (error) {
    return { status: unavailable(error) ? "BLOCKED" : "FAIL", details: { reason: error.message } };
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "gts-engine-probe-"));
  try {
    const godebug = process.env.GODEBUG ?? "";
    const child = spawnSync(process.execPath, [thisFile, "--semantic-worker", repo, version, scratch], {
      cwd: repo,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, TSGO_PROFILE: "1", TNB_GODEBUG_REEXEC: "1",
        GODEBUG: /(?:^|,)asyncpreemptoff=1(?:,|$)/.test(godebug)
          ? godebug : [godebug, "asyncpreemptoff=1"].filter(Boolean).join(","),
      },
    });
    const processEvidence = { exitCode: child.status, signal: child.signal,
      error: child.error?.message ?? null, stdout: child.stdout ?? "", stderr: child.stderr ?? "" };
    const resultPath = path.join(scratch, "result.json");
    if (child.error || child.signal || !fs.existsSync(resultPath)) {
      return { status: "FAIL", details: { reason: "Semantic worker crashed, timed out, or produced no result.",
        process: processEvidence } };
    }
    const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    if (!(result.status in exitCodes) || child.status !== exitCodes[result.status]) {
      return { status: "FAIL", details: { reason: "Semantic worker result and exit code disagree.",
        process: processEvidence } };
    }
    result.details.process = processEvidence;
    return result;
  } finally {
    // scratch is the exact directory just created by mkdtemp, never caller supplied.
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && fs.realpathSync.native(process.argv[1]) === fs.realpathSync.native(thisFile)) {
  if (process.argv[2] === "--semantic-worker") {
    const [, , , repo, version, scratch] = process.argv;
    const result = runSemanticWorker(repo, version, scratch);
    fs.writeFileSync(path.join(scratch, "result.json"), JSON.stringify(result));
    process.exitCode = exitCodes[result.status];
  } else {
    const args = process.argv.slice(2);
    const options = {};
    let result;
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index].replace(/^--/, "");
      if (!args[index].startsWith("--") || !["repo", "version"].includes(key)
        || !args[index + 1] || options[key]) {
        result = { status: "FAIL", details: { reason: `Invalid argument: ${args[index]}` } };
        break;
      }
      options[key] = args[index + 1];
    }
    try {
      result ??= probeEngine(options);
    } catch (error) {
      result = { status: "FAIL", details: { reason: error.message } };
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = exitCodes[result.status];
  }
}
