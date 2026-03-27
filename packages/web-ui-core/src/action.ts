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

import {
  ActionValidity,
  Aura,
  DamageType,
  DiceType,
  ElementalTuningAction,
  PbEntityArea,
  PbEntityState,
  PbHealKind,
  PbModifyDirection,
  PbReactionType,
  PlayCardAction,
  Reaction,
  UseSkillAction,
  type Action,
  type PbDiceRequirement,
  type PbDiceType,
  type PreviewData,
  type SwitchActiveAction,
} from "@gi-tcg/typings";
import type { JSX } from "solid-js";
import type { DicePanelState } from "./components/DicePanel";
import { DICE_COLOR } from "./components/Dice";
import { checkDice } from "@gi-tcg/utils";
import type { SkillRawData, ActionCardRawData } from "@gi-tcg/assets-manager";
import type { AssetsManager } from "@gi-tcg/assets-manager";
import type { ReactionInfo } from "./components/Chessboard";
import type { Translator } from "./locales";

function getDiceText(type: DiceType, t: Translator) {
  switch (type) {
    case DiceType.Cryo:
      return t("action.Cryo");
    case DiceType.Hydro:
      return t("action.Hydro");
    case DiceType.Pyro:
      return t("action.Pyro");
    case DiceType.Electro:
      return t("action.Electro");
    case DiceType.Anemo:
      return t("action.Anemo");
    case DiceType.Geo:
      return t("action.Geo");
    case DiceType.Dendro:
      return t("action.Dendro");
    case DiceType.Omni:
      return t("action.Omni");
    case DiceType.Aligned:
      return t("action.Aligned");
    case DiceType.Void:
      return t("action.Void");
    default:
      return t("action.Elemental");
  }
}

export function getHintTextOfCardOrSkill(
  assetsManager: AssetsManager,
  definitionId: number,
  targetLength: number,
  t: Translator,
): string[] {
  try {
    const data = assetsManager.getDataSync(definitionId) as
      | SkillRawData
      | ActionCardRawData;
    if (data.type === "GCG_CARD_ASSIST") {
      return Array.from({ length: 2 }, () =>
        t("action.chooseSupportToDispose"),
      );
    }
    const result = data.targetList.map((x) => x.hintText);
    result.push(result.at(-1)!);
    return result;
  } catch (e) {
    return Array.from({ length: targetLength }, () =>
      t("action.applyToTarget"),
    );
  }
}

export interface PlayCardActionStep {
  readonly type: "playCard";
  readonly cardId: number;
  readonly playable: boolean;
  readonly isEffectless: boolean;
}
export interface ElementalTuningActionStep {
  readonly type: "elementalTuning";
  readonly cardId: number;
}

export enum ActionStepEntityUi {
  None = 0,
  Visible = 1,
  Outlined = 2,
  Selected = 3,
}

export interface ClickEntityActionStep {
  readonly type: "clickEntity";
  readonly entityId: number | "myActiveCharacter";
  readonly ui: ActionStepEntityUi;
}
export interface ClickSkillButtonActionStep {
  readonly type: "clickSkillButton";
  readonly skillId: number;
  readonly tooltipText?: string;
  readonly isDisabled: boolean;
  readonly isFocused: boolean;
}
export interface ClickSwitchActiveButtonActionStep {
  readonly type: "clickSwitchActiveButton";
  readonly targetCharacterId: number | null;
  readonly tooltipText?: string;
  readonly isDisabled: boolean;
  readonly isFocused: boolean;
}
export interface ClickDeclareEndActionStep {
  readonly type: "declareEnd";
}
export interface ClickConfirmButtonActionStep {
  readonly type: "clickConfirmButton";
  readonly confirmText: string;
  readonly isEffectless?: boolean;
}

export const CANCEL_ACTION_STEP = {
  type: "cancel",
} as const;

export type ActionStep =
  | PlayCardActionStep
  | ElementalTuningActionStep
  | ClickEntityActionStep
  | ClickSkillButtonActionStep
  | ClickSwitchActiveButtonActionStep
  | ClickDeclareEndActionStep
  | ClickConfirmButtonActionStep
  | typeof CANCEL_ACTION_STEP;

export type StepActionResult =
  | {
      type: "actionCommitted";
      chosenActionIndex: number;
      usedDice: PbDiceType[];
    }
  | {
      type: "chooseActiveCommitted";
      activeCharacterId: number;
    }
  | {
      type: "newState";
      newState: ActionState;
    };

type StepActionFunction = (
  step: ActionStep,
  selectedDice: DiceType[],
) => StepActionResult;

export interface RealCosts {
  cards: Map<number, PbDiceRequirement[]>;
  skills: Map<number, PbDiceRequirement[]>;
  switchActive: Map<number, PbDiceRequirement[]>;
}

export interface PreviewingCharacterInfo {
  newHealth: number | null;
  /** 超杀时可能出现的“负数”血量 */
  negativeHealth: number | null;
  newHealthDirection: PbModifyDirection;
  newEnergy: number | null;
  reactions: ReactionInfo[];
  newAura: number | null;
  newDefinitionId: number | null;
  defeated: boolean;
  revived: boolean;
  active: boolean;
}

export interface PreviewingEntityInfo {
  newVariableValue: number | null;
  newVariableDirection: PbModifyDirection;
  newDefinitionId: number | null;
  disposed: boolean;
}

export interface ParsedPreviewData {
  characters: Map<number, PreviewingCharacterInfo>;
  entities: Map<number, PreviewingEntityInfo>;
  newEntities: Map<`${"summon" | "support"}${0 | 1}`, PbEntityState[]>;
}

export const NO_PREVIEW: ParsedPreviewData = {
  characters: new Map(),
  entities: new Map(),
  newEntities: new Map(),
};

function parsePreviewData(previewData: PreviewData[]): ParsedPreviewData {
  const result: ParsedPreviewData = {
    characters: new Map(),
    entities: new Map(),
    newEntities: new Map(),
  };
  const getPreviewingCharacter = (id: number): PreviewingCharacterInfo => {
    let info = result.characters.get(id);
    if (info) {
      return info;
    }
    info = {
      newHealth: null,
      negativeHealth: null,
      newHealthDirection: PbModifyDirection.UNSPECIFIED,
      newEnergy: null,
      reactions: [],
      newAura: null,
      newDefinitionId: null,
      defeated: false,
      revived: false,
      active: false,
    };
    result.characters.set(id, info);
    return info;
  };
  const getPreviewingEntity = (id: number): PreviewingEntityInfo => {
    let info = result.entities.get(id);
    if (info) {
      return info;
    }
    info = {
      newVariableValue: null,
      newVariableDirection: PbModifyDirection.UNSPECIFIED,
      newDefinitionId: null,
      disposed: false,
    };
    result.entities.set(id, info);
    return info;
  };

  for (const data of previewData) {
    const { $case, value } = data.mutation!;
    outer: switch ($case) {
      case "createEntity": {
        let where: "support" | "summon";
        const who = value.who as 0 | 1;
        switch (value.where) {
          case PbEntityArea.SUMMON:
            where = "summon";
            break;
          case PbEntityArea.SUPPORT:
            where = "support";
            break;
          default:
            break outer;
        }
        const key = `${where}${who}` as const;
        if (!result.newEntities.has(key)) {
          result.newEntities.set(key, []);
        }
        result.newEntities.get(key)!.push(value.entity!);
        break;
      }
      case "modifyEntityVar": {
        switch (value.variableName) {
          case "health": {
            const info = getPreviewingCharacter(value.entityId);
            info.newHealth = value.variableValue;
            info.newHealthDirection = value.direction;
            break;
          }
          case "aura": {
            const info = getPreviewingCharacter(value.entityId);
            info.newAura = value.variableValue;
            break;
          }
          case "energy": {
            const info = getPreviewingCharacter(value.entityId);
            info.newEnergy = value.variableValue;
            break;
          }
          case "alive": {
            if (!value.variableValue) {
              const info = getPreviewingCharacter(value.entityId);
              info.defeated = true;
            }
            break;
          }
          default: {
            const info = getPreviewingEntity(value.entityId);
            info.newVariableValue = value.variableValue;
            info.newVariableDirection = value.direction;
            break;
          }
        }
        break;
      }
      case "damage": {
        if (
          value.healKind === PbHealKind.IMMUNE_DEFEATED ||
          value.healKind === PbHealKind.REVIVE
        ) {
          const info = getPreviewingCharacter(value.targetId);
          info.revived = true;
          info.negativeHealth = null;
        } else if (value.causeDefeated) {
          const info = getPreviewingCharacter(value.targetId);
          info.negativeHealth = value.oldHealth - value.value;
        }
        // fallthrough
      }
      case "applyAura": {
        if (value.reactionType !== PbReactionType.UNSPECIFIED) {
          const info = getPreviewingCharacter(value.targetId);
          const incoming =
            "damageType" in value ? value.damageType : value.elementType;
          info.reactions.push({
            type: "reaction",
            reactionType: value.reactionType as Reaction,
            base: value.oldAura as Aura,
            incoming: incoming as DamageType,
            targetId: value.targetId,
            delay: 0,
          });
        }
        break;
      }
      case "removeEntity": {
        const info = getPreviewingEntity(value.entity!.id);
        info.disposed = true;
        break;
      }
      case "switchActive": {
        const info = getPreviewingCharacter(value.characterId);
        info.active = true;
        break;
      }
      case "transformDefinition": {
        const info = getPreviewingEntity(value.entityId);
        info.newDefinitionId = value.newEntityDefinitionId;
        const info2 = getPreviewingCharacter(value.entityId);
        info2.newDefinitionId = value.newEntityDefinitionId;
        break;
      }
    }
  }
  return result;
}

export interface ActionState {
  /** 可供前进（点击）的 steps */
  availableSteps: ActionStep[];
  /** 保存所有的费用信息 */
  realCosts: RealCosts;
  /** 是否显示手牌（只有根节点和外层切人显示；点击手牌视为 cancel） */
  showHands: boolean;
  /** 是否显示技能按钮（打出手牌/调和时不显示） */
  showSkillButtons: boolean;
  /** 提示文本 */
  hintText?: string;
  /** 是否快速行动 */
  isFast: boolean;
  /** 进入此状态会出现报错 */
  alertText?: string;
  /** 骰子面板的状态（不显示、默认收起或默认展开） */
  dicePanel: DicePanelState;
  /** 骰子面板不可选中的骰子类型 */
  disabledDiceTypes?: DiceType[];
  /** 进入此状态时自动选中的骰子 */
  autoSelectedDice: DiceType[] | null;
  /** 限制骰子最多选中个数 */
  maxSelectedDiceCount: number | null;
  /** 是否显示背板遮罩 */
  showBackdrop: boolean;
  /** 解析后的预览信息 */
  previewData: ParsedPreviewData;
  /** 当 step 触发后，步进到下一状态/提交行动 */
  step: StepActionFunction;
}

const validityText = (
  validity: ActionValidity,
  t: Translator,
): string | undefined => {
  switch (validity) {
    case ActionValidity.CONDITION_NOT_MET:
      return t("action.conditionNotMet");
    case ActionValidity.NO_TARGET:
      return t("action.noTarget");
    case ActionValidity.DISABLED:
      return t("action.disabled");
    case ActionValidity.NO_DICE:
      return t("action.noDice");
    case ActionValidity.NO_ENERGY:
      return t("action.noEnergy");
  }
};

type ActionTreeNode<ActionT> =
  | {
      type: "branch";
      children: Map<number, ActionTreeNode<ActionT>>;
    }
  | {
      type: "leaf";
      value: ActionTreeLeafValue<ActionT>;
    };

type ActionTreeLeafValue<T> = {
  action: Action & { value: T };
  index: number;
};

function appendMultiStepNode<T>(
  rootNode: ActionTreeNode<T>,
  keys: number[],
  value: ActionTreeLeafValue<T>,
) {
  // create (keys.length - 1) branch nodes if needed, then add a final leaf node.
  let current = rootNode;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current.type === "leaf") {
      throw new Error("Unexpected leaf node");
    }
    if (!current.children.has(keys[i])) {
      current.children.set(keys[i], { type: "branch", children: new Map() });
    }
    current = current.children.get(keys[i])!;
  }
  if (current.type === "leaf") {
    throw new Error("Unexpected leaf node");
  }
  current.children.set(keys[keys.length - 1], { type: "leaf", value });
}

/** 创建多步状态树时需使用到的上下文 */
interface MultiStepRootNodeContext<T> {
  assetsManager: AssetsManager;
  t: Translator;
  /** 是否是使用技能（否则为打出卡牌） */
  isSkill: boolean;
  /** 行动树根节点 */
  node: ActionTreeNode<T>;
  /** 是否是无效行动 */
  isEffectless: boolean;
  /** 进行此行动自动选择的骰子 */
  autoSelectedDice: DiceType[];
  /** 用于提供 hintText 的定义 id */
  cardOrSkillDefinitionId: number;
}

interface CreatePlayCardActionStateContext {
  assetsManager: AssetsManager;
  t: Translator;
  // 单步打出（直接打出或者直接选骰）对应的 step 行为加入此 map
  cardSingleSteps: Map<PlayCardActionStep, () => StepActionResult>;
  // 多步打出对应的 context 加入此 map，后续构建成状态树
  cardMultiSteps: Map<number, MultiStepRootNodeContext<PlayCardAction>>;
  action: Action & { value: PlayCardAction };
  index: number;
}

function diceReqText(
  diceReq: Map<DiceType, number>,
  ctx: { assetsManager: AssetsManager; t: Translator },
) {
  if ([...diceReq].reduce((acc, [k, v]) => acc + v, 0) === 0) {
    return ctx.t("action.payCostNoDice");
  }
  const diceText = Array.from(diceReq.entries()).map(([type, count]) => {
    const typeText =
      type === DiceType.Aligned && count === 1
        ? ctx.t("action.Elemental")
        : getDiceText(type, ctx.t);
    const color =
      type >= 1 && type <= 7 ? `color="var(--c-${DICE_COLOR[type]})"` : "";
    return ctx.t("action.payCostSingle", {
      count,
      diceType: `<font ${color}>${typeText}</font>`,
    });
  });
  return ctx.t("action.payCost", {
    cost: diceText.join(ctx.t("action.payCostAndSeparator")),
  });
}

function createPlayCardActionState(
  root: ActionState,
  ctx: CreatePlayCardActionStateContext,
) {
  const id = ctx.action.value.cardId;
  const ok = ctx.action.validity === ActionValidity.VALID;
  const ENTER_STEP: PlayCardActionStep = {
    type: "playCard",
    cardId: id,
    playable: ok,
    isEffectless: ctx.action.value.willBeEffectless,
  };
  if (!ok) {
    ctx.cardSingleSteps.set(ENTER_STEP, () => ({
      type: "newState",
      newState: {
        ...root,
        alertText: validityText(ctx.action.validity, ctx.t),
      },
    }));
    return;
  }
  const targetLength = ctx.action.value.targetIds.length;
  if (targetLength > 0) {
    if (!ctx.cardMultiSteps.has(id)) {
      ctx.cardMultiSteps.set(id, {
        assetsManager: ctx.assetsManager,
        t: ctx.t,
        isSkill: false,
        node: { type: "branch", children: new Map() },
        autoSelectedDice: ctx.action.autoSelectedDice as DiceType[],
        cardOrSkillDefinitionId: ctx.action.value.cardDefinitionId,
        isEffectless: ctx.action.value.willBeEffectless,
      });
    }
    appendMultiStepNode(
      ctx.cardMultiSteps.get(id)!.node,
      ctx.action.value.targetIds,
      ctx,
    );
    return;
  }
  const previewData = parsePreviewData(ctx.action.preview);
  if (
    ctx.action.autoSelectedDice.length === 0 &&
    previewData.characters.size === 0 &&
    !ctx.action.value.willBeEffectless
  ) {
    // 无费无预览时，直接提交
    ctx.cardSingleSteps.set(ENTER_STEP, () => ({
      type: "actionCommitted",
      chosenActionIndex: ctx.index,
      usedDice: [],
    }));
    return;
  }
  const CONFIRM_BUTTON_STEP: ClickConfirmButtonActionStep = {
    type: "clickConfirmButton",
    confirmText: ctx.t("action.confirmButtonDefault"),
    isEffectless: ctx.action.value.willBeEffectless,
  };
  const resultState: ActionState = {
    availableSteps: [
      CANCEL_ACTION_STEP,
      ENTER_STEP, // 仅为动画连贯而设计（实际上点不到）
      CONFIRM_BUTTON_STEP,
    ],
    realCosts: root.realCosts,
    showHands: false,
    showSkillButtons: false,
    hintText: ctx.t("action.playCardHint", {
      name:
        ctx.assetsManager.getNameSync(ctx.action.value.cardDefinitionId) ??
        "???",
    }),
    isFast: ctx.action.isFast,
    dicePanel: ctx.action.autoSelectedDice.length > 0 ? "visible" : "hidden",
    autoSelectedDice: ctx.action.autoSelectedDice as DiceType[],
    maxSelectedDiceCount: ctx.action.autoSelectedDice.length,
    showBackdrop: true,
    previewData,
    step: (step, dice) => {
      if (step === CANCEL_ACTION_STEP) {
        return { type: "newState", newState: root };
      } else if (step === CONFIRM_BUTTON_STEP) {
        const diceReq = new Map(
          root.realCosts.cards
            .get(id)!
            .map(({ type, count }) => [type as DiceType, count]),
        );
        if (checkDice(diceReq, dice)) {
          return {
            type: "actionCommitted",
            chosenActionIndex: ctx.index,
            usedDice: dice as PbDiceType[],
          };
        } else {
          return {
            type: "newState",
            newState: {
              ...resultState,
              autoSelectedDice: null,
              alertText: diceReqText(diceReq, ctx),
            },
          };
        }
      } else if (step === ENTER_STEP) {
        return {
          type: "newState",
          newState: {
            ...resultState,
            autoSelectedDice: null,
          },
        };
      } else {
        console.error(step);
        throw new Error("Unexpected step");
      }
    },
  };
  ctx.cardSingleSteps.set(ENTER_STEP, () => ({
    type: "newState",
    newState: resultState,
  }));
}

/**
 * 为带目标选择的打出卡牌或使用技能创建状态树
 */
function createMultiStepState<T>(
  root: ActionState,
  id: number,
  { isSkill, ...ctx }: MultiStepRootNodeContext<T>,
): readonly [ActionStep, ActionState, ActionState[]] {
  const allStates: ActionState[] = [];
  // 起点操作
  const enterStep: ActionStep = isSkill
    ? {
        type: "clickSkillButton",
        isDisabled: false,
        isFocused: false,
        skillId: id,
      }
    : {
        type: "playCard",
        cardId: id,
        playable: true,
        isEffectless: ctx.isEffectless,
      };
  // 在多步选择内部，按下起点的行为
  const innerEnterStep = isSkill
    ? {
        ...enterStep,
        isFocused: true,
      }
    : enterStep;
  const createState = (
    id: number,
    node: ActionTreeNode<T>,
    hintTexts: string[],
    parentNode?: ActionState,
  ): ActionState => {
    if (node.type === "leaf") {
      const CLICK_CONFIRM_STEP: ClickConfirmButtonActionStep = {
        type: "clickConfirmButton",
        confirmText: isSkill
          ? ctx.t("action.confirmButtonDefault")
          : ctx.t("action.confirmButtonPlayCard"),
        isEffectless: ctx.isEffectless,
      };
      const CLICK_ENTITY_STEP: ClickEntityActionStep = {
        type: "clickEntity",
        entityId: id,
        ui: ActionStepEntityUi.Selected,
      };
      const resultState: ActionState = {
        availableSteps: [
          CANCEL_ACTION_STEP,
          innerEnterStep,
          CLICK_ENTITY_STEP,
          CLICK_CONFIRM_STEP,
        ],
        realCosts: root.realCosts,
        showHands: false,
        showSkillButtons: isSkill,
        hintText: hintTexts[0],
        isFast: node.value.action.isFast,
        dicePanel:
          node.value.action.autoSelectedDice.length > 0 ? "visible" : "wrapped",
        autoSelectedDice: null,
        maxSelectedDiceCount: null,
        showBackdrop: true,
        previewData: parsePreviewData(node.value.action.preview),
        step: (step, dice) => {
          if (step === CANCEL_ACTION_STEP) {
            return { type: "newState", newState: root };
          } else if (
            step === CLICK_CONFIRM_STEP ||
            step === CLICK_ENTITY_STEP ||
            (isSkill && step === innerEnterStep)
          ) {
            const diceReq = new Map(
              node.value.action.requiredCost.map(({ type, count }) => [
                type as DiceType,
                count,
              ]),
            );
            if (checkDice(diceReq, dice)) {
              return {
                type: "actionCommitted",
                chosenActionIndex: node.value.index,
                usedDice: dice as PbDiceType[],
              };
            } else {
              return {
                type: "newState",
                newState: {
                  ...resultState,
                  alertText: diceReqText(diceReq, ctx),
                },
              };
            }
          } else if (step === innerEnterStep) {
            return {
              type: "newState",
              newState: {
                ...resultState,
                alertText: ctx.t("action.chooseTarget"),
              },
            };
          } else {
            return parentNode!.step(step, dice);
          }
        },
      };
      allStates.push(resultState);
      return resultState;
    } else {
      const childrenStates = new Map<ClickEntityActionStep, ActionState>();
      const autoSelectedDice = parentNode ? null : ctx.autoSelectedDice;
      const resultState: ActionState = {
        availableSteps: [CANCEL_ACTION_STEP, innerEnterStep],
        realCosts: root.realCosts,
        showHands: false,
        showSkillButtons: isSkill,
        hintText: hintTexts[0],
        isFast: false,
        dicePanel: isSkill ? "wrapped" : "hidden",
        autoSelectedDice,
        maxSelectedDiceCount: autoSelectedDice?.length ?? null,
        showBackdrop: true,
        previewData: NO_PREVIEW,
        step: (step, dice) => {
          if (step === CANCEL_ACTION_STEP) {
            return { type: "newState", newState: root };
          } else if (step.type === "clickEntity") {
            return {
              type: "newState",
              newState: childrenStates.get(step)!,
            };
          } else if (step === innerEnterStep) {
            return {
              type: "newState",
              newState: {
                ...resultState,
                alertText: ctx.t("action.chooseTarget"),
              },
            };
          } else {
            return root.step(step, dice);
          }
        },
      };

      let isLastLevelBranch = false;
      for (const [key, value] of node.children) {
        if (value.type === "leaf") {
          isLastLevelBranch = true;
        }
        const step: ClickEntityActionStep = {
          type: "clickEntity",
          entityId: key,
          ui: ActionStepEntityUi.Outlined,
        };
        childrenStates.set(
          step,
          createState(key, value, hintTexts.slice(1), resultState),
        );
        resultState.availableSteps.push(step);
      }
      if (isLastLevelBranch) {
        for (const [key, state] of childrenStates) {
          state.availableSteps.push(
            ...childrenStates.keys().filter((k) => k !== key),
          );
        }
        if (childrenStates.size === 1) {
          // 最后一层分支如果只有一个选项，直接自动选中
          return {
            ...childrenStates.values().next().value!,
            autoSelectedDice,
          };
        }
      }
      allStates.push(resultState);
      return resultState;
    }
  };
  const hintTexts = getHintTextOfCardOrSkill(
    ctx.assetsManager,
    ctx.cardOrSkillDefinitionId,
    3,
    ctx.t,
  );
  const state = createState(id, ctx.node, hintTexts);
  allStates.push(state);
  return [enterStep, state, allStates];
}

interface CreateUseSkillActionStateContext {
  assetsManager: AssetsManager;
  t: Translator;
  skillSingleStepStates: Map<ClickSkillButtonActionStep, ActionState>;
  skillMultiSteps: Map<number, MultiStepRootNodeContext<UseSkillAction>>;
  action: Action & { value: UseSkillAction };
  index: number;
}

function createUseSkillActionState(
  root: ActionState,
  ctx: CreateUseSkillActionStateContext,
) {
  const id = ctx.action.value.skillDefinitionId;
  const ok = ctx.action.validity === ActionValidity.VALID;
  if (ctx.action.value.targetIds.length > 0) {
    if (!ctx.skillMultiSteps.has(id)) {
      ctx.skillMultiSteps.set(id, {
        assetsManager: ctx.assetsManager,
        t: ctx.t,
        isSkill: true,
        node: { type: "branch", children: new Map() },
        autoSelectedDice: ctx.action.autoSelectedDice as DiceType[],
        cardOrSkillDefinitionId: ctx.action.value.skillDefinitionId,
        isEffectless: false,
      });
    }
    appendMultiStepNode(
      ctx.skillMultiSteps.get(id)!.node,
      ctx.action.value.targetIds,
      ctx,
    );
    return;
  }
  const ENTER_STEP: ClickSkillButtonActionStep = {
    type: "clickSkillButton",
    skillId: id,
    tooltipText: validityText(ctx.action.validity, ctx.t),
    isDisabled: !ok,
    isFocused: false,
  };
  const CONFIRM_TARGET_STEP: ClickEntityActionStep = {
    type: "clickEntity",
    entityId: ctx.action.value.mainDamageTargetId ?? "myActiveCharacter",
    ui: ActionStepEntityUi.Selected,
  };
  const CONFIRM_BUTTON_STEP: ClickSkillButtonActionStep = {
    type: "clickSkillButton",
    skillId: id,
    isDisabled: !ok,
    isFocused: true,
  };
  const resultState: ActionState = {
    availableSteps: [
      CANCEL_ACTION_STEP,
      CONFIRM_TARGET_STEP,
      CONFIRM_BUTTON_STEP,
    ],
    realCosts: root.realCosts,
    showHands: false,
    showSkillButtons: true,
    dicePanel: ctx.action.autoSelectedDice.length > 0 ? "visible" : "wrapped",
    autoSelectedDice: ctx.action.autoSelectedDice as DiceType[],
    maxSelectedDiceCount: ctx.action.autoSelectedDice.length,
    showBackdrop: true,
    isFast: ctx.action.isFast,
    previewData: parsePreviewData(ctx.action.preview),
    step: (step, dice) => {
      if (step === CANCEL_ACTION_STEP) {
        return { type: "newState", newState: root };
      } else if (step === CONFIRM_TARGET_STEP || step === CONFIRM_BUTTON_STEP) {
        const diceReq = new Map(
          root.realCosts.skills
            .get(id)!
            .map(({ type, count }) => [type as DiceType, count]),
        );
        if (ok && checkDice(diceReq, dice)) {
          return {
            type: "actionCommitted",
            chosenActionIndex: ctx.index,
            usedDice: dice as PbDiceType[],
          };
        } else {
          return {
            type: "newState",
            newState: {
              ...resultState,
              autoSelectedDice: null,
              alertText:
                validityText(ctx.action.validity, ctx.t) ??
                diceReqText(diceReq, ctx),
            },
          };
        }
      } else {
        return root.step(step, dice);
      }
    },
  };
  ctx.skillSingleStepStates.set(ENTER_STEP, resultState);
}

interface CreateElementalTuningActionStateContext {
  assetsManager: AssetsManager;
  t: Translator;
  action: Action & { value: ElementalTuningAction };
  index: number;
}

function createElementalTuningActionState(
  root: ActionState,
  ctx: CreateElementalTuningActionStateContext,
): ActionState {
  const CONFIRM_BUTTON_ACTION: ClickConfirmButtonActionStep = {
    type: "clickConfirmButton",
    confirmText: ctx.t("action.confirmButtonElementalTuning"),
  };
  const targetDice = ctx.action.value.targetDice as DiceType;
  const disabledDiceTypes = [DiceType.Omni, targetDice];
  const resultState: ActionState = {
    availableSteps: [CANCEL_ACTION_STEP, CONFIRM_BUTTON_ACTION],
    realCosts: root.realCosts,
    showHands: false,
    showSkillButtons: false,
    hintText: ctx.t("action.tuneToDice", {
      diceType: getDiceText(targetDice, ctx.t),
    }),
    dicePanel: "visible",
    autoSelectedDice: ctx.action.autoSelectedDice as DiceType[],
    maxSelectedDiceCount: 1,
    disabledDiceTypes,
    showBackdrop: true,
    isFast: false,
    previewData: NO_PREVIEW,
    step: (step, dice) => {
      if (step === CANCEL_ACTION_STEP) {
        return { type: "newState", newState: root };
      } else if (step === CONFIRM_BUTTON_ACTION) {
        if (dice.length === 1 && !disabledDiceTypes.includes(dice[0])) {
          return {
            type: "actionCommitted",
            chosenActionIndex: ctx.index,
            usedDice: dice as PbDiceType[],
          };
        } else {
          return {
            type: "newState",
            newState: {
              ...resultState,
              alertText: ctx.t("action.chooseOneDiceToTune"),
            },
          };
        }
      } else {
        console.error(step);
        throw new Error("Unexpected step");
      }
    },
  };
  return resultState;
}

interface CreateSwitchActiveActionStateContext {
  assetsManager: AssetsManager;
  t: Translator;
  // 在根状态下，点击角色进入“显示切换出战按钮”的状态
  outerLevelStates: Map<ClickEntityActionStep, ActionState>;
  // 在“显示切换出战按钮”状态下，点击按钮/选中角色可提交行动；或点击其他角色切换目标
  innerLevelStates: Map<ClickEntityActionStep, ActionState>;
  action: Action & { value: SwitchActiveAction };
  index: number;
}

function createSwitchActiveActionState(
  root: ActionState,
  ctx: CreateSwitchActiveActionStateContext,
): void {
  const ok = ctx.action.validity === ActionValidity.VALID;
  const INNER_SWITCH_ACTIVE_BUTTON: ClickSwitchActiveButtonActionStep = {
    type: "clickSwitchActiveButton",
    targetCharacterId: ctx.action.value.characterId,
    isDisabled: !ok,
    isFocused: true,
  };
  const OUTER_SWITCH_ACTIVE_BUTTON: ClickSwitchActiveButtonActionStep = {
    type: "clickSwitchActiveButton",
    targetCharacterId: ctx.action.value.characterId,
    isDisabled: false,
    isFocused: false,
  };
  const OUTER_CHARACTER_CLICK_ACTION: ClickEntityActionStep = {
    type: "clickEntity",
    entityId: ctx.action.value.characterId,
    ui: ActionStepEntityUi.None,
  };
  const INNER_CHARACTER_CLICK_ACTION: ClickEntityActionStep = {
    type: "clickEntity",
    entityId: ctx.action.value.characterId,
    ui: ActionStepEntityUi.Outlined,
  };
  const CONFIRM_CLICK_ACTION: ClickEntityActionStep = {
    type: "clickEntity",
    entityId: ctx.action.value.characterId,
    ui: ActionStepEntityUi.Selected,
  };
  const innerState: ActionState = {
    availableSteps: [
      CANCEL_ACTION_STEP,
      INNER_SWITCH_ACTIVE_BUTTON,
      CONFIRM_CLICK_ACTION,
    ],
    realCosts: root.realCosts,
    showHands: false,
    showSkillButtons: true,
    hintText: ctx.t("action.switchRoleHint", {
      name:
        ctx.assetsManager.getNameSync(ctx.action.value.characterDefinitionId) ??
        "???",
    }),
    dicePanel: ctx.action.autoSelectedDice.length > 0 ? "visible" : "wrapped",
    autoSelectedDice: ctx.action.autoSelectedDice as DiceType[],
    maxSelectedDiceCount: ctx.action.autoSelectedDice.length,
    showBackdrop: true,
    isFast: ctx.action.isFast,
    previewData: parsePreviewData(ctx.action.preview),
    step: (step, dice) => {
      if (step === CANCEL_ACTION_STEP) {
        return { type: "newState", newState: root };
      } else if (
        step === INNER_SWITCH_ACTIVE_BUTTON ||
        step === CONFIRM_CLICK_ACTION
      ) {
        const realCost = root.realCosts.switchActive.get(
          ctx.action.value.characterId,
        )!;
        const diceReq = new Map(
          realCost.map(({ type, count }) => [type as DiceType, count]),
        );
        if (ok && checkDice(diceReq, dice)) {
          return {
            type: "actionCommitted",
            chosenActionIndex: ctx.index,
            usedDice: dice as PbDiceType[],
          };
        } else {
          return {
            type: "newState",
            newState: {
              ...innerState,
              autoSelectedDice: null,
              alertText:
                validityText(ctx.action.validity, ctx.t) ??
                diceReqText(diceReq, ctx),
            },
          };
        }
      } else if (step.type === "clickEntity") {
        return {
          type: "newState",
          newState: {
            ...ctx.innerLevelStates.get(step)!,
            autoSelectedDice: null,
          },
        };
      } else {
        console.error(step);
        throw new Error("Unexpected step");
      }
    },
  };
  const outerState: ActionState = {
    availableSteps: [CANCEL_ACTION_STEP, OUTER_SWITCH_ACTIVE_BUTTON],
    realCosts: root.realCosts,
    showHands: true,
    showSkillButtons: true,
    dicePanel: "hidden",
    autoSelectedDice: null,
    maxSelectedDiceCount: null,
    showBackdrop: false,
    isFast: false,
    previewData: NO_PREVIEW,
    step: (step) => {
      if (step === CANCEL_ACTION_STEP) {
        return { type: "newState", newState: root };
      } else if (step === OUTER_SWITCH_ACTIVE_BUTTON) {
        return {
          type: "newState",
          newState: innerState,
        };
      } else if (step.type === "clickEntity") {
        return {
          type: "newState",
          newState: ctx.outerLevelStates.get(step) ?? root,
        };
      } else {
        throw new Error("Unexpected step");
      }
    },
  };
  ctx.outerLevelStates.set(OUTER_CHARACTER_CLICK_ACTION, outerState);
  ctx.innerLevelStates.set(INNER_CHARACTER_CLICK_ACTION, innerState);
}

export function createActionState(
  assetsManager: AssetsManager,
  actions: Action[],
  t: Translator,
): ActionState {
  assetsManager.prepareForSync();
  const realCosts: RealCosts = {
    cards: new Map(),
    skills: new Map(),
    switchActive: new Map(),
  };
  const root: ActionState = {
    availableSteps: [],
    realCosts,
    previewData: NO_PREVIEW,
    dicePanel: "hidden",
    autoSelectedDice: null,
    maxSelectedDiceCount: null,
    showBackdrop: false,
    isFast: false,
    showHands: true,
    showSkillButtons: true,
    step: (step) => {
      return steps.get(step)!();
    },
  };
  const steps = new Map<ActionStep, () => StepActionResult>([
    [
      CANCEL_ACTION_STEP,
      () => ({
        type: "newState",
        newState: root,
      }),
    ],
  ]);
  const playCardSingleSteps = new Map<
    PlayCardActionStep,
    () => StepActionResult
  >();
  const playCardMultiSteps = new Map<
    number,
    MultiStepRootNodeContext<PlayCardAction>
  >();
  const useSkillSingleStepStates = new Map<
    ClickSkillButtonActionStep,
    ActionState
  >();
  const useSkillMultiSteps = new Map<
    number,
    MultiStepRootNodeContext<UseSkillAction>
  >();
  const switchActiveInnerStates = new Map<ClickEntityActionStep, ActionState>();
  const switchActiveOuterStates = new Map<ClickEntityActionStep, ActionState>();
  for (let i = 0; i < actions.length; i++) {
    const { action, requiredCost, validity } = actions[i];
    switch (action?.$case) {
      case "useSkill": {
        realCosts.skills.set(action.value.skillDefinitionId, requiredCost);
        createUseSkillActionState(root, {
          assetsManager,
          t,
          skillSingleStepStates: useSkillSingleStepStates,
          skillMultiSteps: useSkillMultiSteps,
          action: { value: action.value, ...actions[i] },
          index: i,
        });
        break;
      }
      case "playCard": {
        realCosts.cards.set(action.value.cardId, requiredCost);
        createPlayCardActionState(root, {
          assetsManager,
          t,
          cardSingleSteps: playCardSingleSteps,
          cardMultiSteps: playCardMultiSteps,
          action: { value: action.value, ...actions[i] },
          index: i,
        });
        break;
      }
      case "switchActive": {
        realCosts.switchActive.set(action.value.characterId, requiredCost);
        createSwitchActiveActionState(root, {
          assetsManager,
          t,
          outerLevelStates: switchActiveOuterStates,
          innerLevelStates: switchActiveInnerStates,
          action: { value: action.value, ...actions[i] },
          index: i,
        });
        break;
      }
      case "elementalTuning": {
        if (validity !== ActionValidity.VALID) {
          continue;
        }
        const step: ElementalTuningActionStep = {
          type: "elementalTuning",
          cardId: action.value.removedCardId,
        };
        const state = createElementalTuningActionState(root, {
          assetsManager,
          t,
          action: { value: action.value, ...actions[i] },
          index: i,
        });
        steps.set(step, () => ({ type: "newState", newState: state }));
        break;
      }
      case "declareEnd": {
        const DECLARE_END_STEP = {
          type: "declareEnd" as const,
        };
        steps.set(DECLARE_END_STEP, () => ({
          type: "actionCommitted",
          chosenActionIndex: i,
          usedDice: [],
        }));
        break;
      }
    }
  }

  // 打出手牌，多步
  for (const [id, node] of playCardMultiSteps) {
    const [step, state] = createMultiStepState(root, id, node);
    steps.set(step, () => ({ type: "newState", newState: state }));
  }
  // 打出手牌，单步
  for (const [step, stepResult] of playCardSingleSteps.entries()) {
    steps.set(step, stepResult);
  }

  // 使用技能，单步
  const allUseSkillSingleSteps = useSkillSingleStepStates.keys().toArray();
  for (const [step, state] of useSkillSingleStepStates.entries()) {
    state.availableSteps.push(
      ...allUseSkillSingleSteps.filter((k) => k !== step),
    );
    steps.set(step, () => ({ type: "newState", newState: state }));
  }
  // 使用技能，多步 & 多步->单步跳转
  const allUseSkillMultipleSteps: ActionStep[] = [];
  for (const [id, node] of useSkillMultiSteps) {
    const [step, state, allStates] = createMultiStepState(root, id, node);
    steps.set(step, () => ({ type: "newState", newState: state }));
    for (const state of allStates) {
      state.availableSteps.push(...allUseSkillSingleSteps);
    }
    allUseSkillMultipleSteps.push(step);
  }
  // 使用技能，单步->多步跳转
  for (const state of useSkillSingleStepStates.values()) {
    state.availableSteps.push(...allUseSkillMultipleSteps);
  }

  // 切人 & 外层跳转
  const ACTIVE_CHARACTER_CLICK: ClickEntityActionStep = {
    type: "clickEntity",
    entityId: "myActiveCharacter",
    ui: ActionStepEntityUi.None,
  };
  for (const [step, state] of switchActiveOuterStates.entries()) {
    state.availableSteps.push(...switchActiveOuterStates.keys());
    state.availableSteps.push(ACTIVE_CHARACTER_CLICK);
    steps.set(step, () => ({ type: "newState", newState: state }));
  }
  // 切人内层跳转
  for (const [step, state] of switchActiveInnerStates.entries()) {
    state.availableSteps.push(
      ...switchActiveInnerStates.keys().filter((k) => k !== step),
    );
  }

  root.availableSteps.push(...steps.keys());
  return root;
}

export function createChooseActiveState(
  candidateIds: number[],
  t: Translator,
): ActionState {
  const NO_COST: RealCosts = {
    cards: new Map(),
    skills: new Map(),
    switchActive: new Map(),
  };
  const CLICK_SWITCH_ACTIVE: ClickSwitchActiveButtonActionStep = {
    type: "clickSwitchActiveButton",
    targetCharacterId: null,
    isDisabled: false,
    isFocused: true,
  };
  const innerStates = new Map<ClickEntityActionStep, ActionState>();
  const root: ActionState = {
    availableSteps: [CANCEL_ACTION_STEP, CLICK_SWITCH_ACTIVE],
    realCosts: NO_COST,
    previewData: NO_PREVIEW,
    dicePanel: "hidden",
    autoSelectedDice: null,
    maxSelectedDiceCount: null,
    showBackdrop: false,
    showHands: true,
    showSkillButtons: true,
    hintText: t("action.chooseActiveCharacter"),
    isFast: false,
    step: (step) => {
      if (step === CANCEL_ACTION_STEP) {
        return { type: "newState", newState: root };
      } else if (step === CLICK_SWITCH_ACTIVE) {
        return {
          type: "newState",
          newState: {
            ...root,
            alertText: t("action.chooseActiveCharacter"),
          },
        };
      } else if (step.type === "clickEntity") {
        return {
          type: "newState",
          newState: innerStates.get(step)!,
        };
      } else {
        console.error(step);
        throw new Error("Unexpected step");
      }
    },
  };
  for (const id of candidateIds) {
    const ENTER_ENTITY_CLICK: ClickEntityActionStep = {
      type: "clickEntity",
      entityId: id,
      ui: ActionStepEntityUi.Outlined,
    };
    const CONFIRM_ENTITY_CLICK: ClickEntityActionStep = {
      type: "clickEntity",
      entityId: id,
      ui: ActionStepEntityUi.Selected,
    };
    const innerState: ActionState = {
      availableSteps: [
        CANCEL_ACTION_STEP,
        CLICK_SWITCH_ACTIVE,
        CONFIRM_ENTITY_CLICK,
      ],
      realCosts: NO_COST,
      previewData: NO_PREVIEW,
      dicePanel: "hidden",
      autoSelectedDice: null,
      maxSelectedDiceCount: null,
      showBackdrop: false,
      showHands: true,
      showSkillButtons: true,
      hintText: t("action.chooseActiveCharacter"),
      isFast: false,
      step: (step, dice) => {
        if (step === CANCEL_ACTION_STEP) {
          return { type: "newState", newState: innerState };
        } else if (
          step === CLICK_SWITCH_ACTIVE ||
          step === CONFIRM_ENTITY_CLICK
        ) {
          return {
            type: "chooseActiveCommitted",
            activeCharacterId: id,
          };
        } else if (step.type === "clickEntity") {
          return {
            type: "newState",
            newState: innerStates.get(step)!,
          };
        } else {
          return root.step(step, dice);
        }
      },
    };
    innerStates.set(ENTER_ENTITY_CLICK, innerState);
    root.availableSteps.push(ENTER_ENTITY_CLICK);
  }
  for (const [step, state] of innerStates.entries()) {
    state.availableSteps.push(...innerStates.keys().filter((k) => k !== step));
  }
  return root;
}
