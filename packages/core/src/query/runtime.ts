import type { AnyState } from "../base/state";
import type { EntityArea } from "../base/entity";
import { toExpression, type Expression, type IQuery } from "./utils";

export function queryToExpression(query: IQuery): Expression {
  return query[toExpression]();
}

interface EntityEntry {
  state: AnyState;
  area: EntityArea;
}

class QueryRuntime {
  private entities: Map<number, EntityEntry> = new Map();
}

interface UnorderedQueryResult {

}
