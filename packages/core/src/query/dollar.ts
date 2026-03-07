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
import type {
  Computed,
  HeterogeneousMetaBase,
  InferResult,
  IQuery,
  MetaBase,
  NotFunctionPrototype,
  RelatedToReq,
  TypingInfoBase,
  TypingInfoFromMeta,
  UnaryOperatorMetas,
} from "./utils";

type DollarUnaryOperatorMethods = {
  [K in keyof UnaryOperatorMetas]: {
    <T extends IQuery>(
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

const UNARY_OPS = ["has", "at", "not", "recentFrom"] as const;

class Dollar {
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
    for (const name of UNARY_OPS) {
      const chainForm = () => {
        const callingForm = (q: IQuery) => {
          return createPrimaryQuery({
            leadingUnaryOp: name,
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
    ...args: { [K in keyof T]: IQuery<T[K]> }
  ): CompositeQuery<IntersectionTy<T>> {
    return createCompositeQuery("intersection", args);
  }

  union<T extends TypingInfoBase[]>(
    ...args: { [K in keyof T]: IQuery<T[K]> }
  ): CompositeQuery<UnionTy<T>> {
    return createCompositeQuery("union", args);
  }
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

type IDollar = Dollar &
  PrimaryMethods<InitialPrimaryMeta> &
  DollarUnaryOperatorMethods;

export const $ = new Dollar() as IDollar;
