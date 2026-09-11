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

import { execSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORE_VERSION,
  serializeGameStateLog,
  type DetailLogEntry,
  type GameState,
  type GameStateLogEntry,
  type Mutation,
} from "@gi-tcg/core";
import type { TraceEntry } from "./agent";
import type { Violation } from "./invariants";
import type { CaseResult } from "./runner";

/**
 * 失败产物与报告。目标是让开发者打开 `report.md` 就能定位：
 * 错误消息里的结算链、source map 后的栈、涉及定义的 `.gts` 位置、
 * 崩溃前的决策与 mutation，以及可在 standalone 导入的 `gameLog.json`。
 */

export interface ErrorInfo {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly causes: readonly string[];
  readonly who?: 0 | 1;
}

export interface KnownIssue {
  readonly key: string;
  readonly note?: string;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "../../../..");
const DATA_SRC = path.join(REPO_ROOT, "packages/data/src");

/**
 * 产物里只写"上下文无关"的路径：相对仓库根目录（已是相对路径的原样返回）。
 * 这样产物可以随 MR 附件分享，也不暴露本机用户名与目录布局。
 */
export function displayPath(p: string): string {
  const rel = path.isAbsolute(p) ? path.relative(REPO_ROOT, p) : path.normalize(p);
  return (rel === "" ? "." : rel).split(path.sep).join("/");
}

/** 把文本（栈、消息、frames）中的仓库绝对路径改成相对路径，含 `file://` 形式 */
export function relativizePaths(text: string): string {
  return text
    .split(`file://${REPO_ROOT}/`)
    .join("")
    .split(`${REPO_ROOT}/`)
    .join("");
}

// ---------- 错误键 ----------

/** 去掉 GiTcgError 附加在消息末尾的结算链（"\n    when ..." 起） */
export function stripDetailLog(message: string): string {
  const idx = message.indexOf("\n    when ");
  return idx === -1 ? message : message.slice(0, idx);
}

/** 规范化错误键：去结算链、数字归一、空白折叠、截断 */
export function normalizeKey(name: string, message: string): string {
  const body = stripDetailLog(message)
    .replace(/-?\d+(\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  return `${name}: ${body}`.slice(0, 120);
}

let knownIssues: KnownIssue[] | null = null;
export function loadKnownIssues(): KnownIssue[] {
  if (!knownIssues) {
    const file = path.join(HERE, "known-issues.json");
    knownIssues = existsSync(file)
      ? (JSON.parse(readFileSync(file, "utf-8")) as KnownIssue[])
      : [];
  }
  return knownIssues;
}
export function matchKnownIssue(key: string): KnownIssue | undefined {
  return loadKnownIssues().find((k) => key.startsWith(k.key));
}

// ---------- .gts 定义索引 ----------

export interface DefLocation {
  readonly id: number;
  readonly symbol: string;
  readonly name?: string;
  /** 相对仓库根目录 */
  readonly file: string;
  readonly line: number;
}

let gtsIndex: Map<number, DefLocation> | null = null;

function* walkGts(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkGts(full);
    } else if (entry.name.endsWith(".gts")) {
      yield full;
    }
  }
}

/** 扫描 packages/data/src/**\/*.gts，建立 定义 id → 名称/文件:行 索引 */
export function getGtsIndex(): Map<number, DefLocation> {
  if (gtsIndex) {
    return gtsIndex;
  }
  const index = new Map<number, DefLocation>();
  if (!existsSync(DATA_SRC)) {
    gtsIndex = index;
    return index;
  }
  const files = [...walkGts(DATA_SRC)].sort((a, b) => {
    // 主定义优先于 old_versions
    const ao = a.includes("/old_versions/") ? 1 : 0;
    const bo = b.includes("/old_versions/") ? 1 : 0;
    return ao - bo || a.localeCompare(b);
  });
  const idRe = /^\s*id\s+(\d+)\s+as\s+([A-Za-z_]\w*)\s*;/;
  const nameRe = /@name\s+(.+?)\s*$/;
  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n");
    let pendingName: string | undefined;
    lines.forEach((text, i) => {
      const nm = nameRe.exec(text);
      if (nm) {
        pendingName = nm[1];
        return;
      }
      const m = idRe.exec(text);
      if (m) {
        const id = Number(m[1]);
        if (!index.has(id)) {
          index.set(id, {
            id,
            symbol: m[2],
            name: pendingName,
            file: path.relative(REPO_ROOT, file),
            line: i + 1,
          });
        }
        pendingName = undefined;
      }
    });
  }
  gtsIndex = index;
  return index;
}

export function describeDef(id: number): string {
  const loc = getGtsIndex().get(id);
  return loc ? `${id}(${loc.name ?? loc.symbol})` : String(id);
}

/** 把文本中出现的已知定义 id 标注为 `id(名称)` */
export function annotateIds(text: string): string {
  const index = getGtsIndex();
  return text.replace(/\b(\d{4,6})\b/g, (s) => {
    const loc = index.get(Number(s));
    return loc ? `${s}(${loc.name ?? loc.symbol})` : s;
  });
}

function collectDefIds(texts: readonly string[]): number[] {
  const index = getGtsIndex();
  const ids = new Set<number>();
  for (const text of texts) {
    for (const m of text.matchAll(/\b(\d{4,6})\b/g)) {
      const id = Number(m[1]);
      if (index.has(id)) {
        ids.add(id);
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
}

// ---------- 渲染 ----------

export function renderDetailLog(
  entries: readonly DetailLogEntry[],
  depth = 0,
  out: string[] = [],
): string {
  for (const e of entries) {
    const env = e.env !== "normal" ? `/${e.env}` : "";
    out.push(`${"  ".repeat(depth)}[${e.type}${env}] ${e.value}`);
    if (e.children) {
      renderDetailLog(e.children, depth + 1, out);
    }
  }
  return out.join("\n");
}

function shortValue(v: unknown): string {
  if (v === null || v === undefined) {
    return String(v);
  }
  if (typeof v === "string") {
    return JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v);
  }
  if (typeof v !== "object") {
    return String(v);
  }
  if (Array.isArray(v)) {
    return `[${v.length}]`;
  }
  const o = v as Record<string, unknown>;
  const def = o.definition as { id?: number } | undefined;
  if (typeof o.id === "number" && def && typeof def.id === "number") {
    return `#${o.id}<${describeDef(def.id)}>`;
  }
  if (typeof o.id === "number" && "__definition" in o) {
    return `def ${describeDef(o.id)}`;
  }
  if (v instanceof Map) {
    return `Map(${v.size})`;
  }
  return "{…}";
}

export function summarizeMutation(m: Mutation): string {
  const parts = Object.entries(m)
    .filter(([k]) => k !== "type")
    .map(([k, v]) => `${k}=${shortValue(v)}`);
  return `${m.type} ${parts.join(" ")}`;
}

// ---------- 产物 ----------

export interface ArtifactInput {
  readonly outDir: string;
  readonly result: CaseResult;
  readonly entries: readonly GameStateLogEntry[];
  readonly lastMutations: readonly Mutation[];
  readonly detailLog: readonly DetailLogEntry[];
  readonly trace: readonly TraceEntry[];
  readonly finalState: GameState | null;
  readonly softViolations: readonly Violation[];
}

function gitCommit(): string | undefined {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

/** 在仓库根目录执行的复现命令（路径相对仓库根目录） */
export function reproCommand(caseJsonPath: string): string {
  return `pnpm --filter @gi-tcg/test fuzz -- repro ${JSON.stringify(displayPath(caseJsonPath))}`;
}

/** 自定位的复现脚本：产物目录放在哪里都能用，只要在仓库内执行（或设置 GI_TCG_ROOT） */
export const REPRO_SCRIPT = `#!/bin/sh
# 在仓库内任意目录执行；产物目录可以放在任何位置。也可用 GI_TCG_ROOT 指定仓库根目录。
CASE="$(cd "$(dirname "$0")" && pwd)/case.json"
cd "\${GI_TCG_ROOT:-$(git rev-parse --show-toplevel)}" && pnpm --filter @gi-tcg/test fuzz -- repro "$CASE"
`;

function writeReproScript(dir: string): void {
  const repro = path.join(dir, "repro.sh");
  writeFileSync(repro, REPRO_SCRIPT);
  chmodSync(repro, 0o755);
}

function fence(text: string, lang = ""): string {
  return `\`\`\`${lang}\n${text}\n\`\`\``;
}

export function writeArtifact(input: ArtifactInput): string {
  const { result, outDir } = input;
  const { spec, setup } = result;
  const dir = path.join(
    outDir,
    `${String(spec.index).padStart(5, "0")}-${result.outcome}`,
  );
  mkdirSync(dir, { recursive: true });
  const caseJsonPath = path.join(dir, "case.json");

  // gameLog.json：standalone 可直接导入
  writeFileSync(
    path.join(dir, "gameLog.json"),
    JSON.stringify({
      gv: setup.version,
      ...serializeGameStateLog(input.entries),
    }),
  );
  if (input.finalState) {
    writeFileSync(
      path.join(dir, "final-state.json"),
      JSON.stringify({
        gv: setup.version,
        ...serializeGameStateLog([
          { state: input.finalState, canResume: false },
        ]),
      }),
    );
  }
  writeFileSync(
    path.join(dir, "detail-log.txt"),
    renderDetailLog(input.detailLog),
  );
  const meta = {
    coreVersion: CORE_VERSION,
    node: process.version,
    gitCommit: gitCommit(),
    createdAt: new Date().toISOString(),
  };
  writeFileSync(
    caseJsonPath,
    JSON.stringify(
      {
        ...result,
        meta,
        trace: input.trace,
        lastMutations: input.lastMutations.map(summarizeMutation),
        softViolations: input.softViolations,
      },
      null,
      2,
    ),
  );
  writeReproScript(dir);
  writeFileSync(path.join(dir, "report.md"), renderReport(input, caseJsonPath, meta));
  return dir;
}

function renderReport(
  input: ArtifactInput,
  caseJsonPath: string,
  meta: Record<string, unknown>,
): string {
  const { result, trace } = input;
  const { spec, setup, error } = result;
  const lines: string[] = [];
  lines.push(`# Fuzz case #${spec.index} — ${result.outcome}`);
  lines.push("");
  lines.push(`- key: \`${result.key ?? "-"}\``);
  lines.push(
    `- mode: ${setup.mode} · version: ${setup.version} · dice: ${setup.dice} · strategy: ${spec.options.strategy}`,
  );
  lines.push(
    `- campaignSeed: ${spec.campaignSeed} · index: ${spec.index} · caseSeed: ${spec.caseSeed} · randomSeed: ${setup.randomSeed}`,
  );
  lines.push(
    `- winner: ${result.winner} · rounds: ${result.rounds} · rpc: ${result.rpcCount} · ${result.durationMs} ms`,
  );
  lines.push(`- core ${meta.coreVersion} · ${meta.node} · commit ${meta.gitCommit ?? "?"}`);
  lines.push("");

  if (error) {
    lines.push("## 错误");
    lines.push("");
    lines.push(fence(annotateIds(`${error.name}: ${error.message}`)));
    if (error.stack) {
      lines.push("");
      lines.push("### 栈");
      lines.push("");
      lines.push(fence(error.stack));
    }
    error.causes.forEach((c, i) => {
      lines.push("");
      lines.push(`### cause ${i + 1}`);
      lines.push("");
      lines.push(fence(c));
    });
    lines.push("");
  }
  if (result.violations?.length) {
    lines.push("## 不变量违规");
    lines.push("");
    for (const v of result.violations) {
      lines.push(`- **${v.rule}** \`${v.path}\`: ${annotateIds(v.message)}`);
    }
    lines.push("");
  }
  if (result.injected) {
    lines.push("## 协议注入");
    lines.push("");
    lines.push(
      `- offender: player ${setup.offender} · step ${result.injected.step} · ${result.injected.method} · **${result.injected.id}** (${result.injected.expectation})`,
    );
    lines.push(`- detail: ${result.injected.detail}`);
    lines.push("");
  }

  const recent = trace.slice(-20);
  const texts = [
    error ? `${error.message}\n${error.stack ?? ""}` : "",
    ...recent.map((t) => t.response),
    ...(setup.decks?.flatMap((d) => [...d.characters, ...d.cards].join(" ")) ?? []),
    ...(result.violations?.map((v) => v.message) ?? []),
  ];
  const ids = collectDefIds(texts);
  if (ids.length) {
    lines.push("## 涉及的定义");
    lines.push("");
    const index = getGtsIndex();
    for (const id of ids) {
      const loc = index.get(id)!;
      lines.push(
        `- ${id} ${loc.name ?? ""} (\`${loc.symbol}\`) — \`${loc.file}:${loc.line}\``,
      );
    }
    lines.push("");
  }

  lines.push("## 对局设定");
  lines.push("");
  if (setup.decks) {
    setup.decks.forEach((deck, who) => {
      lines.push(
        `- player ${who}${setup.offender === who ? " (offender)" : ""}: 角色 ${deck.characters
          .map(describeDef)
          .join(", ")}`,
      );
      lines.push(`  - 牌组(${deck.cards.length}): ${deck.cards.map(describeDef).join(", ")}`);
    });
  }
  if (setup.scenario) {
    lines.push(fence(annotateIds(JSON.stringify(setup.scenario, null, 2)), "json"));
  }
  lines.push("");

  lines.push(`## 最后 ${recent.length} 次决策`);
  lines.push("");
  lines.push("| step | who | round/phase | method | request | response |");
  lines.push("|---|---|---|---|---|---|");
  for (const t of recent) {
    lines.push(
      `| ${t.step} | ${t.who} | ${t.round}/${t.phase} | ${t.method} | ${t.request} | ${annotateIds(t.response)} |`,
    );
  }
  lines.push("");

  if (input.lastMutations.length) {
    lines.push("## 上一暂停点以来的 mutation");
    lines.push("");
    lines.push(fence(input.lastMutations.map(summarizeMutation).join("\n")));
    lines.push("");
  }
  if (input.softViolations.length) {
    lines.push("## 软规则提示");
    lines.push("");
    const seen = new Set<string>();
    for (const v of input.softViolations) {
      const line = `- ${v.rule} \`${v.path}\`: ${v.message}`;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
      if (seen.size >= 30) {
        break;
      }
    }
    lines.push("");
  }
  if (result.warnings?.length) {
    lines.push("## console.warn");
    lines.push("");
    lines.push(fence(result.warnings.slice(0, 20).join("\n")));
    lines.push("");
  }

  lines.push("## 复现与排查");
  lines.push("");
  lines.push(fence(reproCommand(caseJsonPath), "sh"));
  lines.push("");
  lines.push("- 以上命令在仓库根目录执行（路径相对仓库根目录）；本目录下的 `repro.sh` 可在仓库内任意目录执行，产物目录放在哪里都行；");
  lines.push(
    "- `gameLog.json` 可在 standalone（`pnpm --filter @gi-tcg/standalone dev` → 导入日志）中逐暂停点回看棋盘、查看结算细节，并从最后一个可恢复点续跑；",
  );
  lines.push("- `detail-log.txt` 为完整结算细节日志；`final-state.json` 为出错时的最终状态；");
  lines.push("- `case.json` 含完整决策记录（trace）与 mutation 摘要。");
  return lines.join("\n");
}

/** 子进程死在某用例上时由父进程写的精简产物：没有对局日志，但有 watchdog 抓到的主线程栈 */
export function writeHangArtifact(
  outDir: string,
  result: CaseResult,
  capture: { frames: readonly string[]; stuckForMs: number } | undefined,
): string {
  const dir = path.join(
    outDir,
    `${String(result.spec.index).padStart(5, "0")}-${result.outcome}`,
  );
  mkdirSync(dir, { recursive: true });
  const caseJsonPath = path.join(dir, "case.json");
  if (capture) {
    capture = { ...capture, frames: capture.frames.map(relativizePaths) };
  }
  writeFileSync(caseJsonPath, JSON.stringify({ ...result, hang: capture }, null, 2));
  writeReproScript(dir);
  const lines = [
    `# Fuzz case #${result.spec.index} — ${result.outcome}`,
    "",
    `- key: \`${result.key}\``,
    `- mode: ${result.spec.options.mode} · campaignSeed: ${result.spec.campaignSeed} · index: ${result.spec.index}`,
    `- ${result.error?.message ?? ""}`,
    "",
  ];
  if (result.setup.decks || result.setup.scenario) {
    lines.push("## 对局设定");
    lines.push("");
    lines.push(`- version: ${result.setup.version} · dice: ${result.setup.dice} · randomSeed: ${result.setup.randomSeed}`);
    result.setup.decks?.forEach((deck, who) => {
      lines.push(`- player ${who}: 角色 ${deck.characters.map(describeDef).join(", ")}`);
      lines.push(`  - 牌组(${deck.cards.length}): ${deck.cards.map(describeDef).join(", ")}`);
    });
    if (result.setup.scenario) {
      lines.push(fence(annotateIds(JSON.stringify(result.setup.scenario, null, 2)), "json"));
    }
    lines.push("");
  }
  if (capture) {
    lines.push(`## 主线程调用栈（卡住 ${Math.round(capture.stuckForMs / 1000)}s 时由 watchdog 抓取）`);
    lines.push("");
    lines.push(fence(capture.frames.join("\n")));
    lines.push("");
  } else {
    lines.push("## 未能抓到调用栈");
    lines.push("");
    lines.push(
      "watchdog 线程没有来得及暂停主线程。可手动复现：运行 repro 后向进程发送 `kill -USR1 <pid>` 打开 inspector，用 Chrome DevTools 附加并暂停查看栈。",
    );
    lines.push("");
  }
  lines.push("## 复现");
  lines.push("");
  lines.push(fence(reproCommand(caseJsonPath), "sh"));
  lines.push("");
  lines.push("repro 同样带 watchdog：再次卡住时会在 `repro/hang-<index>.json` 留下调用栈。复现命令在仓库根目录执行；`repro.sh` 在仓库内任意目录均可执行。");
  writeFileSync(path.join(dir, "report.md"), lines.join("\n"));
  return dir;
}

// ---------- campaign 汇总 ----------

export interface SummaryGroup {
  readonly key: string;
  readonly outcome: string;
  readonly count: number;
  readonly versions: readonly string[];
  readonly indices: readonly number[];
  readonly representative?: string;
}

export function summarize(results: readonly CaseResult[]): {
  counts: Record<string, number>;
  groups: SummaryGroup[];
} {
  const counts: Record<string, number> = {};
  const map = new Map<string, { outcome: string; versions: Set<string>; indices: number[]; rep?: string }>();
  for (const r of results) {
    counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
    if (r.outcome === "ok") {
      continue;
    }
    const key = r.key ?? `(${r.outcome})`;
    const g = map.get(key) ?? { outcome: r.outcome, versions: new Set(), indices: [] };
    g.versions.add(r.setup.version);
    g.indices.push(r.spec.index);
    g.rep ??= r.artifactDir;
    map.set(key, g);
  }
  const groups = [...map.entries()]
    .map(([key, g]) => ({
      key,
      outcome: g.outcome,
      count: g.indices.length,
      versions: [...g.versions].sort(),
      indices: g.indices.sort((a, b) => a - b).slice(0, 50),
      representative: g.rep,
    }))
    .sort((a, b) => b.count - a.count);
  return { counts, groups };
}

export function writeSummary(outDir: string, results: readonly CaseResult[]): string {
  const { counts, groups } = summarize(results);
  writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify({ total: results.length, counts, groups }, null, 2),
  );
  const lines = [`# Fuzz summary (${results.length} cases)`, ""];
  lines.push(
    Object.entries(counts)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · "),
  );
  lines.push("");
  for (const g of groups) {
    lines.push(`## [${g.outcome}] ×${g.count} \`${g.key}\``);
    lines.push("");
    lines.push(`- versions: ${g.versions.join(", ")}`);
    lines.push(`- cases: ${g.indices.join(", ")}${g.count > g.indices.length ? ", …" : ""}`);
    if (g.representative) {
      lines.push(`- 代表用例: \`${g.representative}\``);
      lines.push(`- 复现: \`${reproCommand(path.join(g.representative, "case.json"))}\``);
    }
    lines.push("");
  }
  const text = lines.join("\n");
  writeFileSync(path.join(outDir, "summary.md"), text);
  return text;
}
