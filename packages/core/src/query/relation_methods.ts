import type { AssignedPrimaryQuery } from "./primary_methods";
import type { PrimaryMethodsInternal } from "./primary_query";
import {
  toExpression,
  type AttachmentReq,
  type CardReq,
  type CharacterReq,
  type Constructor,
  type EntityOnCharacterReq,
  type HeterogeneousMetaBase,
  type InferResult,
  type IQuery,
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
  [K in RelationMethodNames]: <Q extends IQuery>(
    object: RelatedToReq<
      InferResult<Q>,
      RelationMethodMetas[K]["object"]
    > extends true
      ? Q
      : never,
  ) => AssignedPrimaryQuery<
    Meta,
    RelationMethodMetas[K]["subject"]
  >;
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

const HAS_AT_METHODS = ["has", "at", "with", "on"] as const;

class RelationMethodsImpl {
  static {
    for (const methodName of HAS_AT_METHODS) {
      Object.defineProperty(RelationMethodsImpl.prototype, methodName, {
        value: function (object: IQuery) {
          const internal: PrimaryMethodsInternal = this._internal;
          internal.addConstraint([methodName, object[toExpression]()]);
          return this;
        },
      });
    }
  }
}
export const RelationMethods = RelationMethodsImpl as Constructor<
  RelationMethods<any>
>;
