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

import { ActionValidity, type RpcMethod } from "@gi-tcg/core";
import { flip } from "@gi-tcg/utils";
import type { Agent, Req, Res, RpcContext } from "./agent";
import type { Prng } from "./prng";

/**
 * 协议级 fuzz：给合法玩家套一层包装，以概率 p 把某次 rpc 的响应替换成非法响应。
 * 预期：引擎必须以 `GiTcgIoError` 判该玩家负（`must-reject`），
 * 而不是抛出内部错误或接受非法输入。
 */

export type Expectation = "must-reject" | "may-accept";

export interface Injection {
  readonly step: number;
  readonly method: RpcMethod;
  readonly id: string;
  readonly expectation: Expectation;
  readonly detail: string;
}

/** apply 返回 SKIP 表示当前局面下无法构造该非法响应 */
export const SKIP: unique symbol = Symbol("skip");

interface ProtocolMutation<M extends RpcMethod = RpcMethod> {
  readonly id: string;
  readonly method: M;
  readonly expectation: Expectation;
  apply(ctx: RpcContext, req: Req<M>, legal: Res<M>): unknown | typeof SKIP;
}

const own = (ctx: RpcContext) => ctx.game.state.players[ctx.who];

export const PROTOCOL_MUTATIONS: readonly ProtocolMutation[] = [
  {
    id: "action.index-out-of-range",
    method: "action",
    expectation: "must-reject",
    apply: (_ctx, req: Req<"action">, legal: Res<"action">) => ({
      ...legal,
      chosenActionIndex: req.action.length,
    }),
  },
  {
    id: "action.index-negative",
    method: "action",
    expectation: "must-reject",
    apply: (_ctx, _req, legal: Res<"action">) => ({ ...legal, chosenActionIndex: -1 }),
  },
  {
    id: "action.index-float",
    method: "action",
    expectation: "must-reject",
    apply: (_ctx, _req, legal: Res<"action">) => ({ ...legal, chosenActionIndex: 0.5 }),
  },
  {
    id: "action.pick-invalid-validity",
    method: "action",
    expectation: "must-reject",
    apply: (ctx, req: Req<"action">) => {
      const invalid = req.action
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => a.validity !== ActionValidity.VALID);
      if (invalid.length === 0) {
        return SKIP;
      }
      const { a, i } = ctx.rng.pick(invalid);
      return { chosenActionIndex: i, usedDice: a.autoSelectedDice };
    },
  },
  {
    id: "action.dice-drop-one",
    method: "action",
    expectation: "must-reject",
    apply: (_ctx, _req, legal: Res<"action">) =>
      legal.usedDice.length === 0
        ? SKIP
        : { ...legal, usedDice: legal.usedDice.slice(0, -1) },
  },
  {
    id: "action.dice-not-owned",
    method: "action",
    expectation: "must-reject",
    apply: (ctx, _req, legal: Res<"action">) => {
      const dice = own(ctx).dice;
      const missing = [1, 2, 3, 4, 5, 6, 7, 8].filter((d) => !dice.includes(d));
      if (missing.length === 0) {
        return SKIP;
      }
      return { ...legal, usedDice: [...legal.usedDice, ctx.rng.pick(missing)] };
    },
  },
  {
    id: "chooseActive.non-candidate",
    method: "chooseActive",
    expectation: "must-reject",
    apply: (ctx, req: Req<"chooseActive">) => {
      const opp = ctx.game.state.players[flip(ctx.who)];
      const candidate =
        opp.characters.find((c) => !req.candidateIds.includes(c.id))?.id ??
        own(ctx).characters.find((c) => !req.candidateIds.includes(c.id))?.id;
      return { activeCharacterId: candidate ?? -1 };
    },
  },
  {
    id: "selectCard.non-candidate",
    method: "selectCard",
    expectation: "must-reject",
    apply: () => ({ selectedDefinitionId: 0 }),
  },
  {
    id: "switchHands.pile-id",
    method: "switchHands",
    expectation: "must-reject",
    apply: (ctx) => {
      const pile = own(ctx).pile;
      return pile.length === 0 ? SKIP : { removedHandIds: [pile[0].id] };
    },
  },
  {
    id: "switchHands.duplicate-ids",
    method: "switchHands",
    expectation: "must-reject",
    apply: (ctx) => {
      const hands = own(ctx).hands;
      return hands.length === 0
        ? SKIP
        : { removedHandIds: [hands[0].id, hands[0].id] };
    },
  },
  {
    id: "reroll.not-owned-type",
    method: "rerollDice",
    expectation: "must-reject",
    apply: (ctx) => {
      const dice = own(ctx).dice;
      const missing = [1, 2, 3, 4, 5, 6, 7, 8].filter((d) => !dice.includes(d));
      return missing.length === 0 ? SKIP : { diceToReroll: [ctx.rng.pick(missing)] };
    },
  },
  {
    id: "payload.null",
    method: "action",
    expectation: "must-reject",
    apply: () => null,
  },
  {
    id: "payload.missing-field",
    method: "chooseActive",
    expectation: "must-reject",
    apply: () => ({}),
  },
  {
    id: "rpc.throw",
    method: "action",
    expectation: "must-reject",
    apply: () => {
      throw new Error("fuzz: malicious rpc handler throws");
    },
  },
];

export interface MaliciousAgent extends Agent {
  readonly injected: Injection | null;
}

/** 每局最多注入一次，保证 oracle 清晰 */
export function createMaliciousAgent(
  inner: Agent,
  rng: Prng,
  p: number,
): MaliciousAgent {
  let injected: Injection | null = null;
  const wrap = <M extends RpcMethod>(method: M) => {
    return (ctx: RpcContext, req: Req<M>): Res<M> => {
      const legal = (inner[method] as (c: RpcContext, r: Req<M>) => Res<M>)(ctx, req);
      if (injected !== null || !rng.bool(p)) {
        return legal;
      }
      const candidates = PROTOCOL_MUTATIONS.filter((m) => m.method === method);
      if (candidates.length === 0) {
        return legal;
      }
      const mutation = rng.pick(candidates) as unknown as ProtocolMutation<M>;
      // 先登记再执行：apply 可能故意 throw
      const record = (detail: string) => {
        injected = {
          step: ctx.step,
          method,
          id: mutation.id,
          expectation: mutation.expectation,
          detail,
        };
      };
      let mutated: unknown;
      try {
        mutated = mutation.apply(ctx, req, legal);
      } catch (e) {
        record(`threw ${String(e)}`);
        throw e;
      }
      if (mutated === SKIP) {
        return legal;
      }
      record(JSON.stringify(mutated));
      return mutated as Res<M>;
    };
  };
  return {
    get injected() {
      return injected;
    },
    rerollDice: wrap("rerollDice"),
    switchHands: wrap("switchHands"),
    chooseActive: wrap("chooseActive"),
    selectCard: wrap("selectCard"),
    action: wrap("action"),
  };
}
