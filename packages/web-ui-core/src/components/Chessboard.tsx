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
  Aura,
  DiceType,
  PbAttachmentState,
  PbDiceRequirement,
  PbDiceType,
  PbExposedMutation,
  PbPhaseType,
  PbPlayerStatus,
  PbSkillInfo,
  type DamageType,
  type PbCharacterState,
  type PbEntityState,
  type PbGameState,
  type PbSkillType,
  type Reaction,
} from "@gi-tcg/typings";
import { Card } from "./Card";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  splitProps,
  Switch,
  untrack,
  type ComponentProps,
  type JSX,
} from "solid-js";
import { funnel } from "remeda";
import {
  ACTION_OUTLINED_Z,
  CARD_HEIGHT,
  CARD_WIDTH,
  DRAGGING_Z,
  FOCUSING_HANDS_Z,
  getCharacterAreaPos,
  getEntityPos,
  getHandCardBlurredPos,
  getHandCardFocusedPos,
  getHandHintPos,
  getOppHandCardFocusedPos,
  getPileHintPos,
  getPilePos,
  getShowingCardPos,
  getTuningAreaPos,
  MINIMUM_HEIGHT,
  MINIMUM_WIDTH,
  PERSPECTIVE,
  shouldFocusHandWhenDragging,
  unitInPx,
  type Pos,
  type Size,
} from "../layout";
import { CHARACTER_ANIMATION_NONE, CharacterArea } from "./CharacterArea";
import {
  createCardAnimation,
  type CardStaticUiState,
  type CardUiState,
  type CharacterUiState,
  type EntityUiState,
  type Transform,
} from "../ui_state";
import type { ParsedMutation } from "../mutations";
import type { PlayerInfo } from "../client";
import {
  KeyWithAnimation,
  type UpdateSignal,
} from "../primitives/key_with_animation";
import { NotificationBox } from "./NotificationBox";
import { Entity } from "./Entity";
import { PlayerInfoBox, type PlayerInfoProps } from "./PlayerInfoBox";
import { flip } from "@gi-tcg/utils";
import { DiceBar, DicePanel, type DicePanelState } from "./DicePanel";
import { SkillButtonGroup } from "./SkillButtonGroup";
import { createStore } from "solid-js/store";
import { RoundAndPhaseNotification } from "./RoundAndPhaseNotification";
import { PlayingCard } from "./PlayingCard";
import { createCardDataViewer } from "@gi-tcg/card-data-viewer";
import { useUiContext } from "../hooks/context";
import { CardCountHint } from "./CardCountHint";
import { Key } from "@solid-primitives/keyed";
import {
  DeclareEndMarker,
  type DeclareEndMarkerProps,
} from "./DeclareEndMarker";
import {
  ActionStepEntityUi,
  CANCEL_ACTION_STEP,
  NO_PREVIEW,
  type ActionState,
  type ActionStep,
  type ClickEntityActionStep,
  type ClickSkillButtonActionStep,
  type ClickSwitchActiveButtonActionStep,
  type ElementalTuningActionStep,
  type ParsedPreviewData,
  type PlayCardActionStep,
  type PreviewingCharacterInfo,
  type PreviewingEntityInfo,
} from "../action";
import { AspectRatioContainer } from "./AspectRatioContainer";
import { ChessboardBackground } from "./ChessboardBackground";
import { ChessboardBackdrop } from "./ChessboardBackdrop";
import { ActionHintText } from "./ActionHintText";
import { ConfirmButton } from "./ConfirmButton";
import { TuningArea } from "./TuningArea";
import { RerollDiceView } from "./RerollDiceView";
import { SelectCardView } from "./SelectCardView";
import { SwitchHandsView } from "./SwitchHandsView";
import { HistoryPanel } from "./HistoryViewer";
import { CurrentTurnHint } from "./CurrentTurnHint";
import {
  SpecialViewToggleButton,
  HistoryToggleButton,
  ExitButton,
  FullScreenToggleButton,
} from "./FunctionButtonGroup";
import { createAlert } from "./Alert";
import { createMessageBox } from "./MessageBox";
import { TimerCapsule, TimerAlert } from "./Timer";
import type { HistoryBlock } from "../history/typings";
import { BottomHint } from "./BottomHint";
import { TransformWrapper, type Rotation } from "./TransformWrapper";
import { MiniSpecialViewGroup } from "./MiniSpecialView";
import type { OppInfo } from "../opp";
import { RichText } from "./RichText";

export type CardArea = "myPile" | "oppPile" | "myHand" | "oppHand";

export interface CardInfo {
  id: number;
  data: PbEntityState;
  kind: CardArea | "switching" | "animating" | "dragging";
  uiState: CardUiState;
  enableShadow: boolean;
  enableTransition: boolean;
  playStep: PlayCardActionStep | null;
  tuneStep: ElementalTuningActionStep | null;
}

export interface DraggingCardInfo {
  id: number;
  data: PbEntityState;
  x: number;
  y: number;
  status: "start" | "moving" | "end";
  tuneStep: ElementalTuningActionStep | null;
  updatePos: (e: PointerEvent) => Pos;
}

export interface CharacterInfo {
  id: number;
  data: PbCharacterState;
  entities: StatusInfo[];
  combatStatus: StatusInfo[];
  opp: boolean;
  active: boolean;
  triggered: boolean;
  uiState: CharacterUiState;
  preview: PreviewingCharacterInfo | null;
  clickStep: ClickEntityActionStep | null;
}

export interface StatusViewInfo {
  id: number;
  data: PbEntityState | PbAttachmentState;
  animation: "none" | "entering" | "disposing";
  triggered: boolean;
}

export interface StatusInfo extends StatusViewInfo {
  data: PbEntityState;
}

export interface EntityInfo extends StatusInfo {
  type: "support" | "summon";
  uiState: EntityUiState;
  previewingNew: boolean;
  preview: PreviewingEntityInfo | null;
  clickStep: ClickEntityActionStep | null;
}

export interface AnimatingCardInfo {
  data: PbEntityState;
  showing: boolean;
  delay: number;
}

export interface PlayingCardInfo {
  who: 0 | 1;
  data: PbEntityState;
  noEffect: boolean;
}

export interface DamageInfo {
  type: "damage";
  damageType: DamageType;
  value: number;
  sourceId: number;
  targetId: number;
  isSkillMainDamage: boolean;
  isAfterSkillMainDamage: boolean;
  delay: number;
  reaction: ReactionInfo | null;
}

export interface ReactionInfo {
  type: "reaction";
  reactionType: Reaction;
  base: Aura;
  incoming: DamageType;
  targetId: number;
  delay: number;
}

export interface NotificationBoxInfo {
  type: "useSkill" | "switchActive";
  who: 0 | 1;
  characterDefinitionId: number;
  skillDefinitionId?: number;
  skillType: PbSkillType | "overloaded" | null;
}

export interface SkillInfo {
  id: number | "switchActive";
  cost: PbDiceRequirement[];
  realCost?: PbDiceRequirement[];
  step: ClickSkillButtonActionStep | ClickSwitchActiveButtonActionStep | null;
  isTechnique?: boolean;
  energy?: number;
}

export interface ChessboardData extends ParsedMutation {
  /** 保存上一个状态以计算动画效果 */
  previousState: PbGameState;
  state: PbGameState;
  onAnimationFinish?: () => void;
}

export type StepActionStateHandler = (
  step: ActionStep,
  selectedDice: DiceType[],
) => void;

export type ChessboardViewType =
  | "normal"
  | "rerollDice"
  | "switchHands"
  | "selectCard"
  | "rerollDiceEnd"
  | "switchHandsEnd";

export interface RpcTimer {
  current: number;
  total: number;
}

export interface ChessboardProps extends ComponentProps<"div"> {
  who: 0 | 1;
  rotation?: Rotation;
  autoHeight?: boolean;
  timer?: RpcTimer | null;
  myPlayerInfo?: PlayerInfo;
  oppPlayerInfo?: PlayerInfo;
  gameEndExtra?: JSX.Element;
  /**
   * 观战模式。开启后将阻止选骰面板和特殊视图的展开。
   */
  spectatorMode?: boolean;
  chessboardColor?: string;
  /**
   * 对方棋盘的信息。当传入对方棋盘信息时，将在我方棋盘同时渲染对手的手牌、骰子、技能以及特殊视图。
   */
  opp: OppInfo | null;
  /**
   * 从 notify 传入的 state & mutations 经过解析后得到的棋盘数据
   */
  data: ChessboardData;
  /**
   * 从 rpc 解析后的状态
   */
  actionState: ActionState | null;
  history: HistoryBlock[];
  viewType: ChessboardViewType;
  selectCardCandidates: number[];
  doingRpc: boolean;
  onStepActionState?: StepActionStateHandler;
  onRerollDice?: (dice: PbDiceType[]) => void;
  onSwitchHands?: (cardIds: number[]) => void;
  onSelectCard?: (cardDefId: number) => void;
  onGiveUp?: () => void;
}

type HandState =
  | "focusing" // 聚焦手牌显示
  | "blurred" // 正常收起手牌
  | "hidden" // 不显示手牌（行动中）
  | "switching"; // 替换手牌中

interface CardInfoCalcContext {
  who: 0 | 1;
  size: Size;
  myHandState: HandState;
  oppHandState: HandState;
  triggeringEntities: number[];
  hoveringHand: CardInfo | null;
  draggingHand: DraggingCardInfo | null;
  availableSteps: ActionStep[];
  /**
   * 控制oppHands朝向以及是否可以交互。
   */
  hasOppChessboard: boolean;
}

function calcCardsInfo(
  state: PbGameState,
  ctx: CardInfoCalcContext,
): CardInfo[] {
  const {
    who,
    size,
    myHandState,
    oppHandState,
    triggeringEntities,
    hoveringHand,
    availableSteps,
    hasOppChessboard,
  } = ctx;
  const cards: CardInfo[] = [];
  for (const who2 of [0, 1] as const) {
    const opp = who2 !== who;
    const player = state.player[who2];

    // Pile
    const pileSize = player.pileCard.length;
    for (let i = 0; i < pileSize; i++) {
      const [x, y] = getPilePos(size, opp);
      const card = player.pileCard[i];
      cards.push({
        id: card.id,
        data: card,
        kind: opp ? "oppPile" : "myPile",
        uiState: {
          type: "cardStatic",
          isAnimating: false,
          triggered: triggeringEntities.includes(card.id),
          draggingEndAnimation: false,
          transform: {
            x,
            y,
            z: (pileSize - 1 - i) * 0.1,
            ry: 180,
            rz: 90,
          },
        },
        enableShadow: i === pileSize - 1,
        enableTransition: true,
        playStep: null,
        tuneStep: null,
      });
    }

    // Hand
    const handCard = player.handCard.toSorted(
      (a, b) => a.definitionId - b.definitionId,
    );
    const totalHandCardCount = handCard.length;
    const skillCount = player.initiativeSkill.length;

    const isFocus =
      (!opp && myHandState === "focusing") ||
      (opp && hasOppChessboard && oppHandState === "focusing");
    const isSwitching = !opp && myHandState === "switching";
    const z = isSwitching ? DRAGGING_Z : isFocus ? FOCUSING_HANDS_Z : 1;
    const ry = isFocus ? 1 : opp && !hasOppChessboard ? 181 : 1;

    let hoveringHandIndex: number | null = handCard.findIndex(
      (card) => card.id === hoveringHand?.id,
    );
    if (hoveringHandIndex === -1) {
      hoveringHandIndex = null;
    }

    for (let i = 0; i < totalHandCardCount; i++) {
      const card = handCard[i];
      const playStep =
        availableSteps.find(
          (step): step is PlayCardActionStep =>
            step.type === "playCard" && step.cardId === card.id,
        ) ?? null;
      const tuneStep =
        availableSteps.find(
          (step): step is ElementalTuningActionStep =>
            step.type === "elementalTuning" && step.cardId === card.id,
        ) ?? null;

      if (ctx.draggingHand?.id === card.id) {
        continue;
      }
      let x, y;
      if (!opp && myHandState === "switching") {
        [x, y] = getShowingCardPos(size, totalHandCardCount, i);
      } else if (!opp && myHandState === "focusing") {
        [x, y] = getHandCardFocusedPos(
          size,
          totalHandCardCount,
          i,
          hoveringHandIndex,
        );
      } else if (opp && hasOppChessboard && oppHandState === "focusing") {
        [x, y] = getOppHandCardFocusedPos(
          size,
          totalHandCardCount,
          i,
          hoveringHandIndex,
        );
      } else {
        [x, y] = getHandCardBlurredPos(
          size,
          opp,
          ctx.myHandState !== "hidden",
          totalHandCardCount,
          i,
          skillCount,
        );
        if (opp && hasOppChessboard) {
          x -= MINIMUM_WIDTH / 6;
        }
      }
      cards.push({
        id: card.id,
        data: card,
        kind: opp ? "oppHand" : isSwitching ? "switching" : "myHand",
        uiState: {
          type: "cardStatic",
          isAnimating: false,
          triggered: triggeringEntities.includes(card.id),
          transform: {
            x,
            y,
            z,
            ry,
            rz: 0,
          },
          draggingEndAnimation: false,
        },
        enableShadow: !isSwitching,
        enableTransition: true,
        playStep,
        tuneStep,
      });
    }
  }

  // Dragging
  if (ctx.draggingHand) {
    const { x, y, status, id, data } = ctx.draggingHand;
    const playStep =
      availableSteps.find(
        (step): step is PlayCardActionStep =>
          step.type === "playCard" && step.cardId === id,
      ) ?? null;
    const tuneStep =
      availableSteps.find(
        (step): step is ElementalTuningActionStep =>
          step.type === "elementalTuning" && step.cardId === id,
      ) ?? null;

    cards.push({
      id,
      data,
      kind: "dragging",
      uiState: {
        type: "cardStatic",
        isAnimating: false,
        triggered: triggeringEntities.includes(id),
        transform: {
          x,
          y,
          z: DRAGGING_Z,
          ry: 0,
          rz: 0,
        },
        draggingEndAnimation: status === "end",
      },
      enableShadow: true,
      enableTransition: status === "start",
      playStep,
      tuneStep,
    });
  }
  return cards;
}

interface CalcEntitiesInfoResult {
  supports: EntityInfo[];
  summons: EntityInfo[];
  combatStatuses: StatusInfo[];
  characterAreaEntities: Map<number, StatusInfo[]>;
}

interface EntityInfoCalcContext {
  who: 0 | 1;
  size: Size;
  previewData: ParsedPreviewData;
  availableSteps: ActionStep[];
}

function calcEntitiesInfo(
  state: PbGameState,
  { who, size, previewData, availableSteps }: EntityInfoCalcContext,
): CalcEntitiesInfoResult[] {
  const result: CalcEntitiesInfoResult[] = [];
  const calcEntityInfo =
    (
      opp: boolean,
      type: "support" | "summon",
      previewingNew: boolean,
      baseIndex = 0,
    ) =>
    (data: PbEntityState, index: number): EntityInfo => {
      const [x, y] = getEntityPos(size, opp, type, index + baseIndex);
      const preview = previewData.entities.get(data.id) ?? null;
      const clickStep =
        availableSteps.find(
          (step): step is ClickEntityActionStep =>
            step.type === "clickEntity" && step.entityId === data.id,
        ) ?? null;
      return {
        id: data.id,
        type,
        data,
        animation: "none",
        triggered: false,
        uiState: {
          type: "entityStatic",
          isAnimating: false,
          transform: {
            x,
            y,
            z: previewingNew || preview || clickStep ? 0.2 : 0,
            ry: 0,
            rz: 0,
          },
        },
        previewingNew,
        preview,
        clickStep,
      };
    };
  const calcStatusInfo = (data: PbEntityState): StatusInfo => {
    return {
      id: data.id,
      data,
      animation: "none",
      triggered: false,
    };
  };
  for (const who2 of [0, 1] as const) {
    const opp = who2 !== who;
    const player = state.player[who2];
    const supports = player.support.map(calcEntityInfo(opp, "support", false));
    supports.push(
      ...(previewData.newEntities.get(`support${who2}`) ?? []).map(
        calcEntityInfo(opp, "support", true, supports.length),
      ),
    );
    const summons = player.summon.map(calcEntityInfo(opp, "summon", false));
    summons.push(
      ...(previewData.newEntities.get(`summon${who2}`) ?? []).map(
        calcEntityInfo(opp, "summon", true, summons.length),
      ),
    );
    const combatStatuses = player.combatStatus.map(calcStatusInfo);
    const statuses = new Map<number, StatusInfo[]>();
    for (const ch of player.character) {
      statuses.set(ch.id, ch.entity.map(calcStatusInfo));
    }
    result.push({
      supports,
      summons,
      combatStatuses,
      characterAreaEntities: statuses,
    });
  }
  return result;
}

export interface CardCountHintInfo {
  area: CardArea;
  value: number;
  transform: Transform;
}

export interface TuningAreaInfo {
  draggingHand: DraggingCardInfo | null;
  cardHovering: boolean;
  transform: Transform;
}

interface ChessboardChildren {
  characters: CharacterInfo[];
  cards: CardInfo[];
  entities: EntityInfo[];
  cardCountHints: CardCountHintInfo[];
  tuningArea: TuningAreaInfo | null;
}

function rerenderChildren(opt: {
  who: 0 | 1;
  size: Size;
  myHandState: HandState;
  oppHandState: HandState;
  hoveringHand: CardInfo | null;
  draggingHand: DraggingCardInfo | null;
  data: ChessboardData;
  previewData: ParsedPreviewData;
  availableSteps: ActionStep[];
  hasOppChessboard: boolean;
}): ChessboardChildren {
  const {
    size,
    myHandState,
    oppHandState,
    hoveringHand,
    draggingHand,
    data,
    previewData,
    availableSteps,
    hasOppChessboard,
  } = opt;
  // console.log(data);

  const { damages, onAnimationFinish, animatingCards, state, previousState } =
    data;

  const cardCountHints: CardCountHintInfo[] = [];
  const COUNT_HINT_TRANSFORM_BASE = {
    ry: 0,
    rz: 0,
  };
  for (const who of [0, 1] as const) {
    const opp = who !== opt.who;
    const player = state.player[who];
    const oppFocused =
      opp && opt.hasOppChessboard && opt.oppHandState === "focusing";
    cardCountHints.push({
      area: opp ? "oppPile" : "myPile",
      value: player.pileCard.length,
      transform: {
        ...getPileHintPos(size, opp),
        z: player.pileCard.length * 0.1,
        ...COUNT_HINT_TRANSFORM_BASE,
      },
    });
    cardCountHints.push({
      area: opp ? "oppHand" : "myHand",
      value: player.handCard.length,
      transform: {
        ...getHandHintPos(size, opp, player.handCard.length, oppFocused),
        ...COUNT_HINT_TRANSFORM_BASE,
        z: opp && !oppFocused ? 2 : FOCUSING_HANDS_Z,
      },
    });
  }

  const animationPromises: Promise<void>[] = [];
  const currentCards = calcCardsInfo(state, {
    who: opt.who,
    size,
    myHandState,
    oppHandState,
    hoveringHand,
    draggingHand,
    availableSteps,
    hasOppChessboard: hasOppChessboard,
    triggeringEntities: data.triggeringEntities,
  });

  if (animatingCards.length > 0) {
    const previousCards = calcCardsInfo(previousState, {
      who: opt.who,
      size,
      myHandState,
      oppHandState,
      hoveringHand,
      draggingHand,
      availableSteps: [],
      hasOppChessboard: hasOppChessboard,
      triggeringEntities: data.triggeringEntities,
    });
    const showingCards = Map.groupBy(animatingCards, (x) => x.delay);
    let totalDelayMs = 0;
    for (const d of showingCards
      .keys()
      .toArray()
      .toSorted((a, b) => a - b)) {
      const currentAnimatingCards = showingCards.get(d)!;
      const currentShowingCards =
        myHandState === "switching"
          ? []
          : currentAnimatingCards
              .filter((card) => card.showing)
              .toSorted((x, y) => x.data.definitionId - y.data.definitionId);
      let currentDurationMs = 0;
      for (const animatingCard of currentAnimatingCards) {
        if (draggingHand?.id === animatingCard.data.id) {
          continue;
        }
        const start = previousCards.find(
          (card) => card.id === animatingCard.data.id,
        );
        const startTransform = start
          ? (start.uiState as CardStaticUiState).transform
          : null;

        const endIndex = currentCards.findIndex(
          (card) => card.id === animatingCard.data.id,
        );
        let endTransform: Transform | null = null;
        if (endIndex !== -1) {
          endTransform = (currentCards[endIndex].uiState as CardStaticUiState)
            .transform;
          currentCards.splice(endIndex, 1);
        }
        let middleTransform: Transform | null = null;
        const index = currentShowingCards.indexOf(animatingCard);
        const hasMiddle = index !== -1;
        if (hasMiddle) {
          const [x, y] = getShowingCardPos(
            size,
            currentShowingCards.length,
            index,
          );
          middleTransform = {
            x,
            y,
            z: 20,
            ry: 5,
            rz: 0,
          };
        }
        const [animation, promise] = createCardAnimation({
          start: startTransform,
          middle: hasMiddle ? middleTransform : null,
          end: endTransform,
          delayMs: totalDelayMs,
        });
        currentDurationMs = Math.max(currentDurationMs, animation.durationMs);
        currentCards.push({
          id: animatingCard.data.id,
          data: animatingCard.data,
          kind: "animating",
          uiState: animation,
          enableShadow: true,
          enableTransition: false,
          playStep: null,
          tuneStep: null,
        });
        animationPromises.push(promise);
      }
      totalDelayMs += currentDurationMs;
    }
  }

  let entityAnimationDuration = 500;
  let currentEntities = calcEntitiesInfo(state, {
    who: opt.who,
    size,
    previewData,
    availableSteps,
  });
  if (data.disposingEntities.length > 0) {
    const previousEntities = calcEntitiesInfo(previousState, {
      who: opt.who,
      size,
      previewData: NO_PREVIEW,
      availableSteps: [],
    });
    const applyDiff = <T extends StatusInfo>(
      entities: T[],
      newEntities: T[],
    ) => {
      for (const entity of entities) {
        const isDisposing = data.disposingEntities.includes(entity.id);
        if (isDisposing) {
          entity.animation = "disposing";
        }
        if (data.triggeringEntities.includes(entity.id)) {
          entity.triggered = true;
          if (isDisposing) {
            // 此时要播放触发和消失两个动画，略微延长时间
            entityAnimationDuration = 700;
          }
        }
      }
      for (const entity of newEntities) {
        if (data.enteringEntities.includes(entity.id)) {
          entity.animation = "entering";
          entities.push(entity);
        }
      }
    };
    for (const who of [0, 1]) {
      const previousPlayer = previousEntities[who];
      const currentPlayer = currentEntities[who];

      applyDiff(previousPlayer.supports, currentPlayer.supports);
      applyDiff(previousPlayer.summons, currentPlayer.summons);
      applyDiff(previousPlayer.combatStatuses, currentPlayer.combatStatuses);
      for (const [id, entities] of previousPlayer.characterAreaEntities) {
        applyDiff(entities, currentPlayer.characterAreaEntities.get(id) ?? []);
      }
    }
    currentEntities = previousEntities;
  } else {
    const applyAnimation = <T extends StatusInfo>(entities: T[]) => {
      for (const entity of entities) {
        if (data.triggeringEntities.includes(entity.id)) {
          entity.triggered = true;
        }
        if (data.enteringEntities.includes(entity.id)) {
          entity.animation = "entering";
        }
      }
    };
    for (const who of [0, 1]) {
      const currentPlayer = currentEntities[who];
      applyAnimation(currentPlayer.supports);
      applyAnimation(currentPlayer.summons);
      applyAnimation(currentPlayer.combatStatuses);
      for (const entities of currentPlayer.characterAreaEntities.values()) {
        applyAnimation(entities);
      }
    }
  }

  const charactersMap = new Map<number, CharacterInfo>();
  const isCharacterAnimating = damages.some(
    (d) => d.type === "damage" && d.isSkillMainDamage,
  );
  for (const who of [0, 1] as const) {
    const player = state.player[who];
    const opp = who !== opt.who;
    const combatStatus = currentEntities[who].combatStatuses;

    const totalCharacterCount = player.character.length;
    for (let i = 0; i < totalCharacterCount; i++) {
      const ch = player.character[i];
      const entities =
        currentEntities[who].characterAreaEntities.get(ch.id) ?? [];
      const isActive = player.activeCharacterId === ch.id && !ch.defeated;
      const isMyActive = !opp && isActive;
      const [x, y] = getCharacterAreaPos(
        size,
        opp,
        totalCharacterCount,
        i,
        isActive,
      );
      const { promise, resolve } = Promise.withResolvers<void>();
      const preview = previewData.characters.get(ch.id) ?? null;
      const clickStep =
        availableSteps.find(
          (step): step is ClickEntityActionStep =>
            step.type === "clickEntity" &&
            (step.entityId === ch.id ||
              (step.entityId === "myActiveCharacter" && isMyActive)),
        ) ?? null;
      let z =
        (clickStep && clickStep.ui >= ActionStepEntityUi.Visible) || preview
          ? ACTION_OUTLINED_Z
          : 0;
      if (isActive) {
        z += 0.05;
      }
      charactersMap.set(ch.id, {
        id: ch.id,
        data: ch,
        entities,
        triggered: data.triggeringEntities.includes(ch.id),
        uiState: {
          type: "character",
          isAnimating: isCharacterAnimating,
          transform: {
            x,
            y,
            z,
            ry: 0,
            rz: 0,
          },
          damages: [],
          animation: CHARACTER_ANIMATION_NONE,
          onAnimationFinish: resolve,
        },
        opp,
        active: isActive,
        preview,
        combatStatus: isActive ? combatStatus : [],
        clickStep,
      });
      animationPromises.push(promise);
    }
  }
  for (const damage of damages) {
    const target = charactersMap.get(damage.targetId)!;
    if (damage.type === "damage") {
      const source = charactersMap.get(damage.sourceId);
      if (source && damage.isSkillMainDamage) {
        source.triggered = false;
        source.uiState.animation = {
          type: "damageSource",
          targetX: target.uiState.transform.x,
          targetY: target.uiState.transform.y,
          damageType: damage.damageType,
        };
        target.uiState.animation = {
          type: "damageTarget",
          sourceX: source.uiState.transform.x,
          sourceY: source.uiState.transform.y,
          damageType: damage.damageType,
        };
      }
    }
    target.uiState.damages.push(damage);
  }

  if (data.roundAndPhase.value !== null) {
    const duration = data.roundAndPhase.showRound ? 1300 : 500;
    animationPromises.push(
      new Promise((resolve) => setTimeout(resolve, duration)),
    );
  }
  if (data.playingCard || data.notificationBox) {
    animationPromises.push(new Promise((resolve) => setTimeout(resolve, 700)));
  }
  if (data.enteringEntities.length > 0 || data.triggeringEntities.length > 0) {
    animationPromises.push(
      new Promise((resolve) => setTimeout(resolve, entityAnimationDuration)),
    );
  }
  if (data.disposingEntities.length > 0) {
    animationPromises.push(new Promise((resolve) => setTimeout(resolve, 200)));
  }

  Promise.all(animationPromises).then(() => {
    onAnimationFinish?.();
  });

  const cards = currentCards.toSorted((a, b) => a.id - b.id);
  const characters = charactersMap
    .values()
    .toArray()
    .toSorted((a, b) => a.id - b.id);
  const entities = [
    ...currentEntities[0].supports,
    ...currentEntities[0].summons,
    ...currentEntities[1].supports,
    ...currentEntities[1].summons,
  ];

  const [tuningAreaX, tuningAreaY] = getTuningAreaPos(size, draggingHand);
  const tuningArea: TuningAreaInfo = {
    draggingHand,
    cardHovering: draggingHand
      ? draggingHand.x + CARD_WIDTH > tuningAreaX
      : false,
    transform: {
      x: tuningAreaX,
      y: tuningAreaY,
      z: 11.99,
      ry: 0,
      rz: 0,
    },
  };

  return {
    cards,
    characters,
    entities,
    cardCountHints,
    tuningArea,
  };
}

type SelectingItem =
  | {
      type: "card";
      info: CardInfo;
    }
  | {
      type: "entity";
      info: EntityInfo;
    }
  | {
      type: "character";
      info: CharacterInfo;
    }
  | {
      type: "skill";
      info: SkillInfo & { id: number };
    }
  | {
      type: "externalCard";
      info: number | PbEntityState;
    };

export function Chessboard(props: ChessboardProps) {
  const [localProps, elProps] = splitProps(props, [
    "who",
    "rotation",
    "autoHeight",
    "timer",
    "myPlayerInfo",
    "oppPlayerInfo",
    "gameEndExtra",
    "opp",
    "spectatorMode",
    "chessboardColor",
    "data",
    "actionState",
    "history",
    "viewType",
    "selectCardCandidates",
    "doingRpc",
    "onStepActionState",
    "onRerollDice",
    "onSwitchHands",
    "onSelectCard",
    "onGiveUp",
    "class",
    "children",
  ]);
  let chessboardElement!: HTMLDivElement;
  const [transformScale, setTransformScale] = createSignal(1);

  const { assetsManager, locale, t } = useUiContext();
  const { CardDataViewer, ...dataViewerController } = createCardDataViewer({
    includesImage: true,
    assetsManager,
    locale,
  });
  const [selectingItem, setSelectingItem] = createSignal<SelectingItem | null>(
    null,
  );
  /** 是否是主棋盘上被选中的卡 */
  const isSelectingItem = (id: number) => {
    const item = selectingItem();
    if (item === null || item.type === "externalCard") {
      return false;
    } else {
      return id === item.info.id;
    }
  };
  const isExternalSelectingItem = (defIdOrState: number | PbEntityState) => {
    const item = selectingItem();
    if (item === null || item.type !== "externalCard") {
      return false;
    } else if (
      typeof item.info === "number" ||
      typeof defIdOrState === "number"
    ) {
      return defIdOrState === item.info;
    } else {
      return defIdOrState.id === item.info.id;
    }
  };

  createEffect(() => {
    const item = selectingItem();
    if (item === null) {
      dataViewerController.hide();
    } else if (item.type === "card") {
      dataViewerController.showState("card", item.info.data);
    } else if (item.type === "character") {
      dataViewerController.showState(
        "character",
        item.info.data,
        item.info.combatStatus.map((x) => x.data),
      );
    } else if (item.type === "entity") {
      dataViewerController.showState(item.info.type, item.info.data);
    } else if (item.type === "skill") {
      dataViewerController.showSkill(item.info.id);
    } else if (item.type === "externalCard") {
      if (typeof item.info === "number") {
        dataViewerController.showCard(item.info);
      } else {
        dataViewerController.showState("card", item.info);
      }
    }
  });

  const [height, setHeight] = createSignal(0);
  const [width, setWidth] = createSignal(0);
  const onResize = () => {
    const unit = unitInPx();
    setHeight(chessboardElement.clientHeight / unit);
    setWidth(chessboardElement.clientWidth / unit);
  };

  const [updateChildrenSignal, triggerUpdateChildren] =
    createSignal<UpdateSignal>({
      force: true,
    });
  const [getFocusingHands, setFocusingHands] = createSignal(false);
  const [getOppFocusingHands, setOppFocusingHands] = createSignal(false);
  const [getHoveringHand, setHoveringHand] = createSignal<CardInfo | null>(
    null,
  );
  const [getDraggingHand, setDraggingHand] =
    createSignal<DraggingCardInfo | null>(null);
  const canToggleHandFocus = createMemo(
    () => localProps.data.animatingCards.length === 0,
  );
  let shouldMoveWhenHandBlurring: PromiseWithResolvers<boolean>;

  const onResizeDebouncer = funnel(onResize, {
    minQuietPeriodMs: 200,
  });
  const resizeObserver = new ResizeObserver(onResizeDebouncer.call);
  const [children, setChildren] = createSignal<ChessboardChildren>({
    characters: [],
    cards: [],
    entities: [],
    cardCountHints: [],
    tuningArea: null,
  });

  const getHandState = (
    focusing: boolean,
    viewType: ChessboardViewType,
    actionState: ActionState | null,
  ): HandState => {
    if (
      !localProps.spectatorMode &&
      (viewType === "switchHands" || viewType === "switchHandsEnd")
    ) {
      return "switching";
    } else if (actionState && !actionState.showHands) {
      return "hidden";
    } else {
      return focusing ? "focusing" : "blurred";
    }
  };

  createEffect(
    on(
      () => localProps.data,
      (data) => {
        const newChildren = rerenderChildren({
          who: localProps.who,
          size: [height(), width()],
          myHandState: getHandState(
            getFocusingHands(),
            localProps.viewType,
            localProps.actionState,
          ),
          oppHandState: getHandState(
            getOppFocusingHands(),
            "normal",
            localProps.actionState,
          ),
          hoveringHand: getHoveringHand(),
          draggingHand: getDraggingHand(),
          data,
          previewData: localProps.actionState?.previewData ?? NO_PREVIEW,
          availableSteps: localProps.actionState?.availableSteps ?? [],
          hasOppChessboard: !!localProps.opp,
        });
        setChildren(newChildren);
        triggerUpdateChildren({ force: true });
      },
    ),
  );
  createEffect(
    on(
      [
        () => [height(), width()] as Size,
        getFocusingHands,
        getOppFocusingHands,
        getHoveringHand,
        getDraggingHand,
        () => localProps.actionState,
        () => localProps.viewType,
      ],
      ([
        size,
        focusingHands,
        oppFocusingHands,
        hoveringHand,
        draggingHand,
        actionState,
        viewType,
      ]) => {
        const newChildren = rerenderChildren({
          who: localProps.who,
          size,
          myHandState: getHandState(focusingHands, viewType, actionState),
          oppHandState: getHandState(oppFocusingHands, "normal", actionState),
          hoveringHand,
          draggingHand,
          data: localProps.data,
          previewData: actionState?.previewData ?? NO_PREVIEW,
          availableSteps: actionState?.availableSteps ?? [],
          hasOppChessboard: !!localProps.opp,
        });
        setChildren(newChildren);
        triggerUpdateChildren({ force: false });
      },
    ),
  );

  /**
   * on actionState change:
   * - set/unset selected dice
   * - trigger alert
   *
   */
  createEffect(
    on(
      () => localProps.actionState,
      (actionState, prevActionState) => {
        // DEBUG
        // console.log(actionState);
        if (actionState) {
          if (actionState.showBackdrop) {
            // 当显示遮罩时，不再选中角色或实体
            setSelectingItem((item) => {
              if (item?.type === "character" || item?.type === "entity") {
                return null;
              } else {
                return item;
              }
            });
          }
          if (actionState.autoSelectedDice) {
            const dice = myDice();
            const selectingDice = Array.from(
              { length: dice.length },
              () => false,
            );
            for (const d of actionState.autoSelectedDice) {
              for (let i = 0; i < dice.length; i++) {
                if (dice[i] === d && !selectingDice[i]) {
                  selectingDice[i] = true;
                  break;
                }
              }
            }
            setSelectedDice(selectingDice);
          }
          if (actionState.alertText) {
            showAlert(<RichText content={actionState.alertText} />);
          }
          setDicePanelState(actionState.dicePanel);
        } else if (prevActionState) {
          // 退出行动时，取消所有的选择项
          // 保持 draggingHand.status === "end" 以播放完整动画
          // setDraggingHand(null);
          setSelectingItem(null);
          setDicePanelState("hidden");
          setSelectedDice([]);
        }
      },
    ),
  );

  const [isShowCardHint, setShowCardHint] = createStore<
    Record<CardArea, number | null>
  >({
    myPile: null,
    oppPile: null,
    myHand: null,
    oppHand: null,
  });

  const showCardHint = (area: CardArea) => {
    const current = isShowCardHint[area];
    if (current !== null) {
      clearTimeout(current);
    }
    const timeout = window.setTimeout(() => {
      setShowCardHint(area, null);
    }, 1500);
    setShowCardHint(area, timeout);
  };

  const [{ show: showAlert, hide: hideAlert }, Alert] = createAlert();
  const [{ confirm }, MessageBox] = createMessageBox();

  const [showDeclareEndButton, setShowDeclareEndButton] = createSignal(false);
  const declareEndMarkerProps = createMemo<DeclareEndMarkerProps>(() => {
    const canDeclareEnd = localProps.actionState?.availableSteps?.find(
      (s) => s.type === "declareEnd",
    );
    return {
      roundNumber: localProps.data.state.roundNumber,
      phase: localProps.data.state.phase,
      markerClickable: !!canDeclareEnd,
      showButton: showDeclareEndButton(),
      timingMine: localProps.doingRpc,
      currentTime: localProps.timer?.current ?? 0,
      totalTime: localProps.timer?.total ?? Infinity,
      willGetFirst:
        !localProps.data.state.player[flip(localProps.who)].declaredEnd,
      onClick: () => {
        if (canDeclareEnd) {
          if (!showDeclareEndButton()) {
            setShowDeclareEndButton(true);
          } else {
            setShowDeclareEndButton(false);
            localProps.onStepActionState?.(canDeclareEnd, []);
          }
        }
      },
    };
  });

  const showConfirmButton = createMemo(() => {
    return localProps.actionState?.availableSteps.find(
      (s) => s.type === "clickConfirmButton",
    );
  });

  const playerInfoPropsOf = (who: 0 | 1): PlayerInfoProps => {
    const player = localProps.data.state.player[who];
    return {
      declaredEnd: player.declaredEnd,
      diceCount: player.dice.length,
      legendUsed: player.legendUsed,
      status: player.status,
    };
  };
  const myDice = createMemo(
    () => localProps.data.state.player[localProps.who].dice as DiceType[],
  );
  const oppDice = createMemo(
    () => localProps.data.state.player[flip(localProps.who)].dice as DiceType[],
  );
  const findSkillStep = (
    steps: ActionStep[],
    id: SkillInfo["id"],
  ): ClickSkillButtonActionStep | null => {
    return (
      steps.find(
        (s): s is ClickSkillButtonActionStep =>
          s.type === "clickSkillButton" && s.skillId === id,
      ) ?? null
    );
  };
  const isTechnique = (id: SkillInfo["id"]): boolean =>
    typeof id === "number" && id.toString().length > 5;
  const activeEnergy = (who: 0 | 1) => {
    const player = localProps.data.state.player[who];
    const { energy = 0, maxEnergy = 1 } =
      player.character.find((ch) => ch.id === player.activeCharacterId) ?? {};
    return { energy, maxEnergy };
  };
  const energyPercentage = (who: 0 | 1): number => {
    const { energy, maxEnergy } = activeEnergy(who);
    return Math.min(energy / maxEnergy, 1);
  };
  const mySkills = createMemo<SkillInfo[]>(() => {
    const actionState = localProps.actionState;
    const steps = actionState?.availableSteps ?? [];
    const realCosts = actionState?.realCosts.skills;
    return localProps.data.state.player[localProps.who].initiativeSkill.map(
      (sk) => ({
        id: sk.definitionId,
        cost: sk.definitionCost,
        realCost: realCosts?.get(sk.definitionId),
        step: findSkillStep(steps, sk.definitionId),
        isTechnique: isTechnique(sk.definitionId),
        energy: energyPercentage(localProps.who),
      }),
    );
  });
  const oppSkills = createMemo<SkillInfo[]>(() => {
    const actionState = localProps.opp?.actionState;
    const steps = actionState?.availableSteps ?? [];
    const realCosts = actionState?.realCosts.skills;
    return (
      localProps.opp?.initiativeSkills.map((sk) => ({
        id: sk.definitionId,
        cost: sk.definitionCost,
        realCost: realCosts?.get(sk.definitionId),
        step: findSkillStep(steps, sk.definitionId),
        isTechnique: isTechnique(sk.definitionId),
        energy: energyPercentage(flip(localProps.who)),
      })) ?? []
    );
  });
  const switchActiveStep = createMemo(() =>
    localProps.actionState?.availableSteps.find(
      (s) => s.type === "clickSwitchActiveButton",
    ),
  );
  const showSkillButtons = createMemo(() => {
    const shown = !getFocusingHands() && getDraggingHand()?.status !== "moving";
    if (localProps.actionState) {
      return shown && localProps.actionState.showSkillButtons;
    } else {
      return shown;
    }
  });
  const showOppSkillButtons = createMemo(() => {
    const shown = !getOppFocusingHands();
    if (localProps.actionState) {
      return shown && localProps.actionState.showSkillButtons;
    } else {
      return shown;
    }
  });

  const [specialViewVisible, setSpecialViewVisible] = createSignal(true);
  const hasSpecialView = createMemo(() =>
    ["rerollDice", "rerollDiceEnd", "switchHands", "selectCard"].includes(
      localProps.viewType,
    ),
  );
  const hasOppSpecialView = createMemo(() =>
    ["rerollDice", "rerollDiceEnd", "switchHands", "selectCard"].includes(
      localProps.opp?.viewType ?? "normal",
    ),
  );
  const displayUiComponents = createMemo(
    () => !hasSpecialView() || !specialViewVisible(),
  );
  /** 当特殊视图显示状态发生变化时，隐藏所有选中对象 */
  createEffect(
    on(specialViewVisible, () => {
      setSelectingItem(null);
    }),
  );
  /** 当存在特殊视图可用时，使其可见 */
  createEffect(() => {
    if (hasSpecialView()) {
      setSpecialViewVisible(!localProps.spectatorMode);
    }
  });

  const timer = () => (localProps.doingRpc ? (localProps.timer ?? null) : null);

  const [selectedDice, setSelectedDice] = createSignal<boolean[]>([]);
  const [dicePanelState, setDicePanelState] =
    createSignal<DicePanelState>("hidden");

  const selectedDiceValue = () => {
    const selected = selectedDice();
    return myDice().filter((_, i) => selected[i]);
  };

  const [switchedCards, setSwitchedCards] = createSignal<number[]>([]);
  const [showHistory, setShowHistory] = createSignal(false);
  const onCardClick = (
    e: MouseEvent,
    currentTarget: HTMLElement,
    cardInfo: CardInfo,
  ) => {
    if (cardInfo.kind === "switching") {
      setSwitchedCards((c) => {
        const index = c.indexOf(cardInfo.id);
        if (index === -1) {
          return [...c, cardInfo.id];
        } else {
          return c.filter((_, i) => i !== index);
        }
      });
      setSelectingItem({ type: "card", info: cardInfo });
    }
  };

  const onCardPointerEnter = (
    e: PointerEvent,
    currentTarget: HTMLElement,
    cardInfo: CardInfo,
  ) => {
    if (
      cardInfo.kind === "myHand" ||
      (cardInfo.kind === "oppHand" && localProps.opp)
    ) {
      setHoveringHand(cardInfo);
    }
  };
  const onCardPointerLeave = (
    e: PointerEvent,
    currentTarget: HTMLElement,
    cardInfo: CardInfo,
  ) => {
    if (getFocusingHands() || getOppFocusingHands()) {
      setHoveringHand((c) => {
        if (c?.id === cardInfo.id) {
          return null;
        } else {
          return c;
        }
      });
    }
  };
  const onCardPointerDown = async (
    e: PointerEvent,
    currentTarget: HTMLElement,
    cardInfo: CardInfo,
  ) => {
    setShowDeclareEndButton(false);
    if (cardInfo.kind === "myHand" && cardInfo.uiState.type === "cardStatic") {
      localProps.onStepActionState?.(CANCEL_ACTION_STEP, []);
      // 弥补收起手牌时选中由于 z 的差距而导致的视觉不连贯
      let yAdjust = 0;
      if (!getFocusingHands()) {
        shouldMoveWhenHandBlurring = Promise.withResolvers();
        setTimeout(() => {
          shouldMoveWhenHandBlurring.resolve(true);
        }, 100);
        const doMove = await shouldMoveWhenHandBlurring.promise;
        if (canToggleHandFocus()) {
          setFocusingHands(true);
          setOppFocusingHands(false);
          showCardHint("myHand");
          setShowCardHint("oppHand", null);
          setSelectingItem(null);
        }
        if (!doMove) {
          return;
        }
        yAdjust -= 3;
      }
      setSelectingItem({ type: "card", info: cardInfo });
      currentTarget.setPointerCapture(e.pointerId);
      const unit = unitInPx();
      const originalX = cardInfo.uiState.transform.x;
      const originalY = cardInfo.uiState.transform.y + yAdjust;
      const initialPointerX = e.clientX;
      const initialPointerY = e.clientY;
      const zRatio = (PERSPECTIVE - DRAGGING_Z) / PERSPECTIVE;
      setDraggingHand({
        id: cardInfo.id,
        data: cardInfo.data,
        x: originalX,
        y: originalY,
        status: "start",
        tuneStep: cardInfo.tuneStep ?? null,
        updatePos: (e2) => {
          const rot = ((untrack(() => props.rotation) ?? 0) * -Math.PI) / 180;
          const scale = untrack(transformScale);
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const dx = e2.clientX - initialPointerX;
          const dy = e2.clientY - initialPointerY;
          const x = originalX + ((cos * dx - sin * dy) / scale / unit) * zRatio;
          const y = originalY + ((sin * dx + cos * dy) / scale / unit) * zRatio;
          return [x, y];
        },
      });
    } else if (untrack(() => localProps.opp) && cardInfo.kind === "oppHand") {
      currentTarget.setPointerCapture(e.pointerId);
      if (!getOppFocusingHands() && canToggleHandFocus()) {
        setOppFocusingHands(true);
        setFocusingHands(false);
        showCardHint("oppHand");
        setShowCardHint("myHand", null);
        setSelectingItem(null);
        return;
      }
      setSelectingItem({ type: "card", info: cardInfo });
    } else if (
      cardInfo.kind === "myPile" ||
      cardInfo.kind === "oppHand" ||
      cardInfo.kind === "oppPile"
    ) {
      showCardHint(cardInfo.kind);
    }
  };
  const onCardPointerMove = (
    e: PointerEvent,
    currentTarget: HTMLElement,
    cardInfo: CardInfo,
  ) => {
    const dragging = getDraggingHand();
    if (dragging?.id !== cardInfo.id) {
      return;
    }
    if (dragging.status === "end") {
      return;
    }
    shouldMoveWhenHandBlurring?.resolve(true);
    const size = [height(), width()] as Size;
    const [x, y] = dragging.updatePos(e);
    if (canToggleHandFocus()) {
      const shouldFocusingHand = shouldFocusHandWhenDragging(size, y);
      setFocusingHands(shouldFocusingHand);
      setShowCardHint("myHand", null);
      if (shouldFocusingHand) {
        setOppFocusingHands(false);
        setShowCardHint("oppHand", null);
      }
    }
    setDraggingHand({
      ...dragging,
      status: "moving",
      x,
      y,
    });
  };
  const onCardPointerUp = (
    e: PointerEvent,
    currentTarget: HTMLElement,
    cardInfo: CardInfo,
  ) => {
    shouldMoveWhenHandBlurring?.resolve(false);
    const dragging = getDraggingHand();
    const focusingHands = getFocusingHands();
    const size = [height(), width()] as Size;
    if (dragging?.id !== cardInfo.id || cardInfo.kind === "oppHand") {
      return;
    }
    const [tuningAreaX] = getTuningAreaPos(size, dragging);
    const shouldFocusingHand = shouldFocusHandWhenDragging(size, dragging.y);
    if (cardInfo.tuneStep && dragging.x + CARD_WIDTH > tuningAreaX) {
      localProps.onStepActionState?.(cardInfo.tuneStep, selectedDiceValue());
      setDraggingHand({ ...dragging, status: "end" });
      return;
    }
    if (!shouldFocusingHand && cardInfo.playStep) {
      localProps.onStepActionState?.(cardInfo.playStep, selectedDiceValue());
      if (cardInfo.playStep.playable) {
        setDraggingHand({ ...dragging, status: "end" });
      } else {
        setDraggingHand(null);
      }
    } else {
      setDraggingHand(null);
    }
    if (!focusingHands) {
      setSelectingItem(null);
    }
  };

  const onChessboardClick = () => {
    batch(() => {
      if (canToggleHandFocus()) {
        setFocusingHands(false);
        setShowCardHint("myHand", null);
      }
      setOppFocusingHands(false);
      setShowCardHint("oppHand", null);
      setShowDeclareEndButton(false);
      setDraggingHand(null);
      setHoveringHand(null);
      setSelectingItem(null);
      if (localProps.actionState) {
        localProps.onStepActionState?.(CANCEL_ACTION_STEP, []);
      }
    });
  };

  const onCharacterAreaClick = (
    e: MouseEvent,
    currentTarget: HTMLElement,
    characterInfo: CharacterInfo,
  ) => {
    if (canToggleHandFocus()) {
      setFocusingHands(false);
      setShowCardHint("myHand", null);
    }
    setOppFocusingHands(false);
    setShowCardHint("oppHand", null);
    setShowDeclareEndButton(false);
    if (!props.actionState?.showBackdrop) {
      setSelectingItem({ type: "character", info: characterInfo });
    }
    if (characterInfo.clickStep) {
      localProps.onStepActionState?.(
        characterInfo.clickStep,
        selectedDiceValue(),
      );
    }
  };

  const onEntityClick = (
    e: MouseEvent,
    currentTarget: HTMLElement,
    entityInfo: EntityInfo,
  ) => {
    if (canToggleHandFocus()) {
      setFocusingHands(false);
      setShowCardHint("myHand", null);
    }
    setOppFocusingHands(false);
    setShowCardHint("oppHand", null);
    setShowDeclareEndButton(false);
    if (!props.actionState?.showBackdrop) {
      setSelectingItem({ type: "entity", info: entityInfo });
    }
    if (entityInfo.clickStep) {
      localProps.onStepActionState?.(entityInfo.clickStep, selectedDiceValue());
    }
  };

  const onSkillClick = (sk: SkillInfo) => {
    setShowDeclareEndButton(false);
    if (sk.id === "switchActive") {
      const step = switchActiveStep();
      if (step) {
        localProps.onStepActionState?.(step, selectedDiceValue());
      }
    } else {
      setSelectingItem({ type: "skill", info: { ...sk, id: sk.id } });
      const step = localProps.actionState?.availableSteps.find(
        (s) => s.type === "clickSkillButton" && s.skillId === sk.id,
      );
      if (step) {
        localProps.onStepActionState?.(step, selectedDiceValue());
      }
    }
  };

  const onOppSkillClick = (sk: SkillInfo) => {
    setShowDeclareEndButton(false);
    setSelectingItem({
      type: "skill",
      info: { ...sk, id: sk.id as number },
    });
    setFocusingHands(false);
    setShowCardHint("myHand", null);
  };

  const onMiniViewCardClick = (card: number | PbEntityState) => {
    setSelectingItem({ type: "externalCard", info: card });
    setFocusingHands(false);
    setShowCardHint("myHand", null);
    setOppFocusingHands(false);
    setShowCardHint("oppHand", null);
  };

  let containerElement!: HTMLDivElement;

  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const fullscreenHandler = () => {
    setIsFullscreen(document.fullscreenElement === containerElement);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const onExit = async () => {
    const confirmed = await confirm(t("ui.confirmGiveUpGame"));
    if (confirmed) {
      localProps.onGiveUp?.();
    }
  };

  onMount(() => {
    setSpecialViewVisible(!localProps.spectatorMode);
    onResize();
    resizeObserver.observe(chessboardElement);
    document.addEventListener("fullscreenchange", fullscreenHandler);
  });
  onCleanup(() => {
    resizeObserver.disconnect();
    document.removeEventListener("fullscreenchange", fullscreenHandler);
  });
  return (
    <div
      class={`gi-tcg-chessboard-new reset touch-none all:touch-none bg-#443322 relative ${
        localProps.class ?? ""
      }`}
      ref={containerElement}
      bool:data-has-opp-chessboard={!!localProps.opp}
      {...elProps}
    >
      <TransformWrapper
        class="absolute left-0 grid place-items-center children:grid-area-[1/1]"
        autoHeight={localProps.autoHeight}
        rotation={localProps.rotation}
        hasOppChessboard={!!localProps.opp}
        isFullscreen={isFullscreen()}
        setTransformScale={setTransformScale}
      >
        <ChessboardBackground color={localProps.chessboardColor} />
        {/* 3d space */}
        <div
          class="relative h-full w-full preserve-3d select-none z-1"
          ref={chessboardElement}
          onClick={onChessboardClick}
          style={{
            perspective: `${PERSPECTIVE / 4}rem`,
          }}
        >
          <KeyWithAnimation
            each={children().characters}
            updateWhen={updateChildrenSignal()}
          >
            {(character) => (
              <CharacterArea
                {...character()}
                selecting={isSelectingItem(character().id)}
                hidden={hasSpecialView() && specialViewVisible()}
                onClick={(e, t) => onCharacterAreaClick(e, t, character())}
              />
            )}
          </KeyWithAnimation>
          <KeyWithAnimation
            each={children().cards}
            updateWhen={updateChildrenSignal()}
          >
            {(card) => (
              <Card
                {...card()}
                selected={
                  isSelectingItem(card().id) && card().kind !== "dragging"
                }
                toBeSwitched={
                  card().kind === "switching" &&
                  switchedCards().includes(card().id)
                }
                hidden={
                  // 存在特殊视图时：视图可见时只显示正在切换的手牌，反之只显示其他行动牌
                  hasSpecialView()
                    ? (card().kind === "switching") !== specialViewVisible()
                    : false
                }
                realCost={localProps.actionState?.realCosts.cards.get(
                  card().id,
                )}
                onClick={(e, t) => onCardClick(e, t, card())}
                onPointerEnter={(e, t) => onCardPointerEnter(e, t, card())}
                onPointerLeave={(e, t) => onCardPointerLeave(e, t, card())}
                onPointerDown={(e, t) => onCardPointerDown(e, t, card())}
                onPointerMove={(e, t) => onCardPointerMove(e, t, card())}
                onPointerUp={(e, t) => onCardPointerUp(e, t, card())}
              />
            )}
          </KeyWithAnimation>
          <KeyWithAnimation
            each={children().entities}
            updateWhen={updateChildrenSignal()}
          >
            {(entity) => (
              <Entity
                {...entity()}
                selecting={isSelectingItem(entity().id)}
                hidden={hasSpecialView() && specialViewVisible()}
                onClick={(e, t) => onEntityClick(e, t, entity())}
              />
            )}
          </KeyWithAnimation>
          <Key each={children().cardCountHints} by="area">
            {(hint) => (
              <CardCountHint
                {...hint()}
                shown={
                  isShowCardHint[hint().area] !== null &&
                  !(hasSpecialView() && specialViewVisible())
                }
              />
            )}
          </Key>
          <ChessboardBackdrop
            shown={
              localProps.actionState?.showBackdrop ||
              (hasSpecialView() && specialViewVisible())
            }
            onClick={onChessboardClick}
          />
          <Show when={children().tuningArea}>
            {(tuningArea) => <TuningArea {...tuningArea()} />}
          </Show>
        </div>
        {/* 下层 UI 组件 */}
        <AspectRatioContainer class="grid children:grid-area-[1/1] isolate z-2">
          <ActionHintText
            class="place-self-center"
            text={localProps.actionState?.hintText}
          />
          <Show when={displayUiComponents()}>
            <DeclareEndMarker
              class={"self-center declare-end-marker"}
              {...declareEndMarkerProps()}
            />
            <PlayerInfoBox
              opp
              class="self-start"
              {...playerInfoPropsOf(flip(localProps.who))}
              {...localProps.oppPlayerInfo}
            />
            <PlayerInfoBox
              class="self-end"
              {...playerInfoPropsOf(localProps.who)}
              {...localProps.myPlayerInfo}
            />
            <DicePanel
              dice={myDice()}
              selectedDice={selectedDice()}
              maxSelectedCount={
                localProps.actionState?.maxSelectedDiceCount ?? null
              }
              disabledDiceTypes={
                localProps.actionState?.disabledDiceTypes ?? []
              }
              onSelectDice={setSelectedDice}
              state={dicePanelState()}
              onStateChange={setDicePanelState}
              spectatorMode={localProps.spectatorMode}
            />
            <SkillButtonGroup
              class="place-self-end mb-2 mr-6 z-2"
              skills={mySkills()}
              switchActiveButton={switchActiveStep() ?? null}
              switchActiveCost={
                localProps.actionState?.realCosts.switchActive ?? null
              }
              onClick={onSkillClick}
              shown={showSkillButtons()}
            />
            <Show when={localProps.opp}>
              <DiceBar
                class="self-start justify-self-end mt-34 mr-5 z-1"
                opp
                dice={oppDice()}
                selectedDice={[]}
                // 对方骰子面板的显示状态同样受我方状态控制
                state={dicePanelState()}
                spectatorMode={localProps.spectatorMode}
              />
              <SkillButtonGroup
                class="self-start justify-self-end mt-12 mr-6 z-2"
                skills={oppSkills()}
                switchActiveButton={null}
                switchActiveCost={null}
                shown={showOppSkillButtons()}
                onClick={onOppSkillClick}
              />
            </Show>
          </Show>
          <Show when={localProps.actionState?.showBackdrop}>
            <BottomHint {...localProps.actionState!} />
          </Show>
          <ConfirmButton
            class="place-self-center mt-95"
            step={showConfirmButton()}
            onClick={(step) => {
              localProps.onStepActionState?.(step, selectedDiceValue());
            }}
          />
          <RoundAndPhaseNotification
            who={localProps.who}
            roundNumber={localProps.data.state.roundNumber}
            currentTurn={localProps.data.state.currentTurn as 0 | 1}
            class="place-self-center"
            info={localProps.data.roundAndPhase}
          />
          <Show when={localProps.data.notificationBox} keyed>
            {(data) => (
              <NotificationBox opp={data.who !== localProps.who} data={data} />
            )}
          </Show>
          <Show when={localProps.data.playingCard} keyed>
            {(data) => (
              <PlayingCard opp={data.who !== localProps.who} {...data} />
            )}
          </Show>
        </AspectRatioContainer>
        {/* SpecialViews */}
        <Show
          when={props.viewType === "selectCard" && !localProps.spectatorMode}
        >
          <SelectCardView
            shown={specialViewVisible()}
            candidateIds={localProps.selectCardCandidates}
            onClickCard={(id) => {
              setSelectingItem({ type: "externalCard", info: id });
            }}
            onConfirm={(id) => {
              localProps.onSelectCard?.(id);
              setSelectingItem(null);
            }}
          />
        </Show>
        <Show
          when={props.viewType === "switchHands" && !localProps.spectatorMode}
        >
          <SwitchHandsView
            shown={specialViewVisible()}
            onConfirm={() => {
              const cards = switchedCards();
              setSwitchedCards([]);
              localProps.onSwitchHands?.(cards);
              setSelectingItem(null);
            }}
          />
        </Show>
        <Show
          when={
            (props.viewType === "rerollDice" ||
              props.viewType === "rerollDiceEnd") &&
            !localProps.spectatorMode
          }
        >
          <RerollDiceView
            shown={specialViewVisible()}
            noConfirmButton={props.viewType === "rerollDiceEnd"}
            dice={myDice()}
            selectedDice={selectedDice()}
            onSelectDice={setSelectedDice}
            onConfirm={() => {
              const dice = selectedDiceValue() as PbDiceType[];
              setSelectedDice([]);
              localProps.onRerollDice?.(dice);
            }}
          />
        </Show>
        {/* 上层 UI 组件 */}
        <Show when={showHistory()}>
          <HistoryPanel
            who={localProps.who}
            history={localProps.history}
            onBackdropClick={() => setShowHistory(false)}
          />
        </Show>
        <AspectRatioContainer class="z-6 grid children:grid-area-[1/1] isolate">
          <Show
            when={localProps.opp && !(hasSpecialView() && specialViewVisible())}
          >
            <MiniSpecialViewGroup
              who={localProps.who}
              myViewType={localProps.viewType}
              oppViewType={localProps.opp?.viewType ?? "normal"}
              players={localProps.data.state.player}
              mySelectCardCandidates={localProps.selectCardCandidates}
              oppSelectCardCandidates={
                localProps.opp?.selectCardCandidates ?? []
              }
              isSelectingItem={isExternalSelectingItem}
              onCardClick={onMiniViewCardClick}
              onBackDropClick={onChessboardClick}
              showMyView={hasSpecialView()}
              showOppView={hasOppSpecialView()}
            />
          </Show>
          <div class="mx-2 my-13 pointer-events-none contain-strict touch-pan card-data-viewer">
            <CardDataViewer />
          </div>
          {/* 右上角部件 */}
          <div class="justify-self-end h-8 m-2 flex flex-row-reverse gap-1.5 items-center">
            <Show when={localProps.data.state.phase !== PbPhaseType.GAME_END}>
              <ExitButton onClick={onExit} />
            </Show>
            <FullScreenToggleButton
              isFullScreen={isFullscreen()}
              onClick={toggleFullscreen}
            />
            <HistoryToggleButton onClick={() => setShowHistory((v) => !v)} />
            <Show when={hasSpecialView() && !localProps.spectatorMode}>
              <SpecialViewToggleButton
                onClick={() => setSpecialViewVisible((v) => !v)}
              />
            </Show>
            <Show when={localProps.spectatorMode}>
              <div class="h-6 min-w-20 px-3 rounded-full text-3.5 text-center line-height-6 font-bold bg-#e9e2d3/70 text-black/70 pointer-events-none select-none">
                {t("ui.spectatorMode")}
              </div>
            </Show>
            <CurrentTurnHint
              phase={localProps.data.state.phase}
              opp={localProps.data.state.currentTurn !== localProps.who}
            />
            <TimerCapsule timer={timer()} />
          </div>
        </AspectRatioContainer>
        <TimerAlert timer={timer()} />
        <Alert />
        <MessageBox />
        {/* game end */}
        <Show when={localProps.data.state.phase === PbPhaseType.GAME_END}>
          <div class="w-full h-full bg-black/85 flex items-center justify-center flex-col z-10">
            <div class="font-bold text-4xl text-white/70 my-10 select-none">
              {localProps.data.state.winner === localProps.who
                ? t("ui.gameVictory")
                : t("ui.gameDefeat")}
            </div>
            {localProps.gameEndExtra}
          </div>
        </Show>
      </TransformWrapper>
    </div>
  );
}
