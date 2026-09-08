import { expectTypeOf, test } from "vitest";
import { $ } from "../src/query";
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
  expectTypeOf(() => infer($.typeEquipment.at($.summon)));
  // @ts-expect-error status cannot be attached to cards
  expectTypeOf(() => infer($.typeStatus.at($.hand)));
  // @ts-expect-error status cannot be attached to a summon
  expectTypeOf(() => infer($.typeStatus.at($.def(summonId))));

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
