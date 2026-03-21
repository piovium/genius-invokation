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
