import {
  type CompositeQuery,
  createCompositeQuery,
  type IntersectionTy,
  type UnionTy,
} from "./composite_query";
import type {
  BinaryOperator,
  Constructor,
  IQuery,
  MetaBase,
  TypingInfoBase,
} from "./utils";

type BinaryOperatorResult<
  T extends TypingInfoBase,
  U extends TypingInfoBase,
> = {
  orElse: UnionTy<[T, U]>;
  union: UnionTy<[T, U]>;
  intersection: IntersectionTy<[T, U]>;
};

const BINARY_OPS = ["orElse", "union", "intersection"] as const;

export type BinaryMethods<T extends TypingInfoBase> = {
  [K in BinaryOperator]: <U extends TypingInfoBase>(
    rhs: IQuery<U>,
  ) => CompositeQuery<BinaryOperatorResult<T, U>[K]>;
};

class BinaryMethodsImpl {
  static {
    for (const methodName of BINARY_OPS) {
      Object.defineProperty(BinaryMethodsImpl.prototype, methodName, {
        value: function (this: IQuery, rhs: IQuery) {
          return createCompositeQuery(methodName, [this, rhs]);
        },
      });
    }
  }
}
export const BinaryMethods = BinaryMethodsImpl as Constructor<
  BinaryMethods<TypingInfoBase>
>;
