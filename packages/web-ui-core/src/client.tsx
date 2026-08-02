// Copyright (C) 2025 Guyutongxue
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
  ActionResponse,
  dispatchRpc,
  type RpcMethod,
  type PbGameState,
  type PbPlayerState,
  type RpcDispatcher,
  SwitchHandsResponse,
  SelectCardResponse,
  RerollDiceResponse,
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
  type Component,
  type ComponentProps,
  type JSX,
} from "solid-js";
import {
  Chessboard,
  type ChessboardViewType,
  type ChessboardData,
  type StepActionStateHandler,
  type RpcTimer,
  type ChessboardProps,
} from "./components/Chessboard";
import type {
  ChooseActiveResponse,
  PbDiceType,
  PbSkillInfo,
  PlayerIO,
  RpcResponsePayloadOf,
} from "@gi-tcg/core";
import { QueueManager } from "./queue_manager";
import { ActionNotificationTracker, parseMutations } from "./mutations";
import { translations, UiContext, type Locale } from "./hooks/context";
import {
  createActionState,
  createChooseActiveState,
  type ActionState,
  type ActionStep,
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
  const actionNotificationTracker = new ActionNotificationTracker();
  let savedState: PbGameState | undefined = void 0;

  const actionResolvers: {
    [K in RpcMethod]: PromiseWithResolvers<RpcResponsePayloadOf<K>> | null;
  } = {
    selectCard: null,
    chooseActive: null,
    rerollDice: null,
    switchHands: null,
    action: null,
  };

  const dispatcher: RpcDispatcher = {
    chooseActive: async ({ candidateIds }) => {
      // 等待当前的 ui 动画渲染完成
      await uiQueue.drain();
      const resolver = Promise.withResolvers<ChooseActiveResponse>();
      actionResolvers.chooseActive = resolver;
      const acState = createChooseActiveState(candidateIds, t);
      setActionState(acState);
      try {
        return await resolver.promise;
      } finally {
        setActionState(null);
      }
    },
    action: async ({ action }) => {
      // 等待对方行动轮次的动画播放完成
      await uiQueue.waitUntilNone((meta) => meta.turn !== who);
      const resolver = Promise.withResolvers<ActionResponse>();
      actionResolvers.action = resolver;
      const acState = createActionState(getAssetsManager(), action, t);
      setActionState(acState);
      try {
        return await resolver.promise;
      } finally {
        setActionState(null);
      }
    },
    switchHands: async () => {
      if (savedState && savedState.phase >= PbPhaseType.INIT_ACTIVES) {
        // 等待当前的 ui 动画渲染完成
        await uiQueue.drain();
      }
      const resolver = Promise.withResolvers<SwitchHandsResponse>();
      actionResolvers.switchHands = resolver;
      // return { removedHandIds: [] };
      setViewType("switchHands");
      let result: SwitchHandsResponse | null = null;
      try {
        result = await resolver.promise;
        return result;
      } finally {
        if (result && result.removedHandIds.length > 0) {
          setViewType("switchHandsEnd");
          setTimeout(async () => {
            await uiQueue.drain();
            setViewType((t) => (t === "switchHandsEnd" ? "normal" : t));
            forceRefreshData();
          }, 1200);
        } else {
          setViewType("normal");
        }
      }
    },
    selectCard: async ({ candidateDefinitionIds }) => {
      // 等待当前的 ui 动画渲染完成，但不阻塞后续 ui 更新
      await uiQueue.drain();
      const resolver = Promise.withResolvers<SelectCardResponse>();
      actionResolvers.selectCard = resolver;
      setSelectCardCandidates(candidateDefinitionIds);
      setViewType("selectCard");
      try {
        return await resolver.promise;
      } finally {
        setViewType("normal");
      }
    },
    rerollDice: async () => {
      // 等待当前的 ui 动画渲染完成，但不阻塞后续 ui 更新
      await uiQueue.drain();
      const resolver = Promise.withResolvers<RerollDiceResponse>();
      actionResolvers.rerollDice = resolver;
      setViewType("rerollDice");
      try {
        return await resolver.promise;
      } finally {
        setViewType("rerollDiceEnd");
        setTimeout(
          () => setViewType((t) => (t === "rerollDiceEnd" ? "normal" : t)),
          500,
        );
      }
    },
  };

  const forceRefreshData = () => {
    if (!savedState) {
      return;
    }
    const state = oppController.mergeState(savedState);
    const parsed = parseMutations([], oppController);
    setData({
      previousState: state,
      state,
      ...parsed,
    } satisfies ChessboardData);
  };

  const cancelRpc = () => {
    actionResolvers.action?.reject();
    actionResolvers.chooseActive?.reject();
    actionResolvers.rerollDice?.reject();
    actionResolvers.selectCard?.reject();
    actionResolvers.switchHands?.reject();
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
          const parsed = parseMutations(
            mutation,
            oppController,
            actionNotificationTracker,
          );
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
      try {
        setDoingRpc(true);
        return await dispatchRpc(dispatcher)(req);
      } finally {
        setDoingRpc(false);
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
        actionResolvers.action?.resolve(result);
        setActionState(null);
        break;
      }
      case "chooseActiveCommitted": {
        if (option.disableAction) {
          break;
        }
        actionResolvers.chooseActive?.resolve(result);
        setActionState(null);
        break;
      }
    }
  };

  const onRerollDice = (diceToReroll: PbDiceType[]) => {
    if (option.disableAction) {
      return;
    }
    actionResolvers.rerollDice?.resolve({ diceToReroll });
  };
  const onSwitchHands = (removedHandIds: number[]) => {
    if (option.disableAction) {
      return;
    }
    actionResolvers.switchHands?.resolve({ removedHandIds });
  };
  const onSelectCard = (selectedDefinitionId: number) => {
    if (option.disableAction) {
      return;
    }
    actionResolvers.selectCard?.resolve({ selectedDefinitionId });
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
