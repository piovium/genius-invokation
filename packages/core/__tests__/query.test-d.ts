import {
  expectAssignable,
  expectType,
  expectDeprecated,
  expectError,
} from "tsd";
import { $ } from "../src/query/dollar";
import { type IsEqual, typingInfo, type IQuery, type InferResult } from "../src/query/utils";
import { CharacterHandle, SummonHandle } from "../src/builder";
import { AttachmentHandle, ExEntityType } from "../src/builder/type";

declare const infer: <Q extends IQuery>(q: Q) => InferResult<Q>;

const expectEntityType =
  <T extends ExEntityType>() =>
  <Q extends IQuery>(
    q: IsEqual<T, InferResult<Q>["type"]> extends true ? Q : never,
  ) => {};

// basic entity types
expectEntityType<"equipment">()($.typeEquipment);
expectEntityType<"status">()($.typeStatus);
expectEntityType<"combatStatus">()($.combatStatus);
expectEntityType<"summon">()($.summon);
expectEntityType<"support">()($.support);
expectEntityType<"eventCard">()($.typeEventCard);
expectEntityType<"attachment">()($.attachment);

expectEntityType<"eventCard" | "equipment" | "support">()($.hand);
expectEntityType<"eventCard" | "equipment" | "support">()($.pile);

expectEntityType<"eventCard" | "equipment" | "support">()($.my.pile.cost(">", 0));
expectEntityType<"eventCard" | "equipment" | "support">()($.hand.notInitial);

expectEntityType<"character">()($.character);
expectEntityType<"character">()($.active);
expectEntityType<"character">()($.prev);
expectEntityType<"character">()($.next);

expectEntityType<"eventCard" | "equipment" | "support" | "attachment">()(
  $.vHand,
);

// @ts-expect-error
expectError(infer($.status.support));

// combining who
expectAssignable<{}>(infer($.my));
expectAssignable<{}>(infer($.my.combatStatus));
expectAssignable<{}>(infer($.my.support));
expectAssignable<{}>(infer($.opp.pile));
expectAssignable<{}>(infer($.opp.onStage.typeEquipment));
// @ts-expect-error
expectError(infer($.my.my));
// @ts-expect-error
expectError(infer($.my.opp));

// specifying id/def
declare const summonId: SummonHandle;
expectAssignable<{ type: "summon" }>(infer($.def(summonId)));
// @ts-expect-error
expectError(infer($.support.def(summonId)));
// @ts-expect-error
expectError(infer($.def(summonId).status));
// @ts-expect-error
expectError(infer($.id(1).id(2)));

// specifying variables
expectAssignable<{ variables: "foo" | "bar" }>(
  infer($.var("foo", 1).var("bar", 2)),
);
expectAssignable<{ variables: "foo" }>(infer($.var("foo", ">=", 1)));
expectAssignable<{ variables: "foo" }>(infer($.var("foo", (x) => x >= 1)));

// unary operators
expectEntityType<"character">()($.recentOppFrom($.opp.active));
expectEntityType<"character">()($.has($.typeStatus));
expectEntityType<"character">()($.has.typeStatus);
expectEntityType<"character">()($.has.typeEquipment);
expectEntityType<"equipment" | "status">()($.at.my.active);
// @ts-expect-error
expectError(infer($.has($.character)));
// @ts-expect-error
expectError(infer($.has($.support)));
// @ts-expect-error
expectError(infer($.at($.summon)));
// @ts-expect-error
expectError(infer($.recentOppFrom($.support)));
// using Function.prototype
expectDeprecated($.has.call);
expectDeprecated($.at.name);

const x = infer($.on.pile);
type X = typeof x;

// hasAt method
declare const characterId: CharacterHandle;
expectEntityType<"character">()($.character.has($.typeEquipment));
expectEntityType<"status">()($.my.typeStatus.at($.def(characterId)));
// @ts-expect-error
expectError(infer($.equipment.at($.summon)));
// @ts-expect-error
expectError(infer($.status.at($.hand)));
// @ts-expect-error
expectError(infer($.status.at($.def(summonId))));

declare const attachmentId: AttachmentHandle;
expectAssignable<{ areaType: "hands" }>(
  infer($.hand.with($.def(attachmentId))),
);
expectEntityType<"attachment">()($.on.pile);

// binary operator
expectEntityType<"character">()($.opp.next.orElse($.opp.active));

// complex example
// Lisp style
expectEntityType<"status" | "combatStatus" | "summon">()(
  $.intersection(
    $.opp,
    $.union($.typeStatus, $.combatStatus, $.summon),
    $.union($.tag("barrier"), $.tag("shield")),
  ),
);
// Java style
expectEntityType<"status" | "combatStatus" | "summon">()(
  $.opp
    .intersection($.typeStatus.union($.combatStatus).union($.summon))
    .intersection($.tag("barrier").union($.tag("shield"))),
);

// orderBy & limit
$.my.character.orderBy("health").limit(1);
