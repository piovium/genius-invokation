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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import getData from "@gi-tcg/data";
import {
  CancellablePlayerIO,
  DetailLogEntry,
  Game,
  GameState,
  GameStateLogEntry,
  Version,
  exposeState,
  serializeGameStateLog,
} from "@gi-tcg/core";

import { createClient, StandaloneChessboard } from "@gi-tcg/web-ui-core";
import "@gi-tcg/web-ui-core/style.css";
import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { DetailLogViewer } from "@gi-tcg/detail-log-viewer";
import { DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import { useI18n } from "./i18n";

export interface StandaloneParentProps {
  logs?: GameStateLogEntry[];
  deck0: string;
  deck1: string;
  version: Version;
}

const CHILD_WHO = 0;
const PARENT_WHO = 1;

export function StandaloneParent(props: StandaloneParentProps) {
  const { t, assetsManager, locale } = useI18n();
  const [uiIo, Chessboard] = createClient(1, {
    assetsManager: assetsManager(),
    locale,
    onGiveUp: () => {
      game?.giveUp(PARENT_WHO);
    },
  });

  const [popupWindow, setPopupWindow] = createSignal<Window | null>(null);

  const showPopup = async () => {
    if (popupWindow() !== null) {
      return;
    }
    const newWindow = window.open(
      window.location.href,
      "_blank",
      "popup=yes, depended=yes, height=750, width=750",
    );
    setPopupWindow(newWindow);
    // 不知道为什么 onbeforeload 不起作用
    const autoGiveupWhenChildCloseInterval = window.setInterval(() => {
      if (newWindow?.closed && autoGiveupWhenChildCloseInterval !== null) {
        window.clearInterval(autoGiveupWhenChildCloseInterval);
        game?.giveUp(CHILD_WHO);
        setPopupWindow(null);
      }
    }, 1000);
    await new Promise<void>((resolve) => {
      const handler = (e: MessageEvent) => {
        const { data } = e;
        if (typeof data !== "object" || data === null) {
          return;
        }
        if (data.giTcg !== "1.0") {
          return;
        }
        if (!("method" in data)) {
          return;
        }
        if (data.method === "initialized") {
          window?.removeEventListener("message", handler);
          resolve();
        }
      };
      window?.addEventListener("message", handler);
    });
  };

  const childIo: CancellablePlayerIO = {
    notify: (...params) => {
      popupWindow()?.postMessage({
        giTcg: "1.0",
        method: "notify",
        params,
      });
    },
    rpc: async (...params): Promise<any> => {
      const id = Math.random().toString(36).slice(2);
      const result = new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          const { data } = e;
          if (typeof data !== "object" || data === null) {
            return;
          }
          if (data.giTcg !== "1.0") {
            return;
          }
          if (!("method" in data)) {
            return;
          }
          if (data.method === "rpc" && data.id === id) {
            window?.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        window?.addEventListener("message", handler);
      });
      popupWindow()?.postMessage({
        giTcg: "1.0",
        method: "rpc",
        params,
        id,
      });
      return result;
    },
    cancelRpc: () => {
      popupWindow()?.postMessage({
        giTcg: "1.0",
        method: "cancelRpc",
      });
    },
  };

  const [stateLog, setStateLog] = createSignal<GameStateLogEntry[]>([]);
  const [fromImport, setFromImport] = createSignal(false);
  // -1 代表不显示历史
  const [viewingLogIndex, setViewingLogIndex] = createSignal<number>(-1);
  const [viewingWho, setViewingWho] = createSignal<0 | 1>(1);
  const viewingState = (): GameStateLogEntry | undefined => {
    const index = viewingLogIndex();
    return stateLog()[index];
  };
  const enableLog = () => {
    setViewingWho(1);
    setViewingLogIndex(stateLog().length - 2);
  };
  const maxLogIndex = () => {
    return stateLog().length - (fromImport() ? 1 : 2);
  };

  const exportLog = () => {
    const logs = serializeGameStateLog(stateLog());
    const blob = new Blob([JSON.stringify({ ...logs, gv: props.version })], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gameLog.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  let game: Game | null = null;
  const pause = async (
    state: GameState,
    mutations: unknown,
    canResume: boolean,
  ) => {
    if (game !== null) {
      setStateLog((logs) => [...logs, { state, canResume }]);
    }
  };

  const onGameError = (e: unknown, from?: Game) => {
    if (!from || from === game) {
      console.error(e);
      alert(
        t("internalError", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  };

  const createGame = (state?: GameState) => {
    if (!state) {
      const deck0 = DEFAULT_ASSETS_MANAGER.decode(props.deck0);
      const deck1 = DEFAULT_ASSETS_MANAGER.decode(props.deck1);
      state = Game.createInitialState({
        decks: [deck0, deck1],
        data: getData(props.version),
        versionBehavior: props.version,
      });
    }
    const game = new Game(state);
    game.onPause = pause;
    game.players[0].io = childIo;
    game.players[1].io = uiIo;
    return game;
  };

  const startGame = async () => {
    try {
      await showPopup();
      const initialGame = createGame();
      game = initialGame;
      initialGame.start().catch((e) => onGameError(e, initialGame));
    } catch (e) {
      onGameError(e);
    }
  };

  const resumeGame = async () => {
    await showPopup();
    const logs = stateLog().slice(0, viewingLogIndex() + 1);
    childIo.cancelRpc?.();
    uiIo.cancelRpc?.();
    game?.terminate();
    const latestState = logs[logs.length - 1];
    const newGame = createGame(latestState.state);
    game = newGame;
    newGame.start().catch((e) => onGameError(e, newGame));
    setStateLog(logs);
    setViewingLogIndex(-1);
    setFromImport(false);
  };

  const childGiveUpHandler = (e: MessageEvent) => {
    const { data } = e;
    if (typeof data !== "object" || data === null) {
      return;
    }
    if (data.giTcg !== "1.0") {
      return;
    }
    if (!("method" in data)) {
      return;
    }
    if (data.method === "giveUp") {
      game?.giveUp(CHILD_WHO);
    }
  };
  let detailDialog!: HTMLDialogElement;
  const [detailLog, setDetailLog] = createSignal<readonly DetailLogEntry[]>([]);
  const showDetail = () => {
    setDetailLog(game?.detailLog ?? []);
    detailDialog.showModal();
    detailDialog.scrollIntoView({ block: "end" });
  };
  const closeDetail = () => {
    detailDialog.close();
    setDetailLog([]);
  };

  onMount(() => {
    window.addEventListener("beforeunload", () => {
      popupWindow()?.close();
    });
    window.addEventListener("message", childGiveUpHandler);
    if (Array.isArray(props.logs)) {
      setStateLog(props.logs);
      setViewingLogIndex(props.logs.length - 2);
      setFromImport(true);
    } else {
      startGame();
    }
  });
  onCleanup(() => {
    window.removeEventListener("message", childGiveUpHandler);
  });

  return (
    <div>
      <Show
        when={viewingState()}
        fallback={
          <>
            <div class="title-row">
              <span class="title">{t("secondPlayerBoard")}</span>
              <button disabled={stateLog().length <= 1} onClick={enableLog}>
                {t("viewHistory")}
              </button>
            </div>
            <Chessboard />
          </>
        }
      >
        {(state) => (
          <>
            <div class="title-row">
              <span class="title">
                {t("viewingBoardHistory", {
                  side: t(viewingWho() ? "sideSecond" : "sideFirst"),
                })}
              </span>
              <Show
                when={viewingLogIndex() <= maxLogIndex() && state().canResume}
              >
                <button onClick={resumeGame}>{t("resumeFromHere")}</button>
              </Show>
              <button onClick={() => setViewingWho((i) => (1 - i) as 0 | 1)}>
                {t("switchPlayer")}
              </button>
              <button
                disabled={viewingLogIndex() <= 0}
                onClick={() => setViewingLogIndex((i) => i - 1)}
              >
                {t("stepBackward")}
              </button>
              <span>
                {viewingLogIndex() + 1} / {stateLog().length}
              </span>
              <button
                disabled={viewingLogIndex() >= maxLogIndex()}
                onClick={() => setViewingLogIndex((i) => i + 1)}
              >
                {t("stepForward")}
              </button>
              <button
                disabled={fromImport()}
                onClick={() => setViewingLogIndex(-1)}
              >
                {t("backToGame")}
              </button>
            </div>
            <StandaloneChessboard
              class="grayscale"
              assetsManager={assetsManager()}
              locale={locale()}
              who={viewingWho()}
              state={exposeState(viewingWho(), state().state)}
              mutations={[]}
            />
          </>
        )}
      </Show>
      <button disabled={stateLog().length === 0} onClick={exportLog}>
        {t("exportLog")}
      </button>
      <button onClick={showDetail}>{t("showDetails")}</button>
      <dialog ref={detailDialog!}>
        <DetailLogViewer logs={detailLog()} />
        <button onClick={closeDetail}>{t("closeDetails")}</button>
      </dialog>
    </div>
  );
}
