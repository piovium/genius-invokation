import type { SExprSchema } from "./expr_schema";
import {
  toExpression,
  toExpressionUnordered,
  type IUnorderedQuery,
  type TypingInfoBase,
} from "./utils";

const isUnorderedQuery = (query: unknown): query is IUnorderedQuery => {
  return !!query && typeof query === "object" && toExpressionUnordered in query;
};

export class MakeOrderedMethods<Ty extends TypingInfoBase> {
  private _unorderedQuery: SExprSchema.UnorderedQuery;
  private _limitCount = Number.POSITIVE_INFINITY;
  private _orderBySpecs: SExprSchema.OrderBySpec[] = [];

  constructor(unorderedQuery: SExprSchema.UnorderedQuery) {
    this._unorderedQuery = unorderedQuery;
  }

  private _makeThisOrdered(): MakeOrderedMethods<Ty> {
    const self: any = this;
    if (this instanceof MakeOrderedMethods) {
      return this;
    } else if (isUnorderedQuery(self)) {
      return new MakeOrderedMethods<Ty>(self[toExpressionUnordered]());
    } else {
      throw new Error("Expected an unordered query");
    }
  }
  sortByFn(
    fn: (variables: Record<Ty["variables"], number>) => number,
  ): MakeOrderedMethods<Ty> {
    this._orderBySpecs.push(["fn", fn.toString()]);
    return this._makeThisOrdered();
  }
  sortBy<V extends Ty["variables"]>(variable: V): MakeOrderedMethods<Ty>;
  sortBy<V1 extends Ty["variables"], V2 extends Ty["variables"]>(
    lhs: V1 | number,
    op: "+" | "-" | "*" | "/" | "%",
    rhs: V2 | number,
  ): MakeOrderedMethods<Ty>;
  sortBy(
    lhs: string | number,
    op?: "+" | "-" | "*" | "/" | "%",
    rhs?: string | number,
  ): MakeOrderedMethods<Ty> {
    if (!op) {
      this._orderBySpecs.push(["expr", lhs]);
    } else {
      this._orderBySpecs.push(["expr", [op, lhs, rhs!]]);
    }
    return this._makeThisOrdered();
  }
  sortByRaw(...specs: SExprSchema.OrderBySpec[]) {
    this._orderBySpecs.push(...specs);
    return this._makeThisOrdered();
  }

  limit(count: number): MakeOrderedMethods<Ty> {
    this._limitCount = count;
    return this._makeThisOrdered();
  }

  [toExpression](): SExprSchema.OrderedQuery {
    return [
      "orderBy",
      this._unorderedQuery,
      this._orderBySpecs,
      this._limitCount,
    ];
  }
}
