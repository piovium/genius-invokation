import { toExpression, type Expression, type IQuery } from "./utils";

export function queryToExpression(query: IQuery): Expression {
  return query[toExpression]();
}
