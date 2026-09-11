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

import {
  CURRENT_VERSION,
  Game,
  GiTcgIoError,
  VERSIONS,
  type GameData,
  type GameState,
  type GameStateLogEntry,
  type Mutation,
  type PlayerConfig,
  type Version,
} from "@gi-tcg/core";
import { flip } from "@gi-tcg/utils";
import { buildState } from "../dsl";
import {
  agentToPlayerIo,
  createLegalAgent,
  type Agent,
  type StrategyName,
  type TraceEntry,
} from "./agent";
import {
  buildCardPool,
  generateDeck,
  getDataCached,
  type DeckShape,
  type GeneratedDeck,
} from "./deck";
import { checkInvariants, type Violation } from "./invariants";
import { createPrng, deriveSeed, type Prng } from "./prng";
import { createMaliciousAgent, type Injection } from "./protocol";
import {
  displayPath,
  matchKnownIssue,
  normalizeKey,
  relativizePaths,
  writeArtifact,
  type ErrorInfo,
} from "./report";
import { generateScenario, type ScenarioSummary } from "./scenario";

/**
 * 单个 fuzz 用例的执行：建初始状态 → 装 IO 与 hook → start → 分类 → 落盘。
 * 三种模式共用这条流水线，只在"如何建初始状态"和"是否包装恶意玩家"上不同。
 */

export type FuzzMode = "game" | "scenario" | "protocol";
export type DiceMode = "random" | "omni" | "real";

export interface FuzzOptions {
  readonly mode: FuzzMode;
  readonly version: "current" | "random" | Version;
  readonly strategy: StrategyName;
  readonly dice: DiceMode;
  readonly deckShape: DeckShape;
  readonly maxRounds: number;
  readonly timeoutMs: number;
  readonly maxRpcs: number;
  /** `unexpectedInsufficientDice = "throw"` */
  readonly strictDice: boolean;
  /** 协议模式每次 rpc 注入非法响应的概率 */
  readonly maliceP: number;
  /** 场景模式抽取"与角色相关"实体的概率 */
  readonly relatedness: number;
}

/** 用例完全由 (campaignSeed, index, options) 决定 */
export interface CaseSpec {
  readonly campaignSeed: number;
  readonly index: number;
  readonly caseSeed: number;
  readonly options: FuzzOptions;
}

export function createCaseSpec(
  campaignSeed: number,
  index: number,
  options: FuzzOptions,
): CaseSpec {
  return { campaignSeed, index, caseSeed: deriveSeed(campaignSeed, index), options };
}

export type OutcomeKind =
  | "ok"
  | "engine-error"
  | "io-error"
  | "invariant-violation"
  | "protocol-accepted"
  | "timeout"
  | "hang"
  | "crash"
  | "budget-exhausted"
  | "soft-warning"
  | "known";

export const FAILURE_OUTCOMES: readonly OutcomeKind[] = [
  "engine-error",
  "io-error",
  "invariant-violation",
  "protocol-accepted",
  "timeout",
  "hang",
  "crash",
];

/** 由 spec 派生出的具体设定，写入 case.json 便于人读 */
export interface CaseSetup {
  readonly mode: FuzzMode;
  readonly version: Version;
  readonly dice: "omni" | "real";
  readonly decks?: readonly [GeneratedDeck, GeneratedDeck];
  readonly scenario?: ScenarioSummary;
  readonly offender?: 0 | 1;
  readonly randomSeed: number;
}

export interface CaseResult {
  readonly spec: CaseSpec;
  readonly setup: CaseSetup;
  readonly outcome: OutcomeKind;
  /** `known` 时记录原本的 outcome */
  readonly originalOutcome?: OutcomeKind;
  /** 规范化的错误键，用于去重分组 */
  readonly key?: string;
  readonly winner: 0 | 1 | null;
  readonly rounds: number;
  readonly rpcCount: number;
  readonly durationMs: number;
  readonly error?: ErrorInfo;
  readonly violations?: readonly Violation[];
  readonly warnings?: readonly string[];
  readonly injected?: Injection | null;
  readonly artifactDir?: string;
}

export class FuzzInvariantError extends Error {
  constructor(public readonly violations: readonly Violation[]) {
    super(
      `Invariant violation:\n${violations
        .map((v) => `  [${v.rule}] ${v.path}: ${v.message}`)
        .join("\n")}`,
    );
    this.name = "FuzzInvariantError";
  }
}

export interface RunOptions {
  /** 失败产物目录；未提供则不落盘 */
  readonly outDir?: string;
  /** 即使 ok 也保留状态日志（调试用） */
  readonly alwaysWrite?: boolean;
  /** 每次 rpc 的心跳（hang watchdog） */
  readonly onRpc?: () => void;
}

const RECENT_NON_RESUMABLE = 32;

export function toErrorInfo(e: unknown): ErrorInfo {
  if (e instanceof Error) {
    const chain: string[] = [];
    let cause: unknown = e.cause;
    while (cause instanceof Error && chain.length < 5) {
      chain.push(relativizePaths(`${cause.name}: ${cause.message}\n${cause.stack ?? ""}`));
      cause = cause.cause;
    }
    return {
      name: e.name,
      message: relativizePaths(e.message),
      stack: e.stack && relativizePaths(e.stack),
      causes: chain,
      who: e instanceof GiTcgIoError ? e.who : undefined,
    };
  }
  return { name: "NonError", message: String(e), causes: [] };
}

/** 由 spec 确定性地派生设定并构造初始状态（不启动对局）；hang 产物与诊断脚本也用它 */
export function prepareCase(spec: CaseSpec): {
  setup: CaseSetup;
  initialState: GameState;
  rng: Prng;
  data: GameData;
} {
  const { options } = spec;
  const rng = createPrng(spec.caseSeed);
  const version: Version =
    options.version === "current"
      ? CURRENT_VERSION
      : options.version === "random"
        ? rng.split("version").pick(VERSIONS)
        : options.version;
  const dice: "omni" | "real" =
    options.dice === "random"
      ? rng.split("dice").bool()
        ? "omni"
        : "real"
      : options.dice;
  const randomSeed = rng.split("game").int(0, 2147483647);
  const data = getDataCached(version);
  const pool = buildCardPool(version);
  const gameConfig = {
    randomSeed,
    maxRoundsCount: options.maxRounds,
    unexpectedInsufficientDice: options.strictDice ? "throw" : "skipConsume",
  } as const;
  if (options.mode === "scenario") {
    const scenario = generateScenario(pool, rng.split("scenario"), {
      relatedness: options.relatedness,
      maxRounds: options.maxRounds,
      omni: dice === "omni",
      gameConfig,
    });
    let nextId = -5_000_000;
    return {
      setup: { mode: "scenario", version, dice, scenario: scenario.summary, randomSeed },
      initialState: buildState(scenario.tree, { data, nextId: () => nextId-- }),
      rng,
      data,
    };
  }
  const decks = [
    generateDeck(pool, rng.split("deck0"), options.deckShape),
    generateDeck(pool, rng.split("deck1"), options.deckShape),
  ] as const;
  const offender =
    options.mode === "protocol" ? (rng.split("malice").int(0, 2) as 0 | 1) : undefined;
  return {
    setup: { mode: options.mode, version, dice, decks, offender, randomSeed },
    initialState: Game.createInitialState({
      decks,
      data,
      versionBehavior: version,
      ...gameConfig,
    }),
    rng,
    data,
  };
}

export async function runCase(
  spec: CaseSpec,
  run: RunOptions = {},
): Promise<CaseResult> {
  const startedAt = performance.now();
  const { options } = spec;
  const { setup, initialState, rng, data } = prepareCase(spec);
  const dice = setup.dice;

  // ---- 装配 ----
  const game = new Game(initialState, { errorLevel: "strict" });
  const playerConfig: PlayerConfig = {
    alwaysOmni: dice === "omni",
    allowTuningAnyDice: false,
  };
  const trace: TraceEntry[] = [];
  const ioErrors: GiTcgIoError[] = [];
  const warnings: string[] = [];
  const entries: GameStateLogEntry[] = [];
  let nonResumable = 0;
  let lastMutations: readonly Mutation[] = [];
  const softViolations: Violation[] = [];
  let budgetExhausted = false;
  let timedOut = false;
  let malicious: ReturnType<typeof createMaliciousAgent> | null = null;

  for (const who of [0, 1] as const) {
    let agent: Agent = createLegalAgent(options.strategy);
    if (setup.offender === who) {
      malicious = createMaliciousAgent(agent, rng.split("malice-agent"), options.maliceP);
      agent = malicious;
    }
    game.players[who].config = playerConfig;
    game.players[who].io = agentToPlayerIo(agent, {
      who,
      rng: rng.split(`agent${who}`),
      game: () => game,
      trace,
      maxRpcs: options.maxRpcs,
      onRpc: run.onRpc,
      onBudgetExhausted: () => {
        if (!budgetExhausted) {
          budgetExhausted = true;
          game.giveUp(who);
        }
      },
    });
  }
  game.onIoError = (e) => {
    ioErrors.push(e);
  };
  game.onPause = async (state, mutations, canResume) => {
    lastMutations = mutations;
    if (canResume) {
      entries.push({ state, canResume });
    } else {
      entries.push({ state, canResume });
      nonResumable++;
      if (nonResumable > RECENT_NON_RESUMABLE) {
        const i = entries.findIndex((e) => !e.canResume);
        entries.splice(i, 1);
        nonResumable--;
      }
    }
    const violations = checkInvariants(state, data);
    const hard = violations.filter((v) => !v.soft);
    softViolations.push(...violations.filter((v) => v.soft));
    if (hard.length > 0) {
      throw new FuzzInvariantError(hard);
    }
  };

  // 某些宿主（如 cbinding 的 JS 引擎）没有 console，core 的类型声明把它标为可选
  const con = console;
  const originalWarn = con?.warn;
  if (con) {
    con.warn = (...args: unknown[]) => {
      warnings.push(args.map((a) => (typeof a === "string" ? a : String(a))).join(" "));
    };
  }
  const timer = setTimeout(() => {
    timedOut = true;
    game.terminate();
  }, options.timeoutMs);

  // ---- 运行与分类 ----
  let winner: 0 | 1 | null = null;
  let outcome: OutcomeKind = "ok";
  let error: ErrorInfo | undefined;
  let violations: readonly Violation[] | undefined;
  try {
    winner = await game.start();
  } catch (e) {
    if (e instanceof FuzzInvariantError) {
      outcome = "invariant-violation";
      violations = e.violations;
      error = toErrorInfo(e);
    } else if (timedOut) {
      outcome = "timeout";
      error = toErrorInfo(e);
    } else {
      outcome = "engine-error";
      error = toErrorInfo(e);
    }
  } finally {
    clearTimeout(timer);
    if (con && originalWarn) {
      con.warn = originalWarn;
    }
  }
  const injected = malicious?.injected ?? null;
  if (outcome === "ok") {
    if (injected && setup.offender !== undefined) {
      const offender = setup.offender;
      const blamedOffender =
        ioErrors.length === 1 && ioErrors[0].who === offender;
      const lost =
        winner === flip(offender) && game.state.phase === "gameEnd";
      const accepted =
        injected.expectation === "must-reject"
          ? !(blamedOffender && lost)
          : ioErrors.some((e) => e.who !== offender);
      if (accepted) {
        outcome = "protocol-accepted";
        error = {
          name: "ProtocolAccepted",
          message: `injected ${injected.id} at step ${injected.step} (${injected.expectation}); ioErrors=${ioErrors.length}${
            ioErrors[0] ? ` who=${ioErrors[0].who}` : ""
          } winner=${winner} phase=${game.state.phase}`,
          causes: [],
        };
      }
    } else if (ioErrors.length > 0) {
      outcome = "io-error";
      error = toErrorInfo(ioErrors[0]);
    } else if (budgetExhausted) {
      outcome = "budget-exhausted";
    } else if (warnings.length > 0) {
      outcome = "soft-warning";
    }
  }

  let key: string | undefined;
  if (outcome === "invariant-violation" && violations) {
    key = `invariant: ${[...new Set(violations.map((v) => v.rule))].join(",")}`;
  } else if (error) {
    key = normalizeKey(error.name, error.message);
  } else if (outcome === "soft-warning") {
    key = normalizeKey("warn", warnings[0]);
  }
  let originalOutcome: OutcomeKind | undefined;
  if (key && FAILURE_OUTCOMES.includes(outcome) && matchKnownIssue(key)) {
    originalOutcome = outcome;
    outcome = "known";
  }

  let result: CaseResult = {
    spec,
    setup,
    outcome,
    originalOutcome,
    key,
    winner,
    rounds: game.state.roundNumber,
    rpcCount: trace.length,
    durationMs: Math.round(performance.now() - startedAt),
    error,
    violations,
    warnings: warnings.length ? warnings : undefined,
    injected,
  };
  if (run.outDir && (outcome !== "ok" || run.alwaysWrite)) {
    const artifactDir = writeArtifact({
      outDir: run.outDir,
      result,
      entries,
      lastMutations,
      detailLog: game.detailLog,
      trace,
      finalState: game.state,
      softViolations,
    });
    result = { ...result, artifactDir: displayPath(artifactDir) };
  }
  return result;
}
