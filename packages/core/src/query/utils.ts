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

import type { EntityArea } from "../base/entity";
import type { ExEntityType } from "../builder/type";
import type { SExprSchema } from "./expr_schema";
import type { CharacterVariableConfigs } from "../base/character";

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

export type IsEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends <
  G,
>() => G extends U ? 1 : 2
  ? true
  : false;

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

export type NonIndexKeyOf<T> = keyof {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: 0;
};

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

export const toExpressionUnordered: unique symbol = Symbol.for(
  "GiTcgCore/query/toExpressionUnordered",
);
export type ToExpressionUnorderedSymbol = typeof toExpressionUnordered;
export const toExpression: unique symbol = Symbol.for(
  "GiTcgCore/query/toExpression",
);
export type ToExpressionSymbol = typeof toExpression;

export const typingInfo: unique symbol = Symbol.for(
  "GiTcgCore/query/typingInfo",
);
export type TypingInfoSymbol = typeof typingInfo;

export const diceCostKey: unique symbol = Symbol.for(
  "GiTcgCore/query/varKey/diceCost",
);
export type DiceCostKey = typeof diceCostKey;
export const inInitialPileKey: unique symbol = Symbol.for(
  "GiTcgCore/query/varKey/inInitialPile",
);
export type InInitialPileKey = typeof inInitialPileKey;

export interface StateVariables {
  [key: string]: number;
  [diceCostKey]?: number;
  [inInitialPileKey]?: number;
}

export type StateVariablesKey = Exclude<keyof StateVariables, number>;

export type EntityAreaType = EntityArea["type"];

export interface TypingInfoBase {
  type: ExEntityType;
  areaType: EntityAreaType;
  variables: string;
}

export interface IQuery<Ty extends TypingInfoBase = TypingInfoBase> {
  [typingInfo]: Ty;
  [toExpression](): SExprSchema.Query;
}

export interface IUnorderedQuery<Ty extends TypingInfoBase = TypingInfoBase>
  extends IQuery<Ty> {
  [toExpressionUnordered]: () => SExprSchema.UnorderedQuery;
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
  variables:
    | Extract<keyof M["variables"], string>
    | IsEqual<M["type"], "character"> extends true
    ? NonIndexKeyOf<CharacterVariableConfigs>
    : never;
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

export const RELATIONAL_METHODS = ["has", "at", "with", "on"] as const;

export const UNARY_OPERATORS = [
  "has",
  "at",
  "with",
  "on",
  "not",
  "recentOppFrom",
] as const;
export type UnaryOperator = (typeof UNARY_OPERATORS)[number];

export const BINARY_OPERATORS = [
  "orElse",
  "exclude",
  "union",
  "intersection",
] as const;
export type BinaryOperator = (typeof BINARY_OPERATORS)[number];

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
  recentOppFrom: {
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

export function variableKeyToExpr(
  key: StateVariablesKey,
): SExprSchema.NumericalExpression {
  if (key === diceCostKey) {
    return ["special:diceCost"];
  } else if (key === inInitialPileKey) {
    return ["special:inInitialPile"];
  } else {
    return key;
  }
}
export function variableKeyToPropertyCode(key: StateVariablesKey): string {
  if (typeof key === "symbol") {
    return `Symbol.for(${JSON.stringify(Symbol.keyFor(key))})`;
  } else {
    return JSON.stringify(key);
  }
}

// https://github.com/puppeteer/puppeteer/blob/bf1e9722eef723c80250119d81fd9d9e0596c074/packages/puppeteer-core/src/util/Function.ts

type UnknownFunction = (...args: unknown[]) => unknown;
export function reviveFunction(code: string): UnknownFunction {
  return new Function(`return ${code}`)() as UnknownFunction;
}

export function stringifyFunction(fn: (...args: never) => unknown): string {
  let value = fn.toString();
  if (
    value.match(/^(async )*function(\(|\s)/) ||
    value.match(/^(async )*function\s*\*\s*/)
  ) {
    return value;
  }
  const isArrow =
    value.startsWith("(") ||
    value.match(/^async\s*\(/) ||
    value.match(
      /^(async)?\s*[$_a-zA-Z][$\w\u200C\u200D]*\s*=>/,
      // The below one is more accurate but requires ICU support, which is not always available (e.g. cbindings)
      // /^(async)*\s*(?:[$_\p{ID_Start}])(?:[$\u200C\u200D\p{ID_Continue}])*\s*=>/u,
    );
  if (isArrow) {
    return value;
  }
  // This means we might have a function shorthand (e.g. `test(){}`). Let's
  // try prefixing.
  let prefix = "function ";
  if (value.startsWith("async ")) {
    prefix = `async ${prefix}`;
    value = value.substring("async ".length);
  }
  return `${prefix}${value}`;
}
