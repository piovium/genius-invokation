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

import { createResource, For, Match, Show, Switch } from "solid-js";
import { A } from "@solidjs/router";
import axios, { AxiosError } from "axios";
import { GameInfo } from "./GameInfo";
import { ChessboardColor } from "./ChessboardColor";
import { useI18n } from "../i18n";
import { Portal } from "solid-js/web";
import { AvatarSelector } from "./AvatarSelector";
import { useAuth } from "../auth";
import { TextFieldEdit } from "./TextFieldEdit";

export interface UserInfoProps {
  type: "user" | "guest";
  idText: string;
  name: string;
  avatarUrl?: string;
  editable?: boolean;
  onSubmit?: () => void;
}

export function UserInfo(props: UserInfoProps) {
  const { t } = useI18n();
  const [games] = createResource(() =>
    axios.get<{ data: any[] }>(`games/mine`).then((res) => res.data),
  );

  let avatarSelectorEl: HTMLDialogElement | undefined;

  // Nickname editing state
  const { updateInfo } = useAuth();

  const saveName = async (newName: string) => {
    if (newName.trim()) {
      try {
        await updateInfo({ name: newName });
        props.onSubmit?.();
        return true;
      } catch (err) {
        console.error(err);
      }
    }
    return false;
  };

  const setAvatarUrl = async (newUrl: string) => {
    await updateInfo({ avatarUrl: newUrl });
  };

  return (
    <div class="flex flex-col md:flex-row container gap-4 px-2 h-full md:overflow-y-auto">
      <div class="flex flex-col w-full md:w-45 justify-start items-center">
        <div class="relative rounded-full w-40 h-40 b-solid b-1 b-gray-200 flex items-center justify-center">
          <img
            src={props.avatarUrl}
            class="w-36 h-36 object-cover rounded-full"
          />
          <Show
            when={props.editable && props.type === "guest" && props.avatarUrl}
          >
            {(avatarUrl) => (
              <>
                <button
                  class="absolute top-28 right-2 btn btn-ghost bg-white h-10 w-10 p-1 rounded-full shadow-md"
                  onClick={() => avatarSelectorEl?.showModal()}
                  title={t("selectAvatar")}
                >
                  <i class="i-mdi-camera h-6 w-6" />
                </button>
                <Portal>
                  <AvatarSelector
                    ref={avatarSelectorEl!}
                    value={avatarUrl()}
                    onChange={setAvatarUrl}
                  />
                </Portal>
              </>
            )}
          </Show>
        </div>
      </div>
      <div class="flex-grow flex flex-col items-start">
        <h2 class="text-2xl font-bold">{t("profile")}</h2>
        <div class="flex items-end gap-2 mb-5">
          <span class="text-gray-4 text-sm font-300">{props.idText}</span>
        </div>
        <dl class="flex flex-row gap-4 items-center">
          <dt class="font-bold text-nowrap">{t("nickname")}</dt>
          <dd class="flex flex-row gap-4 items-center h-8">
            <TextFieldEdit
              disable={!props.editable}
              value={props.name || ""}
              saveText={t("save")}
              cancelText={t("cancel")}
              placeholder={t("guestNamePlaceholder")}
              onSave={saveName}
            />
          </dd>
        </dl>
        <Show when={props.editable}>
          <hr class="h-1 w-full text-gray-4 my-4" />
          <dl class="flex flex-row gap-4 items-center">
            <dt class="font-bold text-nowrap">{t("chessboardColor")}</dt>
            <ChessboardColor />
          </dl>
          <hr class="h-1 w-full text-gray-4 my-4" />
          <div class="flex flex-col gap-4">
            <dt class="font-bold">{t("gameRecords")}</dt>
            <dd class="flex flex-col gap-1">
              <Switch>
                <Match when={props.type === "guest"}>
                  {t("guestNoGameRecords")}
                </Match>
                <Match when={games.loading}>{t("loading")}</Match>
                <Match when={games.error}>
                  {t("loadFailed", {
                    message:
                      games.error instanceof AxiosError
                        ? games.error.response?.data.message
                        : String(games.error),
                  })}
                </Match>
                <Match when={!games()?.data.length}>{t("noGameRecords")}</Match>
                <Match when={games()}>
                  {(games) => (
                    <For each={games().data}>
                      {(data) => (
                        <GameInfo
                          gameId={data.game.id}
                          createdAt={data.game.createdAt}
                          winnerId={data.game.winnerId}
                        />
                      )}
                    </For>
                  )}
                </Match>
              </Switch>
            </dd>
          </div>
          <hr class="h-1 w-full text-gray-4 my-4" />
          <div class="flex items-center gap-3">
            <A class="btn btn-ghost font-bold" href="/decks">
              {t("myDecksMore")}
            </A>
          </div>
        </Show>
      </div>
    </div>
  );
}
