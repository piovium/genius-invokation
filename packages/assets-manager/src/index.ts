// Copyright (C) 2025 Guyutongxue
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

export {
  AssetsManager,
  DEFAULT_ASSETS_MANAGER,
  type GetDataOptions,
  type GetImageOptions,
  type AnyData,
  type Progress,
  type PrepareForSyncOptions,
  type AssetsVersion,
  type AssetsVersionMap,
  type AssetsManagerOption,
} from "./manager";
export * from "./constants";
export { getNameSync } from "./names";
export type {
  CustomActionCard,
  CustomAttachment,
  CustomCharacter,
  CustomData,
  CustomEntity,
  CustomSkill,
} from "./custom_data";
export {
  getDeckData,
  type DeckData,
  type DeckDataActionCardInfo,
  type DeckDataCharacterInfo,
} from "./deck_data";
export {
  ALL_CATEGORIES,
  type Category,
  type PlayCost,
  type CharacterRawData,
  type SkillRawData,
  type ActionCardRawData,
  type EntityRawData,
  type KeywordRawData,
} from "./data_types";
export { staticEncode, staticDecode } from "./sharing";
