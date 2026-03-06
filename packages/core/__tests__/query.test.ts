import { test } from "bun:test";
import { queryToExpression, $ } from "../src/query";
import { AttachmentHandle } from "../src/builder/type";

test("query", () => {
  console.log(queryToExpression($.my.hand.intersection($.not.with($.def(206 as AttachmentHandle)))))
  
});
