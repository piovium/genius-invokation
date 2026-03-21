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

export function queryToExpression(query: IQuery): Expression {
  return query[toExpression]();
}

class QueryRuntime {
  readonly entities: ReadonlyMap<number, EntityWithArea>;
  readonly state: GameState;
  readonly who: 0 | 1;

  constructor(state: GameState, who: 0 | 1) {
    this.entities = new Map(
      getAllEntitiesWithArea(state).map((e) => [e.state.id, e]),
    );
    this.state = state;
    this.who = who;
  }
}

interface UnorderedQueryResult {}
