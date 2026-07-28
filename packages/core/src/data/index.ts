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

/**
 * Public surface for data definitions and GTS data modules.
 *
 * This intentionally contains no imperative data-definition chain APIs. Data is
 * declared through GTS; these exports are the values and types used inside a
 * definition or by a data provider.
 */
export {
  Registry,
  registerAttachment,
  registerCharacter,
  registerEntity,
  registerInitiativeSkill,
  registerPassiveSkill,
  registerExtension,
  type GameData,
  type CharacterEntry,
  type CharacterInitiativeSkillEntry,
  type CharacterPassiveSkillEntry,
  type OnResolvedCallback,
  type VersionResolver,
  type IRegistrationScope,
} from "./registry";
export { EXTENSION_ID_OFFSET } from "./extension";
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
  ExEntityType,
  HandleT,
} from "./type";
export { DiceType, DamageType, Aura, Reaction } from "@gi-tcg/typings";
export {
  $,
  type IQuery,
  type IDollar,
  type InferResult,
  type InferResult as InferQueryResult,
} from "../query";
export { ListenTo, type TargetGetter } from "../runtime/skill";
export type {
  PlainCharacterState as CharacterState,
  PlainEntityState as EntityState,
  PlainAttachmentState as AttachmentState,
} from "../runtime/context/utils";
export type { CharacterDefinition, EntityDefinition } from "../base/state";
export {
  type CustomEvent,
  createCustomEvent as customEvent,
} from "../base/custom_event";
export { originalDiceCostSizeOfCard as originalDiceCostOfCard } from "../utils";
export { flip, pair, type, type Pair } from "@gi-tcg/utils";
