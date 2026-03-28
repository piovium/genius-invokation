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

import type { AnyState, GameState } from "../base/state";
import { toExpression, type Expression, type IQuery } from "./utils";
import {
  getAllEntitiesWithArea,
  toSortedBy,
  type EntityWithArea,
} from "../utils";
import type { SExprSchema } from "./expr_schema";

export function queryToExpression(query: IQuery): SExprSchema.Query {
  return query[toExpression]();
}

interface EntityEntry extends EntityWithArea {
  index: number;
}

type ExpressionKeyAndDepth = [key: string, depth: number];
type ParsedExpression<Ret = any> = (id: number) => Ret;
type ParsedExpressionAndIsCompiled = [
  exprFn: ParsedExpression,
  compiled: boolean,
];

class QueryRuntime {
  readonly entities: ReadonlyMap<number, EntityEntry>;
  readonly #globalUniverse: ReadonlySet<number>;
  readonly state: GameState;
  readonly who: 0 | 1;
  readonly #defaultOrder: (id: number) => number;

  constructor(state: GameState, who: 0 | 1) {
    this.entities = new Map(
      getAllEntitiesWithArea(state).map((e, index) => [
        e.state.id,
        { ...e, index },
      ]),
    );
    this.state = state;
    this.who = who;
    this.#defaultOrder = (id: number) => this.entities.get(id)?.index ?? -1;
    this.#globalUniverse = new Set(this.entities.keys());
  }

  #parseOrderBy(
    orderBySpec: SExprSchema.OrderBySpec,
    runCountHint?: number,
  ): (id: number) => number {
    switch (orderBySpec[0]) {
      case "expr": {
        const [_, expr] = orderBySpec;
        return this.#buildExpression(expr, runCountHint);
      }
      case "fn": {
        const [_, code] = orderBySpec;
        // TODO
        return () => 0;
      }
      default: {
        throw new Error(`Unknown orderBy spec: ${orderBySpec[0]}`);
      }
    }
  }

  /**
   * There are two implementation of building expression.
   * 1. Interpret. Just recursively evaluate the expression. This is straightforward
   *    but may be slow, especially evaluating complex expression on a lot of entities.
   * 2. Compile. Transform the expression into a piece of JavaScript code and wrap it
   *    to a new `Function`. This triggers JS Engine's JIT if it is called multiple
   *    times, which can be much faster. However, it slows down due to the overhead of
   *    code generation (especially when running for just few entities).
   *
   * After benchmarking, we use the following strategy:
   * - Evaluate the `depth` of expression tree, and the number of times the expression
   *   is expected to be evaluated (`runCountHint`).
   * - For `depth` = 1, use Compile only when `runCountHint` > 15.
   * - For 2 <= `depth` <= 3, use Compile only when `runCountHint` > 5.
   * - For `depth` > 3, always use Compile.
   * 
   * @ref Benchmark Gist: https://gist.github.com/guyutongxue/d55be95c3a171c1f3fcd2b4093cf5820
   * 
   * @param expr
   * @param runCountHint
   */
  #buildExpression(
    expr: SExprSchema.NumericalExpression | SExprSchema.BooleanExpression,
    runCountHint = this.entities.size,
  ): (id: number) => any {
    const [cacheKey, depth] = this.#getExpressionKeyAndEstimatedDepth(expr);
    const cachedEntry = this.#expressionCache.get(cacheKey);
    const shouldCompile =
      depth > 3 || (depth >= 2 && runCountHint > 5) || runCountHint > 15;
    if (cachedEntry && +cachedEntry[1] >= +shouldCompile) {
      return cachedEntry[0];
    }
    if (shouldCompile) {
      // TODO
      const compiledFn = () => 0;
      this.#expressionCache.set(cacheKey, [compiledFn, true]);
      return compiledFn;
    } else {
      // TODO
      const interpretFn = () => 0;
      this.#expressionCache.set(cacheKey, [interpretFn, false]);
      return interpretFn;
    }
  }

  #expressionKeyCache = new WeakMap<object, ExpressionKeyAndDepth>();
  #getExpressionKeyAndEstimatedDepth(
    expr: SExprSchema.NumericalExpression | SExprSchema.BooleanExpression,
  ): ExpressionKeyAndDepth {
    if (typeof expr !== "object") {
      return [`${expr}`, 0];
    }
    let entry = this.#expressionKeyCache.get(expr);
    if (!entry) {
      const key = JSON.stringify(expr);
      const depth = this.#estimateExpressionDepth(key);
      entry = [key, depth];
      this.#expressionKeyCache.set(expr, entry);
    }
    return entry;
  }

  #expressionCache = new Map<string, ParsedExpressionAndIsCompiled>();
  /**
   * Estimate the maximum depth of an expression tree.
   * We do not consider literal `[` inside string because it is rare.
   * (Just an estimation for optimization purpose, not for correctness.)
   */
  #estimateExpressionDepth(jsonKey: string) {
    let depth = 0;
    let maxDepth = 0;
    for (const char of jsonKey) {
      if (char === "[") {
        depth++;
      } else if (char === "]") {
        depth--;
      }
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth;
  }

  execute(expr: SExprSchema.Query): number[] {
    switch (expr[0]) {
      case "orderBy": {
        const [_, unorderedQuery, orderBy, limit] = expr;
        const unorderedResult = this.executeUnordered(unorderedQuery);
        const orderByFns = [
          ...orderBy.map((spec) =>
            this.#parseOrderBy(spec, unorderedResult.size),
          ),
          this.#defaultOrder,
        ];
        const order = (id: number) => orderByFns.map((f) => f(id));
        return toSortedBy([...unorderedResult], order).slice(0, limit);
      }
      default: {
        return toSortedBy([...this.executeUnordered(expr)], this.#defaultOrder);
      }
    }
  }
  executeUnordered(
    expr: SExprSchema.UnorderedQuery,
    universe = this.#globalUniverse,
  ): Set<number> {
    // TODO
    switch (expr[0]) {
      // basic
      case "area":
      case "defeated":
      case "definition":
      case "id":
      case "offStage":
      case "onStage":
      case "position":
      case "tag":
      case "type":
      case "variables":
      case "who":

      // complex
      case "recentFrom":
      case "tagOf":

      // relationals
      case "has":
      case "at":
      case "on":
      case "with":

      // unary
      case "not":

      // binaries
      case "exclude":
      case "intersection":
      case "orElse":
      case "union":

      default: {
        throw new Error(`Unknown query operator: ${expr[0]}`);
      }
    }
  }
}
