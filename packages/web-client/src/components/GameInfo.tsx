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

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { onMount, Show } from "solid-js";
import axios from "axios";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";

dayjs.extend(relativeTime);

export interface GameInfoProps {
  gameId: number;
  createdAt: string;
  winnerId: number | null;
}

export function GameInfo(props: GameInfoProps) {
  const { status } = useAuth();
  const { t, locale } = useI18n();
  onMount(() => {
    dayjs.locale(locale().toLocaleLowerCase());
  });

  const downloadLog = async () => {
    try {
      const { data } = await axios.get(`games/${props.gameId}`);
      const blob = new Blob([data.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gameLog-${props.gameId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(
        t("downloadFailed", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  };
  return (
    <div class="flex flex-row gap-2 items-center">
      <div class="w-24" title={props.createdAt}>
        {dayjs(props.createdAt).fromNow()}
      </div>
      <div class="text-lg">
        <Show
          when={status()?.id === props.winnerId}
          fallback={<div class="text-red-400">{t("defeat")}</div>}
        >
          <div class="text-green-400">{t("victory")}</div>
        </Show>
      </div>
      <button class="btn btn-outline" onClick={downloadLog}>
        {t("downloadLog")}
      </button>
    </div>
  );
}
