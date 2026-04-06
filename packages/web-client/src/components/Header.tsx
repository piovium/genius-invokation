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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { A, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { IS_BETA } from "@gi-tcg/config";
import Logo from "./Logo.svg";
import Title from "./Title.svg";
import LanguageIcon from "./Language.svg";
import { useAuth } from "../auth";
import { Locale, useI18n } from "../i18n";

const USE_LOGO = true;

export function Header() {
  const navigate = useNavigate();
  const { status, logout, avatarUrl } = useAuth();
  const { t, locale, setLocale } = useI18n();
  return (
    <header class="fixed top-0 left-0 w-100dvw flex flex-row h-[calc(3rem+var(--root-padding-top))] md:h-[calc(4rem+var(--root-padding-top))] pt-[var(--root-padding-top)] bg-white z-200 px-4 shadow-md items-center gap-2">
      <img src={Logo} class="h-10 md:h-12" />
      <div class="flex-grow flex flex-col md:flex-row items-start md:items-end gap-1 md:gap-2">
        <h1 class="text-xl line-height-none font-bold">
          <A href="/">
            <Show when={USE_LOGO} fallback={t("platformTitle")}>
              <img src={Title} class="h-5 md:h-6" alt={t("platformLogoAlt")} />
            </Show>
          </A>
        </h1>
        <div class="flex flex-row gap-2">
          <Show when={IS_BETA}>
            <span class="text-8px md:text-10px badge badge-soft-error">
              {t("includeUnreleasedData")}
            </span>
          </Show>
        </div>
      </div>
      <div class="flex flex-row items-center relative">
        <select
          class="select h-8 text-xs border rounded-full pl-7 py-1 bg-white"
          value={locale()}
          onChange={(e) => setLocale(e.currentTarget.value as Locale)}
          aria-label={t("languageLabel")}
        >
          <option value="zh-CN">{t("languageChinese")}</option>
          <option value="en">{t("languageEnglish")}</option>
        </select>
        <img
          src={LanguageIcon}
          class="absolute h-6 -translate-x-50% left-4"
          alt={t("languageLabel")}
        />
      </div>
      <Show when={status().type !== "notLogin"}>
        <A
          href={
            status().type === "guest" ? `/user/guest` : `/user/${status().id}`
          }
        >
          <div class="rounded-full w-10 h-10 md:w-12 md:h-12 b-solid b-1 b-gray-200 flex items-center justify-center">
            <img src={avatarUrl()} class="w-85% h-85% [clip-path:circle()]" />
          </div>
        </A>
        <button
          class="btn btn-outline-red"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <i class="i-mdi-logout" />
          <span class="hidden sm:inline">{t("logout")}</span>
        </button>
      </Show>
    </header>
  );
}
