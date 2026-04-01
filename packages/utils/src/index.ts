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
