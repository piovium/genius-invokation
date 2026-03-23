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
import { getAllEntitiesWithArea, type EntityWithArea } from "../utils";
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

  constructor(state: GameState, who: 0 | 1) {
    this.entities = new Map(
      getAllEntitiesWithArea(state).map((e, index) => [
        e.state.id,
        { ...e, index },
      ]),
    );
    this.state = state;
    this.who = who;
  }

  execute(expr: SExprSchema.Query): number[] {
    switch (expr[0]) {
      case "orderBy": {
        const [_, unorderedQuery, orderBy, limit] = expr;
        const unorderedResult = this.executeUnordered(unorderedQuery);
        // TODO
        break;
      }
      default: {
        return [...this.executeUnordered(expr)];
      }
    }
  }
  executeUnordered(expr: SExprSchema.UnorderedQuery): Set<number> {
    // TODO
    switch (expr[0]) {
      case "area":
    }
  }
}
