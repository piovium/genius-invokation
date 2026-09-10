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
import { PlayerInfo, roomCodeToId, getPlayerAvatarUrl } from "../utils";
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
import {
  Notification,
  PbPhaseType,
  RpcRequest,
  RpcResponse,
  type GameRpcRequest,
  type GameRpcTimer,
} from "@gi-tcg/typings";
import { Client, createClient, WebUiPlayerIO } from "@gi-tcg/web-ui-core";
import { useMobile } from "../App";
import { Dynamic } from "solid-js/web";
import { MobileChessboardLayout } from "../layouts/MobileChessboardLayout";
import type { CancellablePlayerIO } from "@gi-tcg/core";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import {
  RoomConnection,
  RoomConnectionError,
  roomWebSocketUrl,
  type RoomInitialized,
  type RoomEvent,
  type RoomConnectionState,
} from "../room-connection";

// A parameter change must destroy the previous room's connections and pending
// UI promises even when the router reuses this route component.
export default function Room() {
  const params = useParams();
  const [search] = useSearchParams();
  return (
    <Show
      keyed
      when={JSON.stringify([params.code, search.player, search.action])}
    >
      {(_key) => <ConnectedRoom />}
    </Show>
  );
}

function ConnectedRoom() {
  const { t, assetsManager, locale } = useI18n();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const checkboxId = createUniqueId();
  const navigate = useNavigate();
  const code = params.code;
  const action = !!searchParams.action;
  const playerId = String(searchParams.player ?? "");
  const id = roomCodeToId(code);
  const { status } = useAuth();
  const [playerIo, setPlayerIo] = createSignal<WebUiPlayerIO>();
  const [initialized, setInitialized] = createSignal<RoomInitialized>();
  const [loading, setLoading] = createSignal(true);
  const [failed, setFailed] = createSignal<null | string>(null);
  const [chessboard, setChessboard] = createSignal<Component>();
  const [connectionState, setConnectionState] =
    createSignal<RoomConnectionState>("connecting");
  const [observerMode, setObserverMode] = createSignal(false);
  const [oppPlayerIo, setOppPlayerIo] = createSignal<CancellablePlayerIO>();
  const [currentMyTimer, setCurrentMyTimer] = createSignal<GameRpcTimer | null>(
    null,
  );
  const [currentOppTimer, setCurrentOppTimer] =
    createSignal<GameRpcTimer | null>(null);
  let myConnection: RoomConnection | undefined;
  let oppConnection: RoomConnection | undefined;
  let disposed = false;
  let rpcEpoch = 0;
  let lastRpcId: number | null = null;
  let countDownTimerIntervalId: number | undefined;

  const allowWatchOpp = () => !action;
  const cancelMyRequest = () => {
    ++rpcEpoch;
    lastRpcId = null;
    playerIo()?.cancelRpc();
    setCurrentMyTimer(null);
  };
  const reportConnectionError = (error: RoomConnectionError) => {
    if (disposed) return;
    cancelMyRequest();
    setLoading(false);
    setFailed(error.outcomeUnknown ? t("roomActionUnknown") : error.message);
  };
  const reportCommandError = (error: unknown) => {
    if (disposed) return;
    if (error instanceof RoomConnectionError) {
      if (["DISPOSED", "NOT_CONNECTED", "STALE_LOCAL_RPC"].includes(error.code))
        return;
      if (error.code === "COMMAND_PENDING") {
        alert(t("roomCommandPending"));
        return;
      }
      if (error.outcomeUnknown) {
        setFailed(t("roomActionUnknown"));
        return;
      }
    }
    alert(error instanceof Error ? error.message : String(error));
  };

  const initializeClient = (payload: RoomInitialized) => {
    if (playerIo()) return;
    const [io, Ui] = createClient(payload.who, {
      assetsManager: () => assetsManager(payload.config.gameVersion),
      locale,
      onGiveUp: async () => {
        try {
          await myConnection?.giveUp();
        } catch (error) {
          reportCommandError(error);
        }
      },
      disableAction: !action,
    });
    setChessboard(() => Ui);
    setPlayerIo(io);
  };

  const onActionRequested = async (payload: GameRpcRequest) => {
    const io = playerIo();
    if (!io || disposed) return;
    setCurrentMyTimer(payload.timer);
    if (lastRpcId === payload.id) return;
    const epoch = ++rpcEpoch;
    lastRpcId = payload.id;
    const session = myConnection?.sessionId;
    const requestToken = myConnection?.requestToken;
    const response = await io
      .rpc(RpcRequest.decode(payload.request))
      .catch(() => undefined);
    // The same numeric ID can reappear after a reconnect. Generation and
    // session checks keep a stale asynchronous UI answer out of the new view.
    if (
      disposed ||
      epoch !== rpcEpoch ||
      session !== myConnection?.sessionId ||
      !response ||
      !action
    )
      return;
    setCurrentMyTimer(null);
    try {
      await myConnection?.sendResponse(
        payload.id,
        RpcResponse.encode(response).finish(),
        requestToken,
      );
    } catch (error) {
      reportCommandError(error);
    } finally {
      if (epoch === rpcEpoch) lastRpcId = null;
    }
  };

  const onMyEvent = (payload: RoomEvent) => {
    if (disposed) return;
    setLoading(false);
    switch (payload.type) {
      case "initialized": {
        const previous = initialized();
        if (
          String(payload.myPlayerInfo.id) !== playerId ||
          (previous &&
            (payload.who !== previous.who ||
              payload.config.gameVersion !== previous.config.gameVersion))
        ) {
          throw new RoomConnectionError(
            "The room view changed unexpectedly. Reload the room before playing.",
            "SESSION_CHANGED",
          );
        }
        const firstInitialization = !initialized();
        setInitialized(payload);
        initializeClient(payload);
        if (firstInitialization && payload.config.watchable && allowWatchOpp())
          setObserverMode(true);
        break;
      }
      case "notification": {
        const notification = Notification.decode(payload.data);
        playerIo()?.notify(notification);
        if (notification.state?.phase === PbPhaseType.GAME_END) {
          cancelMyRequest();
          setCurrentOppTimer(null);
          myConnection?.markFinished();
        }
        break;
      }
      case "rpc": {
        if (payload.data)
          void onActionRequested(payload.data).catch((error) => {
            myConnection?.dispose();
            reportConnectionError(
              new RoomConnectionError(
                error instanceof Error ? error.message : "Invalid game request",
                "PROTOCOL_ERROR",
              ),
            );
          });
        else cancelMyRequest();
        break;
      }
      case "oppRpc":
        setCurrentOppTimer(payload.oppTimer);
        break;
      case "waiting":
        break;
    }
  };

  const socketUrl = (watchingPlayerId: string | number) =>
    roomWebSocketUrl(
      axios.defaults.baseURL ?? "/api/",
      id,
      watchingPlayerId,
      window.location.href,
    );
  const token = () => localStorage.getItem("accessToken") ?? "";
  createEffect(() => {
    const watching = observerMode();
    const opponent = initialized()?.oppPlayerInfo.id;
    const io = playerIo();
    if (!watching || opponent === undefined || !io) return;
    const connection = new RoomConnection({
      url: socketUrl(opponent),
      token,
      onState: (state) => {
        if (state === "reconnecting" || state === "failed") {
          oppPlayerIo()?.cancelRpc?.();
          io.oppController.close();
          setOppPlayerIo();
        }
      },
      onEvent: (payload) => {
        if (disposed) return;
        switch (payload.type) {
          case "initialized": {
            if (String(payload.myPlayerInfo.id) !== String(opponent))
              throw new Error("Unexpected spectator player identity");
            setOppPlayerIo(io.oppController.open());
            break;
          }
          case "notification": {
            const notification = Notification.decode(payload.data);
            oppPlayerIo()?.notify(notification);
            if (notification.state?.phase === PbPhaseType.GAME_END)
              connection.markFinished();
            break;
          }
          case "rpc": {
            if (payload.data) {
              setCurrentOppTimer(payload.data.timer);
              void oppPlayerIo()
                ?.rpc(RpcRequest.decode(payload.data.request))
                .catch(() => undefined);
            } else {
              oppPlayerIo()?.cancelRpc?.();
              setCurrentOppTimer(null);
            }
            break;
          }
        }
      },
      onError: (error) => {
        if (!disposed) {
          setObserverMode(false);
          alert(error.message);
        }
      },
    });
    oppConnection = connection;
    connection.start();
    onCleanup(() => {
      connection.dispose();
      if (oppConnection === connection) oppConnection = undefined;
      oppPlayerIo()?.cancelRpc?.();
      io.oppController.close();
      setOppPlayerIo();
    });
  });

  const countDownTimer = () => {
    const myTimer = currentMyTimer();
    if (myTimer) {
      const current = myTimer.current - 1;
      if (current <= 0) cancelMyRequest();
      else setCurrentMyTimer({ ...myTimer, current });
    }
    const oppTimer = currentOppTimer();
    if (oppTimer) {
      const current = oppTimer.current - 1;
      if (current <= 0) {
        oppPlayerIo()?.cancelRpc?.();
        setCurrentOppTimer(null);
      } else setCurrentOppTimer({ ...oppTimer, current });
    }
  };

  const [roomInfo] = createResource(() =>
    axios.get<{ status: string }>(`rooms/${id}`).then((res) => res.data),
  );
  createEffect(() => {
    const error = roomInfo.error;
    if (error && !disposed) {
      myConnection?.dispose();
      cancelMyRequest();
      setLoading(false);
      setFailed(
        error instanceof AxiosError
          ? String(error.response?.data?.message ?? error.message)
          : String(error),
      );
    }
  });
  const deleteRoom = async () => {
    if (!window.confirm(t("deleteRoomConfirm"))) return;
    try {
      await axios.delete(`rooms/${id}`);
      history.back();
    } catch (error) {
      if (error instanceof AxiosError) alert(error.response?.data.message);
      console.error(error);
    }
  };
  const downloadGameLog = async () => {
    try {
      const { data } = await axios.get(`rooms/${id}/gameLog`);
      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gameLog.json";
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      if (error instanceof AxiosError) alert(error.response?.data.message);
      console.error(error);
    }
  };
  const getClientPlayerInfo = (player: PlayerInfo) => ({
    name: player.name,
    avatarUrl: getPlayerAvatarUrl(player),
  });
  let chessboardContainer: HTMLDivElement | undefined;
  const mobile = useMobile();

  onMount(() => {
    if (roomInfo.error) return;
    if (!playerId || !Number.isSafeInteger(id)) {
      setLoading(false);
      setFailed(t("roomInvalidLink"));
      return;
    }
    myConnection = new RoomConnection({
      url: socketUrl(playerId),
      token,
      onEvent: onMyEvent,
      onState: (state) => {
        if (disposed) return;
        setConnectionState(state);
        if (state === "reconnecting") cancelMyRequest();
        if (state === "connected") {
          setLoading(false);
          setFailed(null);
        }
      },
      onError: reportConnectionError,
    });
    myConnection.start();
    countDownTimerIntervalId = window.setInterval(countDownTimer, 1000);
  });
  onCleanup(() => {
    disposed = true;
    myConnection?.dispose();
    oppConnection?.dispose();
    window.clearInterval(countDownTimerIntervalId);
    cancelMyRequest();
    oppPlayerIo()?.cancelRpc?.();
    playerIo()?.oppController.close();
    setInitialized();
    setPlayerIo();
  });

  return (
    <Dynamic
      component={mobile() && !!chessboard() ? MobileChessboardLayout : Layout}
    >
      <div
        class="p-0 data-[mobile]:h-100dvh data-[mobile]:overflow-clip container mx-auto flex flex-col group max-w-[calc((100dvh-13.5rem)*160/81)]"
        bool:data-mobile={mobile() && chessboard()}
      >
        <div class="group-data-[mobile]:fixed top-0 right-0 z-100 group-data-[mobile]:translate-x-100% group-data-[mobile]:rotate-90 transform-origin-top-left flex group-data-[mobile]:flex-col flex-row group-data-[mobile]:items-start items-center has-[:where(.visibility-control:checked)]:bg-white group-data-[mobile]:pl-[calc(var(--root-padding-top)+1rem)] group-data-[mobile]:p-4 rounded-br-2xl">
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
              <Show when={initialized()?.config.watchable}>
                <Show when={allowWatchOpp()}>
                  <button
                    class="btn btn-outline-primary"
                    onClick={() => setObserverMode((v) => !v)}
                  >
                    <i class="i-mdi-video-switch-outline" />
                    <span>
                      {t(
                        `enter${observerMode() ? "PlayerView" : "ObserverMode"}`,
                      )}
                    </span>
                  </button>
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
        <Show when={connectionState() === "reconnecting" && !failed()}>
          <div class="mb-3 alert alert-outline-info" role="status">
            {t("roomReconnecting")}
          </div>
        </Show>
        <Switch>
          <Match when={failed()}>
            <div class="mb-3 alert alert-outline-error" role="alert">
              {t("roomLoadFailed", { message: failed() ?? "" })}
            </div>
          </Match>
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
                spectatorMode={observerMode()}
              />
            </div>
          )}
        </Show>
      </div>
    </Dynamic>
  );
}
