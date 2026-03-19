import type { AnyState } from "../base/state";
import type { EntityArea } from "../base/entity";
import { toExpressionUnordered, type Expression, type IUnorderedQuery } from "./utils";

export function queryToExpression(query: IUnorderedQuery): Expression {
  return query[toExpressionUnordered]();
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
