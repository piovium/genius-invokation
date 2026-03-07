import { mixins } from "../utils";
import { BinaryMethods } from "./binary_methods";
import type { SExprSchema } from "./expr_schema";
import { PrimaryMethods } from "./primary_methods";
import { RelationMethods } from "./relation_methods";
import {
  toExpression,
  type Computed,
  type Expression,
  type HeterogeneousMetaBase,
  type IQuery,
  type typingInfo,
  type ReturnOfMeta,
  type UnaryOperator,
} from "./utils";

type DefeatedKeyword = "defeatedOnly" | "noDefeated" | "all";

export class PrimaryMethodsInternal {
  private _constraints: SExprSchema.UnorderedQuery[] = [];
  private _defeatedKeyword: DefeatedKeyword = "noDefeated";

  setDefeatedConstraint(kw: "defeatedOnly" | "all"): void {
    this._defeatedKeyword = kw;
  }
  addConstraint(...constraints: SExprSchema.UnorderedQuery[]): void {
    this._constraints.push(...constraints);
  }
  [toExpression](): SExprSchema.CompositeQuery {
    const finalConstraints: SExprSchema.UnorderedQuery[] = [];
    if (this._defeatedKeyword === "defeatedOnly") {
      finalConstraints.push(["defeated", "only"]);
    } else if (this._defeatedKeyword === "noDefeated") {
      finalConstraints.push(["defeated", "ignore"]);
    }
    return ["intersection", ...finalConstraints, ...this._constraints];
  }
}

export interface PrimaryQueryInitOptions {
  leadingUnaryOp?: UnaryOperator | null;
}

class PrimaryQueryImpl<Meta extends HeterogeneousMetaBase>
  implements IQuery<ReturnOfMeta<Meta>>
{
  declare [typingInfo]: ReturnOfMeta<Meta>;
  private _internal: PrimaryMethodsInternal;
  private _leadingUnaryOp: UnaryOperator | null;

  constructor(options: PrimaryQueryInitOptions) {
    this._internal = new PrimaryMethodsInternal();
    this._leadingUnaryOp = options.leadingUnaryOp ?? null;
  }

  [toExpression](): Expression {
    if (this._leadingUnaryOp !== null) {
      return [this._leadingUnaryOp, this._internal[toExpression]()];
    }
    return this._internal[toExpression]();
  }
}

const PrimaryQuery = mixins(PrimaryQueryImpl, [
  PrimaryMethods,
  RelationMethods,
  BinaryMethods,
]) as any;

export const createPrimaryQuery = <Meta extends HeterogeneousMetaBase>(
  options: PrimaryQueryInitOptions = {},
): PrimaryQuery<Meta> => {
  return new PrimaryQuery(options);
};

export type PrimaryQuery<Meta extends HeterogeneousMetaBase> = Computed<
  PrimaryQueryImpl<Meta> &
    PrimaryMethods<Meta> &
    RelationMethods<Meta> &
    // Forbidden subsequent binary operator that starts with unary shortcut;
    // E.g. `$.has.def(...).orElse($...)` does not make sense. Use `$.has($.def(...)).orElse($...)` instead.
    (Meta extends {
      returns: "identical";
    }
      ? BinaryMethods<ReturnOfMeta<Meta>>
      : {}),
  IQuery<ReturnOfMeta<Meta>>
> & { META: Meta };
