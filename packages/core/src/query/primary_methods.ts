// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import type { CharacterTag, EntityTag, EntityType } from "..";
import type { AttachmentTag } from "../base/attachment";
import type {
  AttachmentHandle,
  CardHandle,
  CharacterHandle,
  EquipmentHandle,
  ExEntityType,
  HandleT,
  StatusHandle,
  SummonHandle,
  SupportHandle,
} from "../builder/type";
import type { PrimaryMethodsInternal, PrimaryQuery } from "./primary_query";
import {
  type AttachmentReq,
  type CardReq,
  type CharacterReq,
  type Computed,
  type Constructor,
  type EntityOnCharacterReq,
  type HeterogeneousMetaBase,
  type InferResult,
  type IUnorderedQuery,
  type IsExtends,
  type MetaBase,
  type AllPropsNotStrictlySuperTypeOf,
  type RelatedToReq,
  type StaticAssert,
  type StrictlySuperTypeOf,
  type TypingInfoFromMeta,
  type AnyTuple,
  toExpressionUnordered,
  stringifyFunction,
  type StateVariables,
  type StateVariablesKey,
  variableKeyToExpr,
  variableKeyToPropertyCode,
  diceCostKey,
  inInitialPileKey,
} from "./utils";

type EventCardHandle = number & { readonly _eventCard: unique symbol };

type PositionPatch<T extends MetaBase["position"]> = {
  type: "character";
  areaType: "characters";
  position: T;
};

type DefPatch<T extends HandleT<ExEntityType>> = (T extends EquipmentHandle
  ? {
      type: "equipment";
      areaType: "characters" | "hands" | "pile";
    }
  : T extends SupportHandle
    ? {
        type: "support";
        areaType: "supports" | "hands" | "pile";
      }
    : T extends StatusHandle
      ? {
          type: "status";
          areaType: "characters";
        }
      : T extends SummonHandle
        ? {
            type: "summon";
            areaType: "summons";
          }
        : T extends CharacterHandle
          ? {
              type: "character";
              areaType: "characters";
            }
          : T extends AttachmentHandle
            ? {
                type: "attachment";
                areaType: "hands" | "pile";
              }
            : T extends EventCardHandle
              ? {
                  type: "eventCard";
                  areaType: "hands" | "pile";
                }
              : {}) & {
  definition: T & { readonly _defSpecified: unique symbol };
};

type HandsOrPileEntityType = "eventCard" | "equipment" | "support";

type TagOfImpl<Ty extends ExEntityType> = Ty extends EntityType
  ? EntityTag
  : Ty extends "character"
    ? CharacterTag
    : Ty extends "attachment"
      ? AttachmentTag
      : never;

type TagOf<Meta extends HeterogeneousMetaBase> = {
  [K in Meta["type"]]: TagOfImpl<K>;
}[Meta["type"]];

type Assign<
  T extends HeterogeneousMetaBase,
  Patch extends Partial<HeterogeneousMetaBase> = {},
> = PrimaryQuery<Computed<T & Patch, HeterogeneousMetaBase>>;

export { type Assign as AssignedPrimaryQuery };

type AssignVar<
  T extends HeterogeneousMetaBase,
  Name extends StateVariablesKey,
> = Assign<T, { variables: { [K in Name]: 0 } }>;

type AssignVarAndActionCard<
  T extends HeterogeneousMetaBase,
  Name extends StateVariablesKey,
> = Assign<
  T,
  {
    variables: { [K in Name]: 0 };
    type: "eventCard" | "equipment" | "support";
    areaType: "characters" | "hands" | "pile" | "supports";
  }
>;

type RelationOp = "<" | "<=" | "=" | ">=" | ">" | "!=";

// Make CodeQL happy
function escapeUnsafeChars(str: string) {
  return str.replace(
    /[<>]/g,
    (x) => `\\u${x.codePointAt(0)!.toString(16).padStart(4, "0")}`,
  );
}

class PrimaryMethodsImpl<Meta extends HeterogeneousMetaBase> {
  private get _self(): any {
    return this;
  }
  private declare _internal: PrimaryMethodsInternal;
  // who
  get my(): Assign<Meta, { who: "my" }> {
    this._internal.addConstraint(["who", "my"]);
    return this._self;
  }
  get opp(): Assign<Meta, { who: "opp" }> {
    this._internal.addConstraint(["who", "opp"]);
    return this._self;
  }
  // on/off stage
  get onStage(): Assign<
    Meta,
    {
      type: EntityType | "character";
      areaType: "characters" | "combatStatuses" | "summons" | "supports";
    }
  > {
    this._internal.addConstraint(["onStage"]);
    return this._self;
  }
  get offStage(): Assign<
    Meta,
    {
      type: HandsOrPileEntityType | "attachment";
      areaType: "hands" | "pile";
    }
  > {
    this._internal.addConstraint(["offStage"]);
    return this._self;
  }
  // area (by path)
  get character(): Assign<Meta, { type: "character"; areaType: "characters" }> {
    this._internal.addConstraint(["area", "characters", "true"]);
    return this._self;
  }
  get combatStatus(): Assign<
    Meta,
    { type: "combatStatus"; areaType: "combatStatuses" }
  > {
    this._internal.addConstraint(["area", "combatStatuses", "true"]);
    return this._self;
  }
  get summon(): Assign<Meta, { type: "summon"; areaType: "summons" }> {
    this._internal.addConstraint(["area", "summons", "true"]);
    return this._self;
  }
  get support(): Assign<Meta, { type: "support"; areaType: "supports" }> {
    this._internal.addConstraint(["area", "supports", "true"]);
    return this._self;
  }
  get attachment(): Assign<
    Meta,
    { type: "attachment"; areaType: "hands" | "pile" }
  > {
    this._internal.addConstraint(["type", "attachment"]);
    return this._self;
  }
  get hand(): Assign<Meta, { type: HandsOrPileEntityType; areaType: "hands" }> {
    this._internal.addConstraint(["area", "hands", "true"]);
    return this._self;
  }
  get pile(): Assign<Meta, { type: HandsOrPileEntityType; areaType: "pile" }> {
    this._internal.addConstraint(["area", "pile", "true"]);
    return this._self;
  }
  // area (not path)
  get vCharacter(): Assign<
    Meta,
    { type: "character" | "status" | "equipment"; areaType: "characters" }
  > {
    this._internal.addConstraint(["area", "characters", "false"]);
    return this._self;
  }

  get vHand(): Assign<
    Meta,
    { type: HandsOrPileEntityType | "attachment"; areaType: "hands" }
  > {
    this._internal.addConstraint(["area", "hands", "false"]);
    return this._self;
  }
  get vPile(): Assign<
    Meta,
    { type: HandsOrPileEntityType | "attachment"; areaType: "pile" }
  > {
    this._internal.addConstraint(["area", "pile", "false"]);
    return this._self;
  }
  // type
  get typeEquipment(): Assign<
    Meta,
    { type: "equipment"; areaType: "characters" | "hands" | "pile" }
  > {
    this._internal.addConstraint(["type", "equipment"]);
    return this._self;
  }
  get typeSupport(): Assign<
    Meta,
    { type: "support"; areaType: "supports" | "hands" | "pile" }
  > {
    this._internal.addConstraint(["type", "support"]);
    return this._self;
  }
  get typeStatus(): Assign<Meta, { type: "status"; areaType: "characters" }> {
    this._internal.addConstraint(["type", "status"]);
    return this._self;
  }
  get typeEventCard(): Assign<
    Meta,
    { type: "eventCard"; areaType: "hands" | "pile" }
  > {
    this._internal.addConstraint(["type", "eventCard"]);
    return this._self;
  }
  // alternative type methods, but not recommended (disambiguate from path)
  /** @deprecated Use `typeEquipment` instead. */
  get equipment() {
    return this.typeEquipment;
  }
  /** @deprecated Use `typeStatus` instead. */
  get status() {
    return this.typeStatus;
  }
  /** @deprecated Use `typeEventCard` instead. */
  get eventCard() {
    return this.typeEventCard;
  }
  // position
  get active(): Assign<Meta, PositionPatch<"active">> {
    this._internal.addConstraint(["position", "active"]);
    return this._self;
  }
  get prev(): Assign<Meta, PositionPatch<"prev">> {
    this._internal.addConstraint(["position", "prev"]);
    return this._self;
  }
  get next(): Assign<Meta, PositionPatch<"next">> {
    this._internal.addConstraint(["position", "next"]);
    return this._self;
  }
  get standby(): Assign<Meta, PositionPatch<"standby">> {
    this._internal.addConstraint(["position", "standby"]);
    return this._self;
  }
  // defeated
  get onlyDefeated(): Assign<
    Meta,
    { type: "character"; areaType: "characters"; defeated: "only" }
  > {
    this._internal.setDefeatedConstraint("defeatedOnly");
    return this._self;
  }
  get includesDefeated(): Assign<
    Meta,
    { type: "character"; areaType: "characters"; defeated: "includes" }
  > {
    this._internal.setDefeatedConstraint("all");
    return this._self;
  }
  // with
  var<const Name extends StateVariablesKey>(
    name: Name,
    value: number,
  ): AssignVar<Meta, Name>;
  var<const Name extends StateVariablesKey>(
    name: Name,
    op: RelationOp,
    value: number,
  ): AssignVar<Meta, Name>;
  var<
    const Name extends StateVariablesKey,
    const Name2 extends StateVariablesKey,
  >(name: Name, op: RelationOp, ref: Name2): AssignVar<Meta, Name | Name2>;
  var<const Name extends StateVariablesKey>(
    name: Name,
    pred: (value: number) => unknown,
  ): AssignVar<Meta, Name>;
  var<const Name extends StateVariablesKey>(
    pred: (values: StateVariables) => unknown,
  ): AssignVar<Meta, Name>;
  var(
    ...args:
      | [StateVariablesKey, number]
      | [StateVariablesKey, RelationOp, number | StateVariablesKey]
      | [StateVariablesKey, (value: number) => unknown]
      | [(values: StateVariables) => unknown]
  ): any {
    if (typeof args[0] !== "function") {
      const [name, opOrValue, valueOrRefOrUndefined] = args;
      const lhs = variableKeyToExpr(name);
      if (typeof opOrValue === "number") {
        this._internal.addConstraint([
          "variables",
          ["expr", ["=", lhs, opOrValue]],
        ]);
      } else if (typeof opOrValue === "string") {
        const rhs =
          typeof valueOrRefOrUndefined === "number"
            ? valueOrRefOrUndefined
            : variableKeyToExpr(valueOrRefOrUndefined);
        this._internal.addConstraint([
          "variables",
          ["expr", [opOrValue, lhs, rhs]],
        ]);
      } else if (typeof opOrValue === "function") {
        const fnCode = stringifyFunction(opOrValue);
        const prop = escapeUnsafeChars(variableKeyToPropertyCode(name));
        const wrappedSource = `(v) => (${fnCode})(v[${prop}])`;
        this._internal.addConstraint(["variables", ["fn", wrappedSource]]);
      } else {
        const _exhaustiveCheck: never = opOrValue!;
        throw new Error("Invalid arguments");
      }
    } else {
      const [pred] = args;
      const fnCode = stringifyFunction(pred);
      this._internal.addConstraint(["variables", ["fn", fnCode]]);
    }
    return this._self;
  }

  cost(value: number): AssignVarAndActionCard<Meta, typeof diceCostKey>;
  cost(
    op: RelationOp,
    value: number,
  ): AssignVarAndActionCard<Meta, typeof diceCostKey>;
  cost(
    pred: (value: number) => unknown,
  ): AssignVarAndActionCard<Meta, typeof diceCostKey>;
  cost(...args: any[]) {
    // @ts-expect-error - overloads are not properly inferred here
    return this.var(diceCostKey, ...args);
  }
  get notInitial(): AssignVarAndActionCard<Meta, typeof inInitialPileKey> {
    return this.var(inInitialPileKey, 0);
  }

  id<const Id extends number>(
    id: Id,
  ): Assign<Meta, { id: Id & { readonly _idSpecified: unique symbol } }> {
    this._internal.addConstraint(["id", id]);
    return this._self;
  }
  def<T extends HandleT<Meta["type"]>>(id: T): Assign<Meta, DefPatch<T>>;
  def<T extends number>(id: number extends T ? number : never): Meta;
  def(id: number): unknown {
    this._internal.addConstraint(["definition", id]);
    return this._self;
  }
  tag(...tags: TagOf<Meta>[]): Assign<Meta> {
    this._internal.addConstraint(
      ...tags.map((tag) => ["tag" as const, tag] satisfies AnyTuple),
    );
    return this._self;
  }
  tagOf<T extends IUnorderedQuery>(
    type: "weapon" | "element",
    query: RelatedToReq<InferResult<T>, CharacterReq> extends true ? T : never,
  ): Assign<Meta> {
    this._internal.addConstraint([
      "tagOf",
      type,
      query[toExpressionUnordered](),
    ]);
    return this._self;
  }
}

type PrimaryMethodRestrictionConfig = {
  my: { who: "my" };
  opp: { who: "opp" };

  character: { type: "character"; areaType: "characters" };
  vCharacter: {
    type: "character" | EntityOnCharacterReq["type"];
    areaType: "characters";
  };

  combatStatus: { type: "combatStatus"; areaType: "combatStatuses" };
  summon: { type: "summon"; areaType: "summons" };
  support: { type: "support"; areaType: "supports" | "hands" | "pile" };

  hand: { type: HandsOrPileEntityType; areaType: "hands" };
  vHand: { type: HandsOrPileEntityType | "attachment"; areaType: "hands" };

  pile: { type: HandsOrPileEntityType; areaType: "pile" };
  vPile: { type: HandsOrPileEntityType | "attachment"; areaType: "pile" };

  equipment: { type: "equipment"; areaType: "characters" | "hands" | "pile" };
  typeEquipment: {
    type: "equipment";
    areaType: "characters" | "hands" | "pile";
  };

  status: { type: "status"; areaType: "characters" };
  typeStatus: { type: "status"; areaType: "characters" };

  eventCard: { type: "eventCard"; areaType: "hands" | "pile" };
  typeEventCard: { type: "eventCard"; areaType: "hands" | "pile" };

  active: { type: "character"; position: "active" };
  prev: { type: "character"; position: "prev" };
  next: { type: "character"; position: "next" };
  standby: { type: "character"; position: "standby" };

  onlyDefeated: { type: "character"; defeated: "only" };
  includesDefeated: { type: "character"; defeated: "includes" };
  // cost: {
  //   type: "eventCard" | "support" | "equipment";
  //   areaType: "characters" | "hands" | "pile" | "supports";
  // };
};

type _Check = StaticAssert<
  IsExtends<
    PrimaryMethodRestrictionConfig,
    {
      [K in keyof PrimaryMethodRestrictionConfig]: Partial<HeterogeneousMetaBase>;
    }
  >
>;

type PrimaryMethodsOmit<Meta extends HeterogeneousMetaBase> = {
  [K in PrimaryMethodNames]: K extends keyof PrimaryMethodRestrictionConfig
    ? AllPropsNotStrictlySuperTypeOf<
        Meta,
        PrimaryMethodRestrictionConfig[K]
      > extends true
      ? K
      : never
    : K extends "id"
      ? StrictlySuperTypeOf<number, Meta["id"]> extends true
        ? K
        : never
      : K extends "def"
        ? StrictlySuperTypeOf<number, Meta["definition"]> extends true
          ? K
          : never
        : never;
}[PrimaryMethodNames];

export const PrimaryMethods = PrimaryMethodsImpl as Constructor<
  PrimaryMethods<any>
>;
export type PrimaryMethods<Meta extends HeterogeneousMetaBase> = Omit<
  PrimaryMethodsImpl<Meta>,
  PrimaryMethodsOmit<Meta>
>;

export type PrimaryMethodNames = keyof PrimaryMethodsImpl<any> & {};

export const PRIMARY_METHODS = Object.getOwnPropertyDescriptors(
  PrimaryMethodsImpl.prototype,
) as {
  [K in PrimaryMethodNames]: PropertyDescriptor;
} & {
  ["constructor"]?: PropertyDescriptor;
};
delete PRIMARY_METHODS.constructor;
