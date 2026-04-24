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

export { character } from "./character";
export { skill, ListenTo } from "./skill";
export { card } from "./card";
export { summon, status, combatStatus } from "./entity";
export { attachment } from "./attachment";
export { extension } from "./extension";
export {
  Registry,
  type GameData,
  type OnResolvedCallback,
  type VersionResolver,
  type IRegistrationScope,
} from "./registry";
export type {
  AttachmentHandle,
  CardHandle,
  CharacterHandle,
  CombatStatusHandle,
  EntityHandle,
  EquipmentHandle,
  SkillHandle,
  StatusHandle,
  SummonHandle,
  SupportHandle,
  PassiveSkillHandle,
  ExtensionHandle,
} from "./type";
export { DiceType, DamageType, Aura, Reaction } from "@gi-tcg/typings";
export type {
  PlainCharacterState as CharacterState,
  PlainEntityState as EntityState,
} from "./context/utils";
export type { CharacterDefinition, EntityDefinition } from "../base/state";
export {
  type CustomEvent,
  createCustomEvent as customEvent,
} from "../base/custom_event";
export {
  $,
  type IQuery,
  type IDollar,
  type InferResult as InferQueryResult,
} from "../query";

export { originalDiceCostSizeOfCard as originalDiceCostOfCard } from "../utils";
export { flip, pair, type, type Pair } from "@gi-tcg/utils";
