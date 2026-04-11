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

import type { EntityState, CharacterTag, GameState } from "../base/state";
import {
  diceCostKey,
  inInitialPileKey,
  reviveFunction,
  toExpression,
  type Expression,
  type InferResult,
  type IQuery,
  type StateVariables,
} from "./utils";
import {
  diceCostSizeOfCard,
  getAllEntitiesWithArea,
  toSortedBy,
  type EntityWithArea,
} from "../utils";
import type { SExprSchema } from "./expr_schema";
import { CharacterBase } from "../builder/context/character";
import { flip } from "@gi-tcg/utils";
import type { EntityArea } from "../base/entity";
import type { ExEntityState } from "../builder/type";

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
type ParsedExpression = (variables: StateVariables) => number;
type ParsedExpressionAndIsCompiled = [
  exprFn: ParsedExpression,
  compiled: boolean,
];

const OFF_STAGE_AREAS = ["hands", "pile"] as EntityArea["type"][];
interface ProperIterable<T> {
  [Symbol.iterator](): IteratorObject<T>;
}

class QueryRunner {
  readonly entities: ReadonlySet<EntityEntry>;
  readonly entityMap: ReadonlyMap<number, EntityEntry>;

  readonly state: GameState;
  who: 0 | 1 = 0;
  readonly #defaultOrder: (entry: EntityEntry) => number;

  readonly #characters: ReadonlySet<EntityEntry>;
  readonly #entitiesOnCharacters: ReadonlySet<EntityEntry>;
  readonly #attachables: ReadonlySet<EntityEntry>;
  readonly #attachments: ReadonlySet<EntityEntry>;

  readonly #characterHelpers: ReadonlyMap<number, CharacterBase>;

  constructor(state: GameState) {
    const entityMap = new Map<number, EntityEntry>();
    const characters = new Set<EntityEntry>();
    const entitiesOnCharacters = new Set<EntityEntry>();
    const attachables = new Set<EntityEntry>();
    const attachments = new Set<EntityEntry>();
    const characterHelpers = new Map<number, CharacterBase>();

    const entitiesWithArea = getAllEntitiesWithArea(state);
    for (let i = 0; i < entitiesWithArea.length; i++) {
      const entry = { ...entitiesWithArea[i], index: i };
      entityMap.set(entry.state.id, entry);
      if (entry.state.definition.type === "character") {
        characters.add(entry);
        characterHelpers.set(
          entry.state.id,
          new CharacterBase(state, entry.state.id),
        );
      } else if (entry.area.type === "characters") {
        entitiesOnCharacters.add(entry);
      }
      if (entry.area.type === "hands" || entry.area.type === "pile") {
        attachables.add(entry);
      }
      if (entry.state.definition.type === "attachment") {
        attachments.add(entry);
      }
    }
    this.entities = new Set(entityMap.values());
    this.entityMap = entityMap;
    this.#characters = characters;
    this.#entitiesOnCharacters = entitiesOnCharacters;
    this.#attachables = attachables;
    this.#attachments = attachments;
    this.#characterHelpers = characterHelpers;

    this.state = state;
    this.#defaultOrder = (entry: EntityEntry) => entry.index;
  }

  readonly variableParamCache = new WeakMap<EntityEntry, StateVariables>();
  /**
   * 对行动牌（equipment, support, eventCard）开启两个特殊变量访问
   * 1. `special:diceCost`: 牌的骰子费用，考虑 attachments
   * 2. `special:inInitialPile`: 牌是否在对应玩家的初始牌堆中（0 或 1）
   * @param entry
   * @returns
   */
  #createVariableParam(entry: EntityEntry): StateVariables {
    const isActionCard =
      entry.state.definition.type === "equipment" ||
      entry.state.definition.type === "support" ||
      entry.state.definition.type === "eventCard";
    if (!isActionCard) {
      return entry.state.variables;
    }
    const cached = this.variableParamCache.get(entry);
    if (cached) {
      return cached;
    }
    let diceCost: number | undefined;
    let inInitialPile: number | undefined;
    const gameState = this.state;
    const initialPile = gameState.players[entry.area.who].initialPile;
    const result = new Proxy(entry.state.variables, {
      get(target, prop, receiver) {
        if (prop === diceCostKey) {
          return (diceCost ??= diceCostSizeOfCard(
            gameState,
            entry.state as EntityState,
          ));
        } else if (prop === inInitialPileKey) {
          return (inInitialPile ??= +initialPile.some(
            (c) => c.id === entry.state.definition.id,
          ));
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as StateVariables;
    this.variableParamCache.set(entry, result);
    return result;
  }

  #parseOrderByOrVariable(
    spec: SExprSchema.OrderBySpec | SExprSchema.VariableSpec,
    runCountHint?: number,
  ): (entry: EntityEntry) => number {
    switch (spec[0]) {
      case "expr": {
        const [_, expr] = spec;
        const built = QueryRunner.#buildExpression(
          expr,
          runCountHint ?? this.entities.size,
        );
        return (entry) => built(this.#createVariableParam(entry));
      }
      case "fn": {
        const [_, code] = spec;
        const revived = QueryRunner.#reviveFunction(code);
        return (entry) => revived(this.#createVariableParam(entry));
      }
      default: {
        throw new Error(`Unknown orderBy/variable spec: ${spec[0]}`);
      }
    }
  }

  static #revivedFunctions = new Map<string, ParsedExpression>();
  static #reviveFunction(code: string): ParsedExpression {
    const cached = this.#revivedFunctions.get(code);
    if (cached) {
      return cached;
    }
    const fn = reviveFunction(code) as ParsedExpression;
    this.#revivedFunctions.set(code, fn);
    return fn;
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
    return (variables: StateVariables) => {
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
          case "special:diceCost": {
            return variables[diceCostKey] ?? Number.NaN;
          }
          case "special:inInitialPile": {
            return variables[inInitialPileKey] ?? Number.NaN;
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
          if (args.length === 0) {
            return "0";
          }
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
          if (args.length === 0) {
            return "1";
          }
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
          if (args.length === 0) {
            return "1";
          }
          return `(+!!(${args.map(visitor).join(" && ")}))`;
        }
        case "or": {
          if (args.length === 0) {
            return "0";
          }
          return `(+!!(${args.map(visitor).join(" || ")}))`;
        }
        case "not": {
          assertsArgCount("not", args, 1);
          return `(+!${visitor(args[0])})`;
        }
        case "special:diceCost": {
          const keyStr = JSON.stringify(Symbol.keyFor(diceCostKey));
          return `(${VARIABLES_PARAM}[Symbol.for(${keyStr})] ?? Number.NaN)`;
        }
        case "special:inInitialPile": {
          const keyStr = JSON.stringify(Symbol.keyFor(inInitialPileKey));
          return `(${VARIABLES_PARAM}[Symbol.for(${keyStr})] ?? Number.NaN)`;
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

  execute(expr: SExprSchema.Query): EntityEntry[] {
    switch (expr[0]) {
      case "orderBy": {
        const [_, unorderedQuery, orderBy, limit] = expr;
        const unorderedResult = new Set(this.executeUnordered(unorderedQuery));
        const orderByFns = [
          ...orderBy.map((spec) =>
            this.#parseOrderByOrVariable(spec, unorderedResult.size),
          ),
          this.#defaultOrder,
        ];
        const order = (entry: EntityEntry) => orderByFns.map((f) => f(entry));
        return toSortedBy([...unorderedResult], order).slice(0, limit);
      }
      default: {
        return toSortedBy([...this.executeUnordered(expr)], this.#defaultOrder);
      }
    }
  }
  executeUnordered(
    expr: SExprSchema.UnorderedQuery,
    universe: ProperIterable<EntityEntry> = this.entities,
  ): ProperIterable<EntityEntry> {
    const universeIt = universe[Symbol.iterator]();
    type EntityFilter = (entry: EntityEntry) => boolean;
    switch (expr[0]) {
      // basic
      case "area": {
        const [_, areaType, byPath] = expr;
        const byPathTypeFilter: Partial<
          Record<EntityArea["type"], EntityFilter>
        > = {
          characters: (entry) => entry.state.definition.type === "character",
          hands: (entry) => entry.state.definition.type !== "attachment",
          pile: (entry) => entry.state.definition.type !== "attachment",
        };
        const typeFilter =
          byPath === "true" ? (byPathTypeFilter[areaType] ?? (() => true)) : () => true;
        const filter: EntityFilter = (entry) =>
          entry.area.type === areaType && typeFilter(entry);
        return universeIt.filter(filter);
      }
      case "defeated": {
        const [_, defeatedSpec] = expr;
        const filter: EntityFilter =
          defeatedSpec === "only"
            ? (entry) => entry.state.variables.alive === 0
            : (entry) => entry.state.variables.alive !== 0;
        return universeIt.filter(filter);
      }
      case "definition": {
        const [_, defId] = expr;
        const filter: EntityFilter = (entry) =>
          entry.state.definition.id === defId;
        return universeIt.filter(filter);
      }
      case "id": {
        const [_, id] = expr;
        const entry = this.entityMap.get(id);
        return entry ? [entry] : [];
      }
      case "offStage": {
        const filter: EntityFilter = (entry) =>
          OFF_STAGE_AREAS.includes(entry.area.type);
        return universeIt.filter(filter);
      }
      case "onStage": {
        const filter: EntityFilter = (entry) =>
          !OFF_STAGE_AREAS.includes(entry.area.type);
        return universeIt.filter(filter);
      }
      case "position": {
        const [_, posSpec] = expr;
        const filter: EntityFilter = (entry) => {
          if (entry.state.definition.type !== "character") {
            return false;
          }
          return this.#characterHelpers
            .get(entry.state.id)!
            .satisfyPosition(posSpec);
        };
        return universeIt.filter(filter);
      }
      case "tag": {
        const [_, tag] = expr;
        const filter: EntityFilter = (entry) =>
          (entry.state.definition.tags as string[]).includes(tag);
        return universeIt.filter(filter);
      }
      case "type": {
        const [_, type] = expr;
        const filter: EntityFilter = (entry) =>
          entry.state.definition.type === type;
        return universeIt.filter(filter);
      }
      case "variables": {
        const [_, variableSpec] = expr;
        const filter = this.#parseOrderByOrVariable(variableSpec);
        return universeIt.filter(filter);
      }
      case "who": {
        const [_, whoDesc] = expr;
        const who = (
          {
            my: [0, 1],
            opp: [1, 0],
          } as const
        )[whoDesc][this.who];
        const filter: EntityFilter = (entry) => entry.area.who === who;
        return universeIt.filter(filter);
      }

      // complex
      case "recentOppFrom": {
        const [_, base] = expr;
        const baseEntries = this.executeUnordered(
          base as SExprSchema.UnorderedQuery,
          this.#characters,
        );
        const results = new Set<EntityEntry>();
        for (const baseEntry of baseEntries) {
          const baseIdx = this.#characterHelpers
            .get(baseEntry.state.id)!
            .positionIndex();
          const targetWho = flip(baseEntry.area.who);
          const targetChs = this.#characters
            .values()
            .filter(
              (entry) =>
                entry.area.who === targetWho &&
                entry.state.variables.alive !== 0,
            )
            .map(
              (entry) =>
                [
                  entry,
                  this.#characterHelpers.get(entry.state.id)!.positionIndex(),
                ] as const,
            )
            .toArray();
          if (targetChs.length === 0) {
            continue;
          }
          // 由于“循环”判定距离，第一个也可以以“尾后”位置的方式参与距离计算
          targetChs.unshift([targetChs[0][0], targetChs.length]);
          const orderFn = ([_, i]: readonly [EntityEntry, number]) => {
            return Math.abs(i - baseIdx);
          };
          results.add(toSortedBy(targetChs, orderFn)[0][0]);
        }
        return results;
      }
      case "tagOf": {
        const [_, tagCategory, base] = expr;
        const baseEntries = [
          ...this.executeUnordered(
            base as SExprSchema.UnorderedQuery,
            this.#characters,
          ),
        ];
        if (baseEntries.length !== 1) {
          console?.warn?.(
            `Expected exactly one candidate for tagOf query, got ${baseEntries.length}`,
          );
          console?.trace?.();
        }
        const baseTags = baseEntries.flatMap(
          (entry) => (entry.state.definition.tags as CharacterTag[]) ?? [],
        );
        const categorizedTags: CharacterTag[] = (
          {
            weapon: ["sword", "claymore", "pole", "catalyst", "bow"],
            element: [
              "cryo",
              "hydro",
              "pyro",
              "electro",
              "anemo",
              "geo",
              "dendro",
            ],
          } satisfies Record<string, CharacterTag[]>
        )[tagCategory];
        const filteredTags: string[] = baseTags.filter(
          (tag) => categorizedTags?.includes(tag),
        );
        return universeIt.filter((entry) =>
          entry.state.definition.tags.some((tag) => filteredTags.includes(tag)),
        );
      }

      // relationals
      case "has": {
        const [_, operand] = expr;
        const operandIds = new Set(
          this.executeUnordered(
            operand as SExprSchema.UnorderedQuery,
            this.#entitiesOnCharacters,
          )
            [Symbol.iterator]()
            .map((entry) => entry.state.id),
        );
        const filter: EntityFilter = (entry) =>
          "entities" in entry.state &&
          entry.state.entities.some((e) => operandIds.has(e.id));
        return universeIt.filter(filter);
      }
      case "at": {
        const [_, operand] = expr;
        const operandEntries = new Set(
          this.executeUnordered(
            operand as SExprSchema.UnorderedQuery,
            this.#characters,
          )
            [Symbol.iterator]()
            .map((entry) => entry.state.id),
        );
        const filter: EntityFilter = (entry) =>
          entry.area.type === "characters" &&
          // this.#entitiesOnCharacters.has(entry) can also work, but it is more efficient to directly check type
          entry.state.definition.type !== "character" &&
          operandEntries.has(entry.area.characterId);
        return universeIt.filter(filter);
      }
      case "on": {
        const [_, operand] = expr;
        const operandEntries = new Set(
          this.executeUnordered(
            operand as SExprSchema.UnorderedQuery,
            this.#attachables,
          )
            [Symbol.iterator]()
            .map((entry) => entry.state.id),
        );
        const filter: EntityFilter = (entry) =>
          (entry.area.type === "hands" || entry.area.type === "pile") &&
          // this.#attachables.has(entry) can also work, but it is more efficient to directly check type
          entry.state.definition.type === "attachment" &&
          operandEntries.has(entry.area.cardId);
        return universeIt.filter(filter);
      }
      case "with": {
        const [_, operand] = expr;
        const operandIds = new Set(
          this.executeUnordered(
            operand as SExprSchema.UnorderedQuery,
            this.#attachments,
          )
            [Symbol.iterator]()
            .map((entry) => entry.state.id),
        );
        const filter: EntityFilter = (entry) =>
          "attachments" in entry.state &&
          entry.state.attachments.some((e) => operandIds.has(e.id));
        return universeIt.filter(filter);
      }

      // unary
      case "not": {
        const [_, operand] = expr;
        const operandEntries = new Set(
          this.executeUnordered(operand as SExprSchema.UnorderedQuery),
        );
        return new Set(universe).difference(operandEntries);
      }

      // binaries
      case "exclude": {
        const [_, left, right] = expr;
        const leftEntries = new Set(
          this.executeUnordered(left as SExprSchema.UnorderedQuery),
        );
        const rightEntries = new Set(
          this.executeUnordered(
            right as SExprSchema.UnorderedQuery,
            leftEntries,
          ),
        );
        return new Set(leftEntries).difference(rightEntries);
      }
      case "intersection": {
        let currUniverse = new Set(universe);
        for (const operand of expr.slice(1)) {
          const operandEntries = new Set(
            this.executeUnordered(
              operand as SExprSchema.UnorderedQuery,
              currUniverse,
            ),
          );
          currUniverse = new Set(currUniverse).intersection(operandEntries);
        }
        return currUniverse;
      }
      case "orElse": {
        const [_, left, right] = expr;
        const leftEntries = new Set(
          this.executeUnordered(left as SExprSchema.UnorderedQuery),
        );
        if (leftEntries.size > 0) {
          return leftEntries;
        }
        return this.executeUnordered(right as SExprSchema.UnorderedQuery);
      }
      case "union": {
        let result = new Set<EntityEntry>();
        for (const operand of expr.slice(1)) {
          const operandEntries = new Set(
            this.executeUnordered(
              operand as SExprSchema.UnorderedQuery,
              universe,
            ),
          );
          result = result.union(operandEntries);
        }
        return result;
      }

      default: {
        const _check: never = expr[0];
        throw new Error(`Unknown query operator: ${expr[0]}`);
      }
    }
  }
}

const runners = new WeakMap<GameState, QueryRunner>();
export function runQuery<T extends IQuery>(
  state: GameState,
  who: 0 | 1,
  query: T,
): ExEntityState<InferResult<T>["type"]>[] {
  let runner = runners.get(state);
  if (!runner) {
    runner = new QueryRunner(state);
    runners.set(state, runner);
  }
  runner.who = who;
  return runner
    .execute(query[toExpression]())
    .map((entry) => entry.state) as ExEntityState<InferResult<T>["type"]>[];
}
