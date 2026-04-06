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
  createSignal,
  Show,
  For,
  createEffect,
  JSX,
  splitProps,
} from "solid-js";
import axios, { AxiosError } from "axios";
import { ToggleSwitch } from "./ToggleSwitch";
import { DeckInfoProps } from "./DeckBriefInfo";
import { roomIdToCode } from "../utils";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "../auth";
import { useVersionContext } from "../App";
import { useGuestDecks, useGuestInfo } from "../guest";
import type { AssetsManager } from "@gi-tcg/assets-manager";
import { useI18n } from "../i18n";

function SelectableDeckInfo(
  props: DeckInfoProps & Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "id">,
) {
  const { assetsManager } = useI18n();
  const [deckInfo, inputProps] = splitProps(props, [
    "characters",
    "name",
    "id",
  ]);
  return (
    <label class="relative group cursor-pointer min-w-15 w-full">
      <input
        type="radio"
        hidden
        class="peer"
        name="createRoomDeck"
        {...inputProps}
      />
      <div class="pl-10 pr-4 flex flex-row">
        <div class="flex flex-row items-center gap-1">
          <For each={deckInfo.characters}>
            {(id) => (
              <img
                class="h-12 w-12 b-2 b-yellow-100 rounded-full"
                src={assetsManager().getImageUrlSync(id, {
                  type: "icon",
                })}
              />
            )}
          </For>
        </div>
      </div>
      <div class="pl-8 pb-1 text-yellow-800 peer-checked:text-yellow-100 transition-colors">
        {deckInfo.name}
      </div>
      <div class="absolute bottom-7 left-0 hidden peer-checked:flex text-6 line-height-6 w-8 h-8  items-center justify-center text-red bg-white b-yellow-800 b-2 rounded-full">
        &#10003;
      </div>
      <div class="absolute bottom-0 left-4 right-1 h-12 bg-white border-yellow-800 b-1 group-hover:bg-yellow-100 group-[_]:peer-checked:bg-yellow-800 rounded-lg z--1 transition-colors" />
    </label>
  );
}

export interface RoomDialogProps {
  ref: HTMLDialogElement;
  joiningRoomInfo?: {
    id: number;
    config: TimeConfig & { [k: string]: any };
  };
}

interface TimeConfig {
  nameKey:
    | "timeConfigMinimal"
    | "timeConfigStandard"
    | "timeConfigDouble"
    | "timeConfigLong"
    | "timeConfigEndless";
  estimationTime: number;
  initTotalActionTime: number;
  rerollTime: number;
  roundTotalActionTime: number;
  actionTime: number;
}

const TIME_CONFIGS: TimeConfig[] = [
  {
    nameKey: "timeConfigMinimal",
    estimationTime: 3,
    initTotalActionTime: 20,
    rerollTime: 25,
    roundTotalActionTime: 20,
    actionTime: 25,
  },
  {
    nameKey: "timeConfigStandard",
    estimationTime: 5,
    initTotalActionTime: 45,
    rerollTime: 40,
    roundTotalActionTime: 60,
    actionTime: 25,
  },
  {
    nameKey: "timeConfigDouble",
    estimationTime: 10,
    initTotalActionTime: 20,
    rerollTime: 60,
    roundTotalActionTime: 180,
    actionTime: 45,
  },
  {
    nameKey: "timeConfigLong",
    estimationTime: 20,
    initTotalActionTime: 60,
    rerollTime: 120,
    roundTotalActionTime: 300,
    actionTime: 90,
  },
  {
    nameKey: "timeConfigEndless",
    estimationTime: 60,
    initTotalActionTime: 60,
    rerollTime: 300,
    roundTotalActionTime: 180,
    actionTime: 300,
  },
];

export function RoomDialog(props: RoomDialogProps) {
  const { t, assetsManager } = useI18n();
  const { status } = useAuth();
  const [guestInfo, setGuestInfo] = useGuestInfo();
  const [guestDecks] = useGuestDecks();
  const navigate = useNavigate();
  const editable = () => !props.joiningRoomInfo;
  let dialogEl: HTMLDialogElement;
  const closeDialog = () => {
    dialogEl.close();
  };
  const { versionInfo } = useVersionContext();
  const [version, setVersion] = createSignal(-1);
  const [timeConfig, setTimeConfig] = createSignal(TIME_CONFIGS[1]);
  const [isPublic, setIsPublic] = createSignal(true);
  const [watchable, setWatchable] = createSignal(true);
  const [allowGuest, setAllowGuest] = createSignal(true);
  const [availableDecks, setAvailableDecks] = createSignal<DeckInfoProps[]>([]);
  const [loadingDecks, setLoadingDecks] = createSignal(true);
  const [selectedDeck, setSelectedDeck] = createSignal<number | null>(null);
  const [entering, setEntering] = createSignal(false);

  createEffect(() => {
    const versions = versionInfo()?.supportedGameVersions ?? [];
    if (props.joiningRoomInfo?.config.gameVersion) {
      const ver = versions.indexOf(props.joiningRoomInfo.config.gameVersion);
      setVersion(ver);
    } else {
      setVersion(versions.length - 1);
    }
  });

  const updateAvailableDecks = async (version: number) => {
    setLoadingDecks(true);
    const { type } = status();
    try {
      if (type === "user") {
        const { data } = await axios.get(`decks?requiredVersion=${version}`);
        setAvailableDecks(data.data);
      } else if (type === "guest") {
        setAvailableDecks(
          guestDecks().filter((deck) => deck.requiredVersion <= version),
        );
      }
    } catch (e) {
      setAvailableDecks([]);
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      }
      console.error(e);
    }
    const currentSelectedDeckId = selectedDeck();
    if (!availableDecks().some((deck) => deck.id === currentSelectedDeckId)) {
      setSelectedDeck(null);
    }
    setLoadingDecks(false);
  };

  createEffect(() => {
    const ver = version();
    if (ver >= 0) {
      updateAvailableDecks(ver);
    }
  });

  const enterRoom = async () => {
    setEntering(true);
    const { type, name, id } = status();
    try {
      let roomId = props.joiningRoomInfo?.id;
      let playerId = id ?? null;
      let response;
      if (typeof roomId === "undefined") {
        const payload: any = {
          gameVersion: version(),
          ...timeConfig(),
          private: !isPublic(),
          watchable: watchable(),
          allowGuest: allowGuest(),
        };
        if (type === "guest") {
          payload.name = name;
          payload.deck = guestDecks().find(
            (deck) => deck.id === selectedDeck(),
          );
          payload.avatarUrl = guestInfo()?.avatarUrl;
        } else if (type === "user") {
          payload.hostDeckId = selectedDeck();
        }
        const { data } = await axios.post("rooms", payload);
        response = data;
        roomId = response.room.id as number;
      } else {
        let payload;
        if (type === "guest") {
          payload = {
            deck: guestDecks().find((deck) => deck.id === selectedDeck()),
            name,
            avatarUrl: guestInfo()?.avatarUrl,
          };
        } else if (type === "user") {
          payload = {
            deckId: selectedDeck(),
          };
        }
        const { data } = await axios.post(`rooms/${roomId}/players`, payload);
        response = data;
      }
      if (response.accessToken) {
        localStorage.setItem("accessToken", response.accessToken);
      }
      if (response.playerId) {
        playerId = response.playerId;
        setGuestInfo((info) => info && { ...info, id: response.playerId });
      }
      const roomCode = roomIdToCode(roomId);
      navigate(`/rooms/${roomCode}?player=${playerId}&action=1`);
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      } else if (e instanceof Error) {
        alert(e.message);
      }
      console.error(e);
    } finally {
      setEntering(false);
    }
  };

  return (
    <dialog
      ref={(el) => (dialogEl = el) && (props.ref as any)?.(el)}
      class="max-h-unset max-w-unset h-100dvh w-100dvw overflow-auto pt-[calc(0.75rem+var(--root-padding-top))] md:pt-3 md:m-x-auto md:my-3rem md:h-[calc(100vh-6rem)] md:w-min md:max-h-200 md:rounded-xl md:shadow-xl p-6 scrollbar-hidden"
    >
      <div class="flex flex-col md:min-h-full md:h-min w-full gap-5">
        <h3 class="flex-shrink-0 text-xl font-bold">{t("roomConfig")}</h3>
        <div
          class="flex-grow min-h-0 flex flex-col md:flex-row gap-4 data-[disabled=true]:cursor-not-allowed mb-[calc(4.5rem+var(--root-padding-bottom))] md:mb-0"
          data-disabled={!editable()}
        >
          <div class="flex flex-col w-full md:w-130" data-editable={editable()}>
            <Show when={versionInfo()}>
              <div class="mb-3 flex flex-row gap-4 items-center">
                <h4 class="text-lg">{t("gameVersion")}</h4>
                <select
                  class="disabled:pointer-events-none appearance-none"
                  value={version()}
                  onChange={(e) => setVersion(Number(e.target.value))}
                  disabled={!editable()}
                >
                  <For each={versionInfo()?.supportedGameVersions ?? []}>
                    {(version, idx) => <option value={idx()}>{version}</option>}
                  </For>
                </select>
              </div>
              <h4 class="text-lg mb-3">{t("thinkingTime")}</h4>
              <div class="w-full grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] md:grid-cols-3 gap-2 mb-3 data-[disabled=true]:pointer-events-none">
                <For
                  each={
                    props.joiningRoomInfo
                      ? [props.joiningRoomInfo.config]
                      : TIME_CONFIGS
                  }
                >
                  {(config) => (
                    <div
                      class="b-1 b-gray-400 rounded-lg p-2 md:p-12px group data-[active=true]:b-slate-500 data-[active=true]:b-2 md:data-[active=true]:p-11px cursor-pointer data-[active=true]:cursor-default select-none transition-colors"
                      data-active={
                        !!props.joiningRoomInfo || config === timeConfig()
                      }
                      onClick={() => setTimeConfig(config)}
                    >
                      <h5 class="font-bold text-gray-400 group-data-[active=true]:text-black transition-colors">
                        {config.nameKey
                          ? t(config.nameKey)
                          : `${config.roundTotalActionTime} + ${config.actionTime}`}
                      </h5>
                      <h5 class="text-gray-400 group-data-[active=true]:text-gray-600 transition-colors md:mb-1 font-size-80%">
                        {config.estimationTime &&
                          t("estimatedEachRound", {
                            minutes: config.estimationTime,
                          })}
                      </h5>
                      <ul class="hidden md:block pl-3 list-disc text-gray-400 font-size-80% text-sm group-data-[active=true]:text-slate-500 transition-colors">
                        <li>
                          {t("initTotalActionTime", {
                            seconds: config.initTotalActionTime,
                          })}
                        </li>
                        <li>
                          {t("rerollTime", { seconds: config.rerollTime })}
                        </li>
                        <li>
                          {t("roundTotalActionTime", {
                            seconds: config.roundTotalActionTime,
                          })}
                        </li>
                        <li>
                          {t("actionTime", { seconds: config.actionTime })}
                        </li>
                      </ul>
                    </div>
                  )}
                </For>
              </div>
              <div class="mb-3 flex flex-row gap-4 items-center">
                <h4 class="text-lg">{t("publicRoom")}</h4>
                <ToggleSwitch
                  checked={
                    props.joiningRoomInfo
                      ? !props.joiningRoomInfo.config.private
                      : isPublic()
                  }
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={!editable()}
                />
              </div>
              <div class="mb-3 flex flex-row gap-4 items-center">
                <h4 class="text-lg">{t("watchable")}</h4>
                <ToggleSwitch
                  checked={
                    props.joiningRoomInfo?.config.watchable ?? watchable()
                  }
                  onChange={(e) => setWatchable(e.target.checked)}
                  disabled={!editable()}
                />
              </div>
              <Show when={editable() && !guestInfo()}>
                <div class="mb-3 flex flex-row gap-4 items-center">
                  <h4 class="text-lg">{t("allowGuestJoin")}</h4>
                  <ToggleSwitch
                    checked={allowGuest()}
                    onChange={(e) => setAllowGuest(e.target.checked)}
                  />
                </div>
              </Show>
              <Show when={editable() ? allowGuest() : guestInfo()}>
                <div class="mb-3 alert alert-border-warning">
                  <p class="alert-description break-all">
                    {t("guestRecordWarning", {
                      suggestion:
                        editable() && !guestInfo()
                          ? t("disableGuestJoin")
                          : t("useGithubLogin"),
                    })}
                  </p>
                </div>
              </Show>
            </Show>
          </div>
          <div class="b-r-gray-200 b-1" />
          <div class="flex flex-col min-w-52 relative">
            <h4 class="text-lg mb-3">{t("chooseDeck")}</h4>
            <ul class="grid w-full grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 md:grid-cols-1 min-h-0 max-h-75dvh md:max-h-155 overflow-auto scrollbar-thin-hover">
              <For
                each={availableDecks()}
                fallback={
                  <li class="text-gray-500">{t("noDeckForVersion")}</li>
                }
              >
                {(deck) => (
                  <li>
                    <SelectableDeckInfo
                      {...deck}
                      checked={selectedDeck() === deck.id}
                      onChange={(e) =>
                        e.target.checked && setSelectedDeck(deck.id)
                      }
                    />
                  </li>
                )}
              </For>
            </ul>
            <div
              class="absolute inset-0 opacity-0 bg-white text-gray-500 pointer-events-none data-[loading=true]:opacity-80 transition flex items-center justify-center"
              data-loading={loadingDecks()}
            >
              {t("loadingEllipsis")}
            </div>
          </div>
        </div>
        <div class="fixed md:static left-0 right-0 bottom-0 bg-white b-t-gray-200 b-1 md:b-0 px-6 pb-[var(--root-padding-bottom)] h-[calc(4.5rem+var(--root-padding-bottom))] md:h-min md:p-0 flex-shrink-0 flex flex-row justify-end items-center gap-4">
          <button class="btn btn-ghost-red" onClick={closeDialog}>
            {t("cancel")}
          </button>
          <button
            class="btn btn-solid-green"
            onClick={enterRoom}
            disabled={selectedDeck() === null || entering()}
          >
            {selectedDeck() === null
              ? t("selectDeckFirst")
              : entering()
                ? t("joiningRoom")
                : editable()
                  ? t("createRoomPlain")
                  : t("joinRoomPlain")}
          </button>
        </div>
      </div>
      <button
        autofocus
        class="hidden md:block absolute right-4 top-4 h-5 w-5 text-black bg-transparent"
        onClick={closeDialog}
      >
        <i class="inline-block h-full w-full i-mdi-window-close" />
      </button>
    </dialog>
  );
}
