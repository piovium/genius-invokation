import {
  type CompositeQuery,
  createCompositeQuery,
  type IntersectionTy,
  type UnionTy,
} from "./composite_query";
import {
  BINARY_OPERATORS,
  type BinaryOperator,
  type Constructor,
  type IUnorderedQuery,
  type MetaBase,
  type TypingInfoBase,
} from "./utils";

type BinaryOperatorResult<
  T extends TypingInfoBase,
  U extends TypingInfoBase,
> = {
  orElse: UnionTy<[T, U]>;
  exclude: T;
  union: UnionTy<[T, U]>;
  intersection: IntersectionTy<[T, U]>;
};

export type BinaryMethods<T extends TypingInfoBase> = {
  [K in BinaryOperator]: <U extends TypingInfoBase>(
    rhs: IUnorderedQuery<U>,
  ) => CompositeQuery<BinaryOperatorResult<T, U>[K]>;
};

class BinaryMethodsImpl {
  static {
    for (const methodName of BINARY_OPERATORS) {
      Object.defineProperty(BinaryMethodsImpl.prototype, methodName, {
        value: function (this: IUnorderedQuery, rhs: IUnorderedQuery) {
          return createCompositeQuery(methodName, [this, rhs]);
        },
      });
    }
  }
}
export const BinaryMethods = BinaryMethodsImpl as Constructor<
  BinaryMethods<TypingInfoBase>
>;
