import { test } from "bun:test";
import { queryToExpression, $, prettyStringifySExpr, stringifySExpr } from "../src/query";
import { AttachmentHandle } from "../src/builder/type";

test("query", () => {
  console.log(
    prettyStringifySExpr(
      queryToExpression(
        $.my.hand.exclude($.with($.def(206 as AttachmentHandle))),
      ),
    ),
  );
});
