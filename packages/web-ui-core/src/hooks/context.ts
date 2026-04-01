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

import type { AssetsManager } from "@gi-tcg/assets-manager";
import { createContext, useContext } from "solid-js";
import type { Translator } from "../locales";
import zhCN from "../locales/zh-CN";
import en from "../locales/en";

export type Locale = "zh-CN" | "en";

export const translations = {
  "zh-CN": zhCN,
  en: en,
};

export interface UiContextValue {
  assetsManager: () => AssetsManager;
  locale: () => Locale;
  t: Translator;
  disableDelicateUi?: boolean;
}

export const UiContext = createContext<UiContextValue>();

export function useUiContext() {
  return useContext(UiContext)!;
}
