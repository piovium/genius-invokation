import { mixins } from "../utils";
import { BinaryMethods } from "./binary_methods";
import type { SExprSchema } from "./expr_schema";
import {
  toExpression,
  type CompositeOperator,
  type Computed,
  type Expression,
  type IQuery,
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

class CompositeQueryImpl<Ty extends TypingInfoBase> implements IQuery<Ty> {
  declare [typingInfo]: Ty;
  constructor(
    private readonly type: CompositeOperator,
    private readonly operands: IQuery[],
  ) {}
  [toExpression](): SExprSchema.CompositeQuery {
    if (
      this.type === "not" ||
      this.type === "has" ||
      this.type === "at" ||
      this.type === "with" ||
      this.type === "on" ||
      this.type === "recentFrom"
    ) {
      if (this.operands.length !== 1) {
        throw new Error(`${this.type} operator requires exactly 1 operands`);
      }
      return [this.type, this.operands[0][toExpression]()];
    }
    if (this.type === "orElse" || this.type === "exclude") {
      if (this.operands.length !== 2) {
        throw new Error(`${this.type} operator requires exactly 2 operands`);
      }
      return [
        this.type,
        this.operands[0][toExpression](),
        this.operands[1][toExpression](),
      ];
    }
    return [this.type, ...this.operands.map((op) => op[toExpression]())];
  }
}

const CompositeQuery = mixins(CompositeQueryImpl, [BinaryMethods]) as any;
export const createCompositeQuery = <Ty extends TypingInfoBase>(
  type: CompositeOperator,
  operands: IQuery[],
): CompositeQuery<Ty> => {
  return new CompositeQuery(type, operands);
};

export type CompositeQuery<Ty extends TypingInfoBase> = Computed<
  CompositeQueryImpl<Ty> & BinaryMethods<Ty>,
  IQuery<Ty>
>;
