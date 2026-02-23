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
  type CreateCharacterEM,
  type CreateEntityEM,
  flattenPbOneof,
  type ModifyEntityVarEM,
  PbCharacterState,
  PbEntityState,
  PbPhaseType,
  PbReactionType,
  type PbExposedMutation,
  type PbGameState,
  PbSkillType,
  PbEntityArea,
  type SwitchActiveEM,
  PbPlayerFlag,
  Reaction,
  PbPlayerStatus,
  PbSwitchActiveFromAction,
  PbDamageType,
  PbHealKind,
  DiceType,
  type ResetDiceEM,
  PbResetDiceReason,
  PbRemoveEntityReason,
  PbMoveEntityReason,
  CreateAttachmentEM,
  PbAttachmentState,
  PbEntityType,
  MoveEntityEM,
} from "@gi-tcg/typings";
import type {
  AbsorbDiceHistoryChild,
  ConvertDiceHistoryChild,
  EnergyHistoryChild,
  GenerateDiceHistoryChild,
  HistoryBlock,
  HistoryChildren,
  HistoryDetailBlock,
  IncreaseMaxHealthHistoryChild,
  UseSkillHistoryBlock,
  VariableChangeHistoryChild,
} from "./typings";
import { flip } from "@gi-tcg/utils";

export interface HistoryData {
  blocks: HistoryBlock[];
  currentIndent: number;
  recorder: StateRecorder;
}

interface VariableRecordEntry {
  oldValue: number;
  newValue: number;
}

class VariableRecord {
  readonly records: VariableRecordEntry[] = [];
  constructor(private readonly initValue = 0) {}

  set(current: number) {
    const oldValue = this.records.at(-1)?.newValue ?? this.initValue;
    this.records.push({
      oldValue,
      newValue: current,
    });
  }

  take() {
    const result = this.records.at(-1);
    return result ?? null;
  }
}

interface Area {
  who: 0 | 1;
  onStage: boolean;
  masterDefinitionId: number | null;
}
export type EntityType =
  | "equipment"
  | "status"
  | "combatStatus"
  | "summon"
  | "support"
  | "eventCard"
  | "unknown"
  | "character"
  | "attachment";

const PB_ENTITY_TYPE_MAP: Record<PbEntityType, EntityType> = {
  [PbEntityType.UNSPECIFIED]: "unknown",
  [PbEntityType.EVENT_CARD]: "eventCard",
  [PbEntityType.STATUS]: "status",
  [PbEntityType.COMBAT_STATUS]: "combatStatus",
  [PbEntityType.SUMMON]: "summon",
  [PbEntityType.SUPPORT]: "support",
  [PbEntityType.EQUIPMENT]: "equipment",
};

/**
 * 收集所有的 ModifyEntityVarEM，以记录 VariableChangeHistoryChild
 * 等需要使用的旧值
 */
export class StateRecorder {
  readonly visibleVarRecords = new Map<number, VariableRecord>();
  readonly energyVarRecords = new Map<number, VariableRecord>();
  readonly maxHealthVarRecords = new Map<number, VariableRecord>();

  readonly maxEnergies = new Map<number, number>();
  readonly entityInitStates = new Map<
    number,
    {
      variableName?: string;
      definitionId: number;
      type: EntityType;
    }
  >();
  readonly area = new Map<number, Area>();
  readonly activeCharacterDefinitionIds = [void 0, void 0] as [
    number | undefined,
    number | undefined,
  ];
  readonly dice: [DiceType[], DiceType[]] = [[], []];

  onInitialize(previousState: PbGameState | undefined) {
    if (!previousState) {
      return;
    }
    for (const who of [0, 1] as const) {
      const player = previousState.player[who];
      for (const ch of player.character) {
        if (ch.id === player.activeCharacterId) {
          this.activeCharacterDefinitionIds[who] = ch.definitionId;
        }
        this.initializeCharacter(who, ch);
      }
      for (const prop of ["combatStatus", "summon", "support"] as const) {
        const area = { who, onStage: true, masterDefinitionId: null };
        for (const entity of player[prop]) {
          this.initializeEntity(area, entity, prop);
        }
      }
      for (const card of [...player.pileCard, ...player.handCard]) {
        this.area.set(card.id, {
          who,
          onStage: false,
          masterDefinitionId: card.definitionId,
        });
        for (const attachment of card.attachment) {
          this.initializeAttachment(
            { who, onStage: false, masterDefinitionId: card.definitionId },
            attachment,
          );
        }
      }
      this.dice[who] = [...player.dice] as DiceType[];
    }
  }

  private initializeEntity(
    area: Area,
    entity: PbEntityState,
    entityType: EntityType,
  ) {
    this.area.set(entity.id, area);
    this.entityInitStates.set(entity.id, { ...entity, type: entityType });
    if (entity.variableName) {
      this.visibleVarRecords.set(
        entity.id,
        new VariableRecord(entity.variableValue ?? 0),
      );
    }
  }

  private initializeAttachment(area: Area, attachment: PbAttachmentState) {
    this.area.set(attachment.id, area);
    this.entityInitStates.set(attachment.id, {
      ...attachment,
      type: "attachment",
    });
    if (attachment.variableName) {
      this.visibleVarRecords.set(
        attachment.id,
        new VariableRecord(attachment.variableValue ?? 0),
      );
    }
  }

  private initializeCharacter(who: 0 | 1, character: PbCharacterState) {
    const area = {
      who,
      onStage: true,
      masterDefinitionId: character.definitionId,
    };
    this.area.set(character.id, area);
    this.energyVarRecords.set(
      character.id,
      new VariableRecord(character.energy),
    );
    this.maxHealthVarRecords.set(
      character.id,
      new VariableRecord(character.maxHealth),
    );
    this.maxEnergies.set(character.id, character.maxEnergy);
    for (const entity of character.entity) {
      this.initializeEntity(
        area,
        entity,
        typeof entity.equipment === "number" ? "equipment" : "status",
      );
    }
  }

  receiveModifyVar(
    varMut: ModifyEntityVarEM,
  ):
    | VariableChangeHistoryChild
    | IncreaseMaxHealthHistoryChild
    | EnergyHistoryChild
    | null {
    const { entityId, entityDefinitionId, variableName, variableValue } =
      varMut;
    let record: VariableRecord | undefined;
    if (
      variableName === "energy" &&
      (record = this.energyVarRecords.get(varMut.entityId))
    ) {
      record.set(variableValue);
      const { oldValue = 0, newValue = 0 } = record.take() ?? {};
      return {
        type: "energy",
        who: this.area.get(entityId)?.who ?? 0,
        characterDefinitionId: entityDefinitionId,
        oldEnergy: oldValue,
        newEnergy: newValue,
      };
    }
    if (
      variableName === "maxHealth" &&
      (record = this.maxHealthVarRecords.get(varMut.entityId))
    ) {
      record.set(variableValue);
      const { oldValue = 0, newValue = 0 } = record.take() ?? {};
      return {
        type: "increaseMaxHealth",
        who: this.area.get(entityId)?.who ?? 0,
        characterDefinitionId: entityDefinitionId,
        oldMaxHealth: oldValue,
        newMaxHealth: newValue,
      };
    }

    if (this.entityInitStates.get(entityId)?.variableName === variableName) {
      const record = this.visibleVarRecords.get(entityId);
      if (record) {
        record.set(variableValue);
        const { oldValue = 0, newValue = 0 } = record.take() ?? {};
        return {
          type: "variableChange",
          who: this.area.get(entityId)?.who ?? 0,
          cardDefinitionId: entityDefinitionId,
          variableName,
          oldValue,
          newValue,
        };
      }
    }
    return null;
  }

  receiveResetDice(
    mut: ResetDiceEM,
  ):
    | AbsorbDiceHistoryChild[]
    | ConvertDiceHistoryChild[]
    | GenerateDiceHistoryChild[] {
    const new_ = [...mut.dice] as DiceType[];
    const old = this.dice[mut.who as 0 | 1];
    this.dice[mut.who as 0 | 1] = new_;

    switch (mut.reason) {
      case PbResetDiceReason.CONVERT:
      case PbResetDiceReason.ELEMENTAL_TUNING: {
        const target = mut.conversionTargetHint as DiceType;
        if (!target) {
          return [];
        }
        const oldCount = old.filter((d) => d === target).length;
        const newCount = new_.filter((d) => d === target).length;
        const diceCount = newCount - oldCount;
        return [
          {
            type: "convertDice",
            who: mut.who as 0 | 1,
            diceType: target,
            count:
              mut.reason === PbResetDiceReason.ELEMENTAL_TUNING ? 1 : diceCount,
            isTuning: mut.reason === PbResetDiceReason.ELEMENTAL_TUNING,
          },
        ];
      }
      case PbResetDiceReason.GENERATE: {
        const generated: DiceType[] = [];
        for (const d of new_) {
          const idx = old.indexOf(d);
          if (idx === -1) {
            generated.push(d);
          } else {
            old.splice(idx, 1);
          }
        }
        return Map.groupBy(generated, (i) => i)
          .entries()
          .toArray()
          .map(
            ([d, arr]): GenerateDiceHistoryChild => ({
              type: "generateDice",
              who: mut.who as 0 | 1,
              diceType: d,
              count: arr.length,
            }),
          );
      }
      case PbResetDiceReason.ABSORB: {
        const diceCount = old.length - new_.length;
        return [
          {
            type: "absorbDice",
            who: mut.who as 0 | 1,
            count: diceCount,
          },
        ];
      }
      default: {
        return [];
      }
    }
  }

  getMasterDefinitionId(entityId: number) {
    const { who = 0, masterDefinitionId = null } =
      this.area.get(entityId) ?? {};
    const type = this.entityInitStates.get(entityId)?.type;
    if (type === "combatStatus") {
      return this.activeCharacterDefinitionIds[who];
    }
    return masterDefinitionId ?? void 0;
  }

  onNewEntity(mut: CreateEntityEM) {
    const { who, where, masterCharacterId, entity } = mut as CreateEntityEM & {
      entity: PbEntityState;
    };

    const entityType = PB_ENTITY_TYPE_MAP[entity.type];
    let masterDefinitionId: number | null = null;
    if (masterCharacterId) {
      masterDefinitionId =
        this.area.get(masterCharacterId)?.masterDefinitionId ?? null;
    } else {
      masterDefinitionId = entity.definitionId;
    }
    const onStage = ![PbEntityArea.HAND, PbEntityArea.PILE].includes(where);
    this.initializeEntity(
      { who: who as 0 | 1, onStage, masterDefinitionId },
      entity,
      entityType,
    );
  }
  renewEntityArea(mut: MoveEntityEM) {
    const { entity, toWho, toWhere, toMasterCharacterId } = mut;
    const area = this.area.get(entity!.id);
    if (area) {
      area.who = toWho as 0 | 1;
      area.onStage = ![PbEntityArea.HAND, PbEntityArea.PILE].includes(toWhere);
      if (toMasterCharacterId) {
        area.masterDefinitionId =
          this.area.get(toMasterCharacterId)?.masterDefinitionId ?? null;
      }
    }
  }
  onNewCharacter(mut: CreateCharacterEM) {
    const { who, character } = mut as CreateCharacterEM & {
      character: PbEntityState;
    };
    this.initializeCharacter(who as 0 | 1, character);
  }
  onNewAttachment(mut: CreateAttachmentEM) {
    const masterDefinitionId =
      this.area.get(mut.masterCardId)?.masterDefinitionId ?? null;
    this.initializeAttachment(
      { who: mut.who as 0 | 1, onStage: false, masterDefinitionId },
      mut.attachment!,
    );
  }
  onSwitchActive(mut: SwitchActiveEM) {
    this.activeCharacterDefinitionIds[mut.who as 0 | 1] =
      mut.characterDefinitionId;
  }
}

export function updateHistory(
  previousState: PbGameState | undefined,
  mutations: PbExposedMutation[],
  history: HistoryData,
) {
  try {
    const lastMainBlock = history.blocks.at(-1);
    const lastHintBlock = history.blocks.findLast((b) => !("children" in b));

    let roundNumber = previousState?.roundNumber ?? 0;
    let phase = previousState?.phase ?? PbPhaseType.ACTION;

    let maybeEndPhaseDrawing = false;

    let mainBlock: HistoryDetailBlock | null = null;
    const children: HistoryChildren[] = [];
    history.recorder.onInitialize(previousState);

    const getLastChild = () => {
      return (
        children.at(-1) ??
        (lastMainBlock && "children" in lastMainBlock
          ? lastMainBlock.children.at(-1)
          : void 0)
      );
    };

    for (const pbm of mutations) {
      const m = flattenPbOneof(pbm.mutation!);
      switch (m.$case) {
        case "changePhase": {
          const newPhase = (
            {
              [PbPhaseType.INIT_HANDS]: "initHands",
              [PbPhaseType.INIT_ACTIVES]: "initActives",
              [PbPhaseType.ACTION]: "action",
              [PbPhaseType.END]: "end",
              [PbPhaseType.ROLL]: null,
              [PbPhaseType.GAME_END]: null,
            } as const
          )[m.newPhase];
          if (!newPhase) {
            continue;
          }
          history.blocks.push({
            type: "changePhase",
            roundNumber,
            newPhase,
          });
          phase = m.newPhase;
          break;
        }
        case "resetDice": {
          children.push(...history.recorder.receiveResetDice(m));
          break;
        }
        case "modifyEntityVar": {
          const child = history.recorder.receiveModifyVar(m);
          if (child) {
            children.push(child);
          }
          break;
        }
        case "applyAura": {
          children.push({
            type: "apply",
            who: history.recorder.area.get(m.targetId)?.who ?? 0,
            characterDefinitionId: m.targetDefinitionId,
            elementType: m.elementType,
            reaction:
              m.reactionType === PbReactionType.UNSPECIFIED
                ? void 0
                : m.reactionType,
            oldAura: m.oldAura,
            newAura: m.newAura,
          });
          break;
        }
        case "damage": {
          if (m.damageType === PbDamageType.HEAL) {
            children.push({
              type: "heal",
              who: history.recorder.area.get(m.targetId)?.who ?? 0,
              characterDefinitionId: m.targetDefinitionId,
              healValue: m.value,
              oldHealth: m.oldHealth,
              newHealth: m.newHealth,
              healType:
                m.healKind === PbHealKind.IMMUNE_DEFEATED
                  ? "immuneDefeated"
                  : m.healKind === PbHealKind.REVIVE
                    ? "revive"
                    : "normal",
            });
          } else {
            children.push({
              type: "damage",
              who: history.recorder.area.get(m.targetId)?.who ?? 0,
              characterDefinitionId: m.targetDefinitionId,
              damageType: m.damageType,
              damageValue: m.value,
              causeDefeated: m.causeDefeated,
              reaction:
                m.reactionType === PbReactionType.UNSPECIFIED
                  ? void 0
                  : m.reactionType,
              oldAura: m.oldAura,
              newAura: m.newAura,
              newHealth: m.newHealth,
              oldHealth: m.oldHealth,
            });
          }
          break;
        }
        case "createEntity": {
          history.recorder.onNewEntity(m);
          const { definitionId, id } = m.entity!;
          const { type } = history.recorder.entityInitStates.get(id)!;

          if (m.where === PbEntityArea.HAND || m.where === PbEntityArea.PILE) {
            children.push({
              type: "createCard",
              who: m.who as 0 | 1,
              cardDefinitionId: definitionId,
              target: m.where === PbEntityArea.HAND ? "hands" : "pile",
            });
          } else {
            children.push({
              type: "createEntity",
              who: m.who as 0 | 1,
              masterDefinitionId: history.recorder.getMasterDefinitionId(id),
              entityDefinitionId: definitionId,
              entityType: type,
            });
          }
          break;
        }
        case "createAttachment": {
          history.recorder.onNewAttachment(m);
          const { definitionId, id } = m.attachment!;
          children.push({
            type: "createEntity",
            who: m.who as 0 | 1,
            masterDefinitionId: history.recorder.getMasterDefinitionId(id),
            entityDefinitionId: definitionId,
            entityType: "attachment",
          });
          break;
        }
        case "createCharacter": {
          history.recorder.onNewCharacter(m);
          break;
        }
        case "removeEntity": {
          if (m.where === PbEntityArea.HAND || m.where === PbEntityArea.PILE) {
            const definitionId = m.entity!.definitionId;
            const { onStage = false } =
              history.recorder.area.get(m.entity!.id) ?? {};
            if (
              m.reason === PbRemoveEntityReason.EVENT_CARD_PLAYED ||
              m.reason === PbRemoveEntityReason.EVENT_CARD_PLAY_NO_EFFECT ||
              m.reason === PbRemoveEntityReason.EQUIP_OVERRIDDEN ||
              m.reason === PbRemoveEntityReason.CREATE_SUPPORT_OVERRIDDEN
            ) {
              mainBlock = {
                type: "playCard",
                who: m.who as 0 | 1,
                cardDefinitionId: definitionId,
                children: [],
                indent: history.currentIndent,
              };
              if (m.reason === PbRemoveEntityReason.EVENT_CARD_PLAY_NO_EFFECT) {
                children.push({
                  type: "playCardNoEffect",
                  who: m.who as 0 | 1,
                  cardDefinitionId: definitionId,
                });
              }
            } else if (m.reason === PbRemoveEntityReason.ELEMENTAL_TUNING) {
              mainBlock = {
                type: "elementalTuning",
                who: m.who as 0 | 1,
                cardDefinitionId: definitionId,
                children: [],
                indent: history.currentIndent,
              };
            } else if (m.reason === PbRemoveEntityReason.OVERFLOW && !onStage) {
              children.push({
                type: "overflowCard",
                who: m.who as 0 | 1,
                cardDefinitionId: definitionId,
              });
            } else if (m.reason === PbRemoveEntityReason.CARD_DISPOSED) {
              children.push({
                type: "removeCard",
                who: m.who as 0 | 1,
                cardDefinitionId: definitionId,
              });
            }
          } else {
            const { definitionId, id } = m.entity!;
            const area = history.recorder.area.get(id);
            const { type } = history.recorder.entityInitStates.get(id)!;
            children.push({
              type: "removeEntity",
              who: area?.who ?? 0,
              masterDefinitionId: history.recorder.getMasterDefinitionId(id),
              entityDefinitionId: definitionId,
              entityType: type,
            });
          }
          break;
        }
        case "setPlayerFlag": {
          if (m.flagName === PbPlayerFlag.DECLARED_END && m.flagValue) {
            history.blocks.push({
              type: "action",
              who: m.who as 0 | 1,
              actionType: "declareEnd",
            });
          }
          break;
        }
        case "switchActive": {
          history.recorder.onSwitchActive(m);
          if (phase < PbPhaseType.ROLL) {
            // we have chooseActiveDone for initial selection
            // @CherryC9H13N do not want the children here.
            break;
          }
          const who = m.who as 0 | 1;
          if (m.fromAction === PbSwitchActiveFromAction.NONE) {
            children.push({
              type: "switchActive",
              who,
              characterDefinitionId: m.characterDefinitionId,
              isOverloaded: m.viaSkillDefinitionId === Reaction.Overloaded,
            });
          } else {
            history.blocks.push({
              type: "switchOrChooseActive",
              who: m.who as 0 | 1,
              characterDefinitionId: m.characterDefinitionId,
              children: [],
              how: "switch",
              indent: history.currentIndent,
            });
          }
          break;
        }
        case "moveEntity": {
          if (phase < PbPhaseType.ROLL) {
            break;
          }
          if (
            m.reason === PbMoveEntityReason.EQUIP ||
            m.reason === PbMoveEntityReason.CREATE_SUPPORT
          ) {
            history.recorder.renewEntityArea(m);
            mainBlock = {
              type: "playCard",
              who: m.fromWho as 0 | 1,
              cardDefinitionId: m.entity!.definitionId,
              children: [],
              indent: history.currentIndent,
            };
          } else if (
            m.reason === PbMoveEntityReason.UNEQUIP ||
            m.reason === PbMoveEntityReason.UNSUPPORT
          ) {
            children.push({
              type: "createCard",
              who: m.toWho as 0 | 1,
              cardDefinitionId: m.entity!.definitionId,
              target: "hands",
            });
          } else if (m.reason === PbMoveEntityReason.DRAW) {
            if (!mainBlock && phase === PbPhaseType.END) {
              maybeEndPhaseDrawing = true;
            }
            const lastChild = getLastChild();
            if (lastChild?.type === "drawCard" && lastChild.who === m.fromWho) {
              lastChild.drawCardsCount += 1;
            } else {
              children.push({
                type: "drawCard",
                who: m.fromWho as 0 | 1,
                drawCardsCount: 1,
              });
            }
          } else if (m.fromWho !== m.toWho) {
            children.push({
              type: "stealHand",
              who: m.toWho as 0 | 1,
              cardDefinitionId: m.entity!.definitionId,
            });
          } else if (m.reason === PbMoveEntityReason.UNDRAW) {
            const lastChild = getLastChild();
            if (
              lastChild?.type === "undrawCard" &&
              lastChild.who === m.fromWho
            ) {
              lastChild.count += 1;
            } else {
              children.push({
                type: "undrawCard",
                who: m.fromWho as 0 | 1,
                count: 1,
              });
            }
          }
          break;
        }
        case "transformDefinition": {
          const area = history.recorder.area.get(m.entityId);
          const state = history.recorder.entityInitStates.get(m.entityId);
          const oldDefinitionId = state?.definitionId ?? 0;
          if (state) {
            state.definitionId = m.newEntityDefinitionId;
          }
          children.push(
            {
              type: "transformDefinition",
              who: area?.who ?? 0,
              cardDefinitionId: oldDefinitionId,
              stage: "old",
            },
            {
              type: "transformDefinition",
              who: area?.who ?? 0,
              // TransformDefinitionEM cannot hide new definition ID. Lets do that in frontend.
              cardDefinitionId: oldDefinitionId ? m.newEntityDefinitionId : 0,
              stage: "new",
            },
          );
          break;
        }
        case "skillUsed": {
          if (
            m.skillType === PbSkillType.TRIGGERED ||
            m.skillType === PbSkillType.TRIGGERED_FROM_ITS_ATTACHMENT
          ) {
            const { type = "unknown" } =
              history.recorder.entityInitStates.get(m.callerId) ?? {};
            const { onStage = false } =
              history.recorder.area.get(m.callerId) ?? {};
            const isAttachment =
              m.skillType === PbSkillType.TRIGGERED_FROM_ITS_ATTACHMENT;
            const masterDefinitionId =
              history.recorder.getMasterDefinitionId(m.callerId) ??
              m.callerDefinitionId;
            mainBlock = {
              type: "triggered",
              who: m.who as 0 | 1,
              masterOrCallerDefinitionId: masterDefinitionId,
              callerOrSkillDefinitionId:
                onStage || isAttachment
                  ? m.callerDefinitionId
                  : masterDefinitionId,
              children: [],
              indent: history.currentIndent,
              entityType: isAttachment ? "attachment" : type,
            };
            let parentBlock: HistoryBlock | null = null;
            for (let i = history.blocks.length - 1; i >= 0; i--) {
              parentBlock = history.blocks[i];
              if (!("indent" in parentBlock)) {
                // a changePhase or action, the trigger event cannot propagates
                break;
              }
              if (parentBlock.indent < history.currentIndent) {
                break;
              }
            }
            if (parentBlock && "children" in parentBlock) {
              parentBlock.children.push({
                type: "willTriggered",
                who: m.who as 0 | 1,
                callerDefinitionId:
                  onStage || isAttachment
                    ? m.callerDefinitionId
                    : masterDefinitionId,
              });
            }
          } else if (m.skillType === PbSkillType.CHARACTER_PASSIVE) {
            mainBlock = {
              type: "triggered",
              who: m.who as 0 | 1,
              masterOrCallerDefinitionId: m.callerDefinitionId,
              callerOrSkillDefinitionId: Math.floor(m.skillDefinitionId),
              children: [],
              entityType: "character",
              indent: history.currentIndent,
            };
          } else {
            const SKILL_TYPE_MAP = {
              [PbSkillType.NORMAL]: "normal",
              [PbSkillType.ELEMENTAL]: "elemental",
              [PbSkillType.BURST]: "burst",
              [PbSkillType.TECHNIQUE]: "technique",
            } as const;
            mainBlock = {
              type: "useSkill",
              who: m.who as 0 | 1,
              callerDefinitionId: m.callerDefinitionId,
              skillDefinitionId: m.skillDefinitionId,
              skillType: SKILL_TYPE_MAP[m.skillType],
              children: [],
              indent: history.currentIndent,
            };
          }
          break;
        }
        case "stepRound": {
          roundNumber++;
          break;
        }
        case "playerStatusChange": {
          if (m.status === PbPlayerStatus.ACTING) {
            const skip =
              lastHintBlock?.type === "action" && lastHintBlock.who === m.who;
            if (!skip) {
              history.blocks.push({
                type: "action",
                who: m.who as 0 | 1,
                actionType: "action",
              });
            }
          }
          break;
        }
        case "chooseActiveDone": {
          mainBlock = {
            type: "switchOrChooseActive",
            who: m.who as 0 | 1,
            characterDefinitionId: m.characterDefinitionId,
            how:
              (previousState?.phase ?? PbPhaseType.ACTION) < PbPhaseType.ACTION
                ? "init"
                : "choose",
            children: [],
            indent: history.currentIndent,
          };
          break;
        }
        case "rerollDone": {
          if (phase < PbPhaseType.ACTION) {
            break;
          }
          const lastChild = getLastChild();
          if (lastChild?.type === "rerollDice" && lastChild.who === m.who) {
            lastChild.count += 1;
          } else {
            children.push({
              type: "rerollDice",
              who: m.who as 0 | 1,
              count: 1,
            });
          }
          break;
        }
        case "switchHandsDone": {
          if (phase < PbPhaseType.ACTION) {
            break;
          }
          const lastChild = getLastChild();
          if (lastChild?.type === "switchCard" && lastChild.who === m.who) {
            lastChild.count += 1;
          } else {
            children.push({
              type: "switchCard",
              who: m.who as 0 | 1,
              count: 1,
            });
          }
          break;
        }
        case "selectCardDone": {
          mainBlock = {
            type: "selectCard",
            who: m.who as 0 | 1,
            cardDefinitionId: m.selectedDefinitionId,
            children: [],
            indent: history.currentIndent,
          };
          break;
        }
        case "handleEvent": {
          if (m.isClose) {
            history.currentIndent = Math.max(0, history.currentIndent - 1);
          } else {
            history.currentIndent++;
          }
          break;
        }
        case "swapCharacterPosition": {
          children.push({
            type: "swapCharacterPosition",
            who: m.who as 0 | 1,
            character0DefinitionId: m.character0DefinitionId,
            character1DefinitionId: m.character1DefinitionId,
          });
          break;
        }
        case "switchTurn":
        case "setWinner": {
          break;
        }
        default: {
          const _: never = m;
          continue;
        }
      }
    }
    if (mainBlock) {
      // trailing consume energy
      if (
        mainBlock.type === "useSkill" &&
        lastMainBlock?.type === "pocket" &&
        lastMainBlock.children.length === 1 &&
        lastMainBlock.children[0].type === "energy"
      ) {
        children.unshift(...lastMainBlock.children);
        history.blocks.pop();
      }
      mainBlock.children.push(...children);
      history.blocks.push(mainBlock);
    } else if (maybeEndPhaseDrawing) {
      history.blocks.push({
        type: "pocket",
        children,
        indent: history.currentIndent,
      });
    } else if (lastMainBlock && "children" in lastMainBlock) {
      lastMainBlock.children.push(...children);
    } else {
      if (children.length > 0) {
        history.blocks.push({
          type: "pocket",
          children,
          indent: history.currentIndent,
        });
      }
    }
  } catch (e) {
    console.error("Error while parsing history:", e);
  }
}
