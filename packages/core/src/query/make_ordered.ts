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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import type { CharacterVariableConfigs } from "../base/character";
import type { SExprSchema } from "./expr_schema";
import {
  diceCostKey,
  inInitialPileKey,
  stringifyFunction,
  toExpression,
  toExpressionUnordered,
  typingInfo,
  variableKeyToExpr,
  type IQuery,
  type IUnorderedQuery,
  type NonIndexKeyOf,
  type StateVariablesKey,
  type TypingInfoBase,
} from "./utils";

const isUnorderedQuery = (query: unknown): query is IUnorderedQuery => {
  return !!query && typeof query === "object" && toExpressionUnordered in query;
};

type VarName<Ty extends TypingInfoBase> =
  | Ty["variables"]
  | (string & {})
  | typeof diceCostKey
  | typeof inInitialPileKey;

export class MakeOrderedMethods<Ty extends TypingInfoBase>
  implements IQuery<Ty>
{
  declare [typingInfo]: Ty;

  private _unorderedQuery: SExprSchema.UnorderedQuery;
  private _limitCount = Number.POSITIVE_INFINITY;
  private _orderBySpecs: SExprSchema.OrderBySpec[] = [];

  constructor(unorderedQuery: SExprSchema.UnorderedQuery) {
    this._unorderedQuery = unorderedQuery;
  }

  private _makeThisOrdered(): MakeOrderedMethods<Ty> {
    const self: any = this;
    if (this instanceof MakeOrderedMethods) {
      return this;
    } else if (isUnorderedQuery(self)) {
      return new MakeOrderedMethods<Ty>(self[toExpressionUnordered]());
    } else {
      throw new Error("Expected an unordered query");
    }
  }
  orderByFn(
    fn: (variables: Record<VarName<Ty>, number>) => number,
  ): MakeOrderedMethods<Ty> {
    const self = this._makeThisOrdered();
    const fnCode = stringifyFunction(fn);
    self._orderBySpecs.push(["fn", fnCode]);
    return self;
  }
  orderBy<V extends VarName<Ty>>(variable: V): MakeOrderedMethods<Ty>;
  orderBy<V1 extends VarName<Ty>, V2 extends VarName<Ty>>(
    lhs: V1 | number,
    op: "+" | "-" | "*" | "/" | "%",
    rhs: V2 | number,
  ): MakeOrderedMethods<Ty>;
  orderBy(
    lhs: StateVariablesKey | number,
    op?: "+" | "-" | "*" | "/" | "%",
    rhs?: StateVariablesKey | number,
  ): MakeOrderedMethods<Ty> {
    const self = this._makeThisOrdered();
    const lhsExpr = typeof lhs === "number" ? lhs : variableKeyToExpr(lhs);
    if (!op) {
      self._orderBySpecs.push(["expr", lhsExpr]);
    } else {
      const rhsExpr = typeof rhs === "number" ? rhs : variableKeyToExpr(rhs!);
      self._orderBySpecs.push(["expr", [op, lhsExpr, rhsExpr]]);
    }
    return self;
  }
  orderByRaw(...specs: SExprSchema.OrderBySpec[]) {
    const self = this._makeThisOrdered();
    self._orderBySpecs.push(...specs);
    return self;
  }

  limit(count: number): MakeOrderedMethods<Ty> {
    const self = this._makeThisOrdered();
    self._limitCount = count;
    return self;
  }

  [toExpression](): SExprSchema.OrderedQuery {
    return [
      "orderBy",
      this._unorderedQuery,
      this._orderBySpecs,
      this._limitCount,
    ];
  }
}
