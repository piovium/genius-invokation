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
import {
  Command,
  InvalidArgumentError,
  Option,
} from "@commander-js/extra-typings";
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

const MODES: FuzzMode[] = ["game", "protocol"];
export function modeForIndex(
  modeArg: FuzzMode | "all",
  index: number,
): FuzzMode {
  return modeArg === "all" ? MODES[index % MODES.length] : modeArg;
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
    error: error
      ? {
          name: error.name,
          message: error.message.slice(0, 500),
          who: error.who,
        }
      : undefined,
  });
}

export function reportFailure(r: CaseResult): void {
  const dir = r.artifactDir;
  console?.error?.(
    `✗ #${r.spec.index} ${r.outcome}${r.originalOutcome ? ` (${r.originalOutcome})` : ""} [${r.setup.mode}/${r.setup.version}] key=${JSON.stringify(r.key ?? "")}`,
  );
  if (dir) {
    console?.error?.(
      `  → ${dir}\n  ${reproCommand(path.join(dir, "case.json"))}`,
    );
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
  writeFileSync(
    progressFile,
    JSON.stringify({ index: null, at: Date.now(), done: true }),
  );
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
  const readProgress = (
    shard: number,
  ): { index: number | null; at: number } | null => {
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
  const recordLost = (
    index: number,
    outcome: "hang" | "crash",
    detail: string,
  ) => {
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
    const artifactDir = displayPath(
      writeHangArtifact(cfg.outDir, result, capture),
    );
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
        if (
          p &&
          p.index !== null &&
          Date.now() - p.at > cfg.options.timeoutMs * 3
        ) {
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
          console?.error?.(
            `[fuzz] shard ${shard}: ${detail}，从 #${p.index + 1} 重启`,
          );
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
    Array.from({ length: cfg.jobs }, (_, shard) =>
      runShardProcess(shard, cfg.startIndex),
    ),
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

async function commandRun(cfg: RunConfig): Promise<number> {
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
  const failures = results.filter((r) =>
    FAILURE_OUTCOMES.includes(r.outcome),
  ).length;
  console?.error?.(
    `[fuzz] 完成：${results.length} 例，${failures} 个失败 · ${displayPath(cfg.outDir)}`,
  );
  return failures > 0 ? 1 : 0;
}

async function commandRepro(file: string): Promise<number> {
  const caseFile = resolveUserPath(file);
  const saved = JSON.parse(readFileSync(caseFile, "utf-8")) as CaseResult;
  const outDir = path.join(path.dirname(caseFile), "repro");
  await setAsyncContext(true);
  mkdirSync(outDir, { recursive: true });
  console?.error?.(
    `[fuzz] repro #${saved.spec.index} (seed ${saved.spec.campaignSeed}) → ${displayPath(outDir)}`,
  );
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

function parseNumber(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new InvalidArgumentError("需要有限数字");
  }
  return number;
}

async function main(): Promise<void> {
  const program = new Command().name("fuzz");
  program
    .command("run")
    .description("运行一轮 fuzz campaign")
    .option(
      "--seed <n>",
      "campaign 种子（默认 Date.now()，会打印）",
      parseNumber,
    )
    .option("--count <n>", "用例数", parseNumber, 100)
    .option(
      "--jobs <n>",
      "并行子进程数（1 为进程内运行）",
      parseNumber,
      Math.max(1, availableParallelism() - 1),
    )
    .addOption(
      new Option("--mode <m>", "运行模式")
        .choices([...MODES, "all"] as const)
        .default("game"),
    )
    .addOption(
      new Option("--version <v>", "游戏版本")
        .choices(["current", "random", ...VERSIONS] as const)
        .default("current"),
    )
    .addOption(
      new Option("--strategy <s>", "行动策略")
        .choices(["weighted", "random"] as const)
        .default("weighted"),
    )
    .addOption(
      new Option("--dice <d>", "骰子模式")
        .choices(["random", "omni", "real"] as const)
        .default("random"),
    )
    .addOption(
      new Option("--deck-shape <s>", "牌组形状")
        .choices(["official", "small", "chaos"] as const)
        .default("official"),
    )
    .option("--max-rounds <n>", "每局最大回合数", parseNumber, 15)
    .option("--timeout-ms <n>", "单局超时", parseNumber, 120000)
    .option("--max-rpcs <n>", "单局 rpc 上限，超过则 giveUp", parseNumber, 2000)
    .option("--strict-dice", "unexpectedInsufficientDice = throw", false)
    .option("--malice-p <p>", "协议模式每次 rpc 注入概率", parseNumber, 0.15)
    .option(
      "--out <dir>",
      "产物目录（默认 packages/test/temp/fuzz/<seed>-<time>）",
    )
    .option("--start-index <n>", "从第 n 个用例开始", parseNumber, 0)
    .option("--stop-on-failure", "首个失败后停止", false)
    .action(
      async ({
        seed = Date.now() % 2147483647,
        count,
        startIndex,
        jobs,
        mode,
        out,
        stopOnFailure,
        ...options
      }) => {
        const stamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        process.exitCode = await commandRun({
          seed,
          count,
          startIndex,
          jobs,
          modeArg: mode,
          options: { ...options, mode: mode === "all" ? "game" : mode },
          outDir: out
            ? resolveUserPath(out)
            : path.join(
                REPO_ROOT,
                "packages/test/temp/fuzz",
                seed + "-" + stamp,
              ),
          stopOnFailure,
        });
      },
    );
  program
    .command("repro")
    .description("按 case.json 里的种子重跑单个用例并完整落盘")
    .argument("<case.json>", "用例文件")
    .action(async (file) => {
      process.exitCode = await commandRepro(file);
    });
  await program.parseAsync();
}

if (import.meta.main) {
  await main();
}
