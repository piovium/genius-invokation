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
  createCompositeQuery,
  type CompositeQuery,
  type IntersectionTy,
  type UnionTy,
} from "./composite_query";
import {
  PRIMARY_METHODS,
  PrimaryMethods,
  type PrimaryMethodNames,
} from "./primary_methods";
import { createPrimaryQuery, type PrimaryQuery } from "./primary_query";
import {
  diceCostKey,
  inInitialPileKey,
  toExpressionUnordered,
  UNARY_OPERATORS,
  type Computed,
  type HeterogeneousMetaBase,
  type InferResult,
  type IQuery,
  type IUnorderedQuery,
  type MetaBase,
  type NotFunctionPrototype,
  type RelatedToReq,
  type TypingInfoBase,
  type TypingInfoFromMeta,
  type UnaryOperatorMetas,
} from "./utils";

type DollarUnaryOperatorMethods = {
  [K in keyof UnaryOperatorMetas]: {
    <T extends IUnorderedQuery>(
      arg: RelatedToReq<
        InferResult<T>,
        UnaryOperatorMetas[K]["operand"]
      > extends true
        ? T
        : never,
    ): PrimaryQuery<UnaryOperatorMetas[K]["result"] & AnyMeta>;
  } & PrimaryQuery<
    Computed<UnaryOperatorMetas[K]["operand"] & MetaBase, MetaBase> & {
      returns: TypingInfoFromMeta<UnaryOperatorMetas[K]["result"] & AnyMeta>;
    }
  > &
    NotFunctionPrototype;
};

export class Dollar {
  static {
    // creating primary methods
    for (const [method, descriptor] of Object.entries<PropertyDescriptor>(
      PRIMARY_METHODS,
    ) as [PrimaryMethodNames, PropertyDescriptor][]) {
      if (descriptor.get) {
        Object.defineProperty(Dollar.prototype, method, {
          get() {
            return createPrimaryQuery({
              leadingUnaryOp: null,
            })[method];
          },
        });
      } else if (descriptor.value) {
        Object.defineProperty(Dollar.prototype, method, {
          value(...args: unknown[]) {
            return (
              createPrimaryQuery({
                leadingUnaryOp: null,
              })[method] as (...args: unknown[]) => unknown
            )(...args);
          },
        });
      }
    }
    // creating leading unary operator methods
    for (const name of UNARY_OPERATORS) {
      const chainForm = () => {
        const callingForm = (q: IUnorderedQuery) => {
          return createPrimaryQuery({
            leadingUnaryOp: name,
            initExpression: [q[toExpressionUnordered]()],
          });
        };
        const returns = createPrimaryQuery({
          leadingUnaryOp: name,
        });
        Object.setPrototypeOf(callingForm, returns);
        return callingForm;
      };
      Object.defineProperty(Dollar.prototype, name, {
        get: chainForm,
        enumerable: true,
      });
    }
  }

  get any(): PrimaryQuery<AnyMeta> {
    return createPrimaryQuery<AnyMeta>({
      leadingUnaryOp: null,
    });
  }

  intersection<T extends TypingInfoBase[]>(
    ...args: { [K in keyof T]: IUnorderedQuery<T[K]> }
  ): CompositeQuery<IntersectionTy<T>> {
    return createCompositeQuery("intersection", args);
  }

  union<T extends TypingInfoBase[]>(
    ...args: { [K in keyof T]: IUnorderedQuery<T[K]> }
  ): CompositeQuery<UnionTy<T>> {
    return createCompositeQuery("union", args);
  }

  readonly keys = {
    diceCost: diceCostKey,
    inInitialPile: inInitialPileKey,
  } as const;
}

type InitialPrimaryMeta = Computed<
  MetaBase & {
    returns: "identical";
  },
  MetaBase
>;

type AnyMeta = Computed<
  MetaBase & {
    returns: "identical";
  },
  HeterogeneousMetaBase
>;

export type IDollar = Dollar &
  PrimaryMethods<InitialPrimaryMeta> &
  DollarUnaryOperatorMethods;

export const $ = new Dollar() as IDollar;

const MACROS = {
  myActive: $.my.active,
  oppActive: $.opp.active,

  myEnergyNotFull: $.my.character.var("energy", "<", "maxEnergy"),

  oppActivePrioritized: $.opp.character.var("health", ">", 0).limit(1),

  myMinHealth: $.my.character.orderBy("health").limit(1),
  oppMinHealth: $.opp.character.orderBy("health").limit(1),
  myMaxHealth: $.my.character.orderBy(0, "-", "health").limit(1),
  oppMaxHealth: $.opp.character.orderBy(0, "-", "health").limit(1),

  myMostInjured: $.my.character.orderBy("health", "-", "maxHealth").limit(1),
  oppMostInjured: $.opp.character.orderBy("health", "-", "maxHealth").limit(1),
  myLeastInjured: $.my.character.orderBy("maxHealth", "-", "health").limit(1),
  oppLeastInjured: $.opp.character.orderBy("maxHealth", "-", "health").limit(1),

  myHandsOrderByCost: $.my.hand.orderBy(0, "-", $.keys.diceCost),
  oppHandsOrderByCost: $.opp.hand.orderBy(0, "-", $.keys.diceCost),
} as const satisfies Record<string, IQuery>;
