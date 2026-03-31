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

import type { I18nKey } from "./locales";
import zhCN from "./locales/zh-CN";
import en from "./locales/en";

export type Locale = "zh-CN" | "en";

export const translations = {
  "zh-CN": zhCN,
  "en": en,
}

export function cardTypeText(tagName: string, t: (key: I18nKey) => string) {
  switch (tagName) {
    case "GCG_CARD_MODIFY":
      return t("typeModify");
    case "GCG_CARD_EVENT":
      return t("typeEvent");
    case "GCG_CARD_ASSIST":
      return t("typeAssist");
    default:
      return tagName;
  }
}
