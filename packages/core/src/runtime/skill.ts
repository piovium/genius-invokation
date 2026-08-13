// Copyright (C) 2024-2025 Guyutongxue
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

import { DamageType } from "@gi-tcg/typings";
import {
  type EventNames,
  type SkillInfo,
  type PlayCardInfo,
  type SwitchActiveInfo,
  type UseSkillInfo,
  type EventArgOf,
  ModifyAction0EventArg,
  ModifyAction1EventArg,
  ModifyAction2EventArg,
  ModifyAction3EventArg,
  type DamageInfo,
  type InitiativeSkillTargetGetter,
  type SkillInfoOfContextConstruction,
  ModifyHeal0EventArg,
  ModifyHeal1EventArg,
  UseSkillEventArg,
  DamageOrHealEventArg,
  ModifyAction4EventArg,
} from "../base/skill";
import type {
  AnyState,
  CharacterState,
  EntityState,
  GameState,
} from "../base/state";
import {
  type CallingAreaType,
  type ContextMetaBase,
  SkillContext,
  type TypedSkillContext,
} from "./skill_context";
import type { ExEntityType, ExtensionHandle, SkillHandle } from "../data/type";
import { type EntityArea } from "../base/entity";
import {
  getActiveCharacterIndex,
  getEntityArea,
  isCharacterInitiativeSkill,
  isSkillDisabled,
  normalizeCost,
} from "../utils";
import { GiTcgDataError } from "../error";
import type { ApplyReactive } from "./reactive";

export type InitiativeSkillTargetKind = readonly (
  "character" | "summon" | "support"
)[];

export type RwContextMeta = Omit<ContextMetaBase, "readonly">;
export type ReadonlyMetaOf<BM extends RwContextMeta> = {
  [K in keyof RwContextMeta]: BM[K];
} & { readonly: true };
export type WritableMetaOf<BM extends RwContextMeta> = {
  [K in keyof RwContextMeta]: BM[K];
} & { readonly: false };

export type SkillOperation<Meta extends RwContextMeta> = (
  c: TypedSkillContext<WritableMetaOf<Meta>>,
  e: ApplyReactive<
    WritableMetaOf<Meta>,
    Omit<Meta["eventArgType"], `_${string}`>
  >,
) => void;

export type SkillOperationFilter<Meta extends RwContextMeta> = (
  c: TypedSkillContext<ReadonlyMetaOf<Meta>>,
  e: ApplyReactive<
    ReadonlyMetaOf<Meta>,
    Omit<Meta["eventArgType"], `_${string}`>
  >,
) => unknown;

type SkillProjection<Projected, Meta extends RwContextMeta> = (
  c: TypedSkillContext<ReadonlyMetaOf<Meta>>,
  e: ApplyReactive<
    ReadonlyMetaOf<Meta>,
    Omit<Meta["eventArgType"], `_${string}`>
  >,
) => Projected;

type StateOf<TargetKindTs extends InitiativeSkillTargetKind> =
  TargetKindTs extends readonly [
    infer First extends ExEntityType,
    ...infer Rest extends InitiativeSkillTargetKind,
  ]
    ? readonly [
        First extends "character" ? CharacterState : EntityState,
        ...StateOf<Rest>,
      ]
    : readonly [];

export interface StrictInitiativeSkillEventArg<
  TargetKindTs extends InitiativeSkillTargetKind,
> {
  targets: StateOf<TargetKindTs>;
}

type InitiativeSkillMeta<
  CallerType extends ExEntityType,
  KindTs extends InitiativeSkillTargetKind,
  Area extends CallingAreaType,
  AssociatedExt extends ExtensionHandle,
> = {
  callerType: CallerType;
  callerVars: never;
  callingArea: Area;
  eventArgType: StrictInitiativeSkillEventArg<KindTs>;
  associatedExtension: AssociatedExt;
  gtsSnippets: {};
};

export type CreateSkillMeta<
  EventArgType,
  CallerType extends ExEntityType,
  Vars extends string,
  AssociatedExt extends ExtensionHandle,
> = {
  callerType: CallerType;
  callerVars: Vars;
  eventArgType: EventArgType;
  associatedExtension: AssociatedExt;
  gtsSnippets: {};
};

export type StrictInitiativeSkillFilter<
  CallerType extends ExEntityType,
  KindTs extends InitiativeSkillTargetKind,
  Area extends CallingAreaType,
  AssociatedExt extends ExtensionHandle,
> = SkillOperationFilter<
  InitiativeSkillMeta<CallerType, KindTs, Area, AssociatedExt>
>;

/** @deprecated use string literal instead */
export const ListenTo = {
  Myself: "myself",
  SameArea: "sameArea",
  SamePlayer: "samePlayer",
  All: "all",
} as const;
export type ListenTo = (typeof ListenTo)[keyof typeof ListenTo];

interface RelativeArg {
  callerId: number;
  callerArea: EntityArea;
  listenTo: ListenTo;
}

function checkRelative(
  state: GameState,
  entityIdOrArea: number | { who: 0 | 1 } | EntityArea,
  r: RelativeArg,
): boolean {
  let entityArea: EntityArea;
  if (typeof entityIdOrArea !== "number" && !("type" in entityIdOrArea)) {
    if (r.listenTo === ListenTo.All) {
      return true;
    } else {
      return r.callerArea.who === entityIdOrArea.who;
    }
  }
  if (typeof entityIdOrArea === "number") {
    entityArea = getEntityArea(state, entityIdOrArea);
  } else {
    entityArea = entityIdOrArea;
  }
  switch (r.listenTo) {
    case ListenTo.Myself:
      return r.callerId === entityIdOrArea;
    // @ts-expect-error fallthrough
    case ListenTo.SameArea:
      if (r.callerArea.type === "characters") {
        return (
          entityArea.type === "characters" &&
          r.callerArea.characterId === entityArea.characterId
        );
      }
    case ListenTo.SamePlayer:
      return r.callerArea.who === entityArea.who;
    case ListenTo.All:
      return true;
    default:
      const _: never = r.listenTo;
      throw new GiTcgDataError(`Unknown listenTo: ${_}`);
  }
}

type Descriptor<E extends EventNames> = readonly [
  E,
  (e: EventArgOf<E>, listen: RelativeArg, current: GameState) => boolean,
];

function defineDescriptor<E extends EventNames>(
  name: E,
  filter?: Descriptor<E>[1],
): Descriptor<E> {
  return [name, filter ?? (() => true)];
}

/**
 * 检查此技能使用是否适用于通常意义上的“使用技能后”。
 *
 * 通常意义上的使用技能后是指：
 * 1. 该技能为主动技能；且
 * 2. 该技能不是准备技能触发的。
 * 3. Note: 通过使用卡牌（天赋等）触发的技能也适用。
 *
 * @param allowTechnique 是否允许特技
 */

function isDebuff(state: GameState, damageInfo: DamageInfo): boolean {
  return (
    getEntityArea(state, damageInfo.source.id).who ===
    getEntityArea(state, damageInfo.target.id).who
  );
}

/**
 * 可以触发 modifyChangeVariable / onChangeVariable 事件的变量名列表。
 */
export const VARIABLE_NAME_CAN_EMIT_EVENTS = ["usage", "nightsoul", "effect"];

/**
 * 定义数据描述中的触发事件名。
 *
 * 系统内部的事件名数量较少，
 * 提供给数据描述的事件名可解释为内部事件+筛选条件。
 * 比如 `onDamaged` 可解释为 `onDamage` 发生且伤害目标
 * 在监听范围内。
 */
export const detailedEventDictionary = {
  roll: defineDescriptor("modifyRoll", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  addDice: defineDescriptor("modifyAction0", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  deductElementDice: defineDescriptor("modifyAction1", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  deductOmniDice: defineDescriptor("modifyAction2", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r) && e.canDeductCost();
  }),
  deductOmniDiceSwitch: defineDescriptor("modifyAction2", (e, r) => {
    return (
      checkRelative(e.onTimeState, { who: e.who }, r) &&
      e.isSwitchActive() &&
      e.canDeductCost()
    );
  }),
  deductOmniDiceCard: defineDescriptor("modifyAction2", (e, r) => {
    return (
      checkRelative(e.onTimeState, { who: e.who }, r) &&
      e.isPlayCard() &&
      e.canDeductCost()
    );
  }),
  deductAllDiceCard: defineDescriptor("modifyAction3", (e, r) => {
    return (
      checkRelative(e.onTimeState, { who: e.who }, r) &&
      e.isPlayCard() &&
      e.canDeductCost()
    );
  }),
  deductVoidDiceSkill: defineDescriptor("modifyAction0", (e, r) => {
    return (
      e.isUseCharacterSkill() &&
      checkRelative(e.onTimeState, e.action.skill.caller.id, r) &&
      e.canDeductVoidCost()
    );
  }),
  deductElementDiceSkill: defineDescriptor("modifyAction1", (e, r) => {
    return (
      e.isUseCharacterSkill() &&
      checkRelative(e.onTimeState, e.action.skill.caller.id, r)
    );
  }),
  deductOmniDiceSkill: defineDescriptor("modifyAction2", (e, r) => {
    return (
      e.isUseCharacterSkill() &&
      checkRelative(e.onTimeState, e.action.skill.caller.id, r) &&
      e.canDeductCost()
    );
  }),
  deductOmniDiceTechnique: defineDescriptor("modifyAction2", (e, r) => {
    return (
      e.isUseTechnique() &&
      checkRelative(e.onTimeState, e.action.skill.caller.id, r) &&
      e.canDeductCost()
    );
  }),
  beforeFastSwitch: defineDescriptor("modifyAction4", (e, r) => {
    return (
      checkRelative(e.onTimeState, { who: e.who }, r) &&
      e.isSwitchActive() &&
      !e.isFast()
    );
  }),
  modifySkillDamageType: defineDescriptor("modifyDamage0", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.source.id, r) &&
      e.source.definition.type === "character" &&
      e.damageInfo.fromReaction === null
    );
  }),
  increaseDamage: defineDescriptor("modifyDamage1", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.source.id, r) &&
      !isDebuff(e.onTimeState, e.damageInfo)
    );
  }),
  increaseSkillDamage: defineDescriptor("modifyDamage1", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.source.id, r) &&
      e.source.definition.type === "character" &&
      e.damageInfo.fromReaction === null
    );
  }),
  increaseTechniqueDamage: defineDescriptor("modifyDamage1", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.source.id, r) &&
      e.via.definition.skillType === "technique" &&
      e.damageInfo.fromReaction === null
    );
  }),
  multiplySkillDamage: defineDescriptor("modifyDamage2", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.source.id, r) &&
      e.source.definition.type === "character" &&
      e.damageInfo.fromReaction === null
    );
  }),
  increaseDamaged: defineDescriptor("modifyDamage1", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.target.id, r)
    );
  }),
  multiplyDamaged: defineDescriptor("modifyDamage2", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      checkRelative(e.onTimeState, e.target.id, r)
    );
  }),
  decreaseDamaged: defineDescriptor("modifyDamage3", (e, r) => {
    return (
      e.type !== DamageType.Piercing &&
      e.value > 0 &&
      checkRelative(e.onTimeState, e.target.id, r)
    );
  }),
  cancelHealed: defineDescriptor("modifyHeal0", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.target.id, r) &&
      e.modifiable() &&
      !e.cancelled
    );
  }),
  decreaseHealed: defineDescriptor("modifyHeal1", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.target.id, r) &&
      e.modifiable() &&
      !e.cancelled
    );
  }),
  beforeDefeated: defineDescriptor("modifyZeroHealth", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.target.id, r) && e._immuneInfo === null
    );
  }),

  battleBegin: defineDescriptor("onBattleBegin"),
  roundBegin: defineDescriptor("onRoundBegin"),
  roundEnd: defineDescriptor("onRoundEnd"),
  actionPhase: defineDescriptor("onActionPhase"),
  endPhase: defineDescriptor("onEndPhase"),
  beforeAction: defineDescriptor("onBeforeAction", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  replaceActionBySkill: defineDescriptor("replaceAction", (e, r) => {
    const player = e.onTimeState.players[e.who];
    const activeChar = player.characters[getActiveCharacterIndex(player)];
    return (
      checkRelative(e.onTimeState, activeChar.id, r) &&
      !isSkillDisabled(activeChar)
    );
  }),
  action: defineDescriptor("onAction", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  playCard: defineDescriptor("onPlayCard", (e, r) => {
    return (
      // 大部分支援牌不触发自身的打出时；
      // 但有例外“特佩利舞台”，故将此判断移到具体卡牌代码中
      checkRelative(e.onTimeState, { who: e.who }, r)
    );
  }),
  beforeSkill: defineDescriptor("onBeforeUseSkill", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.callerArea, r) &&
      isCharacterInitiativeSkill(e.skill) &&
      !e.skill.definition.initiativeSkillConfig.omitEvents
    );
  }),
  beforeTechnique: defineDescriptor("onBeforeUseSkill", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.callerArea, r) &&
      e.isSkillType("technique") &&
      !e.skill.definition.initiativeSkillConfig.omitEvents
    );
  }),
  useSkill: defineDescriptor("onUseSkill", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.callerArea, r) &&
      isCharacterInitiativeSkill(e.skill) &&
      !e.skill.definition.initiativeSkillConfig.omitEvents
    );
  }),
  useTechnique: defineDescriptor("onUseSkill", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.callerArea, r) &&
      e.isSkillType("technique") &&
      !e.skill.definition.initiativeSkillConfig.omitEvents
    );
  }),
  useSkillOrTechnique: defineDescriptor("onUseSkill", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.callerArea, r) &&
      isCharacterInitiativeSkill(e.skill, true) &&
      !e.skill.definition.initiativeSkillConfig.omitEvents
    );
  }),
  declareEnd: defineDescriptor("onDeclareEnd", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  switchActive: defineDescriptor("onSwitchActive", (e, r) => {
    return (
      (e.switchInfo.from &&
        checkRelative(e.onTimeState, e.switchInfo.from.id, r)) ||
      checkRelative(e.onTimeState, e.switchInfo.to.id, r)
    );
  }),
  // 抽牌后：行动牌因抽牌移入手牌，超过上限或者此时仍在手牌区
  drawCard: defineDescriptor("onHandCardInserted", (e, r, curState) => {
    const area = getEntityArea(curState, e.card.id);
    return (
      checkRelative(e.onTimeState, { who: e.who }, r) &&
      ["draw", "switch"].includes(e.reason) &&
      (area.type === "hands" || e.overflowed)
    );
  }),
  // 加入手牌后：行动牌移入手牌，且此时仍在同方
  handCardInserted: defineDescriptor("onHandCardInserted", (e, r, curState) => {
    const area = getEntityArea(curState, e.card.id);
    return (
      checkRelative(e.onTimeState, { who: e.who }, r) && area.who === e.who
    );
  }),
  // 自身加入手牌后
  selfHandCardInserted: defineDescriptor(
    "onHandCardInserted",
    (e, r, curState) => {
      return r.callerId === e.card.id && r.callerArea.type !== "pile";
    },
  ),
  discard: defineDescriptor("onDispose", (e, r) => {
    return e.isDiscard() && checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  discardOrTuneCard: defineDescriptor("onDispose", (e, r) => {
    return (
      e.isDiscardOrTuning() && checkRelative(e.onTimeState, { who: e.who }, r)
    );
  }),
  // 自身（在牌库或手牌中）舍弃时
  selfDiscard: defineDescriptor("onDispose", (e, r) => {
    return r.callerId === e.entity.id && e.isDiscard();
  }),
  dealDamage: defineDescriptor("onDamageOrHeal", (e, r) => {
    return (
      e.isDamageTypeDamage() && checkRelative(e.onTimeState, e.source.id, r)
    );
  }),
  skillDamage: defineDescriptor("onDamageOrHeal", (e, r) => {
    return (
      e.isDamageTypeDamage() && checkRelative(e.onTimeState, e.source.id, r)
    );
  }),
  damaged: defineDescriptor("onDamageOrHeal", (e, r) => {
    return (
      e.isDamageTypeDamage() && checkRelative(e.onTimeState, e.target.id, r)
    );
  }),
  healed: defineDescriptor("onDamageOrHeal", (e, r) => {
    return e.isDamageTypeHeal() && checkRelative(e.onTimeState, e.target.id, r);
  }),
  damagedOrHealed: defineDescriptor("onDamageOrHeal", (e, r) => {
    return checkRelative(e.onTimeState, e.target.id, r);
  }),
  modifyReaction: defineDescriptor("modifyReaction", (e, r) => {
    return checkRelative(e.onTimeState, e.reactionInfo.target.id, r);
  }),
  reaction: defineDescriptor("onReaction", (e, r) => {
    return checkRelative(e.onTimeState, e.reactionInfo.target.id, r);
  }),
  dealReaction: defineDescriptor("onReaction", (e, r) => {
    return checkRelative(e.onTimeState, e.caller.id, r);
  }),
  selfEnter: defineDescriptor("onEnter", (e, r) => {
    return e.entity.id === r.callerId;
  }),
  entityEnter: defineDescriptor("onEnter", (e, r) => {
    return checkRelative(e.onTimeState, e.entity.id, r);
  }),
  selfDispose: defineDescriptor("onDispose", (e, r) => {
    return e.entity.id === r.callerId;
  }),
  entityDispose: defineDescriptor("onDispose", (e, r) => {
    return (
      !e.isDiscardOrTuning() && checkRelative(e.onTimeState, e.entity.id, r)
    );
  }),
  defeated: defineDescriptor("onDamageOrHeal", (e, r) => {
    return (
      checkRelative(e.onTimeState, e.target.id, r) && e.damageInfo.causeDefeated
    );
  }),
  revive: defineDescriptor("onRevive", (e, r) => {
    return checkRelative(e.onTimeState, e.character.id, r);
  }),
  transformDefinition: defineDescriptor("onTransformDefinition", (e, r) => {
    return checkRelative(e.onTimeState, e.entity.id, r);
  }),
  generateDice: defineDescriptor("onGenerateDice", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  cancelConsumeNightsoul: defineDescriptor("modifyChangeVariable", (e, r) => {
    return (
      e.info.varName === "nightsoul" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "decrease" &&
      !e.info.cancelled
    );
  }),
  consumeNightsoul: defineDescriptor("onChangeVariable", (e, r) => {
    return (
      e.info.varName === "nightsoul" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "decrease"
    );
  }),
  gainNightsoul: defineDescriptor("onChangeVariable", (e, r) => {
    return (
      e.info.varName === "nightsoul" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "increase"
    );
  }),
  consumeUsage: defineDescriptor("onChangeVariable", (e, r) => {
    return (
      e.info.varName === "usage" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "decrease"
    );
  }),
  gainUsage: defineDescriptor("onChangeVariable", (e, r) => {
    return (
      e.info.varName === "usage" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "increase"
    );
  }),
  consumeEffect: defineDescriptor("onChangeVariable", (e, r) => {
    return (
      e.info.varName === "effect" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "decrease"
    );
  }),
  gainEffect: defineDescriptor("onChangeVariable", (e, r) => {
    return (
      e.info.varName === "effect" &&
      checkRelative(e.onTimeState, e.area, r) &&
      e.info.direction === "increase"
    );
  }),
  selectCard: defineDescriptor("onSelectCard", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  adventure: defineDescriptor("onAdventure", (e, r) => {
    return checkRelative(e.onTimeState, { who: e.who }, r);
  }),
  customEvent: defineDescriptor("onCustomEvent", (e, r) => {
    return checkRelative(e.onTimeState, e.entity.id, r);
  }),
} satisfies Record<string, Descriptor<any>>;

type OverrideEventArgType = {
  damaged: DamageOrHealEventArg<DamageInfo>;
  defeated: DamageOrHealEventArg<DamageInfo>;
  dealDamage: DamageOrHealEventArg<DamageInfo>;
  deductOmniDiceSwitch: ModifyAction2EventArg<SwitchActiveInfo>;
  deductOmniDiceCard: ModifyAction2EventArg<PlayCardInfo>;
  deductAllDiceCard: ModifyAction3EventArg<PlayCardInfo>;
  deductVoidDiceSkill: ModifyAction0EventArg<UseSkillInfo>;
  deductElementDiceSkill: ModifyAction1EventArg<UseSkillInfo>;
  deductOmniDiceSkill: ModifyAction2EventArg<UseSkillInfo>;
  deductOmniDiceTechnique: ModifyAction2EventArg<UseSkillInfo>;
  beforeFastSwitch: ModifyAction4EventArg<SwitchActiveInfo>;
  cancelHealed: Omit<ModifyHeal0EventArg, "damageInfo" | "value">;
  decreaseHealed: Omit<ModifyHeal1EventArg, "damageInfo" | "value">;
};

type DetailedEventDictionary = Omit<
  typeof detailedEventDictionary,
  "customEvent"
>;
export type DetailedEventNames = keyof DetailedEventDictionary;
export type DetailedEventArgOf<E extends DetailedEventNames> =
  E extends keyof OverrideEventArgType
    ? OverrideEventArgType[E]
    : EventArgOf<DetailedEventDictionary[E][0]>;

export type SkillInfoGetter = () => SkillInfo;

export function wrapSkillInfoWithExt(
  skillInfo: SkillInfo,
  associatedExtensionId: number | null,
): SkillInfoOfContextConstruction {
  return {
    ...skillInfo,
    associatedExtensionId,
    gtsSnippets: new Map(),
  };
}

export type TargetGetter = (ctx: SkillContext<any>) => AnyState[];

function generateTargetList(
  state: GameState,
  skillInfo: SkillInfo,
  known: AnyState[],
  getTarget: TargetGetter[],
  associatedExtensionId: number | null,
): AnyState[][] {
  if (getTarget.length === 0) {
    return [[]];
  }
  const [first, ...rest] = getTarget;
  const ctx = new SkillContext<ReadonlyMetaOf<RwContextMeta>>(
    state,
    wrapSkillInfoWithExt(skillInfo, associatedExtensionId),
    {
      targets: known,
    },
  );
  const states = first(ctx);
  return states.flatMap((st) =>
    generateTargetList(
      state,
      skillInfo,
      [...known, st],
      rest,
      associatedExtensionId,
    ).map((l) => [st, ...l]),
  );
}

export function buildTargetGetter(
  targetQuery: TargetGetter[],
  associatedExtensionId: number | null,
): InitiativeSkillTargetGetter {
  return (state, skillInfo) => {
    const targetIdsList = generateTargetList(
      state,
      skillInfo,
      [],
      targetQuery,
      associatedExtensionId,
    );
    return targetIdsList.map((targets) => ({ targets }));
  };
}
