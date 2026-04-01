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

import {
  PbDiceRequirementType,
  PbDiceType,
  PbEquipmentType,
  type Action,
  type PbCharacterState,
  type PbEntityState,
  type ExposedMutation,
  type Notification,
  type PbPlayerState,
  type RpcMethod,
  type RpcRequest,
  type RpcResponse,
  type PbSkillInfo,
  type PbGameState,
  PbPhaseType,
  type ReadonlyDiceRequirement,
  type PbDiceRequirement,
  PbEntityArea,
  type RpcResponsePayloadOf,
  PbPlayerFlag,
  PbModifyDirection,
  CHARACTER_TAG_SHIELD,
  CHARACTER_TAG_BARRIER,
  CHARACTER_TAG_DISABLE_SKILL,
  CHARACTER_TAG_NIGHTSOULS_BLESSING,
  PbResetDiceReason,
  PbHealKind,
  PbPlayerStatus,
  CARD_TAG_ABYSS,
  CHARACTER_TAG_BOND_OF_LIFE,
  PbMoveEntityReason,
  PbRemoveEntityReason,
  PbAttachmentState,
  CARD_TAG_CONDUCTIVE,
  PbEntityType,
} from "@gi-tcg/typings";
import type {
  AttachmentState,
  CharacterState,
  EntityState,
  EntityTag,
  GameState,
  PhaseType,
  PlayerState,
  StateSymbol,
} from "./base/state";
import type {
  MoveEntityM,
  Mutation,
  PlayerFlag,
  RemoveEntityM,
} from "./base/mutation";
import type {
  ActionInfo,
  HealKind,
  InitiativeSkillDefinition,
} from "./base/skill";
import { GiTcgIoError } from "./error";
import {
  USAGE_PER_ROUND_VARIABLE_NAMES,
  type EntityArea,
  type EntityType,
} from "./base/entity";
import { costOfCard, getEntityById, initiativeSkillsOfPlayer } from "./utils";
import type { AttachmentTag } from "./base/attachment";

export interface PlayerIO {
  notify: (notification: Notification) => void;
  rpc: (request: RpcRequest) => Promise<RpcResponse>;
}

export type PauseHandler = (
  state: GameState,
  mutations: Mutation[],
  canResume: boolean,
) => Promise<unknown>;

export type IoErrorHandler = (e: GiTcgIoError) => void;

/**
 * 由于 ts-proto 没有校验功能，所以额外编写校验 rpc 响应的代码
 *
 * 抛出的 Error 会被外层 catch 并转换为 GiTcgIoError
 * @param method rpc 方法
 * @param response rpc 响应
 */
export function verifyRpcResponse<M extends RpcMethod>(
  method: M,
  response: unknown,
): asserts response is RpcResponsePayloadOf<M> {
  if (typeof response !== "object" || response === null) {
    throw new Error(`Invalid response of ${method}: ${response}`);
  }
  switch (method) {
    case "action": {
      if (
        !("chosenActionIndex" in response) ||
        typeof response.chosenActionIndex !== "number"
      ) {
        throw new Error("Invalid response of action: no chosenActionIndex");
      }
      if (
        !("usedDice" in response) ||
        !Array.isArray(response.usedDice) ||
        response.usedDice.some((d) => typeof d !== "number")
      ) {
        throw new Error("Invalid response of action: no usedDice");
      }
      break;
    }
    case "chooseActive": {
      if (
        !("activeCharacterId" in response) ||
        typeof response.activeCharacterId !== "number"
      ) {
        throw new Error(
          "Invalid response of chooseActive: no activeCharacterId",
        );
      }
      break;
    }
    case "rerollDice": {
      if (
        !("diceToReroll" in response) ||
        !Array.isArray(response.diceToReroll) ||
        response.diceToReroll.some((d) => typeof d !== "number")
      ) {
        throw new Error("Invalid response of rerollDice: no diceToReroll");
      }
      break;
    }
    case "selectCard": {
      if (
        !("selectedDefinitionId" in response) ||
        typeof response.selectedDefinitionId !== "number"
      ) {
        throw new Error(
          "Invalid response of selectCard: no selectedDefinitionId",
        );
      }
      break;
    }
    case "switchHands": {
      if (
        !("removedHandIds" in response) ||
        !Array.isArray(response.removedHandIds) ||
        response.removedHandIds.some((d) => typeof d !== "number")
      ) {
        throw new Error("Invalid response of switchHands: no removedHandIds");
      }
      break;
    }
    default: {
      const _check: never = method;
      throw new Error(`Unknown method: ${method}`);
    }
  }
}

function exposePhaseType(phase: PhaseType): PbPhaseType {
  switch (phase) {
    case "initActives":
      return PbPhaseType.INIT_ACTIVES;
    case "initHands":
      return PbPhaseType.INIT_HANDS;
    case "roll":
      return PbPhaseType.ROLL;
    case "action":
      return PbPhaseType.ACTION;
    case "end":
      return PbPhaseType.END;
    case "gameEnd":
      return PbPhaseType.GAME_END;
  }
}
function exposeEntityWhere(where: EntityArea["type"]): PbEntityArea {
  switch (where) {
    case "characters":
      return PbEntityArea.CHARACTER;
    case "combatStatuses":
      return PbEntityArea.COMBAT_STATUS;
    case "summons":
      return PbEntityArea.SUMMON;
    case "supports":
      return PbEntityArea.SUPPORT;
    case "hands":
      return PbEntityArea.HAND;
    case "pile":
      return PbEntityArea.PILE;
  }
  return PbEntityArea.UNSPECIFIED;
}

function exposeEntityType(type: EntityType): PbEntityType {
  switch (type) {
    case "eventCard":
      return PbEntityType.EVENT_CARD;
    case "status":
      return PbEntityType.STATUS;
    case "combatStatus":
      return PbEntityType.COMBAT_STATUS;
    case "summon":
      return PbEntityType.SUMMON;
    case "support":
      return PbEntityType.SUPPORT;
    case "equipment":
      return PbEntityType.EQUIPMENT;
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Unhandled entity type: ${exhaustiveCheck}`);
    }
  }
}

export function exposeMutation(
  who: 0 | 1,
  m: Mutation,
): ExposedMutation | null {
  switch (m.type) {
    case "stepRandom":
    case "stepId":
    case "mutateExtensionState":
    case "clearRemovedEntities":
    case "pushRoundSkillLog":
    case "clearRoundLogs":
    case "pushPhaseDamageLog":
    case "pushPhaseReactionLog":
    case "clearPhaseLogs":
    case "resetVariables":
    case "switchActive": // We will manually handle this
      return null;
    case "setPlayerFlag": {
      const FLAG_NAME_MAP: Partial<Record<PlayerFlag, PbPlayerFlag>> = {
        declaredEnd: PbPlayerFlag.DECLARED_END,
        legendUsed: PbPlayerFlag.LEGEND_USED,
      };
      const flagName = FLAG_NAME_MAP[m.flagName];
      if (flagName) {
        return {
          $case: "setPlayerFlag",
          who: m.who,
          flagName,
          flagValue: m.value,
        };
      } else {
        return null;
      }
    }
    case "swapCharacterPosition":
      return {
        $case: "swapCharacterPosition",
        who: m.who,
        character0Id: m.characters[0].id,
        character0DefinitionId: m.characters[0].definition.id,
        character1Id: m.characters[1].id,
        character1DefinitionId: m.characters[1].definition.id,
      };
    case "changePhase":
      const newPhase = exposePhaseType(m.newPhase);
      return {
        $case: "changePhase",
        newPhase,
      };
    case "stepRound":
      return { $case: "stepRound" };
    case "switchTurn":
      return { $case: "switchTurn" };
    case "setWinner":
      return { $case: "setWinner", winner: m.winner };
    case "createCharacter": {
      return {
        $case: "createCharacter",
        who: m.who,
        character: exposeCharacter(null, null, m.value),
      };
    }
    case "createEntity": {
      // 对手塞入牌库/手牌的信息不可见
      const hidden =
        m.target.who !== who && ["hands", "pile"].includes(m.target.type);
      return {
        $case: "createEntity",
        who: m.target.who,
        where: exposeEntityWhere(m.target.type),
        entity: exposeEntity(null, m.value, hidden),
        masterCharacterId:
          m.target.type === "characters" ? m.target.characterId : void 0,
      };
    }
    case "createAttachment": {
      return {
        $case: "createAttachment",
        who: m.target.who,
        where: exposeEntityWhere(m.target.type),
        attachment: exposeAttachment(null, m.value),
        masterCardId: m.target.cardId,
      };
    }
    case "moveEntity": {
      const fromWhere = exposeEntityWhere(m.from.type);
      const toWhere = exposeEntityWhere(m.target.type);

      // 对手塞入牌库/手牌的信息不可见
      const hidden =
        m.from.who !== who && ["hands", "pile"].includes(m.target.type);
      const REASON_MAP: Record<MoveEntityM["reason"], PbMoveEntityReason> = {
        draw: PbMoveEntityReason.DRAW,
        undraw: PbMoveEntityReason.UNDRAW,
        steal: PbMoveEntityReason.STEAL,
        switch: PbMoveEntityReason.SWITCH,
        swap: PbMoveEntityReason.SWAP,
        createSupport: PbMoveEntityReason.CREATE_SUPPORT,
        equip: PbMoveEntityReason.EQUIP,
        unequip: PbMoveEntityReason.UNEQUIP,
        unsupport: PbMoveEntityReason.UNSUPPORT,
        other: PbMoveEntityReason.UNSPECIFIED,
      };
      return {
        $case: "moveEntity",
        fromWho: m.from.who,
        fromWhere,
        toWho: m.target.who,
        toWhere,
        toMasterCharacterId:
          m.target.type === "characters" ? m.target.characterId : void 0,
        targetIndex: m.targetIndex,
        entity: exposeEntity(null, m.value, hidden),
        reason: REASON_MAP[m.reason] ?? PbMoveEntityReason.UNSPECIFIED,
      };
    }
    case "removeEntity": {
      if (
        m.oldState.definition.type === "character" ||
        m.oldState.definition.type === "attachment"
      ) {
        return null;
      }
      const hidden =
        m.from.who !== who &&
        ["hands", "pile"].includes(m.from.type) &&
        ["overflow", "elementalTuning"].includes(m.reason);
      const REASON_MAP: Record<RemoveEntityM["reason"], PbRemoveEntityReason> =
        {
          cardDisposed: PbRemoveEntityReason.CARD_DISPOSED,
          targetOfSupportPlayed:
            PbRemoveEntityReason.TARGET_OF_SUPPORT_PLAYED,
          elementalTuning: PbRemoveEntityReason.ELEMENTAL_TUNING,
          eventCardDrawn: PbRemoveEntityReason.EVENT_CARD_DRAWN,
          eventCardPlayed: PbRemoveEntityReason.EVENT_CARD_PLAYED,
          eventCardPlayNoEffect: PbRemoveEntityReason.EVENT_CARD_PLAY_NO_EFFECT,
          equipOverridden: PbRemoveEntityReason.EQUIP_OVERRIDDEN,
          createSupportOverridden:
            PbRemoveEntityReason.CREATE_SUPPORT_OVERRIDDEN,
          overflow: PbRemoveEntityReason.OVERFLOW,
          other: PbRemoveEntityReason.UNSPECIFIED,
        };
      return {
        $case: "removeEntity",
        who: m.from.who,
        where: exposeEntityWhere(m.from.type),
        entity: exposeEntity(null, m.oldState as EntityState, hidden),
        reason: REASON_MAP[m.reason] ?? PbRemoveEntityReason.UNSPECIFIED,
      };
    }
    case "modifyEntityVar": {
      const direction: PbModifyDirection =
        m.direction === null
          ? PbModifyDirection.UNSPECIFIED
          : m.direction === "increase"
            ? PbModifyDirection.INCREASE
            : PbModifyDirection.DECREASE;
      return {
        $case: "modifyEntityVar",
        entityId: m.state.id,
        entityDefinitionId: m.state.definition.id,
        variableName: m.varName,
        variableValue: m.value,
        direction,
      };
    }
    case "transformDefinition": {
      return {
        $case: "transformDefinition",
        entityId: m.state.id,
        newEntityDefinitionId: m.newDefinition.id,
      };
    }
    case "resetDice": {
      const dice =
        m.who === who
          ? ([...m.value] as PbDiceType[])
          : Array.from(m.value, () => PbDiceType.UNSPECIFIED);
      const reason =
        {
          roll: PbResetDiceReason.ROLL,
          consume: PbResetDiceReason.CONSUME,
          elementalTuning: PbResetDiceReason.ELEMENTAL_TUNING,
          generate: PbResetDiceReason.GENERATE,
          convert: PbResetDiceReason.CONVERT,
          absorb: PbResetDiceReason.ABSORB,
          other: PbResetDiceReason.UNSPECIFIED,
        }[m.reason] ?? PbResetDiceReason.UNSPECIFIED;
      return {
        $case: "resetDice",
        who: m.who,
        dice,
        reason,
        conversionTargetHint: m.conversionTargetHint as PbDiceType | undefined,
      };
    }
    default: {
      const _check: never = m;
      return null;
    }
  }
}

const EXPOSED_TAGS: Partial<Record<EntityTag, number>> = {
  shield: CHARACTER_TAG_SHIELD,
  barrier: CHARACTER_TAG_BARRIER,
  disableSkill: CHARACTER_TAG_DISABLE_SKILL,
  nightsoulsBlessing: CHARACTER_TAG_NIGHTSOULS_BLESSING,
  bondOfLife: CHARACTER_TAG_BOND_OF_LIFE,
};
function exposeTag(entities: EntityState[]) {
  let result = 0;
  for (const et of entities) {
    for (const [name, bit] of Object.entries(EXPOSED_TAGS) as [
      EntityTag,
      number,
    ][]) {
      if (et.definition.tags.includes(name)) {
        if (
          name === "barrier" &&
          !(et.variables.barrierUsage || et.variables.usage)
        ) {
          // for barrier: only expose if it has usage
          continue;
        }
        result |= bit;
      }
    }
  }
  return result;
}

export function exposeEntity(
  state: GameState | null,
  e: Omit<EntityState, StateSymbol>,
  hide: boolean,
): PbEntityState {
  let equipment: PbEquipmentType | undefined = void 0;
  if (e.definition.type === "equipment") {
    if (e.definition.tags.includes("artifact")) {
      equipment = PbEquipmentType.ARTIFACT;
    } else if (e.definition.tags.includes("weapon")) {
      equipment = PbEquipmentType.WEAPON;
    } else if (e.definition.tags.includes("technique")) {
      equipment = PbEquipmentType.TECHNIQUE;
    } else {
      equipment = PbEquipmentType.OTHER;
    }
  }
  if (e.definition.id === 0) {
    hide = true;
  }
  const descriptionDictionary =
    hide || state === null
      ? {}
      : Object.fromEntries(
          Object.entries(e.definition.descriptionDictionary).map(([k, v]) => [
            k,
            v(state, e.id),
          ]),
        );
  const hasUsagePerRound = USAGE_PER_ROUND_VARIABLE_NAMES.some(
    (name) => e.variables[name],
  );
  const definitionCost: PbDiceRequirement[] = [];
  if (!hide) {
    definitionCost.push(...exposeDiceRequirement(costOfCard(e.definition)));
    if (e.definition.tags.includes("legend")) {
      definitionCost.push({
        type: PbDiceRequirementType.LEGEND,
        count: 1,
      });
    }
  }
  const EXPOSED_TAGS: Partial<Record<EntityTag | AttachmentTag, number>> = {
    abyss: CARD_TAG_ABYSS,
    conductive: CARD_TAG_CONDUCTIVE,
  };
  const tags = [
    ...e.definition.tags,
    ...e.attachments.flatMap((att) => att.definition.tags),
  ];
  let pbTags = 0;
  for (const tag of tags) {
    const bit = EXPOSED_TAGS[tag];
    if (bit) {
      pbTags |= bit;
    }
  }
  return {
    id: e.id,
    type: hide ? PbEntityType.UNSPECIFIED : exposeEntityType(e.definition.type),
    definitionId: hide ? 0 : e.definition.id,
    variableValue: e.definition.visibleVarName
      ? e.variables[e.definition.visibleVarName] ?? void 0
      : void 0,
    variableName: e.definition.visibleVarName ?? void 0,
    hasUsagePerRound,
    hintIcon: e.variables.hintIcon ?? void 0,
    hintText: e.definition.hintText ?? void 0,
    equipment,
    descriptionDictionary,
    definitionCost,
    tags: pbTags,
    attachment: hide
      ? []
      : e.attachments.map((att) => exposeAttachment(state, att)),
  };
}

export function exposeAttachment(
  state: GameState | null,
  att: Omit<AttachmentState, StateSymbol>,
): PbAttachmentState {
  const descriptionDictionary =
    state === null
      ? {}
      : Object.fromEntries(
          Object.entries(att.definition.descriptionDictionary).map(([k, v]) => [
            k,
            v(state, att.id),
          ]),
        );
  return {
    id: att.id,
    definitionId: att.definition.id,
    descriptionDictionary,
    variableName: att.definition.visibleVarName ?? void 0,
    variableValue: att.definition.visibleVarName
      ? att.variables[att.definition.visibleVarName] ?? void 0
      : void 0,
  };
}

function exposeDiceRequirement(
  req: ReadonlyDiceRequirement,
): PbDiceRequirement[] {
  return req
    .entries()
    .map(([k, v]) => ({ type: k as PbDiceRequirementType, count: v }))
    .toArray();
}

export function exposeCharacter(
  state: GameState | null,
  player: PlayerState | null,
  ch: Omit<CharacterState, StateSymbol>,
): PbCharacterState {
  const tags = exposeTag([
    ...(player?.activeCharacterId === ch.id
      ? [...player.combatStatuses, ...player.summons]
      : []),
    ...ch.entities,
  ]);
  let energy = ch.variables.energy;
  let maxEnergy = ch.variables.maxEnergy;
  let specialEnergyName: string | undefined = void 0;
  if (ch.definition.specialEnergy) {
    specialEnergyName = ch.definition.specialEnergy.variableName;
    energy = ch.variables[specialEnergyName];
    maxEnergy = ch.definition.specialEnergy.slotSize;
  }
  return {
    id: ch.id,
    definitionId: ch.definition.id,
    defeated: !ch.variables.alive,
    entity: ch.entities.map((e) => exposeEntity(state, e, false)),
    health: ch.variables.health,
    energy,
    maxHealth: ch.variables.maxHealth,
    maxEnergy,
    aura: ch.variables.aura,
    tags,
    specialEnergyName,
  };
}

function exposeInitiativeSkill(skill: InitiativeSkillDefinition): PbSkillInfo {
  return {
    definitionId: skill.id,
    definitionCost: exposeDiceRequirement(
      skill.initiativeSkillConfig.requiredCost,
    ),
  };
}

export function exposeState(who: 0 | 1, state: GameState): PbGameState {
  return {
    phase: exposePhaseType(state.phase),
    currentTurn: state.currentTurn,
    roundNumber: state.roundNumber,
    winner: state.winner ?? void 0,
    player: state.players.map<PbPlayerState>((p, i) => {
      const skills = initiativeSkillsOfPlayer(p).map(({ skill }) => skill);
      const dice =
        i === who
          ? ([...p.dice] as PbDiceType[])
          : p.dice.map(() => PbDiceType.UNSPECIFIED);
      return {
        activeCharacterId: p.activeCharacterId,
        pileCard: p.pile.map((c) => exposeEntity(state, c, true)),
        handCard: p.hands.map((c) => exposeEntity(state, c, i !== who)),
        character: p.characters.map((ch) => exposeCharacter(state, p, ch)),
        dice,
        combatStatus: p.combatStatuses.map((e) =>
          exposeEntity(state, e, false),
        ),
        support: p.supports.map((e) => exposeEntity(state, e, false)),
        summon: p.summons.map((e) => exposeEntity(state, e, false)),
        initiativeSkill: i === who ? skills.map(exposeInitiativeSkill) : [],
        declaredEnd: p.declaredEnd,
        legendUsed: p.legendUsed,
        status: PbPlayerStatus.UNSPECIFIED,
      };
    }),
  };
}

export function exposeAction(action: ActionInfo): Action {
  const BASE = {
    requiredCost: exposeDiceRequirement(action.cost),
    autoSelectedDice: action.autoSelectedDice as PbDiceType[],
    validity: action.validity,
    preview: action.preview ?? [],
    isFast: action.fast,
  };
  switch (action.type) {
    case "useSkill": {
      return {
        action: {
          $case: "useSkill",
          value: {
            skillDefinitionId: action.skill.definition.id,
            targetIds: action.targets.map((t) => t.id),
            mainDamageTargetId: action.mainDamageTargetId,
          },
        },
        ...BASE,
      };
    }
    case "playCard": {
      return {
        action: {
          $case: "playCard",
          value: {
            cardId: action.skill.caller.id,
            cardDefinitionId: action.skill.caller.definition.id,
            targetIds: action.targets.map((t) => t.id),
            willBeEffectless: action.willBeEffectless,
          },
        },
        ...BASE,
      };
    }
    case "switchActive": {
      return {
        action: {
          $case: "switchActive",
          value: {
            characterId: action.to.id,
            characterDefinitionId: action.to.definition.id,
          },
        },
        ...BASE,
      };
    }
    case "elementalTuning": {
      return {
        action: {
          $case: "elementalTuning",
          value: {
            removedCardId: action.card.id,
            targetDice: action.result as PbDiceType,
          },
        },
        ...BASE,
      };
    }
    case "declareEnd": {
      return {
        action: {
          $case: "declareEnd",
          value: {},
        },
        ...BASE,
      };
    }
  }
}

export function exposeHealKind(healKind: HealKind | null): PbHealKind {
  if (healKind === null) {
    return PbHealKind.NOT_A_HEAL;
  }
  return {
    common: PbHealKind.COMMON,
    immuneDefeated: PbHealKind.IMMUNE_DEFEATED,
    revive: PbHealKind.REVIVE,
    increaseMaxHealth: PbHealKind.INCREASE_MAX_HEALTH,
    distribution: PbHealKind.DISTRIBUTION,
  }[healKind];
}

export interface CancellablePlayerIO extends PlayerIO {
  cancelRpc?: () => void;
}

/**
 * 合并多个 playerIo。只有 mainIo 的 rpc response 会被接受；
 * 其余的 io 只会接受 notification 和 request，以及 rpc 的 cancellation
 * @param mainIo
 * @param restIos
 * @returns
 */
export function mergeIo<T extends PlayerIO>(
  mainIo: T,
  ...restIos: CancellablePlayerIO[]
): T {
  const allIos = [mainIo, ...restIos];
  return {
    ...mainIo,
    notify: (notification) => {
      for (const io of allIos) {
        io.notify(notification);
      }
    },
    rpc: (request) => {
      for (const io of restIos) {
        Promise.try(() => io.rpc(request)).catch(() => {});
      }
      return mainIo.rpc(request).finally(() => {
        for (const io of restIos) {
          io.cancelRpc?.();
        }
      });
    },
  };
}
