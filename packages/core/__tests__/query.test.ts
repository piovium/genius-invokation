import { expect, test } from "bun:test";
import { queryToExpression, $, prettyStringifySExpr, stringifySExpr } from "../src/query";
import { AttachmentHandle } from "../src/builder/type";

test("query", () => {
  expect(
    prettyStringifySExpr(
      queryToExpression(
        $.my.hand.exclude($.with($.def(206 as AttachmentHandle))),
      ),
    ),
  ).toBe(`(exclude (intersection (defeated ignore)
                       (who my)
                       (area hands true))
         (with (intersection (defeated ignore)
                             (intersection (defeated ignore)
                                           (definition 206)))))`);
});
