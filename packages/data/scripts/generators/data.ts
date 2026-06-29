// Copyright (C) 2024-2025 Guyutongxue
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

export type * from "@gi-tcg/assets-manager";
import type { CharacterRawData, EntityRawData, ActionCardRawData } from "@gi-tcg/assets-manager";
import { default as charactersRaw } from "@gi-tcg/assets-manager/data/CHS/characters";
import { default as entitiesRaw } from "@gi-tcg/assets-manager/data/CHS/entities";
import { default as actionCardRaw } from "@gi-tcg/assets-manager/data/CHS/action_cards";

export const characters = charactersRaw as CharacterRawData[];
export const entities = entitiesRaw as EntityRawData[];
export const actionCards = actionCardRaw as ActionCardRawData[]; 
