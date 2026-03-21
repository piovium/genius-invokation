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
 
import type { SExprSchema } from "./expr_schema";
import type { AssignedPrimaryQuery } from "./primary_methods";
import type { PrimaryMethodsInternal } from "./primary_query";
import {
  RELATIONAL_METHODS,
  toExpressionUnordered,
  type AttachmentReq,
  type CardReq,
  type CharacterReq,
  type Constructor,
  type EntityOnCharacterReq,
  type HeterogeneousMetaBase,
  type InferResult,
  type IUnorderedQuery,
  type RelatedToReq,
  type TypingInfoFromMeta,
} from "./utils";

type RelationMethodMetas = {
  has: {
    subject: CharacterReq;
    object: EntityOnCharacterReq;
  };
  at: {
    subject: EntityOnCharacterReq;
    object: CharacterReq;
  };
  with: {
    subject: CardReq;
    object: AttachmentReq;
  };
  on: {
    subject: AttachmentReq;
    object: CardReq;
  };
};
type RelationMethodNames = keyof RelationMethodMetas & {};

type AllRelationMethods<Meta extends HeterogeneousMetaBase> = {
  [K in RelationMethodNames]: <Q extends IUnorderedQuery>(
    object: RelatedToReq<
      InferResult<Q>,
      RelationMethodMetas[K]["object"]
    > extends true
      ? Q
      : never,
  ) => AssignedPrimaryQuery<Meta, RelationMethodMetas[K]["subject"]>;
};

type RelationMethodsOmit<Meta extends HeterogeneousMetaBase> = {
  [K in RelationMethodNames]: RelatedToReq<
    TypingInfoFromMeta<Meta>,
    RelationMethodMetas[K]["subject"]
  > extends true
    ? never
    : K;
}[RelationMethodNames];

export type RelationMethods<Meta extends HeterogeneousMetaBase> = Omit<
  AllRelationMethods<Meta>,
  RelationMethodsOmit<Meta>
>;

class RelationMethodsImpl {
  static {
    for (const methodName of RELATIONAL_METHODS) {
      Object.defineProperty(RelationMethodsImpl.prototype, methodName, {
        value: function (object: IUnorderedQuery) {
          const constraint: SExprSchema.CompositeQuery = [
            methodName,
            object[toExpressionUnordered](),
          ];
          const internal: PrimaryMethodsInternal = this._internal;
          internal.addConstraint(constraint);
          return this;
        },
      });
    }
  }
}
export const RelationMethods = RelationMethodsImpl as Constructor<
  RelationMethods<any>
>;
