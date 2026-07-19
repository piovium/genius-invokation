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

import { IS_BETA } from "@gi-tcg/config";
import { AssetsManager, type Language } from "./manager";

export {
  AssetsManager,
  type GetDataOptions,
  type GetImageOptions,
  type AnyData,
  type Progress,
  type PrepareForSyncOptions,
  type AssetsManagerOption,
} from "./manager";

// @ts-expect-error Node.js typing
const env = import.meta.env || globalThis.process?.env || {};

export const DEFAULT_ASSETS_API_ENDPOINT =
  env.DEFAULT_ASSETS_API_ENDPOINT || "https://static-data.piovium.org/api/v4";

const preferredLanguage =
  globalThis?.navigator?.languages?.[0] ??
  globalThis?.navigator?.language ??
  globalThis?.Intl?.DateTimeFormat()?.resolvedOptions()?.locale ??
  "en-US";
export const DEFAULT_LANGUAGE: Language = preferredLanguage.startsWith("zh")
  ? "CHS"
  : "EN";
export const DEFAULT_VERSION: typeof IS_BETA extends true ? "beta" : "latest" =
  (IS_BETA ? "beta" : "latest") as any;
export const DEFAULT_ASSETS_MANAGER = new AssetsManager();

export { getNameSync } from "./names";
export type {
  CustomActionCard,
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
