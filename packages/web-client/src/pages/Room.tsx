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

import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { Layout } from "../layouts/Layout";
import {
  PlayerInfo,
  roomCodeToId,
  getPlayerAvatarUrl,
} from "../utils";
import {
  Show,
  createSignal,
  onMount,
  createEffect,
  onCleanup,
  createResource,
  Switch,
  Match,
  Component,
  createUniqueId,
} from "solid-js";
import axios, { AxiosError } from "axios";
import "@gi-tcg/web-ui-core/style.css";
import EventSourceStream from "@server-sent-stream/web";
import {
  PbPlayerStatus,
  type Notification,
  type RpcRequest,
} from "@gi-tcg/typings";
import { Client, createClient, WebUiPlayerIO } from "@gi-tcg/web-ui-core";
import { useMobile } from "../App";
import { Dynamic } from "solid-js/web";
import { MobileChessboardLayout } from "../layouts/MobileChessboardLayout";
import type { CancellablePlayerIO } from "@gi-tcg/core";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";

interface InitializedPayload {
  who: 0 | 1;
  config: any;
  myPlayerInfo: PlayerInfo;
  oppPlayerInfo: PlayerInfo;
}

interface RpcTimer {
  current: number;
  total: number;
}

interface ActionRequestPayload {
  id: number;
  timer: RpcTimer;
  request: RpcRequest;
}

const SSE_RECONNECT_TIMEOUT = 30 * 1000;

const createReconnectSse = <T,>(
  url: string | (() => string),
  onPayload: (payload: T) => void,
  onError?: (e: Error) => void,
): [fetch: () => void, abort: () => void] => {
  let reconnectTimeout: number | null = null;
  let abortController: AbortController | null = null;
  let cancelled = false;
  let activating = false;

  const resetReconnectTimer = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    reconnectTimeout = setTimeout(() => {
      console.warn("No data received, reconnecting...");
      abortController?.abort();
    }, SSE_RECONNECT_TIMEOUT);
  };

  const connect = () => {
    if (cancelled) {
      return;
    }
    if (activating) {
      return;
    }
    activating = true;
    abortController = new AbortController();
    axios
      .get(typeof url === "function" ? url() : url, {
        headers: {
          Accept: "text/event-stream",
        },
        responseType: "stream",
        signal: abortController.signal,
        adapter: "fetch",
        validateStatus: () => true, // Accept all status codes
      })
      .then(async (response) => {
        if (response.status !== 200) {
          onError?.(
            new AxiosError(
              response.statusText,
              `${response.status}`,
              void 0,
              void 0,
              response,
            ),
          );
          return;
        }
        console.log(`${url} CONNECTED`);
        const data: ReadableStream = response.data;
        const reader = data.pipeThrough(new EventSourceStream()).getReader();

        activating = false;
        resetReconnectTimer(); // Start the timer after connection is established

        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          resetReconnectTimer(); // Reset the timer on receiving data
          const payload = JSON.parse(value.data);
          try {
            onPayload(payload);
          } catch (e) {
            console.error("Error processing payload:", e);
          }
        }

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
      })
      .catch((error) => {
        // network error / abort error, try reconnect later
        onError?.(error);
        setTimeout(connect, 1000);
      });
  };

  return [
    () => {
      cancelled = false;
      activating = false;
      connect();
    },
    () => {
      cancelled = true;
      activating = false;
      abortController?.abort();
    },
  ];
};

export default function Room() {
  const { t, assetsManager, locale } = useI18n();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const checkboxId = createUniqueId();
  const navigate = useNavigate();
  const code = params.code;
  const action = !!searchParams.action;
  const playerId = searchParams.player;
  const id = roomCodeToId(code);
  const { status } = useAuth();
  const [playerIo, setPlayerIo] = createSignal<WebUiPlayerIO>();
  const [initialized, setInitialized] = createSignal<InitializedPayload>();
  const [loading, setLoading] = createSignal(true);
  const [failed, setFailed] = createSignal<null | string>(null);
  const [chessboard, setChessboard] = createSignal<Component>();

  const [showOpp, setShowOpp] = createSignal(false);
  const [liveMode, setLiveMode] = createSignal(true);
  const [oppPlayerIo, setOppPlayerIo] = createSignal<CancellablePlayerIO>();

  const reportStreamError = async (e: Error) => {
    if (e instanceof AxiosError) {
      const data = e.response?.data as ReadableStream;
      if (data && "pipeThrough" in data) {
        const reader = data.pipeThrough(new TextDecoderStream()).getReader();
        const { value, done } = await reader.read();
        let message = `${value}`;
        try {
          message = JSON.parse(value ?? "{}").message;
        } catch {}
        if (initialized()) {
          alert(message);
        } else {
          setLoading(false);
          setFailed(message);
        }
        console.error(value);
      }
    }
    console.error(e);
  };

  createEffect(() => {
    const payload = initialized();
    const onGiveUp = async () => {
      try {
        const { data } = await axios.post(
          `rooms/${id}/players/${playerId}/giveUp`,
        );
      } catch (e) {
        if (e instanceof AxiosError) {
          alert(e.response?.data.message);
        }
        console.error(e);
      }
    };
    if (payload && !playerIo()) {
      const [io, Ui] = createClient(payload.who, {
        assetsManager,
        locale,
        onGiveUp,
        disableAction: !action,
      });
      setChessboard(() => Ui);
      setPlayerIo(io);
    }
  });

  const onActionRequested = async (payload: ActionRequestPayload) => {
    setCurrentMyTimer(payload.timer);
    currentRpcId.value = payload.id;
    playerIo()?.cancelRpc();
    await new Promise((r) => setTimeout(r, 100)); // wait for UI notifications?
    const response = await playerIo()
      ?.rpc(payload.request)
      .catch(() => void 0);
    if (!response) {
      return;
    }
    setCurrentMyTimer(null);
    try {
      const reply = axios.post(
        `rooms/${id}/players/${playerId}/actionResponse`,
        {
          id: payload.id,
          response,
        },
      );
      currentRpcId.value = null;
      await reply;
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      }
      console.error(e);
    }
  };

  const deleteRoom = async () => {
    if (!window.confirm(t("deleteRoomConfirm"))) {
      return;
    }
    try {
      const { data } = await axios.delete(`rooms/${id}`);
      history.back();
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      }
      console.error(e);
    }
  };

  const [currentMyTimer, setCurrentMyTimer] = createSignal<RpcTimer | null>(
    null,
  );
  const [currentOppTimer, setCurrentOppTimer] = createSignal<RpcTimer | null>(
    null,
  );
  const currentRpcId: { value: number | null } = { value: null };
  let countDownTimerIntervalId: number | null = null;
  const countDownTimer = () => {
    for (const [timer, setTimer] of [
      [currentMyTimer(), setCurrentMyTimer] as const,
      [currentOppTimer(), setCurrentOppTimer] as const,
    ]) {
      if (timer) {
        const current = timer.current - 1;
        setTimer({ ...timer, current });
        if (current <= 0) {
          playerIo()?.cancelRpc();
          setTimer(null);
        }
      }
    }
  };
  const setActionTimer = () => {
    countDownTimerIntervalId = window.setInterval(countDownTimer, 1000);
  };
  const cleanActionTimer = () => {
    if (countDownTimerIntervalId) {
      window.clearInterval(countDownTimerIntervalId);
    }
  };

  const [roomInfo] = createResource(() =>
    axios.get<{ status: string }>(`rooms/${id}`).then((res) => res.data),
  );

  const [fetchMyNotification, abortMyNotification] = createReconnectSse(
    `rooms/${id}/players/${playerId}/notification`,
    (payload: any) => {
      setLoading(false);
      switch (payload.type) {
        case "initialized": {
          setInitialized(payload);
          break;
        }
        case "notification": {
          const notification: Notification = payload.data;
          playerIo()?.notify(notification);
          // 观战时，收到我方状态变更为非行动通知时，取消 rpc
          if (
            !action &&
            notification.mutation.find(
              (mut) =>
                mut.mutation?.$case === "playerStatusChange" &&
                mut.mutation.value.who === initialized()?.who &&
                mut.mutation.value.status === PbPlayerStatus.UNSPECIFIED,
            )
          ) {
            playerIo()?.cancelRpc();
            setCurrentMyTimer(null);
          }
          break;
        }
        case "oppRpc": {
          setCurrentOppTimer(payload.oppTimer ?? null);
          break;
        }
        case "rpc": {
          if (payload.id !== currentRpcId.value) {
            onActionRequested(payload);
          }
          break;
        }
        case "error": {
          alert(t("fatalError", { message: payload.message }));
          break;
        }
        default: {
          console.log("%c%s", "color: green", JSON.stringify(payload));
          break;
        }
      }
    },
    reportStreamError,
  );

  const getOppPlayerId = () => initialized()?.oppPlayerInfo.id;
  const allowWatchOpp = () => !action;

  const [fetchOppNotification, abortOppNotification] = createReconnectSse(
    () => `rooms/${id}/players/${getOppPlayerId()}/notification`,
    (payload: any) => {
      switch (payload.type) {
        case "initialized": {
          const myPlayerIo = playerIo();
          if (myPlayerIo) {
            const oppPlayerIo = myPlayerIo.oppController.open();
            setOppPlayerIo(oppPlayerIo);
          }
          break;
        }
        case "notification": {
          const notification: Notification = payload.data;
          oppPlayerIo()?.notify(notification);
          // 观战时，收到我方状态变更为非行动通知时，取消 rpc
          if (
            notification.mutation.find(
              (mut) =>
                mut.mutation?.$case === "playerStatusChange" &&
                mut.mutation.value.who === initialized()?.who &&
                mut.mutation.value.status === PbPlayerStatus.UNSPECIFIED,
            )
          ) {
            oppPlayerIo()?.cancelRpc?.();
          }
          break;
        }
        case "rpc": {
          oppPlayerIo()?.cancelRpc?.();
          setTimeout(() => {
            oppPlayerIo()
              ?.rpc(payload.request)
              .catch(() => void 0);
          }, 100);
          break;
        }
        case "error": {
          break;
        }
        default: {
          console.log("%c%s", "color: orange", JSON.stringify(payload));
          break;
        }
      }
    },
    reportStreamError,
  );

  createEffect(() => {
    if (showOpp()) {
      fetchOppNotification();
    } else {
      abortOppNotification();
      playerIo()?.oppController.close();
    }
  });

  const downloadGameLog = async () => {
    try {
      const { data } = await axios.get(`rooms/${id}/gameLog`);
      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gameLog.json`;
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      if (e instanceof AxiosError) {
        alert(e.response?.data.message);
      }
      console.error(e);
    }
  };

  const getClientPlayerInfo = (playerInfo: PlayerInfo) => ({
    name: playerInfo.name,
    avatarUrl: getPlayerAvatarUrl(playerInfo),
  });

  let chessboardContainer: HTMLDivElement | undefined;

  const mobile = useMobile();

  onMount(() => {
    fetchMyNotification();
    setActionTimer();
  });

  onCleanup(() => {
    setInitialized();
    setPlayerIo();
    cleanActionTimer();
  });

  return (
    <Dynamic
      component={mobile() && !!chessboard() ? MobileChessboardLayout : Layout}
    >
      <div
        class="p-0 data-[mobile]:h-100dvh data-[mobile]:overflow-clip container mx-auto flex flex-col group max-w-[calc((100dvh-13.5rem)*160/81)]"
        bool:data-mobile={mobile() && chessboard()}
      >
        <div class="group-data-[mobile]:fixed top-0 right-0 z-100 group-data-[mobile]:translate-x-100% group-data-[mobile]-rotate-90 transform-origin-top-left flex group-data-[mobile]:flex-col flex-row group-data-[mobile]:items-start items-center has-[.visibility-control:checked]:bg-white group-data-[mobile]:pl-[calc(var(--root-padding-top)+1rem)] group-data-[mobile]:p-4 rounded-br-2xl">
          <input
            hidden
            type="checkbox"
            class="peer visibility-control"
            id={checkboxId}
          />
          <label
            for={checkboxId}
            class="hidden ml-4 mb-3 group-data-[mobile]:inline-flex btn btn-soft-primary peer-checked:btn-solid-primary text-primary peer-checked:text-white text-1.2rem h-8 w-8 p-0 items-center justify-center opacity-50 peer-checked:opacity-100"
          >
            <i class="i-mdi-info" />
          </label>
          <div class="flex-grow group-data-[mobile]:hidden group-data-[mobile]:peer-checked:flex flex flex-row group-data-[mobile]:flex-col flex-wrap items-center justify-between mb-3">
            <div class="flex flex-row flex-wrap gap-3 items-center">
              <h2 class="text-2xl font-bold flex-shrink-0">
                {t("roomNumber", { code })}
              </h2>
              <Show when={!loading() && !failed() && !initialized()}>
                <button class="btn btn-outline-red" onClick={deleteRoom}>
                  <i class="i-mdi-delete" />
                </button>
              </Show>
              <Show when={initialized()?.config?.watchable}>
                <Show when={allowWatchOpp()}>
                  <input
                    id="showOpp"
                    type="checkbox"
                    class="checkbox-primary"
                    checked={showOpp()}
                    onChange={(e) => setShowOpp(e.currentTarget.checked)}
                  />
                  <label for="showOpp">{t("showOpponentBoard")}</label>
                  <Show when={showOpp()}>
                    <input
                      id="liveMode"
                      type="checkbox"
                      class="checkbox-primary"
                      checked={liveMode()}
                      onChange={(e) => setLiveMode(e.currentTarget.checked)}
                    />
                    <label for="liveMode">{t("liveMode")}</label>
                  </Show>
                </Show>
              </Show>
            </div>
            <div>
              <Show when={initialized()}>
                {(payload) => (
                  <div class="flex group-data-[mobile]:flex-col flex-row items-center">
                    <div>
                      <span>
                        {payload().myPlayerInfo.name}
                        {action ? t("meLabel") : t("spectatingLabel")}
                      </span>
                      <span class="font-bold"> VS </span>
                      <span>{payload().oppPlayerInfo.name}</span>
                    </div>
                    <span class="group-data-[mobile]:hidden">，</span>
                    <span>
                      {payload().who === 0
                        ? t("youAreFirst")
                        : t("youAreSecond")}
                    </span>
                  </div>
                )}
              </Show>
            </div>
          </div>
          <button
            class="hidden group-data-[mobile]:peer-checked:inline-flex btn btn-outline-blue whitespace-normal text-center leading-tight min-h-10 px-4 py-2"
            onClick={() => {
              navigate("/");
            }}
          >
            <i class="i-mdi-home" />
            {t("backHome")}
          </button>
        </div>
        <Switch>
          <Match when={loading() || roomInfo.loading}>
            <div class="mb-3 alert alert-outline-info">{t("roomLoading")}</div>
          </Match>
          <Match when={roomInfo.state === "ready" && roomInfo()}>
            {(info) => (
              <Switch>
                <Match when={!initialized() && info().status === "waiting"}>
                  <div class="mb-3 alert alert-outline-info">
                    {t("waitingForOpponent")}
                  </div>
                </Match>
                <Match when={info().status === "finished"}>
                  <div class="mb-3 alert alert-outline-info">
                    {t("roomFinished")}
                    <button
                      class="btn btn-soft-info whitespace-normal text-center leading-tight min-h-10 px-4 py-2"
                      onClick={downloadGameLog}
                    >
                      {t("downloadLog")}
                    </button>
                  </div>
                </Match>
              </Switch>
            )}
          </Match>
          <Match when={failed()}>
            <div class="mb-3 alert alert-outline-error">
              {t("roomLoadFailed", { message: failed() ?? "" })}
            </div>
          </Match>
        </Switch>
        <Show when={initialized()}>
          {(payload) => (
            <div class="relative" ref={chessboardContainer}>
              <Dynamic<Client[1]>
                component={chessboard()}
                rotation={mobile() ? 90 : 0}
                autoHeight={!mobile()}
                class={`${
                  mobile() ? "mobile-chessboard h-100dvh w-100dvw" : ""
                }`}
                chessboardColor={status().chessboardColor ?? void 0}
                timer={currentMyTimer() ?? currentOppTimer()}
                myPlayerInfo={getClientPlayerInfo(payload().myPlayerInfo)}
                oppPlayerInfo={getClientPlayerInfo(payload().oppPlayerInfo)}
                gameEndExtra={
                  <div class="flex justify-center gap-20 mt-10">
                    <div class="flex flex-col justify-start w-36 h-30">
                      <button
                        class="px-4 py-1 w-36 h-10 mt-20 font-bold font-size-4.5 text-yellow-800 bg-yellow-50 rounded-full border-yellow-800 b-2 active:bg-yellow-800 active:text-yellow-200 hover:shadow-[inset_0_0_16px_white] hover:border-white"
                        onClick={downloadGameLog}
                      >
                        {t("downloadLog")}
                      </button>
                      {/* <Show when={logtimer}>
                        <span class="text-white/60 text-3">{logtimer}后到期</span>
                      </Show> */}
                    </div>
                    <div class="flex flex-col justify-start w-36 h-30">
                      <button
                        class="px-4 py-1 w-36 h-10 mt-20 font-bold font-size-4.5 text-yellow-800 bg-yellow-50 rounded-full border-yellow-800 b-2 active:bg-yellow-800 active:text-yellow-200 hover:shadow-[inset_0_0_16px_white] hover:border-white"
                        onClick={() => {
                          navigate("/");
                        }}
                      >
                        {t("backHome")}
                      </button>
                    </div>
                  </div>
                }
                liveStreamingMode={showOpp() && liveMode()}
              />
            </div>
          )}
        </Show>
      </div>
    </Dynamic>
  );
}
