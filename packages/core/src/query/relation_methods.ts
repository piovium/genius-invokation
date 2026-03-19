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
