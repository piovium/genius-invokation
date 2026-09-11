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

import type { JSX } from "#jsx/jsx-runtime";
import {
  Aura,
  DiceType,
  type CharacterDefinition,
  type EntityDefinition,
  type GameConfig,
  type PhaseType,
} from "@gi-tcg/core";
import {
  Attachment,
  Card,
  Character,
  CombatStatus,
  DeclaredEnd,
  DiceCount,
  Equipment,
  State,
  Status,
  Summon,
  Support,
} from "../dsl";
import { characterOfTalent, type CardPool } from "./deck";
import type { Prng } from "./prng";

/**
 * 场景级 fuzz：随机生成一个"中局"状态树（复用 packages/test 的 JSX DSL，
 * 直接调用组件函数而不写 JSX），再交给同一条运行流水线。
 * 相比整局模式，它能直接命中特定状态/召唤物/装备的代码路径。
 */

export interface ScenarioOptions {
  /** 抽取"与角色相关"实体（同角色 id 前缀的状态、召唤物、天赋）的概率 */
  readonly relatedness: number;
  readonly maxRounds: number;
  readonly omni: boolean;
  readonly gameConfig: Partial<GameConfig>;
}

export interface ScenarioPlayerSummary {
  readonly characters: readonly {
    readonly def: number;
    readonly active: boolean;
    readonly alive: 0 | 1;
    readonly health: number;
    readonly energy: number;
    readonly aura: number;
    readonly entities: readonly number[];
  }[];
  readonly combatStatuses: readonly number[];
  readonly summons: readonly number[];
  readonly supports: readonly number[];
  readonly hands: readonly number[];
  readonly pile: readonly number[];
  readonly dice: { readonly count: number; readonly type: number };
  readonly declaredEnd: boolean;
}

export interface ScenarioSummary {
  readonly phase: PhaseType;
  readonly prevPhase: PhaseType | null;
  readonly roundNumber: number;
  readonly currentTurn: "my" | "opp";
  readonly random: number;
  readonly players: readonly [ScenarioPlayerSummary, ScenarioPlayerSummary];
}

const handle = <T>(id: number) => id as unknown as T;

const EQUIPMENT_GROUPS = ["weapon", "artifact", "technique", "talent"] as const;
const WEAPON_TYPES = ["sword", "claymore", "pole", "catalyst", "bow"];
const RELATED_ONLY_TAGS = ["preparingSkill", "nightsoulsBlessing"];

interface Pools {
  status: EntityDefinition[];
  combatStatus: EntityDefinition[];
  summon: EntityDefinition[];
  support: EntityDefinition[];
  equipment: Record<(typeof EQUIPMENT_GROUPS)[number], EntityDefinition[]>;
  byOwner: Map<number, EntityDefinition[]>;
}

const poolCache = new WeakMap<CardPool, Pools>();
function scenarioPools(pool: CardPool): Pools {
  const cached = poolCache.get(pool);
  if (cached) {
    return cached;
  }
  const pools: Pools = {
    status: [],
    combatStatus: [],
    summon: [],
    support: [],
    equipment: { weapon: [], artifact: [], technique: [], talent: [] },
    byOwner: new Map(),
  };
  for (const def of [...pool.data.entities.values()].sort((a, b) => a.id - b.id)) {
    switch (def.type) {
      case "status":
      case "combatStatus":
      case "summon":
      case "support":
        pools[def.type].push(def);
        break;
      case "equipment":
        for (const g of EQUIPMENT_GROUPS) {
          if (def.tags.includes(g)) {
            pools.equipment[g].push(def);
            break;
          }
        }
        break;
    }
    const owner = ownerOf(def.id, pool);
    if (owner !== null) {
      const list = pools.byOwner.get(owner) ?? [];
      list.push(def);
      pools.byOwner.set(owner, list);
    }
  }
  poolCache.set(pool, pools);
  return pools;
}

/** 角色专属实体：1 + 角色 id + 序号；天赋：2 + 角色 id + 序号 */
function ownerOf(id: number, pool: CardPool): number | null {
  if (id >= 100000 && id < 200000) {
    const charId = Math.floor((id - 100000) / 10);
    return pool.data.characters.has(charId) ? charId : null;
  }
  return characterOfTalent(id, pool.data);
}

/** 生成实体的可选变量覆盖：只对定义里存在的变量、在界内取值 */
function randomVars(
  def: EntityDefinition,
  rng: Prng,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of ["usage", "usagePerRound", "shield", "duration"]) {
    const cfg = def.varConfigs[name as keyof typeof def.varConfigs] as
      | { initialValue: number; lowerBound: number; upperBound: number }
      | undefined;
    if (!cfg || !rng.bool(0.5)) {
      continue;
    }
    const lo = Math.min(cfg.initialValue, Math.max(cfg.lowerBound, 1));
    const hi = Math.min(cfg.upperBound, Math.max(cfg.initialValue, lo));
    out[name] = rng.int(lo, hi + 1);
  }
  return out;
}

export function generateScenario(
  pool: CardPool,
  rng: Prng,
  opts: ScenarioOptions,
): { tree: JSX.Element; summary: ScenarioSummary } {
  const pools = scenarioPools(pool);
  const auras = Object.values(Aura).filter((v) => typeof v === "number") as number[];
  const phase: PhaseType = rng.pickWeighted(
    ["action", "roll", "end"] as PhaseType[],
    (p) => (p === "action" ? 0.7 : p === "roll" ? 0.2 : 0.1),
  );
  const prevPhase: PhaseType | null =
    phase === "action" ? (rng.bool(0.3) ? "roll" : null) : null;
  const roundNumber = rng.int(1, Math.max(2, opts.maxRounds));
  const currentTurn = rng.bool() ? "my" : "opp";
  const random = rng.int(0, 2147483647);
  const children: JSX.Element[] = [];
  const summaries: ScenarioPlayerSummary[] = [];
  let declaredEndUsed = false;

  for (const who of [0, 1] as const) {
    const side = who === 0 ? { my: true } : { opp: true };
    const chars = rng.shuffle(pool.characters).slice(0, 3);
    const activeIndex = rng.int(0, 3);
    const related = (
      ch: CharacterDefinition,
      general: readonly EntityDefinition[],
      type: EntityDefinition["type"],
      filter: (d: EntityDefinition) => boolean,
    ): EntityDefinition | null => {
      const own = (pools.byOwner.get(ch.id) ?? []).filter(
        (d) => d.type === type && filter(d),
      );
      const gen = general.filter(filter);
      const useRelated = own.length > 0 && (gen.length === 0 || rng.bool(opts.relatedness));
      const source = useRelated ? own : gen;
      return source.length ? rng.pick(source) : null;
    };
    const charSummaries: ScenarioPlayerSummary["characters"][number][] = [];
    const charElements = chars.map((ch, i) => {
      const active = i === activeIndex;
      const alive: 0 | 1 = !active && rng.bool(0.15) ? 0 : 1;
      const maxHealth = ch.varConfigs.maxHealth.initialValue;
      const maxEnergy = ch.varConfigs.maxEnergy.initialValue;
      const health = alive ? rng.int(1, maxHealth + 1) : 0;
      const energy = alive ? rng.int(0, maxEnergy + 1) : 0;
      const aura = alive ? rng.pick(auras) : Aura.None;
      const entityElements: JSX.Element[] = [];
      const entityIds: number[] = [];
      if (alive) {
        for (const group of EQUIPMENT_GROUPS) {
          if (!rng.bool(group === "talent" ? 0.4 : 0.3)) {
            continue;
          }
          let def: EntityDefinition | null;
          if (group === "talent") {
            // 事件类天赋（eventTalent）是 eventCard，不能作为装备放到角色区
            const talents = (pool.talents.get(ch.id) ?? []).filter(
              (d) => d.type === "equipment",
            );
            def = talents.length ? rng.pick(talents) : null;
          } else if (group === "weapon") {
            const weaponType = ch.tags.find((t) => WEAPON_TYPES.includes(t));
            const list = pools.equipment.weapon.filter(
              (d) => !weaponType || d.tags.includes(weaponType as never),
            );
            def = list.length ? rng.pick(list) : null;
          } else {
            def = pools.equipment[group].length
              ? rng.pick(pools.equipment[group])
              : null;
          }
          if (def) {
            entityElements.push(Equipment({ def: handle(def.id), ...randomVars(def, rng) }));
            entityIds.push(def.id);
          }
        }
        const statusCount = rng.int(0, 4);
        const used = new Set<number>();
        for (let s = 0; s < statusCount; s++) {
          const def = related(ch, pools.status, "status", (d) =>
            !used.has(d.id) &&
            (!d.tags.some((t) => RELATED_ONLY_TAGS.includes(t)) ||
              ownerOf(d.id, pool) === ch.id),
          );
          if (def) {
            used.add(def.id);
            entityElements.push(Status({ def: handle(def.id), ...randomVars(def, rng) }));
            entityIds.push(def.id);
          }
        }
      }
      charSummaries.push({ def: ch.id, active, alive, health, energy, aura, entities: entityIds });
      return Character({
        ...side,
        active,
        def: handle(ch.id),
        health,
        energy,
        aura: aura as never,
        alive,
        children: entityElements,
      });
    });
    children.push(...charElements);

    const pickMany = (
      general: readonly EntityDefinition[],
      type: EntityDefinition["type"],
      max: number,
    ): EntityDefinition[] => {
      const count = rng.int(0, max + 1);
      const used = new Set<number>();
      const out: EntityDefinition[] = [];
      for (let k = 0; k < count; k++) {
        const ch = rng.pick(chars);
        const def = related(ch, general, type, (d) => !used.has(d.id));
        if (def) {
          used.add(def.id);
          out.push(def);
        }
      }
      return out;
    };
    const combatStatuses = pickMany(pools.combatStatus, "combatStatus", 3);
    const summons = pickMany(pools.summon, "summon", 4);
    const supports = pickMany(pools.support, "support", 4);
    children.push(
      ...combatStatuses.map((d) => CombatStatus({ ...side, def: handle(d.id), ...randomVars(d, rng) })),
      ...summons.map((d) => Summon({ ...side, def: handle(d.id), ...randomVars(d, rng) })),
      ...supports.map((d) => Support({ ...side, def: handle(d.id), ...randomVars(d, rng) })),
    );

    const cardCandidates = [
      ...pool.deckCards,
      ...chars.flatMap((c) => pool.talents.get(c.id) ?? []),
    ];
    const attachments = [...pool.data.attachments.values()];
    const drawCards = (count: number): EntityDefinition[] =>
      Array.from({ length: count }, () =>
        pool.tokens.length && rng.bool(0.05)
          ? rng.pick(pool.tokens)
          : rng.pick(cardCandidates),
      );
    const hands = drawCards(rng.int(0, 11));
    const pile = drawCards(rng.int(0, 31));
    children.push(
      ...hands.map((d) =>
        Card({
          ...side,
          def: handle(d.id),
          children:
            attachments.length && rng.bool(0.05)
              ? [Attachment({ def: handle(rng.pick(attachments).id) })]
              : [],
        }),
      ),
      ...pile.map((d) => Card({ ...side, def: handle(d.id), pile: true })),
    );

    const dice = {
      count: rng.int(0, 17),
      type: opts.omni ? DiceType.Omni : rng.int(1, 9),
    };
    children.push(DiceCount({ ...side, count: dice.count, type: dice.type as never }));
    const declaredEnd = phase === "action" && !declaredEndUsed && rng.bool(0.15);
    if (declaredEnd) {
      declaredEndUsed = true;
      children.push(DeclaredEnd(side));
    }
    summaries.push({
      characters: charSummaries,
      combatStatuses: combatStatuses.map((d) => d.id),
      summons: summons.map((d) => d.id),
      supports: supports.map((d) => d.id),
      hands: hands.map((d) => d.id),
      pile: pile.map((d) => d.id),
      dice,
      declaredEnd,
    });
  }

  const tree = State({
    dataVersion: pool.version,
    config: opts.gameConfig,
    phase,
    prevPhase,
    currentTurn,
    roundNumber,
    random,
    children,
  });
  return {
    tree,
    summary: {
      phase,
      prevPhase,
      roundNumber,
      currentTurn,
      random,
      players: summaries as [ScenarioPlayerSummary, ScenarioPlayerSummary],
    },
  };
}
