// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { fork, type ChildProcess } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { setAsyncContext, VERSIONS, type Version } from "@gi-tcg/core";
import { hangFilePath, startHangWatchdog, type HangCapture } from "./hang";
import {
  displayPath,
  relativizePaths,
  REPO_ROOT,
  reproCommand,
  writeHangArtifact,
  writeSummary,
} from "./report";
import {
  createCaseSpec,
  FAILURE_OUTCOMES,
  prepareCase,
  runCase,
  type CaseResult,
  type CaseSpec,
  type FuzzMode,
  type FuzzOptions,
} from "./runner";

/**
 * 命令行入口：
 *   pnpm --filter @gi-tcg/test fuzz -- run [options]
 *   pnpm --filter @gi-tcg/test fuzz -- repro <case.json>
 */

const USAGE = `用法:
  fuzz run [选项]            运行一轮 fuzz campaign
  fuzz repro <case.json>     按 case.json 里的种子重跑单个用例并完整落盘

run 选项:
  --seed <n>          campaign 种子（默认 Date.now()，会打印）
  --count <n>         用例数（默认 100）
  --jobs <n>          并行子进程数（默认 CPU 数 - 1；1 为进程内运行）
  --mode <m>          game | scenario | protocol | all（默认 game）
  --version <v>       current | random | v6.7.0 等（默认 current）
  --strategy <s>      weighted | random（默认 weighted）
  --dice <d>          random | omni | real（默认 random）
  --deck-shape <s>    official | small | chaos（默认 official）
  --max-rounds <n>    每局最大回合数（默认 15）
  --timeout-ms <n>    单局超时（默认 120000）
  --max-rpcs <n>      单局 rpc 上限，超过则 giveUp（默认 2000）
  --strict-dice       unexpectedInsufficientDice = throw
  --malice-p <p>      协议模式每次 rpc 注入概率（默认 0.15）
  --relatedness <p>   场景模式抽取角色相关实体的概率（默认 0.7）
  --out <dir>         产物目录（默认 packages/test/temp/fuzz/<seed>-<time>）
  --start-index <n>   从第 n 个用例开始（默认 0）
  --stop-on-failure   首个失败后停止
`;

interface RunConfig {
  readonly seed: number;
  readonly count: number;
  readonly startIndex: number;
  readonly jobs: number;
  readonly modeArg: FuzzMode | "all";
  readonly options: FuzzOptions;
  readonly outDir: string;
  readonly stopOnFailure: boolean;
}

/** worker 子进程接收的配置（JSON） */
export interface ShardConfig extends RunConfig {
  readonly shard: number;
  /** 本分片从该 index 起（含）处理满足 index % jobs === shard 的用例 */
  readonly from: number;
}

/**
 * 用户在命令行里写的相对路径按"敲命令时所在的目录"解析：
 * `pnpm run` 会把 cwd 切到 packages/test，但 pnpm/npm 会在 INIT_CWD 里保留原目录。
 */
function resolveUserPath(p: string): string {
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), p);
}

const MODES: FuzzMode[] = ["game", "scenario", "protocol"];
export function modeForIndex(modeArg: FuzzMode | "all", index: number): FuzzMode {
  return modeArg === "all" ? MODES[index % MODES.length] : modeArg;
}

function parseRun(argv: string[]): RunConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      seed: { type: "string" },
      count: { type: "string", default: "100" },
      jobs: { type: "string" },
      mode: { type: "string", default: "game" },
      version: { type: "string", default: "current" },
      strategy: { type: "string", default: "weighted" },
      dice: { type: "string", default: "random" },
      "deck-shape": { type: "string", default: "official" },
      "max-rounds": { type: "string", default: "15" },
      "timeout-ms": { type: "string", default: "120000" },
      "max-rpcs": { type: "string", default: "2000" },
      "strict-dice": { type: "boolean", default: false },
      "malice-p": { type: "string", default: "0.15" },
      relatedness: { type: "string", default: "0.7" },
      out: { type: "string" },
      "start-index": { type: "string", default: "0" },
      "stop-on-failure": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });
  const num = (v: string | undefined, name: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      throw new Error(`--${name} 需要数字，得到 ${v}`);
    }
    return n;
  };
  const oneOf = <T extends string>(v: string, name: string, allowed: readonly T[]): T => {
    if (!allowed.includes(v as T)) {
      throw new Error(`--${name} 必须是 ${allowed.join("|")}，得到 ${v}`);
    }
    return v as T;
  };
  const versionArg = values.version!;
  const version: FuzzOptions["version"] =
    versionArg === "current" || versionArg === "random"
      ? versionArg
      : oneOf(versionArg, "version", VERSIONS as readonly Version[]);
  const seed = values.seed ? num(values.seed, "seed") : Date.now() % 2147483647;
  const modeArg = oneOf(values.mode!, "mode", [...MODES, "all"] as const);
  const options: FuzzOptions = {
    mode: modeArg === "all" ? "game" : modeArg,
    version,
    strategy: oneOf(values.strategy!, "strategy", ["weighted", "random"] as const),
    dice: oneOf(values.dice!, "dice", ["random", "omni", "real"] as const),
    deckShape: oneOf(values["deck-shape"]!, "deck-shape", ["official", "small", "chaos"] as const),
    maxRounds: num(values["max-rounds"], "max-rounds"),
    timeoutMs: num(values["timeout-ms"], "timeout-ms"),
    maxRpcs: num(values["max-rpcs"], "max-rpcs"),
    strictDice: values["strict-dice"]!,
    maliceP: num(values["malice-p"], "malice-p"),
    relatedness: num(values.relatedness, "relatedness"),
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return {
    seed,
    count: num(values.count, "count"),
    startIndex: num(values["start-index"], "start-index"),
    jobs: values.jobs ? num(values.jobs, "jobs") : Math.max(1, availableParallelism() - 1),
    modeArg,
    options,
    outDir: values.out
      ? resolveUserPath(values.out)
      : path.join(REPO_ROOT, "packages/test/temp/fuzz", `${seed}-${stamp}`),
    stopOnFailure: values["stop-on-failure"]!,
  };
}

function specFor(cfg: RunConfig, index: number): CaseSpec {
  return createCaseSpec(cfg.seed, index, {
    ...cfg.options,
    mode: modeForIndex(cfg.modeArg, index),
  });
}

/** 写入 results 的精简行（栈只保留在 case.json 中） */
function resultLine(r: CaseResult): string {
  const { error, ...rest } = r;
  return JSON.stringify({
    ...rest,
    error: error ? { name: error.name, message: error.message.slice(0, 500), who: error.who } : undefined,
  });
}

export function reportFailure(r: CaseResult): void {
  const dir = r.artifactDir;
  console?.error?.(
    `✗ #${r.spec.index} ${r.outcome}${r.originalOutcome ? ` (${r.originalOutcome})` : ""} [${r.setup.mode}/${r.setup.version}] key=${JSON.stringify(r.key ?? "")}`,
  );
  if (dir) {
    console?.error?.(`  → ${dir}\n  ${reproCommand(path.join(dir, "case.json"))}`);
  }
}

/** 顺序执行一个分片；子进程与 --jobs 1 都走这里 */
export async function runShard(cfg: ShardConfig): Promise<CaseResult[]> {
  await setAsyncContext(true);
  mkdirSync(cfg.outDir, { recursive: true });
  const resultsFile = path.join(cfg.outDir, `results-${cfg.shard}.jsonl`);
  const progressFile = path.join(cfg.outDir, `progress-${cfg.shard}.json`);
  const results: CaseResult[] = [];
  const end = cfg.startIndex + cfg.count;
  const t0 = performance.now();
  let done = 0;
  // 同步死循环时 runCase 里的 setTimeout 无法触发，由 watchdog 线程抓栈并结束进程
  const watchdog = startHangWatchdog({
    thresholdMs: cfg.options.timeoutMs + 10_000,
    outDir: cfg.outDir,
  });
  for (let index = cfg.from; index < end; index++) {
    if (index % cfg.jobs !== cfg.shard) {
      continue;
    }
    writeFileSync(progressFile, JSON.stringify({ index, at: Date.now() }));
    watchdog.progress(index);
    const result = await runCase(specFor(cfg, index), {
      outDir: cfg.outDir,
      onRpc: () => watchdog.beat(),
    });
    results.push(result);
    appendFileSync(resultsFile, resultLine(result) + "\n");
    done++;
    if (result.outcome !== "ok") {
      reportFailure(result);
    }
    if (cfg.jobs === 1 && done % 10 === 0) {
      printProgress(results, t0);
    }
    if (cfg.stopOnFailure && FAILURE_OUTCOMES.includes(result.outcome)) {
      break;
    }
  }
  writeFileSync(progressFile, JSON.stringify({ index: null, at: Date.now(), done: true }));
  watchdog.idle();
  await watchdog.stop();
  return results;
}

function printProgress(results: readonly CaseResult[], t0: number): void {
  const counts = new Map<string, number>();
  for (const r of results) {
    counts.set(r.outcome, (counts.get(r.outcome) ?? 0) + 1);
  }
  const rate = (results.length / ((performance.now() - t0) / 1000)).toFixed(2);
  console?.error?.(
    `[fuzz] ${results.length} done · ${[...counts].map(([k, v]) => `${k}=${v}`).join(" ")} · ${rate} games/s`,
  );
}

/** 父进程：fork 分片、检测卡死/崩溃并重启、合并结果 */
async function runParallel(cfg: RunConfig): Promise<CaseResult[]> {
  mkdirSync(cfg.outDir, { recursive: true });
  const workerPath = fileURLToPath(new URL("./worker.ts", import.meta.url));
  const extra: CaseResult[] = [];
  const t0 = performance.now();
  const readProgress = (shard: number): { index: number | null; at: number } | null => {
    const file = path.join(cfg.outDir, `progress-${shard}.json`);
    if (!existsSync(file)) {
      return null;
    }
    try {
      return JSON.parse(readFileSync(file, "utf-8"));
    } catch {
      return null; // 文件写入中途被读取
    }
  };
  /** 子进程在处理第 index 个用例时消失：记为 hang/crash 并写产物 */
  const recordLost = (index: number, outcome: "hang" | "crash", detail: string) => {
    const spec = specFor(cfg, index);
    const hangFile = hangFilePath(cfg.outDir, index);
    let capture: HangCapture | undefined;
    if (existsSync(hangFile)) {
      try {
        const raw = JSON.parse(readFileSync(hangFile, "utf-8")) as HangCapture;
        capture = { ...raw, frames: raw.frames.map(relativizePaths) };
      } catch {
        // ignore
      }
    }
    let setup: CaseResult["setup"] = {
      mode: spec.options.mode,
      version: "?" as Version,
      dice: "omni",
      randomSeed: 0,
    };
    try {
      setup = prepareCase(spec).setup;
    } catch {
      // 连初始状态都建不出来时保持占位
    }
    const result: CaseResult = {
      spec,
      setup,
      outcome,
      winner: null,
      rounds: 0,
      rpcCount: 0,
      durationMs: 0,
      key: capture
        ? `hang: ${capture.frames[0] ?? "?"}`.slice(0, 120)
        : `${outcome}: ${detail}`,
      error: { name: outcome, message: detail, causes: [] },
    };
    const artifactDir = displayPath(writeHangArtifact(cfg.outDir, result, capture));
    const full = { ...result, artifactDir };
    extra.push(full);
    reportFailure(full);
  };
  const runShardProcess = (shard: number, from: number): Promise<void> =>
    new Promise((resolve) => {
      const config: ShardConfig = { ...cfg, shard, from };
      const child: ChildProcess = fork(workerPath, [JSON.stringify(config)], {
        execArgv: process.execArgv,
        stdio: "inherit",
      });
      let killedByParent = false;
      // 后备：watchdog 线程若也没能结束进程，由父进程强杀
      const watchdog = setInterval(() => {
        const p = readProgress(shard);
        if (p && p.index !== null && Date.now() - p.at > cfg.options.timeoutMs * 3) {
          killedByParent = true;
          child.kill("SIGKILL");
        }
      }, 5000);
      child.on("exit", (code, signal) => {
        clearInterval(watchdog);
        const p = readProgress(shard);
        if (p && p.index !== null) {
          // 没有正常写下 done 标记：进程死在第 p.index 个用例上
          const outcome = signal === "SIGKILL" ? "hang" : "crash";
          const detail =
            outcome === "hang"
              ? `worker stuck on #${p.index} for >${Math.round((Date.now() - p.at) / 1000)}s${killedByParent ? " (killed by parent)" : ""}`
              : `worker exited with code ${code} signal ${signal} on #${p.index}`;
          console?.error?.(`[fuzz] shard ${shard}: ${detail}，从 #${p.index + 1} 重启`);
          recordLost(p.index, outcome, detail);
          resolve(runShardProcess(shard, p.index + 1));
          return;
        }
        if (code !== 0 && code !== null) {
          console?.error?.(`[fuzz] shard ${shard} 以退出码 ${code} 结束`);
        }
        resolve();
      });
    });
  await Promise.all(
    Array.from({ length: cfg.jobs }, (_, shard) => runShardProcess(shard, cfg.startIndex)),
  );
  const results: CaseResult[] = [...extra];
  for (let shard = 0; shard < cfg.jobs; shard++) {
    const file = path.join(cfg.outDir, `results-${shard}.jsonl`);
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf-8").split("\n")) {
        if (line.trim()) {
          results.push(JSON.parse(line) as CaseResult);
        }
      }
    }
  }
  results.sort((a, b) => a.spec.index - b.spec.index);
  printProgress(results, t0);
  return results;
}

async function commandRun(argv: string[]): Promise<number> {
  const cfg = parseRun(argv);
  mkdirSync(cfg.outDir, { recursive: true });
  writeFileSync(
    path.join(cfg.outDir, "campaign.json"),
    JSON.stringify({ ...cfg, outDir: displayPath(cfg.outDir) }, null, 2),
  );
  console?.error?.(
    `[fuzz] seed=${cfg.seed} count=${cfg.count} jobs=${cfg.jobs} mode=${cfg.modeArg} version=${cfg.options.version} → ${displayPath(cfg.outDir)}`,
  );
  const results =
    cfg.jobs <= 1
      ? await runShard({ ...cfg, jobs: 1, shard: 0, from: cfg.startIndex })
      : await runParallel(cfg);
  writeFileSync(
    path.join(cfg.outDir, "results.jsonl"),
    results.map(resultLine).join("\n") + "\n",
  );
  const summary = writeSummary(cfg.outDir, results);
  console?.error?.(`\n${summary}`);
  const failures = results.filter((r) => FAILURE_OUTCOMES.includes(r.outcome)).length;
  console?.error?.(`[fuzz] 完成：${results.length} 例，${failures} 个失败 · ${displayPath(cfg.outDir)}`);
  return failures > 0 ? 1 : 0;
}

async function commandRepro(argv: string[]): Promise<number> {
  const file = argv[0];
  if (!file) {
    console?.error?.(USAGE);
    return 2;
  }
  const caseFile = resolveUserPath(file);
  const saved = JSON.parse(readFileSync(caseFile, "utf-8")) as CaseResult;
  const outDir = path.join(path.dirname(caseFile), "repro");
  await setAsyncContext(true);
  mkdirSync(outDir, { recursive: true });
  console?.error?.(`[fuzz] repro #${saved.spec.index} (seed ${saved.spec.campaignSeed}) → ${displayPath(outDir)}`);
  const watchdog = startHangWatchdog({
    thresholdMs: saved.spec.options.timeoutMs + 10_000,
    outDir,
  });
  watchdog.progress(saved.spec.index);
  const result = await runCase(saved.spec, {
    outDir,
    alwaysWrite: true,
    onRpc: () => watchdog.beat(),
  });
  watchdog.idle();
  await watchdog.stop();
  const verdict =
    result.outcome === saved.outcome && result.key === saved.key
      ? "REPRODUCED"
      : result.outcome === "ok"
        ? "NOT REPRODUCED"
        : "DIFFERENT FAILURE";
  console?.error?.(
    `[fuzz] ${verdict}: outcome=${result.outcome} key=${JSON.stringify(result.key ?? "")} (原 ${saved.outcome} ${JSON.stringify(saved.key ?? "")})`,
  );
  if (result.artifactDir) {
    console?.error?.(`  → ${result.artifactDir}`);
  }
  return verdict === "REPRODUCED" ? 0 : 1;
}

async function main(): Promise<void> {
  // pnpm 会把 `--` 原样传给脚本
  const args = process.argv.slice(2).filter((a, i, arr) => !(a === "--" && arr.slice(0, i).every((x) => x === "--")));
  const [command, ...rest] = args;
  let code: number;
  switch (command) {
    case "run":
      code = await commandRun(rest);
      break;
    case "repro":
      code = await commandRepro(rest);
      break;
    default:
      console?.error?.(USAGE);
      code = command === undefined || command === "--help" ? 0 : 2;
  }
  process.exit(code);
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console?.error?.(e);
    process.exit(2);
  });
}
