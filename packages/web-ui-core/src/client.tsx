// Copyright (C) 2025 Guyutongxue
// Copyright (C) 2026 Piovium Labs
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

import {
  dispatchRpc,
  type ActionResponse,
  type RpcMethod,
  type PbGameState,
  type PbPlayerState,
  type RpcDispatcher,
  type SwitchHandsResponse,
  type SelectCardResponse,
  type RerollDiceResponse,
  PbEntityArea,
  PbEntityType,
  PbPhaseType,
  PbPlayerStatus,
  type PbExposedMutation,
} from "@gi-tcg/typings";
import {
  createMemo,
  createSignal,
  type Accessor,
  type ComponentProps,
  type JSX,
} from "solid-js";
import {
  Chessboard,
  type ChessboardViewType,
  type ChessboardData,
  type StepActionStateHandler,
  type RpcTimer,
} from "./components/Chessboard";
import type {
  ChooseActiveResponse,
  PbDiceType,
  RpcResponsePayloadOf,
} from "@gi-tcg/core";
import { QueueManager } from "./queue_manager";
import { parseMutations, type ParseMutationContext } from "./mutations";
import { translations, UiContext, type Locale } from "./hooks/context";
import {
  createActionState,
  createChooseActiveState,
  type ActionState,
} from "./action";
import { AssetsManager, DEFAULT_ASSETS_MANAGER } from "@gi-tcg/assets-manager";
import {
  StateRecorder,
  updateHistory,
  type HistoryData,
} from "./history/parser";
import { createStore, produce } from "solid-js/store";
import type { Rotation } from "./components/TransformWrapper";
import type { CancellablePlayerIO } from "@gi-tcg/core";
import {
  OppChessboardController,
  type IOppChessboardController,
  type OppInfo,
} from "./opp";
import { flip } from "@gi-tcg/utils";
import { flatten, resolveTemplate, translator } from "@solid-primitives/i18n";

const EMPTY_PLAYER_DATA: PbPlayerState = {
  activeCharacterId: 0,
  dice: [],
  pileCard: [],
  handCard: [],
  character: [],
  combatStatus: [],
  summon: [],
  support: [],
  initiativeSkill: [],
  declaredEnd: false,
  legendUsed: false,
  status: PbPlayerStatus.UNSPECIFIED,
};

export const EMPTY_GAME_STATE: PbGameState = {
  currentTurn: 0,
  phase: PbPhaseType.INIT_HANDS,
  roundNumber: 0,
  player: [EMPTY_PLAYER_DATA, EMPTY_PLAYER_DATA],
};

/** 动画队列中每个任务携带的元数据 */
interface AnimationMeta {
  /** 该动画所属的行动轮次 */
  turn: number;
  /** 该动画是否涉及我方支援区的创建、删除、移动 */
  involvesMySupport: boolean;
}

/** 判断该批 mutation 是否涉及我方支援区的创建、删除、移动 */
function involvesMySupportArea(
  mutations: PbExposedMutation[],
  who: 0 | 1,
): boolean {
  return mutations.some(({ mutation }) => {
    switch (mutation?.$case) {
      case "createEntity":
      case "removeEntity":
        return (
          mutation.value.who === who &&
          mutation.value.where === PbEntityArea.SUPPORT
        );
      case "moveEntity":
        return (
          (mutation.value.fromWho === who &&
            mutation.value.fromWhere === PbEntityArea.SUPPORT) ||
          (mutation.value.toWho === who &&
            mutation.value.toWhere === PbEntityArea.SUPPORT)
        );
      default:
        return false;
    }
  });
}

export interface ClientOption {
  onGiveUp?: () => void;
  rpc?: Partial<RpcDispatcher>;
  assetsManager?: Accessor<AssetsManager>;
  locale?: Accessor<Locale>;
  disableDelicateUi?: boolean;
  disableAction?: boolean;
}

export interface WebUiPlayerIO extends CancellablePlayerIO {
  cancelRpc: () => void;
  oppController: IOppChessboardController;
}

export type Client = [
  io: WebUiPlayerIO,
  Chessboard: (props: ClientChessboardProps) => JSX.Element,
];

export interface PlayerInfo {
  avatarUrl?: string;
  name?: string;
}

export interface ClientChessboardProps extends ComponentProps<"div"> {
  rotation?: Rotation;
  autoHeight?: boolean;
  timer?: RpcTimer | null;
  myPlayerInfo?: PlayerInfo;
  oppPlayerInfo?: PlayerInfo;
  spectatorMode?: boolean;
  chessboardColor?: string;
  gameEndExtra?: JSX.Element;
}

export function createClient(who: 0 | 1, option: ClientOption = {}): Client {
  const getAssetsManager = () =>
    option.assetsManager?.() ?? DEFAULT_ASSETS_MANAGER;
  const getLocale = () => option.locale?.() ?? "zh-CN";
  const dict = createMemo(() => flatten(translations[getLocale()]));
  const t = translator(dict, resolveTemplate);

  const [data, setData] = createSignal<ChessboardData>({
    raw: [],
    roundAndPhase: {
      showRound: false,
      who: null,
      value: null,
    },
    state: EMPTY_GAME_STATE,
    previousState: EMPTY_GAME_STATE,
    animatingCards: [],
    playingCard: null,
    enteringEntities: [],
    disposingEntities: [],
    triggeringEntities: [],
    damages: [],
    notificationBox: null,
  });
  const [actionState, setActionState] = createSignal<ActionState | null>(null);
  const [doingRpc, setDoingRpc] = createSignal(false);
  const [viewType, setViewType] = createSignal<ChessboardViewType>("normal");
  const [selectCardCandidates, setSelectCardCandidates] = createSignal<
    number[]
  >([]);
  const [opp, setOpp] = createSignal<OppInfo | null>(null);

  const uiQueue = new QueueManager<AnimationMeta>();
  let savedState: PbGameState | undefined = void 0;
  let rpcScope: AbortController | null = null;

  interface PendingRpcResponse {
    method: RpcMethod;
    resolve: (value: unknown) => void;
  }
  let pendingRpcResponse: PendingRpcResponse | null = null;

  const ensureRpcActive = (signal: AbortSignal) => {
    if (signal.aborted) {
      throw signal.reason;
    }
  };

  const waitForUi = async (wait: Promise<unknown>, signal: AbortSignal) => {
    ensureRpcActive(signal);
    const cancelled = Promise.withResolvers<never>();
    const abort = () => cancelled.reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    try {
      await Promise.race([wait, cancelled.promise]);
    } finally {
      signal.removeEventListener("abort", abort);
    }
    ensureRpcActive(signal);
  };

  const waitForResponse = async <T,>(
    method: RpcMethod,
    signal: AbortSignal,
    show: () => void,
    finish: (result: T | null) => void,
  ): Promise<T> => {
    ensureRpcActive(signal);
    const resolver = Promise.withResolvers<T>();
    const pending: PendingRpcResponse = {
      method,
      resolve: (value) => resolver.resolve(value as T),
    };
    pendingRpcResponse = pending;
    const abort = () => resolver.reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    let result: T | null = null;
    try {
      show();
      result = await resolver.promise;
      return result;
    } finally {
      signal.removeEventListener("abort", abort);
      if (pendingRpcResponse === pending) {
        pendingRpcResponse = null;
      }
      if (!signal.aborted) {
        finish(result);
      }
    }
  };

  const createDispatcher = (signal: AbortSignal): RpcDispatcher => ({
    chooseActive: async ({ candidateIds }) => {
      // 等待当前的 ui 动画渲染完成
      await waitForUi(uiQueue.drain(), signal);
      return waitForResponse<ChooseActiveResponse>(
        "chooseActive",
        signal,
        () => setActionState(createChooseActiveState(candidateIds, t)),
        () => setActionState(null),
      );
    },
    action: async ({ action }) => {
      // 等待对方行动轮次的动画播放完成
      await waitForUi(
        uiQueue.waitUntilNone((meta) => meta.turn !== who),
        signal,
      );
      return waitForResponse<ActionResponse>(
        "action",
        signal,
        () => setActionState(createActionState(getAssetsManager(), action, t)),
        () => setActionState(null),
      );
    },
    switchHands: async () => {
      if (savedState && savedState.phase >= PbPhaseType.INIT_ACTIVES) {
        // 等待当前的 ui 动画渲染完成
        await waitForUi(uiQueue.drain(), signal);
      }
      return waitForResponse<SwitchHandsResponse>(
        "switchHands",
        signal,
        () => setViewType("switchHands"),
        (result) => {
          if (result && result.removedHandIds.length > 0) {
            setViewType("switchHandsEnd");
            setTimeout(async () => {
              await uiQueue.drain();
              if (!signal.aborted) {
                setViewType((t) => (t === "switchHandsEnd" ? "normal" : t));
                forceRefreshData();
              }
            }, 1200);
          } else {
            setViewType("normal");
          }
        },
      );
    },
    selectCard: async ({ candidateDefinitionIds }) => {
      // 等待当前的 ui 动画渲染完成，但不阻塞后续 ui 更新
      await waitForUi(uiQueue.drain(), signal);
      return waitForResponse<SelectCardResponse>(
        "selectCard",
        signal,
        () => {
          setSelectCardCandidates(candidateDefinitionIds);
          setViewType("selectCard");
        },
        () => setViewType("normal"),
      );
    },
    rerollDice: async () => {
      // 等待当前的 ui 动画渲染完成，但不阻塞后续 ui 更新
      await waitForUi(uiQueue.drain(), signal);
      return waitForResponse<RerollDiceResponse>(
        "rerollDice",
        signal,
        () => setViewType("rerollDice"),
        () => {
          setViewType("rerollDiceEnd");
          setTimeout(() => {
            if (!signal.aborted) {
              setViewType((t) => (t === "rerollDiceEnd" ? "normal" : t));
            }
          }, 500);
        },
      );
    },
  });

  const forceRefreshData = () => {
    if (!savedState) {
      return;
    }
    const state = oppController.mergeState(savedState);
    const parsed = parseMutations([], parseMutationContext);
    setData({
      previousState: state,
      state,
      ...parsed,
    } satisfies ChessboardData);
  };

  const cancelRpc = () => {
    rpcScope?.abort(new Error("RPC cancelled"));
    rpcScope = null;
    setActionState(null);
    setViewType("normal");
    setSelectCardCandidates([]);
    setDoingRpc(false);
  };

  const resolveRpc = <K extends RpcMethod>(
    method: K,
    response: RpcResponsePayloadOf<K>,
  ) => {
    if (pendingRpcResponse?.method === method) {
      pendingRpcResponse.resolve(response);
    }
  };

  const [history, setHistory] = createStore<HistoryData>({
    blocks: [],
    currentIndent: 0,
    recorder: new StateRecorder(),
  });

  const oppController = new OppChessboardController({
    assetsManager: getAssetsManager,
    t,
    who: flip(who),
    onUpdate: async (info) => {
      await uiQueue.drain();
      setOpp(info);
      forceRefreshData();
    },
  });
  const parseMutationContext: ParseMutationContext = {
    oppController,
    previousPlayerStatusMutationWho: null,
    previousPlayerStatusMutationStatus: null,
  };

  const io: WebUiPlayerIO = {
    oppController,
    cancelRpc,
    notify: ({ mutation, state }) => {
      if (!state) {
        return;
      }
      const turn = state.currentTurn;
      const involvesMySupport = involvesMySupportArea(mutation, who);
      uiQueue.push(
        async () => {
          state = oppController.mergeState(state!);
          const parsed = parseMutations(mutation, parseMutationContext);
          setHistory(
            produce((history) => updateHistory(savedState, mutation, history)),
          );
          const { promise, resolve } = Promise.withResolvers<void>();
          setData({
            previousState: savedState ?? state,
            state,
            onAnimationFinish: resolve,
            ...parsed,
          } satisfies ChessboardData);
          savedState = state;
          await promise;
        },
        { turn, involvesMySupport },
      );
    },
    rpc: async (req) => {
      cancelRpc();
      const controller = new AbortController();
      rpcScope = controller;
      try {
        setDoingRpc(true);
        return await dispatchRpc(createDispatcher(controller.signal))(req);
      } finally {
        // Keep the scope alive after a successful response: its delayed UI
        // cleanup still belongs to this RPC and must be aborted by the next one.
        if (rpcScope === controller) {
          setDoingRpc(false);
        }
      }
    },
  };

  const onStepActionState: StepActionStateHandler = (step, dice) => {
    const currentActionState = actionState();
    if (!currentActionState) {
      return;
    }
    // 动画队列 guard：基于当前动画播放状态禁止部分 action step 的提交，以防用户误操作
    const pending = uiQueue.pending();
    if (
      step.type === "clickSkillButton" ||
      step.type === "clickSwitchActiveButton"
    ) {
      // 当存在动画正在播放时，禁用使用技能和切换出战角色
      if (pending.length > 0) {
        return;
      }
    } else if (
      step.type === "playCard" &&
      savedState?.player[who].handCard.find((card) => card.id === step.cardId)
        ?.type === PbEntityType.SUPPORT
    ) {
      // 当存在涉及我方支援区的动画正在播放时，禁用打出支援牌
      if (pending.some((meta) => meta.involvesMySupport)) {
        return;
      }
    }

    const result = currentActionState.step(step, dice);
    switch (result.type) {
      case "newState": {
        setActionState(result.newState);
        break;
      }
      case "actionCommitted": {
        if (option.disableAction) {
          break;
        }
        resolveRpc("action", result);
        setActionState(null);
        break;
      }
      case "chooseActiveCommitted": {
        if (option.disableAction) {
          break;
        }
        resolveRpc("chooseActive", result);
        setActionState(null);
        break;
      }
    }
  };

  const onRerollDice = (diceToReroll: PbDiceType[]) => {
    if (option.disableAction) {
      return;
    }
    resolveRpc("rerollDice", { diceToReroll });
  };
  const onSwitchHands = (removedHandIds: number[]) => {
    if (option.disableAction) {
      return;
    }
    resolveRpc("switchHands", { removedHandIds });
  };
  const onSelectCard = (selectedDefinitionId: number) => {
    if (option.disableAction) {
      return;
    }
    resolveRpc("selectCard", { selectedDefinitionId });
  };

  const onGiveUp = () => {
    cancelRpc();
    option.onGiveUp?.();
  };

  const Wrapper = (props: ComponentProps<"div">) => (
    <UiContext.Provider
      value={{
        ...option,
        assetsManager: getAssetsManager,
        locale: getLocale,
        t,
      }}
    >
      <Chessboard
        who={who}
        data={data()}
        actionState={actionState()}
        history={history.blocks}
        viewType={viewType()}
        selectCardCandidates={selectCardCandidates()}
        doingRpc={doingRpc()}
        onStepActionState={onStepActionState}
        onRerollDice={onRerollDice}
        onSwitchHands={onSwitchHands}
        onSelectCard={onSelectCard}
        onGiveUp={onGiveUp}
        opp={opp()}
        {...props}
      />
    </UiContext.Provider>
  );

  return [io, Wrapper];
}
