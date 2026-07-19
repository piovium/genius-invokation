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
import type { Language } from "./manager";

export const DEFAULT_ASSETS_API_ENDPOINT =
  import.meta.env?.DEFAULT_ASSETS_API_ENDPOINT ||
  // @ts-expect-error Node.js typing
  globalThis.process?.env.DEFAULT_ASSETS_API_ENDPOINT ||
  "https://static-data.piovium.org/api/v4";

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
