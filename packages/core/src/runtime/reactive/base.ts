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
import type { SExprSchema } from "../../query/expr_schema";
import {
  toExpression,
  toExpressionUnordered,
  type IUnorderedQuery,
  type typingInfo,
} from "../../query/utils";
import type { TypingInfoBase } from "../../utils";

export const ReactiveStateSymbol: unique symbol = Symbol("ReactiveState");
export type ReactiveStateSymbol = typeof ReactiveStateSymbol;

export const RawStateSymbol: unique symbol = Symbol("ReactiveState/RawState");
export type RawStateSymbol = typeof RawStateSymbol;

export const LatestStateSymbol: unique symbol = Symbol(
  "ReactiveState/LatestState",
);
export type LatestStateSymbol = typeof LatestStateSymbol;

export abstract class ReactiveStateBase<
  QueryTy extends TypingInfoBase,
> implements IUnorderedQuery<QueryTy> {
  declare [typingInfo]: QueryTy;
  abstract readonly id: number;
  abstract get [ReactiveStateSymbol](): QueryTy["type"];
  declare [RawStateSymbol]: object;
  abstract get [LatestStateSymbol](): object;
  [toExpressionUnordered](): SExprSchema.UnorderedQuery {
    return ["id", this.id];
  }
  [toExpression](): SExprSchema.Query {
    return this[toExpressionUnordered]();
  }
  cast<Ty extends ExEntityType>(): Extract<
    this,
    {
      readonly [ReactiveStateSymbol]: Ty;
    }
  > {
    return this as any;
  }
  latest(): this[LatestStateSymbol] {
    return this[LatestStateSymbol];
  }
}
