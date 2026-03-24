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

class QueryRuntime {
  readonly entities: ReadonlyMap<number, EntityEntry>;
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
  }

  #parseOrderBy(orderBySpec: SExprSchema.OrderBySpec): (id: number) => number {
    switch (orderBySpec[0]) {
      case "expr": {
        const [_, expr] = orderBySpec;
        break;
      }
      case "fn": {
        const [_, code] = orderBySpec;
        break;
      }
      default: {
        throw new Error(`Unknown orderBy spec: ${orderBySpec[0]}`);
      }
    }
    // TODO
    return () => 0;
  }

  execute(expr: SExprSchema.Query): number[] {
    switch (expr[0]) {
      case "orderBy": {
        const [_, unorderedQuery, orderBy, limit] = expr;
        const unorderedResult = this.executeUnordered(unorderedQuery);
        const orderFn = (id: number) =>
          [
            ...orderBy.map((spec) => this.#parseOrderBy(spec)),
            this.#defaultOrder,
          ].map((f) => f(id));
        return toSortedBy([...unorderedResult], orderFn).slice(0, limit);
      }
      default: {
        return toSortedBy([...this.executeUnordered(expr)], this.#defaultOrder);
      }
    }
  }
  executeUnordered(expr: SExprSchema.UnorderedQuery): Set<number> {
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
