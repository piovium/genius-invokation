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

/**
 * 可复现的伪随机数生成器（mulberry32）。
 * fuzz 目录内禁止使用 `Math.random`，所有随机性都必须来自这里，
 * 这样任何用例都能仅凭 (campaignSeed, index, options) 完全再生。
 */

export interface Prng {
  readonly seed: number;
  /** [0, 2^32) 的整数 */
  nextU32(): number;
  /** [0, 1) 的浮点数 */
  float(): number;
  /** [min, maxExclusive) 的整数 */
  int(min: number, maxExclusive: number): number;
  bool(p?: number): boolean;
  pick<T>(arr: readonly T[]): T;
  pickWeighted<T>(
    items: readonly T[],
    weight: (item: T, index: number) => number,
  ): T;
  /** Fisher-Yates，返回新数组 */
  shuffle<T>(arr: readonly T[]): T[];
  /** 每个元素以概率 p 被选中 */
  subset<T>(arr: readonly T[], p?: number): T[];
  /** 派生独立子流，同一 label 总是得到同一子流 */
  split(label: string | number): Prng;
}

/** FNV-1a 32 位哈希 + 雪崩混合，把若干标签折叠成一个 32 位种子 */
export function deriveSeed(...parts: readonly (number | string)[]): number {
  let h = 0x811c9dc5;
  const text = parts.map(String).join(" ");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) || 1;
}

export function createPrng(seed: number): Prng {
  let a = seed >>> 0;
  const nextU32 = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const float = () => nextU32() / 4294967296;
  const prng: Prng = {
    seed,
    nextU32,
    float,
    int(min, maxExclusive) {
      if (maxExclusive <= min) {
        throw new RangeError(`empty range [${min}, ${maxExclusive})`);
      }
      return min + Math.floor(float() * (maxExclusive - min));
    },
    bool(p = 0.5) {
      return float() < p;
    },
    pick(arr) {
      if (arr.length === 0) {
        throw new RangeError("pick from empty array");
      }
      return arr[prng.int(0, arr.length)];
    },
    pickWeighted(items, weight) {
      let total = 0;
      const weights = items.map((item, i) => {
        const w = Math.max(0, weight(item, i));
        total += w;
        return w;
      });
      if (items.length === 0 || total <= 0) {
        throw new RangeError("pickWeighted: no positive weight");
      }
      let r = float() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) {
          return items[i];
        }
      }
      return items[items.length - 1];
    },
    shuffle(arr) {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = prng.int(0, i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
    subset(arr, p = 0.5) {
      return arr.filter(() => float() < p);
    },
    split(label) {
      return createPrng(deriveSeed(seed, label));
    },
  };
  return prng;
}
