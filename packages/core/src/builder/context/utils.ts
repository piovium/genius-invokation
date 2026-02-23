// Copyright (C) 2025 Guyutongxue
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

/** This file provides a wrapper of getEntityById/getEntityArea with getRaw */

import type {
  AttachmentState,
  CharacterState,
  EntityState,
  GameState,
  StateSymbol,
} from "../../base/state";
import { getRaw } from "./reactive";
import {
  getEntityArea as getEntityAreaOriginal,
  getEntityById as getEntityByIdOriginal,
} from "../../utils";
import type { ExEntityType } from "../type";

export function getEntityArea(state: GameState, id: number) {
  return getEntityAreaOriginal(getRaw(state), id);
}

export function getEntityById(state: GameState, id: number) {
  return getEntityByIdOriginal(getRaw(state), id);
}

export {
  elementOfCharacter,
  getActiveCharacterIndex,
  nationOfCharacter,
  weaponOfCharacter,
  allSkills,
  diceCostSizeOfCard,
  isCharacterInitiativeSkill,
  sortDice,
} from "../../utils";

export type PlainCharacterState = Omit<CharacterState, StateSymbol>;
export type PlainEntityState = Omit<EntityState, StateSymbol>;
export type PlainAttachmentState = Omit<AttachmentState, StateSymbol>;
export type PlainAnyState =
  | PlainCharacterState
  | PlainEntityState
  | PlainAttachmentState;
export type ExPlainEntityState<TypeT extends ExEntityType> =
  TypeT extends "character"
    ? PlainCharacterState
    : TypeT extends "attachment"
      ? PlainAttachmentState
      : PlainEntityState;
