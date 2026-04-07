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
 
import { mixins } from "../utils";
import { BinaryMethods } from "./binary_methods";
import type { SExprSchema } from "./expr_schema";
import { MakeOrderedMethods } from "./make_ordered";
import {
  toExpression,
  toExpressionUnordered,
  type CompositeOperator,
  type Computed,
  type Expression,
  type IUnorderedQuery,
  type typingInfo,
  type TypingInfoBase,
} from "./utils";

type UnionTy2<T extends TypingInfoBase, U extends TypingInfoBase> = {
  [K in keyof T & keyof U]: T[K] | U[K];
};
export type UnionTy<Metas extends TypingInfoBase[]> = Computed<
  Metas extends [
    infer First extends TypingInfoBase,
    ...infer Rest extends TypingInfoBase[],
  ]
    ? UnionTy2<First, UnionTy<Rest>>
    : never,
  TypingInfoBase
>;

type IntersectionTy2<
  Meta1 extends TypingInfoBase,
  Meta2 extends TypingInfoBase,
> = {
  [K in keyof Meta1 & keyof Meta2]: Meta1[K] & Meta2[K];
};
export type IntersectionTy<Metas extends TypingInfoBase[]> = Computed<
  Metas extends [
    infer First extends TypingInfoBase,
    ...infer Rest extends TypingInfoBase[],
  ]
    ? IntersectionTy2<First, IntersectionTy<Rest>>
    : TypingInfoBase,
  TypingInfoBase
>;

class CompositeQueryImpl<Ty extends TypingInfoBase>
  implements IUnorderedQuery<Ty>
{
  declare [typingInfo]: Ty;
  constructor(
    private readonly type: CompositeOperator,
    private readonly operands: IUnorderedQuery[],
  ) {}
  [toExpressionUnordered](): SExprSchema.CompositeQuery {
    if (
      this.type === "not" ||
      this.type === "has" ||
      this.type === "at" ||
      this.type === "with" ||
      this.type === "on" ||
      this.type === "recentOppFrom"
    ) {
      if (this.operands.length !== 1) {
        throw new Error(`${this.type} operator requires exactly 1 operands`);
      }
      return [this.type, this.operands[0][toExpressionUnordered]()];
    }
    if (this.type === "orElse" || this.type === "exclude") {
      if (this.operands.length !== 2) {
        throw new Error(`${this.type} operator requires exactly 2 operands`);
      }
      return [
        this.type,
        this.operands[0][toExpressionUnordered](),
        this.operands[1][toExpressionUnordered](),
      ];
    }
    return [
      this.type,
      ...this.operands.map((op) => op[toExpressionUnordered]()),
    ];
  }
  [toExpression](): SExprSchema.Query {
    return this[toExpressionUnordered]();
  }
}

const CompositeQuery = mixins(CompositeQueryImpl, [
  BinaryMethods,
  MakeOrderedMethods,
]) as any;

export const createCompositeQuery = <Ty extends TypingInfoBase>(
  type: CompositeOperator,
  operands: IUnorderedQuery[],
): CompositeQuery<Ty> => {
  return new CompositeQuery(type, operands);
};

export type CompositeQuery<Ty extends TypingInfoBase> = Computed<
  CompositeQueryImpl<Ty> & BinaryMethods<Ty> & MakeOrderedMethods<Ty>,
  IUnorderedQuery<Ty>
>;
