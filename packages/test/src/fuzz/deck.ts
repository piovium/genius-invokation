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

import getData from "@gi-tcg/data";
import type {
  CharacterDefinition,
  DeckConfig,
  EntityDefinition,
  GameData,
  Version,
} from "@gi-tcg/core";
import type { Prng } from "./prng";

/**
 * 离线牌组生成：直接从 `GameData` 推导可入牌组的卡牌，不依赖 assets 数据。
 *
 * - 可入牌组的卡 = type ∈ {eventCard, equipment, support} 且
 *   （`obtainable` 或带有 talent/adventureSpot/blessing/technique 标签）；
 *   `obtainable=false` 只表示"不能被随机生成"，天赋/秘境/祝福/特技都是 false。
 * - 天赋牌按 id 约定绑定角色：`2` + 角色 id + 序号（1503 → 215031）。
 * - 秘传（legend）与祝福（blessing）每套 ≤1 张，其余 ≤2 张。
 */

export type DeckShape = "official" | "small" | "chaos";

export interface CardPool {
  readonly version: Version;
  readonly data: GameData;
  readonly characters: readonly CharacterDefinition[];
  /** 可入牌组的非天赋卡 */
  readonly deckCards: readonly EntityDefinition[];
  /** 角色 id → 该角色的天赋牌 */
  readonly talents: ReadonlyMap<number, readonly EntityDefinition[]>;
  /** 仅游戏内生成、不可入牌组的卡（chaos 模式才会抽到） */
  readonly tokens: readonly EntityDefinition[];
}

export interface GeneratedDeck extends DeckConfig {
  readonly noShuffle: true;
}

const DECK_CARD_TYPES: ReadonlySet<string> = new Set([
  "eventCard",
  "equipment",
  "support",
]);
const LEGAL_UNOBTAINABLE_TAGS = ["talent", "adventureSpot", "blessing", "technique"];
const SINGLETON_TAGS = ["legend", "blessing"];

const poolCache = new Map<Version, CardPool>();

/** 每个进程最多缓存的版本数；`--version random` 时避免 30+ 份 GameData 常驻内存 */
const MAX_CACHED_VERSIONS = 4;
const dataCache = new Map<Version | undefined, GameData>();
export function getDataCached(version?: Version): GameData {
  let data = dataCache.get(version);
  if (data) {
    // 刷新 LRU 顺序
    dataCache.delete(version);
  } else {
    data = getData(version);
    if (dataCache.size >= MAX_CACHED_VERSIONS) {
      const oldest = dataCache.keys().next().value;
      dataCache.delete(oldest);
      poolCache.delete(oldest as Version);
    }
  }
  dataCache.set(version, data);
  return data;
}

/** 由天赋牌 id 推出角色 id；不符合约定或角色不存在时返回 null */
export function characterOfTalent(
  id: number,
  data: GameData,
): number | null {
  if (id < 200000 || id >= 300000) {
    return null;
  }
  const charId = Math.floor((id - 200000) / 10);
  return data.characters.has(charId) ? charId : null;
}

export function isSingleton(def: EntityDefinition): boolean {
  return def.tags.some((t) => SINGLETON_TAGS.includes(t));
}

export function buildCardPool(version: Version): CardPool {
  const cached = poolCache.get(version);
  if (cached) {
    return cached;
  }
  const data = getDataCached(version);
  const byId = <T extends { id: number }>(a: T, b: T) => a.id - b.id;
  const characters = [...data.characters.values()].sort(byId);
  const deckCards: EntityDefinition[] = [];
  const tokens: EntityDefinition[] = [];
  const talents = new Map<number, EntityDefinition[]>();
  for (const def of [...data.entities.values()].sort(byId)) {
    if (!DECK_CARD_TYPES.has(def.type)) {
      continue;
    }
    if (def.tags.includes("talent")) {
      const charId = characterOfTalent(def.id, data);
      if (charId === null) {
        tokens.push(def);
        continue;
      }
      const list = talents.get(charId) ?? [];
      list.push(def);
      talents.set(charId, list);
      continue;
    }
    const legal =
      def.obtainable ||
      def.tags.some((t) => LEGAL_UNOBTAINABLE_TAGS.includes(t));
    (legal ? deckCards : tokens).push(def);
  }
  const pool: CardPool = { version, data, characters, deckCards, talents, tokens };
  poolCache.set(version, pool);
  return pool;
}

/** 从候选中按权重与张数限制抽 `count` 张 */
function drawCards(
  rng: Prng,
  candidates: readonly EntityDefinition[],
  count: number,
  options: { limit: (def: EntityDefinition) => number; talentWeight: number },
): number[] {
  const remaining = [...candidates];
  const counts = new Map<number, number>();
  const cards: number[] = [];
  while (cards.length < count && remaining.length > 0) {
    const def = rng.pickWeighted(remaining, (d) =>
      d.tags.includes("talent") ? options.talentWeight : 1,
    );
    const used = counts.get(def.id) ?? 0;
    if (used >= options.limit(def)) {
      remaining.splice(remaining.indexOf(def), 1);
      continue;
    }
    counts.set(def.id, used + 1);
    cards.push(def.id);
  }
  return cards;
}

export function generateDeck(
  pool: CardPool,
  rng: Prng,
  shape: DeckShape,
): GeneratedDeck {
  let characters: number[];
  let cards: number[];
  switch (shape) {
    case "official":
    case "small": {
      characters = rng
        .shuffle(pool.characters)
        .slice(0, 3)
        .map((c) => c.id);
      const candidates = [
        ...pool.deckCards,
        ...characters.flatMap((id) => pool.talents.get(id) ?? []),
      ];
      const count = shape === "official" ? 30 : rng.int(8, 21);
      cards = drawCards(rng, candidates, count, {
        limit: (def) => (isSingleton(def) ? 1 : 2),
        talentWeight: 3,
      });
      break;
    }
    case "chaos": {
      const charCount = rng.int(1, 4);
      characters = [];
      const shuffled = rng.shuffle(pool.characters);
      for (let i = 0; i < charCount; i++) {
        if (characters.length > 0 && rng.bool(0.2)) {
          characters.push(rng.pick(characters));
        } else {
          characters.push(shuffled[i % shuffled.length].id);
        }
      }
      const candidates = [
        ...pool.deckCards,
        ...[...pool.talents.values()].flat(),
        ...pool.tokens,
      ];
      cards = drawCards(rng, candidates, rng.int(0, 41), {
        limit: () => Number.POSITIVE_INFINITY,
        talentWeight: 1,
      });
      break;
    }
  }
  return { characters, cards: rng.shuffle(cards), noShuffle: true };
}
