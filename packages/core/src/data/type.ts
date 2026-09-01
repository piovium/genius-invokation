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

export type CharacterHandle<Id extends number = number> = Id & {
  readonly _char: unique symbol;
};
export type SkillHandle<Id extends number = number> = Id & {
  readonly _skill: unique symbol;
};
export type PassiveSkillHandle<Id extends number = number> = Id & {
  readonly _passiveSkill: unique symbol;
};
export type EntityHandle<Id extends number = number> = Id & {
  readonly _entity: unique symbol;
};
export type CardHandle<Id extends number = number> = EntityHandle<Id> & {
  readonly _card: unique symbol;
};
export type StatusHandle<Id extends number = number> = EntityHandle<Id> & {
  readonly _stat: unique symbol;
};
export type CombatStatusHandle<Id extends number = number> =
  EntityHandle<Id> & {
    readonly _cStat: unique symbol;
  };
export type SummonHandle<Id extends number = number> = Id & {
  readonly sm: unique symbol;
};
export type SupportHandle<Id extends number = number> = EntityHandle<Id> &
  CardHandle<Id> & { readonly _support: unique symbol };
export type EquipmentHandle<Id extends number = number> = EntityHandle<Id> &
  CardHandle<Id> & { readonly _equip: unique symbol };

export type AttachmentHandle<Id extends number = number> = Id & {
  readonly _attach: unique symbol;
};

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
  Id extends number = number,
> = T extends "character"
  ? CharacterHandle<Id>
  : T extends "attachment"
    ? AttachmentHandle<Id>
    : T extends "eventCard"
      ? CardHandle<Id>
      : T extends "combatStatus"
        ? CombatStatusHandle<Id>
        : T extends "status"
          ? StatusHandle<Id>
          : T extends "equipment"
            ? EquipmentHandle<Id>
            : T extends "summon"
              ? SummonHandle<Id>
              : T extends "support"
                ? SupportHandle<Id>
                : T extends "passiveSkill"
                  ? SkillHandle<Id>
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
