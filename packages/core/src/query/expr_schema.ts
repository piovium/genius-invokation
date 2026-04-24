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
 
import type { Expression, IsExtends, StaticAssert } from "./utils";

interface Rule {
  use?: NonTerminalName;

  enum?: [string, ...string[]];

  // arbitrary primitive values
  arbitrary?: "number" | "string";

  // (...<args>)
  list?: Rule;

  // (<leading> <args> ...<restArgs>)
  leading?: string;
  args?: Argument[];
  restArgs?: Argument;

  description?: string;
}

interface Argument extends Rule {
  name: string;
}

interface NonTerminalConfig {
  rules: [Rule, ...Rule[]];
  description?: string;
}

const defineNonTerminal = <const T extends NonTerminalConfig>(config: T): T =>
  config;

class NonTerminalsConfig {
  Query = defineNonTerminal({
    rules: [{ use: "UnorderedQuery" }, { use: "OrderedQuery" }],
  });
  UnorderedQuery = defineNonTerminal({
    rules: [{ use: "PrimaryQuery" }, { use: "CompositeQuery" }],
  });
  OrderedQuery = defineNonTerminal({
    rules: [
      {
        leading: "orderBy",
        args: [
          { name: "targetQuery", use: "UnorderedQuery" },
          { name: "orderBySpec", list: { use: "OrderBySpec" } },
          { name: "limit", arbitrary: "number" },
        ],
      },
    ],
  });

  PrimaryQuery = defineNonTerminal({
    rules: [
      {
        leading: "who",
        args: [{ name: "whoSpec", enum: ["my", "opp"] }],
      },
      {
        leading: "type",
        args: [
          {
            name: "typeSpec",
            enum: [
              "character",
              "equipment",
              "status",
              "combatStatus",
              "summon",
              "support",
              "eventCard",
              "attachment",
            ],
          },
        ],
      },
      {
        leading: "area",
        args: [
          {
            name: "areaSpec",
            enum: [
              "characters",
              "combatStatuses",
              "summons",
              "supports",
              "hands",
              "pile",
            ],
          },
          {
            name: "byPath",
            enum: ["true", "false"],
            description: `Whether use the \`path\` semantics to filter the area, which means the equipments/statuses attached to characters and attachments attached on hand/pile cards are not considered when byPath is true`,
          },
        ],
      },
      {
        leading: "onStage",
        args: [],
      },
      {
        leading: "offStage",
        args: [],
      },
      {
        leading: "position",
        args: [
          { name: "positionSpec", enum: ["active", "standby", "prev", "next"] },
        ],
      },
      {
        leading: "defeated",
        args: [{ name: "defeatedSpec", enum: ["only", "ignore"] }],
      },
      {
        leading: "variables",
        args: [{ name: "variableSpec", use: "VariableSpec" }],
      },
      {
        leading: "id",
        args: [{ name: "idValue", arbitrary: "number" }],
      },
      {
        leading: "definition",
        args: [{ name: "definitionId", arbitrary: "number" }],
      },
      {
        leading: "tag",
        args: [{ name: "tagValue", arbitrary: "string" }],
      },
      {
        leading: "tagOf",
        args: [
          { name: "tagType", enum: ["element", "weapon"] },
          { name: "referencedQuery", use: "UnorderedQuery" },
        ],
      },
    ],
  });
  CompositeQuery = defineNonTerminal({
    rules: [
      {
        leading: "intersection",
        restArgs: { name: "operands", use: "UnorderedQuery" },
        description: "Note: When no arguments are provided, i.e. (intersection), the expression matches all entities."
      },
      {
        leading: "union",
        restArgs: { name: "operands", use: "UnorderedQuery" },
      },
      {
        leading: "orElse",
        args: [
          { name: "lhs", use: "UnorderedQuery" },
          { name: "rhs", use: "UnorderedQuery" },
        ],
      },
      {
        leading: "exclude",
        args: [
          { name: "lhs", use: "UnorderedQuery" },
          { name: "rhs", use: "UnorderedQuery" },
        ],
      },
      {
        leading: "not",
        args: [{ name: "operand", use: "UnorderedQuery" }],
      },
      {
        leading: "has",
        args: [{ name: "operand", use: "UnorderedQuery" }],
      },
      {
        leading: "at",
        args: [{ name: "operand", use: "UnorderedQuery" }],
      },
      {
        leading: "with",
        args: [{ name: "operand", use: "UnorderedQuery" }],
      },
      {
        leading: "on",
        args: [{ name: "operand", use: "UnorderedQuery" }],
      },
      {
        leading: "recentOppFrom",
        args: [{ name: "operand", use: "UnorderedQuery" }],
      },
    ],
  });

  VariableSpec = defineNonTerminal({
    rules: [
      {
        leading: "expr",
        args: [{ name: "expression", use: "BooleanExpression" }],
      },
      {
        leading: "fn",
        args: [
          {
            name: "fnCode",
            arbitrary: "string",
            description: `JS Function body, receives a object containing variable values, returns boolean`,
          },
        ],
      },
    ],
  });
  OrderBySpec = defineNonTerminal({
    rules: [
      {
        leading: "expr",
        args: [{ name: "expression", use: "NumericalExpression" }],
      },
      {
        leading: "fn",
        args: [
          {
            name: "fnCode",
            arbitrary: "string",
            description: `JS Function body, receives a object containing variable values, returns number`,
          },
        ],
      },
    ],
  });

  BooleanExpression = defineNonTerminal({
    rules: [
      {
        leading: "not",
        args: [{ name: "operand", use: "BooleanExpression" }],
      },
      {
        leading: "and",
        restArgs: { name: "operands", use: "BooleanExpression" },
      },
      {
        leading: "or",
        restArgs: { name: "operands", use: "BooleanExpression" },
      },
      {
        leading: ">",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: ">=",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "=",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "<=",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "<",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "!=",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
    ],
  });
  NumericalExpression = defineNonTerminal({
    rules: [
      {
        arbitrary: "string",
        description: `Use the value read from a variable name`,
      },
      {
        arbitrary: "number",
        description: `Arbitrary constant number`,
      },
      {
        leading: "special:diceCost",
        args: [],
        description: `Returns the dice cost of this card.`
      },
      {
        leading: "special:inInitialPile",
        args: [],
        description: `Returns 1 if the card is in player's initial pile, otherwise 0.`
      },
      {
        leading: "+",
        restArgs: { name: "operands", use: "NumericalExpression" },
      },
      {
        leading: "*",
        restArgs: { name: "operands", use: "NumericalExpression" },
      },
      {
        leading: "-",
        args: [{ name: "rhs", use: "NumericalExpression" }],
      },
      {
        leading: "-",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "/",
        args: [{ name: "rhs", use: "NumericalExpression" }],
      },
      {
        leading: "/",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "%",
        args: [
          { name: "lhs", use: "NumericalExpression" },
          { name: "rhs", use: "NumericalExpression" },
        ],
      },
      {
        leading: "min",
        restArgs: { name: "operands", use: "NumericalExpression" },
      },
      {
        leading: "max",
        restArgs: { name: "operands", use: "NumericalExpression" },
      },
    ],
  });
}

type NonTerminalName = keyof NonTerminalsConfig;

type InferRule<R extends Rule, Visited extends string = never> = R extends {
  use: infer U extends NonTerminalName;
}
  ? InferNonTerminal<U, Visited>
  : R extends { list: infer L extends Rule }
    ? InferRule<L, Visited>[]
    : R extends { enum: infer E extends string[] }
      ? E[number]
      : R extends { arbitrary: infer A extends "string" | "number" }
        ? A extends "string"
          ? string
          : number
        : R extends {
              leading: infer L extends string;
              args: infer Args extends Argument[];
            }
          ? InferExpr<L, Args, undefined, Visited>
          : R extends {
                leading: infer L extends string;
                args: infer Args extends Argument[];
                restArgs: infer RestArgs extends Argument;
              }
            ? InferExpr<L, Args, RestArgs, Visited>
            : R extends {
                  leading: infer L extends string;
                  restArgs: infer RestArgs extends Argument;
                }
              ? InferExpr<L, undefined, RestArgs, Visited>
              : never;

type InferExpr<
  L extends string,
  Args extends Argument[] | undefined,
  RestArgs extends Argument | undefined,
  Visited extends string,
> = [
  L,
  ...(Args extends Argument[] ? InferArguments<Args, Visited> : []),
  ...(RestArgs extends Argument ? InferArgument<RestArgs, Visited>[] : []),
];

type InferArguments<
  Args extends Argument[],
  Visited extends string,
> = Args extends [
  infer First extends Argument,
  ...infer Rest extends Argument[],
]
  ? [InferArgument<First, Visited>, ...InferArguments<Rest, Visited>]
  : [];

type InferArgument<Arg extends Argument, Visited extends string> = InferRule<
  Arg,
  Visited
>;

type InferNonTerminal<
  N extends NonTerminalName,
  Visited extends string = never,
> = N extends Visited
  ? Expression
  : InferRule<NonTerminalsConfig[N]["rules"][number], Visited | N>;

export namespace SExprSchema {
  export type Query = InferNonTerminal<"Query">;
  export type UnorderedQuery = InferNonTerminal<"UnorderedQuery">;
  export type OrderedQuery = InferNonTerminal<"OrderedQuery">;
  export type PrimaryQuery = InferNonTerminal<"PrimaryQuery">;
  export type CompositeQuery = InferNonTerminal<"CompositeQuery">;
  export type VariableSpec = InferNonTerminal<"VariableSpec">;
  export type OrderBySpec = InferNonTerminal<"OrderBySpec">;
  export type BooleanExpression = InferNonTerminal<"BooleanExpression">;
  export type NumericalExpression = InferNonTerminal<"NumericalExpression">;
}
