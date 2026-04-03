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

const assertsArgCount = (op: string, args: unknown[], expected = 2) => {
  if (args.length !== expected) {
    throw new Error(
      `Invalid number of arguments for '${op}': expected ${expected}, got ${args.length}`,
    );
  }
};

type NumericalLikeExpression =
  | SExprSchema.NumericalExpression
  | SExprSchema.BooleanExpression;
type ExpressionKeyAndDepth = [key: string, depth: number];
type ParsedExpression = (variables: Record<string, number>) => number;
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
        const built = QueryRuntime.#buildExpression(
          expr,
          runCountHint ?? this.entities.size,
        );
        return (id: number) =>
          built(this.entities.get(id)?.state.variables ?? {});
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
  static #buildExpression(
    expr: NumericalLikeExpression,
    runCountHint: number,
  ): ParsedExpression {
    const [cacheKey, depth] = this.#getExpressionKeyAndEstimatedDepth(expr);
    const cachedEntry = this.#expressionCache.get(cacheKey);
    const shouldCompile =
      depth > 3 || (depth >= 2 && runCountHint > 5) || runCountHint > 15;
    if (cachedEntry && +cachedEntry[1] >= +shouldCompile) {
      return cachedEntry[0];
    }
    if (shouldCompile) {
      const compiledFn = this.#compileExpression(expr);
      this.#expressionCache.set(cacheKey, [compiledFn, true]);
      return compiledFn;
    } else {
      const interpretFn = this.#interpretExpression(expr);
      this.#expressionCache.set(cacheKey, [interpretFn, false]);
      return interpretFn;
    }
  }

  static #interpretExpression(expr: NumericalLikeExpression): ParsedExpression {
    return (variables: Record<string, number>) => {
      const visitor = (expr: Expression | NumericalLikeExpression): number => {
        if (typeof expr === "number") {
          return expr;
        }
        if (typeof expr === "string") {
          return variables[expr] ?? Number.NaN;
        }
        const [op, ...args] = expr as Exclude<
          NumericalLikeExpression,
          number | string
        >;
        switch (op) {
          case "+": {
            return args.reduce<number>((sum, arg) => sum + visitor(arg), 0);
          }
          case "-": {
            if (args.length === 1) {
              return -visitor(args[0]);
            } else if (args.length === 2) {
              return visitor(args[0]) - visitor(args[1]);
            } else {
              throw new Error(
                `Invalid number of arguments for '-': ${args.length}`,
              );
            }
          }
          case "*": {
            return args.reduce<number>(
              (product, arg) => product * visitor(arg),
              1,
            );
          }
          case "/": {
            if (args.length === 1) {
              return 1 / visitor(args[0]);
            } else if (args.length === 2) {
              return visitor(args[0]) / visitor(args[1]);
            } else {
              throw new Error(
                `Invalid number of arguments for '/': ${args.length}`,
              );
            }
          }
          case "%": {
            assertsArgCount("%", args);
            return visitor(args[0]) % visitor(args[1]);
          }
          case "min": {
            return Math.min(...args.map(visitor));
          }
          case "max": {
            return Math.max(...args.map(visitor));
          }
          case "=": {
            assertsArgCount("=", args);
            return +(visitor(args[0]) === visitor(args[1]));
          }
          case "!=": {
            assertsArgCount("!=", args);
            return +(visitor(args[0]) !== visitor(args[1]));
          }
          case ">": {
            assertsArgCount(">", args);
            return +(visitor(args[0]) > visitor(args[1]));
          }
          case ">=": {
            assertsArgCount(">=", args);
            return +(visitor(args[0]) >= visitor(args[1]));
          }
          case "<": {
            assertsArgCount("<", args);
            return +(visitor(args[0]) < visitor(args[1]));
          }
          case "<=": {
            assertsArgCount("<=", args);
            return +(visitor(args[0]) <= visitor(args[1]));
          }
          case "and": {
            return args.every(visitor) ? 1 : 0;
          }
          case "or": {
            return args.some(visitor) ? 1 : 0;
          }
          case "not": {
            assertsArgCount("not", args, 1);
            return visitor(args[0]) ? 0 : 1;
          }
          default: {
            const _check: never = op;
            throw new Error(`Unknown expression type: ${expr[0]}`);
          }
        }
      };
      return visitor(expr);
    };
  }

  static #compileExpression(expr: NumericalLikeExpression): ParsedExpression {
    const VARIABLES_PARAM = "variables";
    const visitor = (expr: Expression | NumericalLikeExpression): string => {
      if (typeof expr === "number") {
        return String(expr);
      }
      if (typeof expr === "string") {
        return `(${VARIABLES_PARAM}[${JSON.stringify(expr)}] ?? Number.NaN)`;
      }
      const [op, ...args] = expr as Exclude<
        NumericalLikeExpression,
        number | string
      >;
      switch (op) {
        case "+": {
          return `(${args.map(visitor).join(" + ")})`;
        }
        case "-": {
          if (args.length === 1) {
            return `(-${visitor(args[0])})`;
          } else if (args.length === 2) {
            return `(${visitor(args[0])} - ${visitor(args[1])})`;
          } else {
            throw new Error(
              `Invalid number of arguments for '-': ${args.length}`,
            );
          }
        }
        case "*": {
          return `(${args.map(visitor).join(" * ")})`;
        }
        case "/": {
          if (args.length === 1) {
            return `(1 / ${visitor(args[0])})`;
          } else if (args.length === 2) {
            return `(${visitor(args[0])} / ${visitor(args[1])})`;
          } else {
            throw new Error(
              `Invalid number of arguments for '/': ${args.length}`,
            );
          }
        }
        case "%": {
          assertsArgCount("%", args);
          return `(${visitor(args[0])} % ${visitor(args[1])})`;
        }
        case "min": {
          return `Math.min(${args.map(visitor).join(", ")})`;
        }
        case "max": {
          return `Math.max(${args.map(visitor).join(", ")})`;
        }
        case "=": {
          assertsArgCount("=", args);
          return `(+(${visitor(args[0])} === ${visitor(args[1])}))`;
        }
        case "!=": {
          assertsArgCount("!=", args);
          return `(+(${visitor(args[0])} !== ${visitor(args[1])}))`;
        }
        case ">": {
          assertsArgCount(">", args);
          return `(+(${visitor(args[0])} > ${visitor(args[1])}))`;
        }
        case ">=": {
          assertsArgCount(">=", args);
          return `(+(${visitor(args[0])} >= ${visitor(args[1])}))`;
        }
        case "<": {
          assertsArgCount("<", args);
          return `(+(${visitor(args[0])} < ${visitor(args[1])}))`;
        }
        case "<=": {
          assertsArgCount("<=", args);
          return `(+(${visitor(args[0])} <= ${visitor(args[1])}))`;
        }
        case "and": {
          return `(${args.map(visitor).join(" && ")})`;
        }
        case "or": {
          return `(${args.map(visitor).join(" || ")})`;
        }
        case "not": {
          assertsArgCount("not", args, 1);
          return `(!${visitor(args[0])})`;
        }
        default: {
          const _check: never = op;
          throw new Error(`Unknown expression type: ${expr[0]}`);
        }
      }
    };
    const functionBody = `return ${visitor(expr)};`;
    // console.log("Compiled expression function body:", functionBody);
    return new Function(VARIABLES_PARAM, functionBody) as ParsedExpression;
  }

  static #expressionKeyCache = new WeakMap<object, ExpressionKeyAndDepth>();
  static #getExpressionKeyAndEstimatedDepth(
    expr: NumericalLikeExpression,
  ): ExpressionKeyAndDepth {
    if (typeof expr !== "object") {
      return [String(expr), 0];
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

  static #expressionCache = new Map<string, ParsedExpressionAndIsCompiled>();
  /**
   * Estimate the maximum depth of an expression tree.
   * We do not consider literal `[` inside string because it is rare.
   * (Just an estimation for optimization purpose, not for correctness.)
   */
  static #estimateExpressionDepth(jsonKey: string) {
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
