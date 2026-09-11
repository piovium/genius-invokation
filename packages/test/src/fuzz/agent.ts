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
  ActionValidity,
  DiceType,
  dispatchRpc,
  type Action,
  type Game,
  type PlayerIO,
  type RpcMethod,
  type RpcRequestPayloadOf,
  type RpcResponsePayloadOf,
} from "@gi-tcg/core";
import type { Prng } from "./prng";

/**
 * 合法随机玩家：只在引擎标记为 VALID 的候选中选择，并原样使用
 * `autoSelectedDice` 支付。因此合法策略下出现 `GiTcgIoError`
 * 即意味着"引擎宣称合法却又拒绝"，应视为 bug。
 */

export type Req<M extends RpcMethod> = RpcRequestPayloadOf<M>;
export type Res<M extends RpcMethod> = RpcResponsePayloadOf<M>;

export interface RpcContext {
  readonly who: 0 | 1;
  readonly rng: Prng;
  readonly game: Game;
  /** 本玩家第几次 rpc（从 1 开始） */
  readonly step: number;
}

export interface Agent {
  rerollDice(ctx: RpcContext, req: Req<"rerollDice">): Res<"rerollDice">;
  switchHands(ctx: RpcContext, req: Req<"switchHands">): Res<"switchHands">;
  chooseActive(ctx: RpcContext, req: Req<"chooseActive">): Res<"chooseActive">;
  selectCard(ctx: RpcContext, req: Req<"selectCard">): Res<"selectCard">;
  action(ctx: RpcContext, req: Req<"action">): Res<"action">;
}

export type StrategyName = "weighted" | "random";

const WEIGHTS: Record<StrategyName, Record<string, number>> = {
  weighted: {
    useSkill: 6,
    playCard: 4,
    switchActive: 2,
    elementalTuning: 1,
    declareEnd: 0.3,
  },
  random: {},
};

export function actionWeight(strategy: StrategyName, action: Action): number {
  const kind = action.action?.$case ?? "";
  return WEIGHTS[strategy][kind] ?? 1;
}

export function createLegalAgent(strategy: StrategyName): Agent {
  return {
    rerollDice(ctx) {
      const dice = ctx.game.state.players[ctx.who].dice;
      return {
        diceToReroll: dice.filter(
          (d) => d !== DiceType.Omni && ctx.rng.bool(0.5),
        ),
      } as Res<"rerollDice">;
    },
    switchHands(ctx) {
      const hands = ctx.game.state.players[ctx.who].hands;
      return { removedHandIds: hands.filter(() => ctx.rng.bool(0.3)).map((h) => h.id) };
    },
    chooseActive(ctx, req) {
      return { activeCharacterId: ctx.rng.pick(req.candidateIds) };
    },
    selectCard(ctx, req) {
      return { selectedDefinitionId: ctx.rng.pick(req.candidateDefinitionIds) };
    },
    action(ctx, req) {
      const valid = req.action
        .map((action, index) => ({ action, index }))
        .filter(({ action }) => action.validity === ActionValidity.VALID);
      if (valid.length === 0) {
        throw new Error("No VALID action offered by the engine");
      }
      const { action, index } = ctx.rng.pickWeighted(valid, (v) =>
        actionWeight(strategy, v.action),
      );
      return { chosenActionIndex: index, usedDice: action.autoSelectedDice };
    },
  };
}

/** 单次 rpc 的决策记录，用于失败报告 */
export interface TraceEntry {
  readonly step: number;
  readonly who: 0 | 1;
  readonly method: RpcMethod;
  /** 请求的简短摘要（如候选数量） */
  readonly request: string;
  /** 响应的简短摘要，行动类会带上定义 id 与目标 */
  readonly response: string;
  readonly round: number;
  readonly phase: string;
}

export function describeAction(action: Action | undefined): string {
  const a = action?.action;
  if (!a) {
    return "<none>";
  }
  switch (a.$case) {
    case "useSkill":
      return `useSkill def=${a.value.skillDefinitionId} targets=[${a.value.targetIds}]`;
    case "playCard":
      return `playCard card=${a.value.cardId} targets=[${a.value.targetIds}]`;
    case "switchActive":
      return `switchActive to=${a.value.characterId}`;
    case "elementalTuning":
      return `elementalTuning card=${a.value.removedCardId}`;
    case "declareEnd":
      return "declareEnd";
    default:
      return String((a as { $case: string }).$case);
  }
}

function describeRequest(method: RpcMethod, req: unknown): string {
  const r = req as Record<string, unknown[]>;
  switch (method) {
    case "action":
      return `${r.action.length} candidates`;
    case "chooseActive":
      return `candidates=[${r.candidateIds}]`;
    case "selectCard":
      return `candidates=[${r.candidateDefinitionIds}]`;
    default:
      return "";
  }
}

function describeResponse(method: RpcMethod, req: unknown, res: unknown): string {
  if (method === "action") {
    const { chosenActionIndex, usedDice } = res as Res<"action">;
    const actions = (req as Req<"action">).action;
    return `#${chosenActionIndex} ${describeAction(actions[chosenActionIndex])} dice=[${usedDice}]`;
  }
  return JSON.stringify(res);
}

export interface AgentIoOptions {
  readonly who: 0 | 1;
  readonly rng: Prng;
  readonly game: () => Game;
  readonly trace: TraceEntry[];
  /** rpc 次数上限；超过后调用 onBudgetExhausted（通常是 giveUp） */
  readonly maxRpcs: number;
  readonly onBudgetExhausted: () => void;
  /** 每次 rpc 后回调（用于 hang watchdog 心跳与超时检查） */
  readonly onRpc?: () => void;
}

/** 每隔多少次 rpc 让出一次宏任务队列：整局都在微任务里跑时，setTimeout 永远没机会触发 */
const YIELD_EVERY = 8;

/** 把 Agent 包装成引擎需要的 PlayerIO，并记录决策 */
export function agentToPlayerIo(agent: Agent, opts: AgentIoOptions): PlayerIO {
  let step = 0;
  const handle = <M extends RpcMethod>(method: M) => {
    return async (req: Req<M>): Promise<Res<M>> => {
      step++;
      if (step % YIELD_EVERY === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      const game = opts.game();
      opts.onRpc?.();
      if (step > opts.maxRpcs) {
        opts.onBudgetExhausted();
      }
      const ctx: RpcContext = { who: opts.who, rng: opts.rng, game, step };
      const res = (agent[method] as (c: RpcContext, r: Req<M>) => Res<M>)(ctx, req);
      opts.trace.push({
        step,
        who: opts.who,
        method,
        request: describeRequest(method, req),
        response: describeResponse(method, req, res),
        round: game.state.roundNumber,
        phase: game.state.phase,
      });
      return res;
    };
  };
  return {
    notify: () => {},
    rpc: dispatchRpc({
      rerollDice: handle("rerollDice"),
      switchHands: handle("switchHands"),
      chooseActive: handle("chooseActive"),
      selectCard: handle("selectCard"),
      action: handle("action"),
    }),
  };
}
