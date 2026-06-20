// Copyright (C) 2024-2025 Guyutongxue
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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

export * from "./dice";

export function flip(who: 0 | 1): 0 | 1 {
  return (1 - who) as 0 | 1;
}

import { type, scope } from "arktype";
import type {} from "@ark/schema";

const augScope = scope({
  pair: type("<T>", ["T", "T"]),
});
export const augType = augScope.type;

export { augType as type };

type ScopeDef = typeof augScope.t;
export type TypeInfer<Def> = type.infer<Def, ScopeDef>;
export type TypeValidate<Def> = type.validate<Def, ScopeDef, {}>;

export type { Type } from "arktype";

export type Pair<T> = [T, T];

/**
 * Create a pair of the given value.
 * 
 * Notice that if the value is non-primitive then it will share the 
 * same reference. We recommend to manipulate the result pair inside 
 * `immer`'s produce to get the immutability guarantee.
 * @param value The value to be paired.
 * @returns A pair containing the given value.
 */
export function pair<T>(value: T): Pair<T> {
  const ret: [T, T] = [value, value];
  return ret;
}

/**
 * Returns a new array sorted by the values returned by the `projection` function.
 *
 * Supports single-key sorting (projection returns `number`) and multi-key / lexicographic
 * sorting (projection returns `number[]`). When the projection returns a number it is
 * automatically wrapped into a single-element array for comparison.
 *
 * The comparison is stable in the sense that it follows the natural ordering of numbers
 * and falls back to comparing array lengths when all compared elements are equal.
 *
 * @template T - The type of the array elements.
 * @template K - The type returned by the projection (`number` or `number[]`).
 *
 * @param arr - The source array to be sorted (read-only, a new sorted array is returned).
 * @param projection - A function that maps each element to a sortable key.
 *                     - Return a `number` for single-key sorting.
 *                     - Return a `number[]` for multi-key sorting (earlier indices have higher priority).
 *
 * @returns A new array containing the elements of `arr` sorted according to the projection.
 *
 * @example
 * // Single-key numeric sort
 * const users = [{ id: 3 }, { id: 1 }, { id: 2 }];
 * toSortedBy(users, u => u.id);
 * // => [{ id: 1 }, { id: 2 }, { id: 3 }]
 *
 * @example
 * // Multi-key sort (first by score desc, then by name asc)
 * const items = [
 *   { score: 10, name: "Bob" },
 *   { score: 10, name: "Alice" },
 *   { score: 5, name: "Charlie" }
 * ];
 * toSortedBy(items, item => [-item.score, item.name.charCodeAt(0)]);
 * // => [{ score: 10, name: "Alice" }, { score: 10, name: "Bob" }, { score: 5, name: "Charlie" }]
 */
export function toSortedBy<T, K extends number[] | number>(
  arr: readonly T[],
  projection: (element: T) => K,
): T[] {
  return arr.toSorted((a, b) => {
    let projectionA: number[] | number = projection(a);
    let projectionB: number[] | number = projection(b);
    if (!Array.isArray(projectionA)) {
      projectionA = [projectionA];
    }
    if (!Array.isArray(projectionB)) {
      projectionB = [projectionB];
    }
    const size = Math.min(projectionA.length, projectionB.length);
    for (let i = 0; i < size; i++) {
      if (projectionA[i] < projectionB[i]) {
        return -1;
      }
      if (projectionA[i] > projectionB[i]) {
        return 1;
      }
    }
    return projectionA.length - projectionB.length;
  });
}
