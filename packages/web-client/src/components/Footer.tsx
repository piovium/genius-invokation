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

import { IS_BETA } from "@gi-tcg/config";
import { onMount, Show } from "solid-js";
import dayjs from "dayjs";
import localize from "dayjs/plugin/localizedFormat";
import "dayjs/locale/zh-cn";
import "dayjs/locale/en";
import { useVersionContext } from "../App";
import { useI18n } from "../i18n";

dayjs.extend(localize);

export function Footer() {
  const { versionInfo } = useVersionContext();
  const { t, locale } = useI18n();
  onMount(() => {
    dayjs.locale(locale().toLocaleLowerCase());
  });
  return (
    <footer class="flex flex-col md:flex-row gap-x-4 gap-y-0 p-4 text-sm text-gray-500 flex-wrap">
      <div class="flex flex-row gap-4">
        <span>© 2026 Piovium Labs</span>
        <a
          class="text-blue-400"
          href="https://github.com/piovium/genius-invokation"
          target="_blank"
        >
          GitHub
        </a>
      </div>
      <div>
        {t("license")}{" "}
        <a
          class="text-blue-400"
          href="https://www.gnu.org/licenses/agpl-3.0.html"
          target="_blank"
        >
          AGPL-3.0-or-later
        </a>
      </div>
      <Show when={versionInfo()}>
        <div>
          {t("gameVersion")}{" "}
          {IS_BETA ? (
            <span class="text-red-300">{t("latestBeta")}</span>
          ) : (
            versionInfo().currentGameVersion
          )}
        </div>
        <div>
          {t("simulatorVersion")} {versionInfo().coreVersion} (
          <a
            title={versionInfo().revision.message}
            class="text-blue-400"
            href={`https://github.com/piovium/genius-invokation/commit/${
              versionInfo().revision.hash
            }`}
            target="_blank"
          >
            {dayjs(versionInfo().revision.date).format("YYYY-MM-DD HH:mm:ss")}
          </a>
          )
        </div>
      </Show>
      <div>
        <a
          class="text-blue-400"
          href={t("playerGroupLink")}
          target="_blank"
        >
          {t("joinPlayerGroup")}
        </a>
      </div>
    </footer>
  );
}
