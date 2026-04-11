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

import type { Draft } from "immer";
import {
  ActionValidity,
  DiceType,
  type DiceRequirement,
  type ReadonlyDiceRequirement,
} from "@gi-tcg/typings";
import { checkDice, chooseDiceValue, flip } from "@gi-tcg/utils";
import type {
  AnyState,
  CharacterState,
  EntityState,
  EntityVariables,
  GameState,
  PlayerState,
} from "./base/state";
import type { EntityArea, EntityDefinition, EntityType } from "./base/entity";
import {
  NATION_TAGS,
  WEAPON_TAGS,
  type CharacterDefinition,
  type CharacterTag,
  type ElementTag,
  type NationTag,
  type WeaponTag,
} from "./base/character";
import {
  defineSkillInfo,
  EventArg,
  type EventNames,
  type InitiativeSkillDefinition,
  type InitiativeSkillInfo,
  type SkillDefinition,
  type SkillInfo,
  type SkillType,
  type TriggeredSkillDefinition,
  ZeroHealthEventArg,
} from "./base/skill";
import {
  GiTcgCoreInternalEntityNotFoundError,
  GiTcgCoreInternalError,
} from "./error";
import type { ActionInfoWithModification } from "./preview";
import type { PlayerConfig } from "./player";
import type { MoveEntityM } from "./base/mutation";

export type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export function getEntityById(state: GameState, id: number): AnyState {
  for (const player of state.players) {
    for (const ch of player.characters) {
      if (ch.id === id) {
        return ch;
      }
      for (const entity of ch.entities) {
        if (entity.id === id) {
          return entity;
        }
      }
    }
    for (const key of [
      "combatStatuses",
      "summons",
      "supports",
      "hands",
      "pile",
      "removedEntities",
    ] as const) {
      const area = player[key];
      for (const entity of area) {
        if (entity.id === id) {
          return entity;
        }
        // might exists in hands, cards, or removedEntities.
        if ("attachments" in entity) {
          for (const attachment of entity.attachments) {
            if (attachment.id === id) {
              return attachment;
            }
          }
        }
      }
    }
  }
  throw new GiTcgCoreInternalError(`Cannot found entity ${id}`);
}

/**
 * 查找所有实体(含牌堆)，按照通常响应顺序排序
 * @param state 游戏状态
 * @param inclRemoved 是否包含已移除的实体
 * @returns 实体状态列表
 */
export function getAllEntities(
  state: GameState,
  inclRemoved = false,
): AnyState[] {
  return getAllEntitiesImpl(state, inclRemoved, false);
}

export interface EntityWithArea {
  readonly state: AnyState;
  readonly area: EntityArea;
}

/**
 * 查找所有实体(含牌堆)，按照通常响应顺序排序，并附带实体所在区域信息。
 * @param state 游戏状态
 * @param inclRemoved 是否包含已移除的实体
 * @returns 实体与区域信息列表
 */
export function getAllEntitiesWithArea(
  state: GameState,
  inclRemoved = false,
): EntityWithArea[] {
  return getAllEntitiesImpl(state, inclRemoved, true);
}

function getAllEntitiesImpl(
  state: GameState,
  inclRemoved: boolean,
  withArea: true,
): EntityWithArea[];
function getAllEntitiesImpl(
  state: GameState,
  inclRemoved: boolean,
  withArea: false,
): AnyState[];
function getAllEntitiesImpl(
  state: GameState,
  inclRemoved: boolean,
  withArea: boolean,
): (AnyState | EntityWithArea)[] {
  const result: AnyState[] = [];
  const resultWithArea: EntityWithArea[] = [];
  let append: (entity: AnyState, area: EntityArea) => void;
  if (withArea) {
    append = (entity: AnyState, area: EntityArea) => {
      resultWithArea.push({ state: entity, area });
    };
  } else {
    append = (entity: AnyState, _area: EntityArea) => {
      result.push(entity);
    };
  }

  // 游戏实际的响应顺序并非规则书所述，而是
  // 出战角色、出战角色装备和状态、出战状态、后台角色、后台角色装备和状态
  // 召唤物、支援牌
  // （即出战状态区夹在出战角色区和后台角色区之间）

  const characters = ([0, 1] as const).map((who) => {
    const player = state.players[who];
    let activeIdx = 0;
    try {
      activeIdx = getActiveCharacterIndex(player);
    } catch {}
    return shiftLeft(player.characters, activeIdx);
  });

  // 先列出倒下角色区上实体
  for (const who of [state.currentTurn, flip(state.currentTurn)]) {
    for (const ch of characters[who]) {
      if (ch.variables.alive === 0) {
        const area: EntityArea = {
          type: "characters",
          who,
          characterId: ch.id,
        };
        append(ch, area);
        for (const entity of ch.entities) {
          append(entity, area);
        }
      }
    }
  }

  for (const who of [state.currentTurn, flip(state.currentTurn)]) {
    const player = state.players[who];
    const [active, ...standby] = characters[who];

    if (active.variables.alive === 1) {
      const activeArea: EntityArea = {
        type: "characters",
        who,
        characterId: active.id,
      };
      append(active, activeArea);
      for (const entity of active.entities) {
        append(entity, activeArea);
      }
    }
    const combatStatusArea: EntityArea = {
      type: "combatStatuses",
      who,
    };
    for (const combatStatus of player.combatStatuses) {
      append(combatStatus, combatStatusArea);
    }
    for (const ch of standby) {
      if (ch.variables.alive === 1) {
        const area: EntityArea = {
          type: "characters",
          who,
          characterId: ch.id,
        };
        append(ch, area);
        for (const entity of ch.entities) {
          append(entity, area);
        }
      }
    }
    const summonsArea: EntityArea = {
      type: "summons",
      who,
    };
    for (const summon of player.summons) {
      append(summon, summonsArea);
    }
    const supportsArea: EntityArea = {
      type: "supports",
      who,
    };
    for (const support of player.supports) {
      append(support, supportsArea);
    }
    for (const card of player.hands) {
      const area: EntityArea = {
        type: "hands",
        who,
        cardId: card.id,
      };
      append(card, area);
      for (const attachment of card.attachments) {
        append(attachment, area);
      }
    }
    for (const card of player.pile.toReversed()) {
      const area: EntityArea = {
        type: "pile",
        who,
        cardId: card.id,
      };
      append(card, area);
      for (const attachment of card.attachments) {
        append(attachment, area);
      }
    }
    if (inclRemoved) {
      const removedArea: EntityArea = {
        type: "removedEntities",
        who,
      };
      for (const removedEntity of player.removedEntities) {
        append(removedEntity, removedArea);
      }
    }
  }
  return withArea ? resultWithArea : result;
}

export interface CallerAndTriggeredSkill {
  caller: AnyState;
  skill: TriggeredSkillDefinition;
}

export interface CallerAndInitiativeSkill {
  caller: AnyState;
  skill: InitiativeSkillDefinition;
}

/**
 * 显示当前玩家的主动技能列表。含当前出战角色的主动技能，和所装备的特技提供的技能。
 *
 * 不考虑是否可以打出。不含准备技能。
 * @param player
 * @returns
 */
export function initiativeSkillsOfPlayer(
  player: PlayerState,
  includesHidden = false,
): CallerAndInitiativeSkill[] {
  const activeCh = player.characters.find(
    (ch) => player.activeCharacterId === ch.id,
  );
  if (!activeCh) {
    return [];
  }
  return [
    ...activeCh.entities.flatMap((st) =>
      st.definition.skills
        .filter(
          (sk): sk is InitiativeSkillDefinition =>
            sk.triggerOn === "initiative" &&
            sk.skillType !== "playCard" &&
            (includesHidden || !sk.initiativeSkillConfig.hidden),
        )
        .map((sk) => ({
          caller: st,
          skill: sk,
        })),
    ),
    ...activeCh.definition.skills
      .filter(
        (sk): sk is InitiativeSkillDefinition =>
          sk.triggerOn === "initiative" &&
          (includesHidden || !sk.initiativeSkillConfig.hidden),
      )
      .map((sk) => ({
        caller: activeCh,
        skill: sk,
      })),
  ];
}

/**
 * 检索 `state` 中所有响应 `triggerOn` 的技能。包括扩展点，不含已移除的实体。
 * @param state
 * @param triggerOn
 * @returns
 */
export function allSkills(
  state: GameState,
  triggerOn: EventNames,
): CallerAndTriggeredSkill[] {
  const result: CallerAndTriggeredSkill[] = [];
  const activeChId = state.players[state.currentTurn].activeCharacterId;
  if (activeChId) {
    const caller = getEntityById(
      state,
      state.players[state.currentTurn].activeCharacterId,
    ) as CharacterState;
    for (const ext of state.extensions) {
      for (const skill of ext.definition.skills) {
        if (skill.triggerOn === triggerOn) {
          result.push({ caller, skill });
        }
      }
    }
  }
  for (const entity of getAllEntities(state)) {
    for (const skill of entity.definition.skills) {
      if (skill.triggerOn === triggerOn) {
        result.push({ caller: entity, skill });
      }
    }
  }
  return result;
}

export function getEntityArea(state: GameState, id: number): EntityArea {
  for (const who of [0, 1] as const) {
    const player = state.players[who];
    for (const ch of player.characters) {
      if (ch.id === id || ch.entities.find((e) => e.id === id)) {
        return {
          type: "characters",
          who,
          characterId: ch.id,
        };
      }
    }
    for (const key of [
      "combatStatuses",
      "summons",
      "supports",
      "hands",
      "pile",
      "removedEntities",
    ] as const) {
      for (const entity of player[key]) {
        if (
          entity.id === id ||
          ("attachments" in entity &&
            entity.attachments.find((a) => a.id === id))
        ) {
          return { type: key, who, cardId: entity.id };
        }
      }
    }
  }
  throw new GiTcgCoreInternalEntityNotFoundError(state, id);
}

export function allEntitiesAtArea(
  state: GameState,
  area: EntityArea,
): AnyState[] {
  const result: AnyState[] = [];
  const player = state.players[area.who];
  if (area.type === "characters") {
    const characters = player.characters;
    const ch = characters.find((ch) => ch.id === area.characterId);
    if (!ch) {
      throw new GiTcgCoreInternalEntityNotFoundError(state, area.characterId);
    }
    result.push(ch, ...ch.entities);
  } else if (area.type === "hands" || area.type === "pile") {
    const card = player[area.type].find((c) => c.id === area.cardId);
    if (!card) {
      throw new GiTcgCoreInternalEntityNotFoundError(state, area.cardId);
    }
    result.push(card, ...card.attachments);
  } else {
    result.push(...player[area.type]);
  }
  return result;
}

/**
 * Remove an entity by its id from the given game state.
 * @param state The mutable game state draft.
 * @param id The id of the entity to remove.
 * @returns The removed entity; callers should use this return value.
 */
export function removeEntity(state: Draft<GameState>, id: number): AnyState {
  for (const player of state.players) {
    for (const ch of player.characters) {
      const idx = ch.entities.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const [removed] = ch.entities.splice(idx, 1);
        return removed;
      }
    }
    for (const key of [
      "combatStatuses",
      "summons",
      "supports",
      "hands",
      "pile",
    ] as const) {
      const area = player[key];
      for (let i = 0; i < area.length; i++) {
        if (area[i].id === id) {
          const [removed] = area.splice(i, 1);
          return removed;
        }
        if (key === "hands" || key === "pile") {
          const attachmentIdx = area[i].attachments.findIndex(
            (a) => a.id === id,
          );
          if (attachmentIdx !== -1) {
            const [removed] = area[i].attachments.splice(attachmentIdx, 1);
            return removed;
          }
        }
      }
    }
  }
  throw new GiTcgCoreInternalEntityNotFoundError(state, id);
}

/** 检查 `skill` 是否是角色主动技能（或者特技） */
export function isCharacterInitiativeSkill(
  skill: SkillInfo,
  allowTechnique = false,
): skill is InitiativeSkillInfo {
  const allowSkillType: SkillType[] = ["normal", "elemental", "burst"];
  if (allowTechnique) {
    allowSkillType.push("technique");
  }
  return (
    skill.definition.triggerOn === "initiative" &&
    allowSkillType.includes(skill.definition.skillType as SkillType)
  );
}

export function getActiveCharacterIndex(player: PlayerState): number {
  const activeIdx = player.characters.findIndex(
    (ch) => ch.id === player.activeCharacterId,
  );
  if (activeIdx === -1) {
    throw new GiTcgCoreInternalError(
      `Invalid active character id ${player.activeCharacterId}`,
    );
  }
  return activeIdx;
}

export interface CheckPreparingResult {
  status: EntityState;
  skillId: number;
}

export function findReplaceAction(
  state: GameState,
  eventArg: EventArg,
): SkillInfo | null {
  const skills = allSkills(state, "replaceAction");
  for (const { caller, skill } of skills) {
    const area = getEntityArea(state, caller.id);
    if (area.type !== "characters") {
      continue;
    }
    const skillInfo = defineSkillInfo({
      caller,
      definition: skill,
    });
    if (skill.filter(state, skillInfo, eventArg)) {
      return skillInfo;
    }
  }
  return null;
}

export function isSkillDisabled(character: CharacterState): boolean {
  return character.entities.some((st) =>
    st.definition.tags.includes("disableSkill"),
  );
}

/**
 * createEntity 在已有 `exists` 实体时，是否叠加在某个已存在实体上
 * @param exists 待入场区域的全部实体
 * @param incoming 待入场的实体定义
 * @returns 若可叠加且存在可叠加的已存在实体，返回之
 */
export function shouldEnterOverride<T extends AnyState>(
  exists: T[],
  incoming: T["definition"],
): T | null {
  if (incoming.type === "character") {
    return null;
  }
  const existOne =
    exists.find((et) => et.definition.id === incoming.id) ?? null;
  if (incoming.type === "support") {
    // 仅冒险地点可叠加
    if (incoming.tags.includes("adventureSpot")) {
      return existOne;
    } else {
      return null;
    }
  }
  // 状态、装备、出战状态、召唤物 可叠加
  return existOne;
}

export interface CreateEntityOptions {
  /** 若覆盖创建，只修改 `overrideVariables` 中指定的变量 */
  readonly modifyOverriddenVariablesOnly?: boolean;
  /** 创建实体时，覆盖默认变量 */
  readonly overrideVariables?: Partial<EntityVariables>;
}

export interface InsertEntityOptions extends CreateEntityOptions {
  /** 移动实体原因 */
  readonly moveReason?: MoveEntityM["reason"];
}

export function getInsertedStateVariables<T extends AnyState>({
  state,
  oldState,
  newStateTemplate,
  opt,
}: {
  /** 对局状态，用于获取 versionBehavior */
  state: GameState;
  /** 是否覆盖了同名状态 */
  oldState: T | null;
  /** 带创建的实体，提供 variables 和 definitions */
  newStateTemplate: Partial<T> & { definition: {} };
  opt?: InsertEntityOptions;
}): EntityVariables {
  const definition = newStateTemplate.definition;
  const incomingVariables =
    newStateTemplate.variables ?? opt?.overrideVariables ?? {};
  if (oldState) {
    const { varConfigs } = definition;
    const newValues: Record<string, number> = {};
    // refresh exist entity's variable
    for (const name in varConfigs) {
      if (opt?.modifyOverriddenVariablesOnly && !(name in incomingVariables)) {
        continue;
      }
      let { initialValue, recreateBehavior } = varConfigs[name];
      if (typeof incomingVariables[name] === "number") {
        initialValue = incomingVariables[name];
      }
      const oldValue = oldState.variables[name] ?? 0;
      switch (recreateBehavior.type) {
        case "default": {
          const defaultBehaviorType =
            state.versionBehavior.defaultRecreateBehavior;
          if (defaultBehaviorType === "overwrite") {
            newValues[name] = initialValue;
          } else if (defaultBehaviorType === "takeMax") {
            newValues[name] = Math.max(initialValue, oldValue);
          }
          break;
        }
        case "keep": {
          // just skip this variable
          break;
        }
        case "overwrite": {
          newValues[name] = initialValue;
          break;
        }
        case "takeMax": {
          newValues[name] = Math.max(initialValue, oldValue);
          break;
        }
        case "append": {
          if (oldValue > recreateBehavior.appendLimit) {
            // 如果当前值已经超过可叠加的上限，则不再叠加
            break;
          }
          const appendValue =
            incomingVariables[name] ?? recreateBehavior.appendValue;
          const appendResult = appendValue + oldValue;
          newValues[name] = Math.min(
            appendResult,
            recreateBehavior.appendLimit,
          );
          break;
        }
        default: {
          const _check: never = recreateBehavior;
          break;
        }
      }
    }
    return newValues;
  } else {
    return Object.fromEntries(
      Object.entries(definition.varConfigs).map(([name, { initialValue }]) => [
        name,
        incomingVariables[name] ?? initialValue,
      ]),
    );
  }
}

export function isChargedPlunging(skill: SkillDefinition, player: PlayerState) {
  if (!skill.initiativeSkillConfig) {
    return { charged: false, plunging: false };
  }
  let charged = skill.initiativeSkillConfig.alwaysCharged;
  let plunging = skill.initiativeSkillConfig.alwaysPlunging;
  const isNormal = skill.skillType === "normal";
  if (!isNormal) {
    return { charged, plunging };
  }
  const activeCh = player.characters[getActiveCharacterIndex(player)];
  const asPlunging = activeCh.entities.some((et) =>
    et.definition.tags.includes("normalAsPlunging"),
  );
  charged ||= player.canCharged;
  plunging ||= player.canPlunging || asPlunging;
  return { charged, plunging };
}

export function applyAutoSelectedDiceToAction(
  actionInfo: ActionInfoWithModification,
  player: PlayerState,
  config: PlayerConfig,
): ActionInfoWithModification {
  if (actionInfo.validity !== ActionValidity.VALID) {
    return actionInfo;
  }
  if (actionInfo.type === "elementalTuning") {
    const disallowed = config.allowTuningAnyDice
      ? []
      : [actionInfo.result, DiceType.Omni];
    const tuningDice = player.dice.findLast((d) => !disallowed.includes(d));
    if (!tuningDice) {
      return {
        ...actionInfo,
        validity: ActionValidity.NO_DICE,
      };
    } else {
      return {
        ...actionInfo,
        autoSelectedDice: [tuningDice],
      };
    }
  }
  const autoSelectedDice = chooseDiceValue(actionInfo.cost, player.dice);
  const ok = checkDice(actionInfo.cost, autoSelectedDice);
  if (!ok) {
    return {
      ...actionInfo,
      validity: ActionValidity.NO_DICE,
    };
  }
  const energy =
    player.characters[getActiveCharacterIndex(player)].variables.energy;
  const requiredEnergy = actionInfo.cost.get(DiceType.Energy) ?? 0;
  if (energy < requiredEnergy) {
    return {
      ...actionInfo,
      validity: ActionValidity.NO_ENERGY,
    };
  }
  return {
    ...actionInfo,
    autoSelectedDice,
  };
}

export function playSkillOfCard(
  card: EntityDefinition,
): InitiativeSkillDefinition | null {
  const skillDefinition = card.skills.find(
    (sk): sk is InitiativeSkillDefinition => sk.skillType === "playCard",
  );
  return skillDefinition ?? null;
}

export function normalizeCost(req: DiceRequirement): DiceRequirement {
  const emptyDice = req
    .entries()
    .filter(([k, v]) => v === 0)
    .map(([k, v]) => k);
  for (const dice of emptyDice) {
    req.delete(dice);
  }
  if (req.size === 0) {
    req.set(DiceType.Aligned, 0);
  }
  return req;
}

export const EMPTY_MAP: ReadonlyDiceRequirement = new Map([
  [DiceType.Aligned, 0],
]);

export function costOfCard(card: EntityDefinition): ReadonlyDiceRequirement {
  return playSkillOfCard(card)?.initiativeSkillConfig.requiredCost ?? EMPTY_MAP;
}

export function costSize(req: ReadonlyDiceRequirement): number {
  return req.entries().reduce((acc, [dice, count]) => acc + count, 0);
}

export function diceCostSize(req: ReadonlyDiceRequirement): number {
  return req
    .entries()
    .reduce(
      (acc, [dice, count]) => acc + (dice !== DiceType.Energy ? count : 0),
      0,
    );
}

export function originalDiceCostSizeOfCard(
  definition: EntityDefinition,
): number {
  return (
    playSkillOfCard(definition)?.initiativeSkillConfig.computed$diceCostSize ??
    0
  );
}

export function diceCostSizeOfCard(
  state: GameState,
  card: EntityState,
): number {
  const definition = card.definition;
  if (
    !state.versionBehavior.diceCostApplyAttachments ||
    card.attachments.length === 0
  ) {
    // shortcut path, return static value
    return originalDiceCostSizeOfCard(definition);
  }
  const { requiredCost } = applyAttachmentModifications(state, card);
  return diceCostSize(requiredCost);
}

export function assertValidActionCard(entity: EntityDefinition): void {
  if (
    !(["support", "equipment", "eventCard"] as EntityType[]).includes(
      entity.type,
    )
  ) {
    throw new GiTcgCoreInternalError(
      `Invalid action card type: ${entity.type}`,
    );
  }
}

export interface ModifiedHandCardInformation {
  readonly requiredCost: ReadonlyDiceRequirement;
  readonly shouldFast: boolean;
  readonly disableTuning: boolean;
  readonly willBeEffectless: boolean;
  /** undefined for default behavior (current active character's element) */
  readonly tunedToType: DiceType | undefined;
}

/**
 * 对 `cost` 应用减骰算法。
 * @param cost 待修改的骰子需求 Map
 * @param availableType 允许减少的骰子类型，按优先级排列
 * @param count 减少骰子的个数
 * @returns 修改后的 `cost`
 */
export function deductCost(
  cost: DiceRequirement,
  availableType: DiceType[],
  count: number,
) {
  for (const type of availableType) {
    const currentCount = cost.get(type) ?? 0;
    cost.set(type, Math.max(0, currentCount - count));
    count -= currentCount;
    if (count <= 0) {
      return;
    }
  }
  return cost;
}

export function appendCost(
  cost: DiceRequirement,
  availableType: DiceType[],
  count: number,
) {
  for (const type of availableType) {
    const currentEntry = cost.get(type);
    if (typeof currentEntry !== "undefined") {
      cost.set(type, currentEntry + count);
      return;
    }
  }
  cost.set(DiceType.Aligned, count);
}

export function applyAttachmentModifications(
  state: GameState,
  card: EntityState,
): ModifiedHandCardInformation {
  const { who } = getEntityArea(state, card.id);
  const playSkill = playSkillOfCard(card.definition);
  let costs: DiceRequirement = new Map(
    playSkill?.initiativeSkillConfig.requiredCost ?? EMPTY_MAP,
  );
  let shouldFast = playSkill?.initiativeSkillConfig.shouldFast ?? false;
  let disableTuning = card.definition.disableTuning;
  // 6.3- 旧逻辑：带 eventEffectless 出战状态的玩家会无效化事件牌效果
  let willBeEffectless =
    state.players[who].combatStatuses.some((st) =>
      st.definition.tags.includes("eventEffectless"),
    ) && card.definition.type === "eventCard";
  let tunedToType: DiceType | undefined = undefined;
  let changedCostType: DiceType | null = null;
  const modifications = card.attachments.flatMap((at) =>
    (0, at.definition.modifications)(state, at.id),
  );
  const priority = [
    DiceType.Aligned,
    DiceType.Cryo,
    DiceType.Hydro,
    DiceType.Pyro,
    DiceType.Electro,
    DiceType.Anemo,
    DiceType.Geo,
    DiceType.Dendro,
    DiceType.Void,
  ];
  for (const mod of modifications) {
    switch (mod.type) {
      case "increaseCardCost": {
        appendCost(costs, priority, mod.value);
        break;
      }
      case "decreaseCardCost": {
        deductCost(costs, priority, mod.value);
        break;
      }
      case "changeCardCostType": {
        changedCostType = mod.toType;
        break;
      }
      case "changeCardTuningTarget": {
        tunedToType = mod.tuningTarget;
        break;
      }
      case "disableCardTuning": {
        disableTuning = true;
        break;
      }
      case "makeEffectless": {
        willBeEffectless = true;
        break;
      }
      default: {
        const _check: never = mod;
        break;
      }
    }
  }
  if (changedCostType !== null) {
    const diceSize = diceCostSize(costs);
    const energyCost = costs.get(DiceType.Energy) ?? 0;
    costs = new Map([[changedCostType, diceSize]]);
    if (energyCost > 0) {
      costs.set(DiceType.Energy, energyCost);
    }
  }
  return {
    requiredCost: normalizeCost(costs),
    shouldFast,
    disableTuning,
    willBeEffectless,
    tunedToType,
  };
}

export function elementOfCharacter(ch: CharacterDefinition): DiceType {
  const elementTags: Record<ElementTag, DiceType> = {
    cryo: DiceType.Cryo,
    hydro: DiceType.Hydro,
    pyro: DiceType.Pyro,
    electro: DiceType.Electro,
    anemo: DiceType.Anemo,
    geo: DiceType.Geo,
    dendro: DiceType.Dendro,
  };
  const element = ch.tags.find((tag): tag is ElementTag => tag in elementTags);
  if (typeof element === "undefined") {
    return DiceType.Void;
  }
  return elementTags[element];
}
export function weaponOfCharacter(ch: CharacterDefinition): WeaponTag {
  const weaponTags: readonly CharacterTag[] = WEAPON_TAGS;
  const weapon = ch.tags.find((tag): tag is WeaponTag =>
    weaponTags.includes(tag),
  );
  return weapon ?? "otherWeapon";
}
export function nationOfCharacter(ch: CharacterDefinition): NationTag[] {
  const nationTags: readonly CharacterTag[] = NATION_TAGS;
  return ch.tags.filter((tag): tag is NationTag => nationTags.includes(tag));
}

export function toSortedBy<T, K extends number[] | number>(
  arr: readonly T[],
  projection: (element: T) => K,
): T[] {
  return arr.toSorted((a, b) => {
    let projectionA: number[] | number = projection(a);
    let projectionB: number[] | number = projection(b);
    if (!Array.isArray(projectionA)) {
      projectionA = [projectionA];
    }
    if (!Array.isArray(projectionB)) {
      projectionB = [projectionB];
    }
    const size = Math.min(projectionA.length, projectionB.length);
    for (let i = 0; i < size; i++) {
      if (projectionA[i] < projectionB[i]) {
        return -1;
      }
      if (projectionA[i] > projectionB[i]) {
        return 1;
      }
    }
    return projectionA.length - projectionB.length;
  });
}

/**
 * 骰子排序算法。每次修改骰子后都需要重新排序；排序依据是：
 * 1. 万能骰靠前
 * 2. 有效骰靠前
 * 3. 骰子数量多的靠前
 * 4. 骰子类型编号
 * @param player 当前玩家的状态，用以获取有效骰信息
 * @param dice
 * @returns
 */
export function sortDice(
  player: PlayerState,
  dice: readonly DiceType[],
): DiceType[] {
  const characterElements = shiftLeft(
    player.characters,
    getActiveCharacterIndex(player),
  ).map((ch) => elementOfCharacter(ch.definition));
  const countMap = new Map<DiceType, number>();
  for (const d of dice) {
    countMap.set(d, (countMap.get(d) ?? 0) + 1);
  }
  return toSortedBy(dice, (dice) => [
    dice === DiceType.Omni ? -1 : 0,
    characterElements.includes(dice) ? -1 : 0,
    -countMap.get(dice)!,
    dice,
  ]);
}

type TupleIndices<T extends readonly unknown[]> = Extract<
  keyof T,
  `${number}`
> extends `${infer N extends number}`
  ? N
  : never;

declare global {
  interface ReadonlyArray<T> {
    map<This extends readonly [unknown, unknown], U>(
      this: This,
      fn: (value: T, index: TupleIndices<This>, array: This) => U,
    ): { -readonly [K in keyof This]: U };
  }
  interface Array<T> {
    map<This extends [unknown, unknown], U>(
      this: This,
      fn: (value: T, index: TupleIndices<This>, array: This) => U,
    ): { -readonly [K in keyof This]: U };
  }
}

export function shiftLeft<T>(arr: readonly T[], idx: number): T[] {
  return [...arr.slice(idx), ...arr.slice(0, idx)];
}

/** Shuffle an array. No use of state random generator */
export function shuffle<T>(arr: readonly T[]): readonly T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Mixins

type AbstractConstructor = abstract new (...args: any[]) => any;
type Constructor = new (...args: any[]) => any;

type InstanceOfConstructors<Ts extends AbstractConstructor[]> = Ts extends [
  infer Car extends AbstractConstructor,
  ...infer Cdr extends AbstractConstructor[],
]
  ? InstanceType<Car> & InstanceOfConstructors<Cdr>
  : {};

type MixinResult<
  T extends Constructor,
  Us extends AbstractConstructor[],
> = new (
  ...args: ConstructorParameters<T>
) => InstanceType<T> & InstanceOfConstructors<Us>;

/**
 * Construct a mixin class from `derivedCtor`, then copy prototype methods from `constructors` onto it.
 * @param derivedCtor The base class to extend from.
 * @param constructors Classes whose prototype methods will be copied. Their constructors and class field initializers are not executed.
 * @returns
 */
export function mixins<
  T extends Constructor,
  const Us extends AbstractConstructor[],
>(derivedCtor: T, constructors: Us): MixinResult<T, Us> {
  class Mixed extends derivedCtor {
    constructor(...args: any[]) {
      super(...args);
      for (const baseCtor of constructors) {
        for (const name of Object.getOwnPropertyNames(baseCtor.prototype)) {
          if (name === "constructor") {
            continue;
          }
          Object.defineProperty(
            Mixed.prototype,
            name,
            Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
              Object.create(null),
          );
        }
      }
    }
  }
  return Mixed as any;
}
