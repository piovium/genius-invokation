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
  Show,
  createResource,
  Switch,
  Match,
  For,
  createSignal,
  onMount,
  createEffect,
} from "solid-js";
import { Layout } from "../layouts/Layout";
import { A, useNavigate, useSearchParams } from "@solidjs/router";
import axios, { AxiosError } from "axios";
import { DeckBriefInfo } from "../components/DeckBriefInfo";
import { RoomDialog } from "../components/RoomDialog";
import { roomCodeToId } from "../utils";
import { RoomInfo } from "../components/RoomInfo";
import { useDecks } from "./Decks";
import { Login } from "../components/Login";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { Portal } from "solid-js/web";

export default function Home() {
  const { t } = useI18n();
  const { status, loading: userLoading, error: userError, logout } = useAuth();
  const navigate = useNavigate();
  const { decks, loading: decksLoading, error: decksError } = useDecks();

  const [roomCodeValid, setRoomCodeValid] = createSignal(false);
  let createRoomDialogEl!: HTMLDialogElement;
  let joinRoomDialogEl!: HTMLDialogElement;
  const [joiningRoomInfo, setJoiningRoomInfo] = createSignal<any>();

  const [currentRoom] = createResource(() =>
    axios.get("rooms/current").then((r) => r.data),
  );
  const [allRooms, { refetch: refreshAllRooms }] = createResource(() =>
    axios
      .get("rooms")
      .then((e) => e.data.filter((r: any) => r.id !== currentRoom()?.id)),
  );

  const isLogin = () => {
    const { type } = status();
    return type !== "notLogin";
  };

  const createRoom = () => {
    if (!decks().count) {
      alert(t("createDeckFirst"));
      navigate("/decks/new");
      return;
    }
    createRoomDialogEl.showModal();
  };
  const joinRoomBySubmitCode = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!decks().count) {
      alert(t("createDeckFirst"));
      navigate("/decks/new");
      return;
    }
    const form = new FormData(e.target as HTMLFormElement);
    const roomCode = form.get("roomCode") as string;
    const roomId = roomCodeToId(roomCode);
    try {
      const { data } = await axios.get(`rooms/${roomId}`);
      setJoiningRoomInfo(data);
      joinRoomDialogEl.showModal();
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      }
      console.error(e);
      setJoiningRoomInfo();
    }
  };
  const joinRoomByInfo = (roomInfo: any) => {
    if (!decks().count) {
      alert(t("createDeckFirst"));
      navigate("/decks/new");
      return;
    }
    setJoiningRoomInfo(roomInfo);
    joinRoomDialogEl.showModal();
  };

  return (
    <Layout>
      <div class="container mx-auto h-full px-2">
        <Switch>
          <Match when={userLoading()}>
            <div class="text-gray-500">{t("loadingNow")}</div>
          </Match>
          <Match when={userError()}>
            <div class="text-red-500">
              <p>
                {t("userInfoLoadFailed", {
                  message: userError()?.message ?? String(userError()),
                })}
              </p>
              <p>
                {t("pleaseTry")}{" "}
                <button class="btn btn-outline-red" onClick={logout}>
                  {t("logout")}
                </button>
              </p>
            </div>
          </Match>
          <Match when={isLogin()}>
            <div class="flex flex-col h-full min-h-0">
              <div class="flex-shrink-0 mb-8">
                <h2 class="text-3xl font-light">
                  {t("welcomeUser", {
                    guestPrefix:
                      status().type === "guest" ? t("guestPrefix") : " ",
                    name: status().name ?? "",
                  })}
                </h2>
              </div>
              <div class="flex flex-grow flex-col-reverse md:flex-row gap-8 md:gap-0 min-h-0">
                <div class="h-full w-full md:w-128 flex flex-col items-start md:bottom-opacity-gradient">
                  <A
                    href="/decks"
                    class="text-xl font-bold text-blue-500 hover:underline mb-4"
                  >
                    {t("myDecks")}
                  </A>
                  <Switch>
                    <Match when={decksLoading()}>
                      <div class="text-gray-500">{t("deckInfoLoading")}</div>
                    </Match>
                    <Match when={decksError()}>
                      <div class="text-gray-500">
                        {t("deckInfoLoadFailed", {
                          message:
                            decksError()?.message ?? String(decksError()),
                        })}
                      </div>
                    </Match>
                    <Match when={true}>
                      <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:gap-3 md:pr-6 md:overflow-y-auto scrollbar-thin-hover">
                        <For
                          each={decks().data}
                          fallback={
                            <div class="text-gray-500">
                              {t("noDecks")}
                              <A href="/decks/new" class="text-blue-500">
                                {t("goAdd")}
                              </A>
                            </div>
                          }
                        >
                          {(deckData) => <DeckBriefInfo {...deckData} />}
                        </For>
                      </div>
                    </Match>
                  </Switch>
                </div>
                <div class="b-r-gray-200 b-1 hidden md:block mr-8" />
                <div class="flex-grow flex flex-col md:min-w-128">
                  <h4 class="text-xl font-bold mb-5">{t("startGame")}</h4>
                  <Show
                    when={!currentRoom()}
                    fallback={
                      <div class="mb-8 grid gap-3 grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))]">
                        <RoomInfo {...currentRoom()} />
                      </div>
                    }
                  >
                    <div class="flex flex-col md:flex-row gap-2 md:gap-5 items-center mb-8">
                      <button
                        class="flex-shrink-0 w-full md:w-35 btn btn-solid-green h-2.3rem"
                        onClick={createRoom}
                      >
                        {t("createRoom")}
                      </button>
                      <span class="flex-shrink-0">{t("or")}</span>
                      <form
                        class="flex-grow flex flex-row w-full md:w-unset"
                        onSubmit={joinRoomBySubmitCode}
                      >
                        <input
                          type="text"
                          class="input input-solid rounded-r-0 b-r-0 flex-grow md:flex-grow-0 text-1rem line-height-none h-9 text-4"
                          name="roomCode"
                          placeholder={t("enterRoomCode")}
                          inputmode="numeric"
                          pattern="\d{4}"
                          onInput={(e) =>
                            setRoomCodeValid(e.target.checkValidity())
                          }
                          autofocus
                          required
                        />
                        <button
                          type="submit"
                          class="flex-shrink-0 btn btn-solid rounded-l-0 h-9 text-4"
                          disabled={!roomCodeValid()}
                        >
                          {t("joinRoom")}
                        </button>
                      </form>
                    </div>
                  </Show>
                  <h4 class="text-xl font-bold mb-5 flex flex-row items-center gap-2">
                    {t("currentGames")}
                    <button
                      class="btn btn-ghost-primary p-1"
                      onClick={refreshAllRooms}
                    >
                      <i class="i-mdi-refresh" />
                    </button>
                  </h4>
                  <ul class="grid scrollbar-thin-hover grid w-full grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] md:gap-3 md:overflow-y-auto">
                    <Switch>
                      <Match when={allRooms.loading}>
                        <div class="text-gray-500">{t("roomInfoLoading")}</div>
                      </Match>
                      <Match when={allRooms.error}>
                        <div class="text-red-500">
                          {t("roomInfoLoadFailed", {
                            message:
                              allRooms.error instanceof AxiosError
                                ? allRooms.error.response?.data.message
                                : allRooms.error,
                          })}
                        </div>
                      </Match>
                      <Match when={true}>
                        <For
                          each={allRooms()}
                          fallback={
                            <div class="text-gray-500">{t("noGames")}</div>
                          }
                        >
                          {(roomInfo) => (
                            <li>
                              <RoomInfo {...roomInfo} onJoin={joinRoomByInfo} />
                            </li>
                          )}
                        </For>
                      </Match>
                    </Switch>
                  </ul>
                </div>
              </div>
            </div>
          </Match>
          <Match when={true}>
            <div class="w-full flex justify-center">
              <Login />
            </div>
          </Match>
        </Switch>
      </div>
      <Portal>
        <RoomDialog ref={createRoomDialogEl!} />
        <RoomDialog
          ref={joinRoomDialogEl!}
          joiningRoomInfo={joiningRoomInfo()}
        />
      </Portal>
    </Layout>
  );
}
