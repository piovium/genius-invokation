import { expect, test } from "bun:test";
import {
  queryToExpression,
  $,
  prettyStringifySExpr,
  stringifySExpr,
} from "../src/query";
import { AttachmentHandle } from "../src/builder/type";

test("'Fluent API' building tests", () => {
  expect(
    prettyStringifySExpr(
      queryToExpression(
        $.my.hand.exclude($.with($.def(206 as AttachmentHandle))),
      ),
    ),
  ).toBe(dedent`
    (exclude (intersection (defeated ignore)
                           (who my)
                           (area hands true))
             (with (intersection (defeated ignore)
                                 (definition 206))))
  `);

  expect(
    prettyStringifySExpr(
      queryToExpression(
        $.my.character.orderBy("health", "-", "maxHealth").limit(1),
      ),
    ),
  ).toBe(dedent`
    (orderBy (intersection (defeated ignore)
                           (who my)
                           (area characters true))
             [(expr (- health maxHealth))]
             1)
  `);
});

function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  const content = strings.reduce((acc, str, i) => {
    const value = i < values.length ? String(values[i]) : "";
    return acc + str + value;
  }, "");
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const minIndent = lines.reduce((min, line) => {
    if (line.trim() === "") {
      return min;
    }
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(min, indent);
  }, Number.POSITIVE_INFINITY);

  if (!Number.isFinite(minIndent) || minIndent === 0) {
    return lines.join("\n");
  }

  return lines.map((line) => line.slice(minIndent)).join("\n");
}
