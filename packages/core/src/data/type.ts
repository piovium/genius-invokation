// Copyright (C) 2024-2025 Guyutongxue
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

import type { DamageType } from "@gi-tcg/typings";
import type { CharacterTag } from "../base/character";
import type { EntityTag, EntityType } from "../base/entity";
import type {
  AttachmentState,
  CharacterState,
  EntityState,
} from "../base/state";
import type { Computed } from "../query/utils";

interface HandleMeta {
  readonly id: number;
  readonly variables: string;
}

/** A numeric definition ID carrying its metadata at the type level. */
type Handle<Meta extends HandleMeta, Brand extends {} = {}> = Meta["id"] &
  Computed<
    {
      readonly _meta: Meta;
    } & Brand
  >;

export type CharacterHandle<Meta extends HandleMeta = HandleMeta> = Handle<
  Meta,
  {
    readonly _char: unique symbol;
  }
>;
export type SkillHandle<Meta extends HandleMeta = HandleMeta> = Handle<
  Meta,
  {
    readonly _skill: unique symbol;
  }
>;
export type PassiveSkillHandle<Meta extends HandleMeta = HandleMeta> = Handle<
  Meta,
  {
    readonly _passiveSkill: unique symbol;
  }
>;
export type EntityHandle<
  Meta extends HandleMeta = HandleMeta,
  Brand extends {} = {},
> = Handle<
  Meta,
  {
    readonly _entity: unique symbol;
  } & Brand
>;
export type CardHandle<Meta extends HandleMeta = HandleMeta> = EntityHandle<
  Meta,
  {
    readonly _card: unique symbol;
  }
>;
export type StatusHandle<Meta extends HandleMeta = HandleMeta> = EntityHandle<
  Meta,
  {
    readonly _stat: unique symbol;
  }
>;
export type CombatStatusHandle<Meta extends HandleMeta = HandleMeta> =
  EntityHandle<
    Meta,
    {
      readonly _cStat: unique symbol;
    }
  >;
export type SummonHandle<Meta extends HandleMeta = HandleMeta> = Handle<
  Meta,
  {
    readonly _summon: unique symbol;
  }
>;
export type SupportHandle<Meta extends HandleMeta = HandleMeta> = EntityHandle<
  Meta,
  { readonly _support: unique symbol }
> &
  CardHandle<Meta>;
export type EquipmentHandle<Meta extends HandleMeta = HandleMeta> =
  EntityHandle<Meta, { readonly _equip: unique symbol }> & CardHandle<Meta>;

export type AttachmentHandle<Meta extends HandleMeta = HandleMeta> = Handle<
  Meta,
  {
    readonly _attach: unique symbol;
  }
>;

export type ExtensionHandle<T = unknown> = number & {
  readonly _extSym: unique symbol;
  readonly type: T;
};

export type ExEntityType = "character" | EntityType | "attachment";

export type ExEntityState<TypeT extends ExEntityType> =
  TypeT extends "character"
    ? CharacterState
    : TypeT extends "attachment"
      ? AttachmentState
      : EntityState;

export type HandleT<
  T extends ExEntityType,
  Meta extends HandleMeta = HandleMeta,
> = T extends "character"
  ? CharacterHandle<Meta>
  : T extends "attachment"
    ? AttachmentHandle<Meta>
    : T extends "eventCard"
      ? CardHandle<Meta>
      : T extends "combatStatus"
        ? CombatStatusHandle<Meta>
        : T extends "status"
          ? StatusHandle<Meta>
          : T extends "equipment"
            ? EquipmentHandle<Meta>
            : T extends "summon"
              ? SummonHandle<Meta>
              : T extends "support"
                ? SupportHandle<Meta>
                : T extends "passiveSkill"
                  ? SkillHandle<Meta>
                  : never;

export type ExTag<TypeT extends ExEntityType> = TypeT extends "character"
  ? CharacterTag
  : TypeT extends EntityType
    ? EntityTag
    : never;

export type AppliableDamageType =
  | typeof DamageType.Cryo
  | typeof DamageType.Hydro
  | typeof DamageType.Pyro
  | typeof DamageType.Electro
  | typeof DamageType.Dendro
  | typeof DamageType.Geo;
