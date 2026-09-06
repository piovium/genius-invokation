import { expect, expectTypeOf, test } from "vitest";
import {
  queryToExpression,
  $,
  prettyStringifySExpr,
  stringifySExpr,
} from "../src/query";
import type { CharacterHandle, SummonHandle } from "../src/data";
import type { AttachmentHandle } from "../src/data/type";
import type { ContextMetaBase } from "../src/runtime/skill_context";
import type { RxEntityState } from "../src/runtime/reactive";
import type { InferResult, IQuery } from "../src/query/utils";

declare const infer: <Q extends IQuery>(q: Q) => InferResult<Q>;
declare const reactiveCharacter: RxEntityState<ContextMetaBase, "character">;
declare const reactiveStatus: RxEntityState<ContextMetaBase, "status">;
declare const summonId: SummonHandle;
declare const characterId: CharacterHandle;
declare const attachmentId: AttachmentHandle;

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

  expect(prettyStringifySExpr(queryToExpression($.my.pile.cost(">", 0))))
    .toBe(dedent`
    (intersection (defeated ignore)
                  (who my)
                  (area pile true)
                  (variables (expr (> (special:diceCost)
                                      0))))
  `);
});

test("stringify of functions", () => {
  expect(
    prettyStringifySExpr(
      queryToExpression($.my.summon.var(({ usage }) => usage! >= 2)),
    ),
  ).toBe(dedent`
    (intersection (defeated ignore)
                  (who my)
                  (area summons true)
                  (variables (fn "({ usage }) => usage >= 2")))
  `);

  const obj = {
    seemsAlive({ health }: { health: number }) {
      return health > 0;
    },
  };
  expect(
    prettyStringifySExpr(
      queryToExpression($.opp.character.var(obj.seemsAlive)),
    ),
  ).toBe(dedent`
    (intersection (defeated ignore)
                  (who opp)
                  (area characters true)
                  (variables (fn ${JSON.stringify("function " + obj.seemsAlive.toString())})))
  `);
});

test("query types", () => {
  // basic entity types
  expectTypeOf(() => infer($.typeEquipment))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"equipment">();
  expectTypeOf(() => infer($.typeStatus))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"status">();
  expectTypeOf(() => infer($.combatStatus))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"combatStatus">();
  expectTypeOf(() => infer($.summon))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"summon">();
  expectTypeOf(() => infer($.support))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"support">();
  expectTypeOf(() => infer($.typeEventCard))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"eventCard">();
  expectTypeOf(() => infer($.attachment))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"attachment">();

  expectTypeOf(() => infer($.hand))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"eventCard" | "equipment" | "support">();
  expectTypeOf(() => infer($.pile))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"eventCard" | "equipment" | "support">();
  expectTypeOf(() => infer($.my.pile.cost(">", 0)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"eventCard" | "equipment" | "support">();
  expectTypeOf(() => infer($.hand.notInitial))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"eventCard" | "equipment" | "support">();

  expectTypeOf(() => infer($.character))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.active))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.prev))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.next))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();

  // reactive states are queries for their own entity id
  expectTypeOf(() => infer(reactiveCharacter))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.character.intersection(reactiveCharacter)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.typeStatus.at(reactiveCharacter)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"status">();
  expectTypeOf(() => infer($.character.has(reactiveStatus)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();

  expectTypeOf(() => infer($.vHand))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"eventCard" | "equipment" | "support" | "attachment">();

  // @ts-expect-error status cannot be combined with support
  expectTypeOf(() => infer($.status.support));

  // combining who
  expectTypeOf(() => infer($.my)).returns.toExtend<{}>();
  expectTypeOf(() => infer($.my.combatStatus)).returns.toExtend<{}>();
  expectTypeOf(() => infer($.my.support)).returns.toExtend<{}>();
  expectTypeOf(() => infer($.opp.pile)).returns.toExtend<{}>();
  expectTypeOf(() => infer($.opp.onStage.typeEquipment)).returns.toExtend<{}>();
  // @ts-expect-error who can only be specified once
  expectTypeOf(() => infer($.my.my));
  // @ts-expect-error who can only be specified once
  expectTypeOf(() => infer($.my.opp));

  // specifying id/def
  expectTypeOf(() => infer($.def(summonId))).returns.toExtend<{
    type: "summon";
  }>();
  // @ts-expect-error summon definitions cannot be combined with support
  expectTypeOf(() => infer($.support.def(summonId)));
  // @ts-expect-error entity type can only be specified once
  expectTypeOf(() => infer($.def(summonId).status));
  // @ts-expect-error id can only be specified once
  expectTypeOf(() => infer($.id(1).id(2)));

  // specifying variables
  expectTypeOf(() => infer($.var("foo", 1).var("bar", 2))).returns.toExtend<{
    variables: "foo" | "bar";
  }>();
  expectTypeOf(() => infer($.var("foo", ">=", 1))).returns.toExtend<{
    variables: "foo";
  }>();
  expectTypeOf(() => infer($.var("foo", (x) => x >= 1))).returns.toExtend<{
    variables: "foo";
  }>();

  // unary operators
  expectTypeOf(() => infer($.recentOppFrom($.opp.active)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.has($.typeStatus)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.has.typeStatus))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.has.typeEquipment))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.at.my.active))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"equipment" | "status">();
  // @ts-expect-error has only accepts attachments
  expectTypeOf(() => infer($.has($.character)));
  // @ts-expect-error has only accepts attachments
  expectTypeOf(() => infer($.has($.support)));
  // @ts-expect-error at only accepts characters
  expectTypeOf(() => infer($.at($.summon)));
  // @ts-expect-error recentOppFrom only accepts characters
  expectTypeOf(() => infer($.recentOppFrom($.support)));

  // has/at methods
  expectTypeOf(() => infer($.character.has($.typeEquipment)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();
  expectTypeOf(() => infer($.my.typeStatus.at($.def(characterId))))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"status">();
  // @ts-expect-error equipment can only be attached to characters
  expectTypeOf(() => infer($.equipment.at($.summon)));
  // @ts-expect-error status cannot be attached to cards
  expectTypeOf(() => infer($.status.at($.hand)));
  // @ts-expect-error status cannot be attached to a summon
  expectTypeOf(() => infer($.status.at($.def(summonId))));

  expectTypeOf(() => infer($.hand.with($.def(attachmentId)))).returns.toExtend<{
    areaType: "hands";
  }>();
  expectTypeOf(() => infer($.on.pile))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"attachment">();

  // binary operator
  expectTypeOf(() => infer($.opp.next.orElse($.opp.active)))
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"character">();

  // complex example, Lisp style
  expectTypeOf(() =>
    infer(
      $.intersection(
        $.opp,
        $.union($.typeStatus, $.combatStatus, $.summon),
        $.union($.tag("barrier"), $.tag("shield")),
      ),
    ),
  )
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"status" | "combatStatus" | "summon">();

  // complex example, Java style
  expectTypeOf(() =>
    infer(
      $.opp
        .intersection($.typeStatus.union($.combatStatus).union($.summon))
        .intersection($.tag("barrier").union($.tag("shield"))),
    ),
  )
    .returns.toHaveProperty("type")
    .toEqualTypeOf<"status" | "combatStatus" | "summon">();

  // orderBy & limit
  expectTypeOf(() =>
    $.my.character.orderBy("health").limit(1),
  ).returns.toExtend<IQuery>();
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
