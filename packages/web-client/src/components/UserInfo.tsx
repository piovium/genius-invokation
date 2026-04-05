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

import {
  createResource,
  For,
  Match,
  Show,
  Switch,
  createSignal,
} from "solid-js";
import { getPlayerAvatarUrl, getGithubAvatarUrl } from "../utils";
import { A } from "@solidjs/router";
import axios, { AxiosError } from "axios";
import { GameInfo } from "./GameInfo";
import { ChessboardColor } from "./ChessboardColor";
import { useI18n } from "../i18n";

export interface UserInfoProps {
  type: "user" | "guest";
  id: number | null;
  name?: string;
  avatar?: string | null;
  chessboardColor: string | null;
  editable?: boolean;
  onNameChange?: (newName: string) => Promise<void>;
  onAvatarChange?: (newAvatar: string | null) => Promise<void>;
  onOpenAvatarSelector?: () => void;
}

export function UserInfo(props: UserInfoProps) {
  const { t } = useI18n();
  const [games] = createResource(() =>
    axios.get<{ data: any[] }>(`games/mine`).then((res) => res.data),
  );

  // Nickname editing state
  const [editingName, setEditingName] = createSignal(false);
  const [nameInputEl, setNameInputEl] = createSignal<HTMLInputElement>();
  const [uploading, setUploading] = createSignal(false);

  const startEditingName = () => {
    setEditingName(true);
    const input = nameInputEl();
    if (input) {
      input.value = props.name || "";
      input.focus();
    }
  };

  const saveName = async (e: SubmitEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newName = formData.get("name") as string;

    if (newName.trim() && props.onNameChange) {
      try {
        setUploading(true);
        await props.onNameChange(newName.trim());
        setEditingName(false);
      } catch (err) {
        console.error(err);
      } finally {
        setUploading(false);
      }
    }
  };

  const avatarUrl = () => {
    console.log(props.id, props.type);
    if (props.type !== "guest" && props.id) {
      return getGithubAvatarUrl(props.id);
    }
    return getPlayerAvatarUrl({
      isGuest: true,
      id: props.id ?? null,
      name: props.name || "",
      avatar: props.avatar,
    });
  };

  return (
    <div class="flex flex-col md:flex-row container gap-4 px-2 h-full md:overflow-y-auto">
      <div class="flex flex-col w-full md:w-45 justify-start items-center">
        <div class="relative rounded-full w-40 h-40 b-solid b-1 b-gray-200 flex items-center justify-center">
          <img src={avatarUrl()} class="w-36 h-36 object-cover rounded-full" />
          <Show when={props.editable && props.type === "guest"}>
            <button
              class="absolute top-28 right-2 btn btn-ghost bg-white h-10 w-10 p-1 rounded-full shadow-md"
              onClick={() => props.onOpenAvatarSelector?.()}
              title={t("selectAvatar")}
            >
              <i class="i-mdi-camera h-6 w-6" />
            </button>
          </Show>
        </div>
      </div>
      <div class="flex-grow flex flex-col items-start">
        <h2 class="text-2xl font-bold">{t("profile")}</h2>
        <div class="flex items-end gap-2 mb-5">
          <span class="text-gray-4 text-sm font-300">
            {props.type === "guest" ? t("guestIdentity") : `ID: ${props.id}`}
          </span>
        </div>
        <dl class="flex flex-row gap-4 items-center">
          <dt class="font-bold text-nowrap">{t("nickname")}</dt>
          <dd class="flex flex-row gap-4 items-center h-8">
            <Show
              when={props.editable && editingName()}
              fallback={
                <div class="flex flex-row items-center gap-2">
                  <span class="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
                    {props.name}
                  </span>
                  <Show when={props.editable && props.type === "guest"}>
                    <button
                      class="btn btn-ghost h-8 w-8 p-1"
                      onClick={startEditingName}
                    >
                      <i class="i-mdi-square-edit-outline h-6 w-6" />
                    </button>
                  </Show>
                </div>
              }
            >
              <form
                onSubmit={(e) => saveName(e)}
                class="flex flex-row gap-1 md:gap-3 text-3.2 md:text-3.5"
              >
                <input
                  type="text"
                  required
                  ref={setNameInputEl}
                  onFocus={(e) => e.target.select()}
                  name="name"
                  class="input input-outline min-w-40 md:w-50 h-8 text-1rem"
                  placeholder={t("guestNamePlaceholder")}
                />
                <button
                  type="submit"
                  class="btn btn-soft-green h-8 w-12"
                  disabled={uploading()}
                >
                  <Show when={uploading()} fallback={t("save")}>
                    <i class="i-mdi-loading animate-spin" />
                  </Show>
                </button>
                <button
                  type="button"
                  class="btn btn-soft-red h-8 w-12"
                  onClick={() => setEditingName(false)}
                >
                  {t("cancel")}
                </button>
              </form>
            </Show>
          </dd>
        </dl>
        <hr class="h-1 w-full text-gray-4 my-4" />
        <dl class="flex flex-row gap-4 items-center">
          <dt class="font-bold text-nowrap">{t("chessboardColor")}</dt>
          <Show when={props.editable}>
            <ChessboardColor />
          </Show>
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
              <Match when={!!!games()?.data.length}>{t("noGameRecords")}</Match>
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
      </div>
    </div>
  );
}
