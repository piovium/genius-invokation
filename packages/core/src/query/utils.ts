import type { EntityArea, EntityType } from "../base/entity";
import type { ExEntityType } from "../builder/type";

export type IsExtends<T, U> = [T] extends [U] ? true : false;
export type Related<T, U> = IsExtends<T, U> extends true
  ? true
  : IsExtends<U, T> extends true
    ? true
    : false;
export type Computed<T, R = any> = {
  [K in keyof T]: T[K];
} extends infer O extends R
  ? O
  : never;

export type StrictlySuperTypeOf<T, U> = IsExtends<U, T> extends true
  ? IsExtends<T, U> extends true
    ? false
    : true
  : false;

/**
 * T is not a strictly super type of U.
 * That is, T is either:
 * - same as U
 * - a sub type of U
 * - not related to U
 */
type NotStrictlySuperTypeOf<T, U> = StrictlySuperTypeOf<T, U> extends true
  ? false
  : true;

/**
 * For all properties `K` in `ConfigMeta`, if `Meta[K]` is not a strictly super type of `ConfigMeta[K]`,
 * then returns `true`.
 *
 * This is used to check whether a property in `PrimaryMethod` should be omitted. It should omit if
 * all configured properties of `Meta` is not a strictly super type of `ConfigMeta`, which means
 * `ConfigMeta` do not provide more information than (or unrelated information to) current `Meta`, so
 * won't be provide as a method from current builder chain point.
 */
export type AllPropsNotStrictlySuperTypeOf<
  Meta,
  ConfigMeta extends Partial<MetaBase>,
> = {
  [K in keyof ConfigMeta]: K extends keyof Meta
    ? NotStrictlySuperTypeOf<Meta[K], ConfigMeta[K]> extends true
      ? 0
      : unknown
    : 0;
}[keyof ConfigMeta] extends 0
  ? true
  : false;

export type StaticAssert<T extends true> = T;

/**
 * Mark Function.prototype.* as deprecated so the LSP won't hint them
 * inside suggestion list
 */
export type NotFunctionPrototype = {
  /** @deprecated This object do not have function prototype */
  [Symbol.hasInstance]?: never;
  /** @deprecated This object do not have function prototype */
  [Symbol.metadata]?: never;
  /** @deprecated This object do not have function prototype */
  apply: never;
  /** @deprecated This object do not have function prototype */
  bind: never;
  /** @deprecated This object do not have function prototype */
  call: never;
  /** @deprecated This object do not have function prototype */
  arguments: never;
  /** @deprecated This object do not have function prototype */
  caller: never;
  /** @deprecated This object do not have function prototype */
  prototype: never;
  /** @deprecated This object do not have function prototype */
  toString: never;
  /** @deprecated This object do not have function prototype */
  length: never;
  /** @deprecated This object do not have function prototype */
  name: never;
};

type _CheckFunctionPrototypePropertyExhausted = StaticAssert<
  IsExtends<keyof Function, keyof NotFunctionPrototype>
>;

export type AnyTuple = [unknown, ...unknown[]] | [];

export type Constructor<T = any> = new (...args: any[]) => T;

export type UnionToIntersection<U> = (
  U extends any ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type LastOf<U> = UnionToIntersection<
  U extends any ? () => U : never
> extends () => infer R
  ? R
  : never;

// Recursive helper that generates an intersected structure of combinations
// By sequentially pulling individual keys, mapping over their unions, and stacking them.
type ExplodeImpl<T, K = keyof T, Last = LastOf<K>> = [K] extends [never]
  ? {} // Base case: no more keys
  : Last extends keyof T
    ? T[Last] extends infer V
      ? V extends any // Distribute the union of the property value
        ? { [P in Last]: V } & ExplodeImpl<Omit<T, Last>>
        : never
      : never
    : never;

// Formatter helper that cleans up intersections into distinct flat objects
// (Converts `{a: 1} & {b: 1}` to `{a: 1, b: 1}`)
type Explode<T> = ExplodeImpl<T> extends infer O
  ? O extends any
    ? { [K in keyof O]: O[K] }
    : never
  : never;

// type ExplodedMetaBase = Explode<MetaBase>;

export type Expression = string | number | Expression[];

export const toExpression: unique symbol = Symbol("toExpression");
export const typingInfo: unique symbol = Symbol("meta");

type TypingInfoSymbol = typeof typingInfo;

export type EntityAreaType = EntityArea["type"];

export interface TypingInfoBase {
  type: ExEntityType;
  areaType: EntityAreaType;
  variables: string;
}

export interface IQuery<Ty extends TypingInfoBase = TypingInfoBase> {
  [typingInfo]: Ty;
  [toExpression]: () => Expression;
}

export type InferResult<Q extends IQuery> = Computed<
  Q[TypingInfoSymbol],
  TypingInfoBase
>;

export type HeterogeneousMetaBase = MetaBase & {
  returns: "identical" | TypingInfoBase;
};
export interface MetaBase {
  type: ExEntityType;
  areaType: EntityAreaType;
  who: "my" | "opp";
  definition: number;
  position: "active" | "prev" | "next" | "standby";
  defeated: "only" | "includes";
  id: number;
  variables: {};
}

export type TypingInfoFromMeta<M extends MetaBase> = {
  type: M["type"];
  areaType: M["areaType"];
  variables: Extract<keyof M["variables"], string>;
};

export type ReturnOfMeta<M extends MetaBase> = Computed<
  M extends HeterogeneousMetaBase
    ? M["returns"] extends "identical"
      ? TypingInfoFromMeta<M>
      : M["returns"] extends TypingInfoBase
        ? M["returns"]
        : never
    : M,
  TypingInfoBase
>;

export type CharacterReq = {
  type: "character";
  areaType: "characters";
};
export type EntityOnCharacterReq = {
  type: "status" | "equipment";
  areaType: "characters";
};
export type CardReq = {
  type: "eventCard" | "equipment" | "support";
  areaType: "hands" | "pile";
};
export type AttachmentReq = {
  type: "attachment";
  areaType: "hands" | "pile";
};

type ReqBase = {
  type: MetaBase["type"];
  areaType: MetaBase["areaType"];
};

export type UnaryOperator = "not" | "has" | "at" | "recentFrom";
export type BinaryOperator = "orElse" | "union" | "intersection";

export type CompositeOperator = UnaryOperator | BinaryOperator;

export type UnaryOperatorMetas = {
  not: {
    operand: ReqBase;
    result: ReqBase;
  };
  has: {
    operand: EntityOnCharacterReq;
    result: CharacterReq;
  };
  at: {
    operand: CharacterReq;
    result: EntityOnCharacterReq;
  };
  with: {
    operand: AttachmentReq;
    result: CardReq;
  };
  on: {
    operand: CardReq;
    result: AttachmentReq;
  };
  recentFrom: {
    operand: CharacterReq;
    result: CharacterReq;
  };
};

type PropsRelated<T, U, Props extends keyof T & keyof U> = {
  [K in Props]: Related<T[K], U[K]> extends true ? 0 : unknown;
}[Props] extends 0
  ? true
  : false;

export type RelatedToReq<
  Input extends TypingInfoBase,
  Req extends ReqBase,
> = PropsRelated<Input, Req, "type" | "areaType">;
