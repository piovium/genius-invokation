// Copyright (C) 2025 Guyutongxue
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

import type { ExEntityType } from "../../data/type";

export const ReactiveStateSymbol: unique symbol = Symbol("ReactiveState");
export type ReactiveStateSymbol = typeof ReactiveStateSymbol;

export const RawStateSymbol: unique symbol = Symbol("ReactiveState/RawState");
export type RawStateSymbol = typeof RawStateSymbol;

export const LatestStateSymbol: unique symbol = Symbol("ReactiveState/LatestState");
export type LatestStateSymbol = typeof LatestStateSymbol;

export interface ExtraInfo<Ty extends ExEntityType> {
  variables: string;
  areaType:
    | (Ty extends "character" | "equipment" | "status" ? "characters" : never)
    | (Ty extends "combatStatus" ? "combatStatuses" : never)
    | (Ty extends "summon" ? "summons" : never)
    | (Ty extends "support" ? "supports" : never)
    | (Ty extends "eventCard" | "support" | "equipment" | "attachment"
        ? "hands" | "pile"
        : never)
    | "disposedEntities";
}


export abstract class ReactiveStateBase {
  abstract get [ReactiveStateSymbol](): ExEntityType;
  declare [RawStateSymbol]: object;
  abstract get [LatestStateSymbol](): object;
  cast<Ty extends ExEntityType>(): this & {
    readonly [ReactiveStateSymbol]: Ty;
  } {
    return this as any;
  }
  latest(): this[LatestStateSymbol] {
    return this[LatestStateSymbol];
  }
}
