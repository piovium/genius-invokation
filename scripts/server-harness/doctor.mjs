#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repository = fileURLToPath(new URL("../../", import.meta.url));

// Commands and arguments are fixed. On Windows, cmd resolves both .cmd package
// manager shims and native executables; no user input enters its command text.
async function probeVersion(command, args = ["--version"]) {
  try {
    const options = {
      // Probe the installed command outside the project's packageManager
      // selection, and disable Corepack downloads and automatic pinning.
      cwd: dirname(process.execPath),
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 16 * 1024,
      env: {
        ...process.env,
        COREPACK_ENABLE_NETWORK: "0",
        COREPACK_ENABLE_AUTO_PIN: "0",
        COREPACK_ENABLE_PROJECT_SPEC: "0",
        COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
        npm_config_manage_package_manager_versions: "false",
      },
    };
    const { stdout } = process.platform === "win32"
      ? await execFileAsync("cmd.exe", ["/d", "/s", "/c", `${command} ${args.join(" ")}`], options)
      : await execFileAsync(command, args, options);
    // Do not forward arbitrary tool output, which may contain local settings.
    const version = /\b(\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?)\b/.exec(stdout)?.[1] ?? null;
    return {
      available: true,
      version,
      ...(version === null ? { detail: "Command succeeded without a recognizable version." } : {}),
    };
  } catch (error) {
    return {
      available: false,
      version: null,
      detail: error.killed
        ? "Version command timed out."
        : error.code === "ENOENT"
          ? "Command was not found."
          : "Version command was unavailable or returned an error.",
    };
  }
}

function matchesVersion(version, major, minor = 0) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? "");
  return Boolean(match && Number(match[1]) === major && Number(match[2]) >= minor);
}

async function checkFile(path) {
  try {
    return { path, exists: (await stat(resolve(repository, path))).isFile() };
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return { path, exists: false };
    }
    return { path, exists: false, detail: `Cannot inspect file (${error.code ?? "unknown error"}).` };
  }
}

async function diagnose() {
  const tasks = [
    probeVersion("pnpm"),
    probeVersion("bun"),
    probeVersion("docker"),
    probeVersion("psql"),
    checkFile("packages/server/dist/main.js"),
    checkFile("packages/server/generated/prisma/client.ts"),
    checkFile("packages/assets-manager/src/data/deck.json"),
  ];
  const results = await Promise.allSettled(tasks);
  // Each check handles expected absence itself. An unexpected check failure must
  // fail the doctor instead of accidentally claiming readiness.
  const values = results.map((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    return result.value;
  });
  const [pnpm, bun, docker, psql, ...files] = values;
  const node = {
    version: process.versions.node,
    required: ">=26.1.0 <27.0.0",
    compatible: matchesVersion(process.versions.node, 26, 1),
    harnessCompatible: Number(process.versions.node.split(".")[0]) >= 24,
  };
  pnpm.required = ">=12.0.0 <13.0.0";
  pnpm.compatible = pnpm.available && matchesVersion(pnpm.version, 12);
  const databaseUrlSet = Boolean(process.env.DATABASE_URL?.trim());
  const blockers = [];
  if (!node.compatible) {
    blockers.push(`Production requires Node.js ${node.required}; current runtime is ${node.version}.`);
  }
  if (!pnpm.compatible) {
    blockers.push(`Production requires pnpm ${pnpm.required}; ${pnpm.version ? `found ${pnpm.version}` : "no usable version was found"}.`);
  }
  if (!databaseUrlSet) {
    blockers.push("DATABASE_URL is not set in this process environment.");
  }
  for (const file of files) {
    if (!file.exists) {
      blockers.push(`Missing prerequisite file: ${file.path}.`);
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    readyForProductionBaseline: blockers.length === 0,
    blockers,
    runtime: { node, pnpm },
    optionalTools: { bun, docker, psql },
    environment: { DATABASE_URL: databaseUrlSet },
    files,
    scope: "Read-only prerequisite check. No .env files loaded; database connectivity and application startup are not tested. Bun is reported only for the future migration.",
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    process.stdout.write(`${JSON.stringify({
      usage: "node scripts/server-harness/doctor.mjs [--output <report.json>]",
      exitCodes: { 0: "Prerequisites present", 1: "Production baseline prerequisites missing", 2: "Usage or doctor failure" },
    }, null, 2)}\n`);
    return;
  }
  let output;
  if (args.length) {
    if (args.length !== 2 || args[0] !== "--output" || !args[1] || args[1].startsWith("--")) {
      throw new Error("Usage: node scripts/server-harness/doctor.mjs [--output <report.json>]");
    }
    output = resolve(args[1]);
  }
  const report = await diagnose();
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, json, "utf8");
  }
  process.stdout.write(json);
  process.exitCode = report.readyForProductionBaseline ? 0 : 1;
}

main().catch(() => {
  // Keep stdout machine-readable without exposing unexpected process output or
  // environment values in an exception message.
  process.stdout.write(`${JSON.stringify({
    readyForProductionBaseline: false,
    error: "Doctor failed. Check command arguments and the optional output file path; use --help for usage.",
  }, null, 2)}\n`);
  process.exitCode = 2;
});
