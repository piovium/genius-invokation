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

type Split<S extends string> = string extends S
  ? readonly string[]
  : S extends `${infer A} ${infer B}`
    ? readonly [A, ...(B extends "" ? readonly [] : Split<B>)]
    : readonly [S];

type GuessTypeFromSplitted<S extends readonly string[]> = S extends readonly [
  infer First extends string,
  ...infer Rest extends readonly string[],
]
  ? First extends
      | "character"
      | "characters"
      | "active"
      | "prev"
      | "next"
      | "standby"
    ? "character"
    : First extends "combat"
      ? "combatStatus"
      : First extends "summon" | "summons"
        ? "summon"
        : First extends "support" | "supports"
          ? "support"
          : First extends "status" | "statuses"
            ? "status"
            : First extends "equipment" | "equipments"
              ? "equipment"
              : GuessTypeFromSplitted<Rest>
  : any;

export type GuessedTypeOfQuery<Q extends string> = GuessTypeFromSplitted<
  Split<Q>
>;
