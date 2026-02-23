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
  Aura,
  CreateEntityEM,
  DamageType,
  MoveEntityEM,
  PbEntityArea,
  type PbExposedMutation,
  PbMoveEntityReason,
  PbPhaseType,
  PbPlayerFlag,
  PbPlayerStatus,
  PbReactionType,
  PbRemoveEntityReason,
  PbSkillType,
  Reaction,
  RemoveEntityEM,
} from "@gi-tcg/typings";
import type {
  AnimatingCardInfo,
  DamageInfo,
  NotificationBoxInfo,
  PlayingCardInfo,
  ReactionInfo,
} from "./components/Chessboard";
import type { OppChessboardController } from "./opp";

export type CardDestination = `${"pile" | "hand"}${0 | 1}`;
function getCardArea(
  verb: "from" | "to",
  {
    $case,
    value,
  }: PbExposedMutation["mutation"] & {
    $case: "createEntity" | "moveEntity" | "removeEntity";
  },
): CardDestination | null {
  let area: PbEntityArea | null = null;
  let who: 0 | 1 = 0;
  if (verb === "from") {
    if ($case === "moveEntity") {
      area = value.fromWhere;
      who = value.fromWho as 0 | 1;
    } else if ($case === "removeEntity") {
      area = value.where;
      who = value.who as 0 | 1;
    }
  } else {
    if ($case === "moveEntity") {
      area = value.toWhere;
      who = value.toWho as 0 | 1;
    } else if ($case === "createEntity") {
      area = value.where;
      who = value.who as 0 | 1;
    }
  }
  if (area === PbEntityArea.HAND) {
    return `hand${who}`;
  } else if (area === PbEntityArea.PILE) {
    return `pile${who}`;
  } else {
    return null;
  }
}

interface AnimatingCardWithDestination extends AnimatingCardInfo {
  destination: CardDestination | null;
}

export interface RoundAndPhaseNotificationInfo {
  showRound: boolean;
  who: 0 | 1 | null;
  value: PbPhaseType | "action" | "declareEnd" | null;
}

export interface ParsedMutation {
  raw: PbExposedMutation[];
  roundAndPhase: RoundAndPhaseNotificationInfo;
  animatingCards: AnimatingCardInfo[];
  playingCard: PlayingCardInfo | null;
  damages: (DamageInfo | ReactionInfo)[];
  notificationBox: NotificationBoxInfo | null;
  enteringEntities: number[];
  triggeringEntities: number[];
  disposingEntities: number[];
}

export function parseMutations(
  mutations: PbExposedMutation[],
  oppController?: OppChessboardController,
): ParsedMutation {
  const oppKnownCardState =
    !oppController || oppController.closed ? null : oppController.handCards;

  let playingCard: PlayingCardInfo | null = null;
  const animatingCards: AnimatingCardWithDestination[] = [];
  // 保证同一刻的同一卡牌区域的进出方向一致（要么全进要么全出）
  // 如果新的卡牌动画的 from 和之前的进出方向相反，则新的卡牌动画延迟一刻
  // to 部分同理
  const cardAreaState = new Map<
    CardDestination,
    {
      direction: "in" | "out";
      delay: number;
    }
  >();

  const damagesByTarget = new Map<number, (DamageInfo | ReactionInfo)[]>();
  let notificationBox: NotificationBoxInfo | null = null;
  let isAfterSkillMainDamage = false;
  const enteringEntities: number[] = [];
  const triggeringEntities: number[] = [];
  const disposingEntities: number[] = [];
  const roundAndPhase: RoundAndPhaseNotificationInfo = {
    showRound: false,
    who: null,
    value: null,
  };

  const handleCardOps = (
    mutation: PbExposedMutation["mutation"] & {
      $case: "createEntity" | "moveEntity" | "removeEntity";
    },
  ) => {
    const areas: PbEntityArea[] = [];
    if (mutation.$case === "moveEntity") {
      areas.push(mutation.value.fromWhere, mutation.value.toWhere);
    } else {
      areas.push(mutation.value.where);
    }
    if (
      !areas.some(
        (area) => area === PbEntityArea.HAND || area === PbEntityArea.PILE,
      )
    ) {
      return;
    }
    let card = mutation.value.entity!;
    if (oppKnownCardState?.has(card.id)) {
      card = oppKnownCardState.get(card.id)!;
    }
    let showing = card.definitionId !== 0;
    if (mutation.$case === "removeEntity") {
      if (
        [
          PbRemoveEntityReason.EVENT_CARD_PLAYED,
          PbRemoveEntityReason.EVENT_CARD_PLAY_NO_EFFECT,
          PbRemoveEntityReason.EQUIP_OVERRIDDEN,
          PbRemoveEntityReason.CREATE_SUPPORT_OVERRIDDEN,
        ].includes(mutation.value.reason)
      ) {
        playingCard = {
          who: mutation.value.who as 0 | 1,
          data: card,
          noEffect:
            mutation.value.reason ===
            PbRemoveEntityReason.EVENT_CARD_PLAY_NO_EFFECT,
        };
        showing = false;
      }
    } else if (mutation.$case === "moveEntity") {
      if (
        [PbMoveEntityReason.EQUIP, PbMoveEntityReason.CREATE_SUPPORT].includes(
          mutation.value.reason,
        )
      ) {
        playingCard = {
          who: mutation.value.fromWho as 0 | 1,
          data: card,
          noEffect: false,
        };
        showing = false;
      }
    }
    const source = getCardArea("from", mutation);
    const destination = getCardArea("to", mutation);

    const current = animatingCards.find((x) => x.data.id === card.id);
    if (current) {
      current.destination = destination;
    } else {
      const sourceState = source ? cardAreaState.get(source) : void 0;
      const destinationState = destination
        ? cardAreaState.get(destination)
        : void 0;
      const sourceDelay = sourceState
        ? sourceState.delay + +(sourceState.direction === "in")
        : 0;
      const destinationDelay = destinationState
        ? destinationState.delay + +(destinationState.direction === "out")
        : 0;
      animatingCards.push({
        data: card,
        showing,
        destination,
        delay: Math.max(sourceDelay, destinationDelay),
      });
      if (source) {
        cardAreaState.set(source, {
          direction: "out",
          delay: sourceDelay,
        });
      }
      if (destination) {
        cardAreaState.set(destination, {
          direction: "in",
          delay: destinationDelay,
        });
      }
    }
  };

  for (const { mutation } of mutations) {
    switch (mutation?.$case) {
      case "applyAura": {
        const targetId = mutation.value.targetId;
        if (mutation.value.reactionType !== PbReactionType.UNSPECIFIED) {
          if (!damagesByTarget.has(targetId)) {
            damagesByTarget.set(targetId, []);
          }
          const targetDamages = damagesByTarget.get(targetId)!;
          targetDamages.push({
            type: "reaction",
            reactionType: mutation.value.reactionType,
            base: mutation.value.oldAura as Aura,
            incoming: mutation.value.elementType as DamageType,
            targetId,
            delay: targetDamages.length,
          });
        }
        break;
      }
      case "damage": {
        const targetId = mutation.value.targetId;
        if (!damagesByTarget.has(targetId)) {
          damagesByTarget.set(targetId, []);
        }
        let reaction: ReactionInfo | null = null;
        if (mutation.value.reactionType !== PbReactionType.UNSPECIFIED) {
          reaction = {
            type: "reaction",
            reactionType: mutation.value.reactionType,
            targetId,
            base: mutation.value.oldAura as Aura,
            incoming: mutation.value.damageType as DamageType,
            delay: 0,
          };
        }
        const targetDamages = damagesByTarget.get(targetId)!;
        targetDamages.push({
          type: "damage",
          damageType: mutation.value.damageType as DamageType,
          value: mutation.value.value,
          sourceId: mutation.value.sourceId,
          targetId,
          isSkillMainDamage: mutation.value.isSkillMainDamage,
          isAfterSkillMainDamage,
          delay: targetDamages.length,
          reaction,
        });
        if (mutation.value.isSkillMainDamage) {
          isAfterSkillMainDamage = true;
        }
        break;
      }
      case "skillUsed": {
        triggeringEntities.push(mutation.value.callerId);
        if (
          ![
            PbSkillType.TRIGGERED,
            PbSkillType.TRIGGERED_FROM_ITS_ATTACHMENT,
          ].includes(mutation.value.skillType)
        ) {
          notificationBox = {
            type: "useSkill",
            who: mutation.value.who as 0 | 1,
            characterDefinitionId: mutation.value.callerDefinitionId,
            skillDefinitionId: mutation.value.skillDefinitionId,
            skillType: mutation.value.skillType,
          };
        }
        break;
      }
      case "switchActive": {
        notificationBox = {
          type: "switchActive",
          who: mutation.value.who as 0 | 1,
          characterDefinitionId: mutation.value.characterDefinitionId,
          skillDefinitionId: mutation.value.viaSkillDefinitionId,
          skillType:
            mutation.value.viaSkillDefinitionId === Reaction.Overloaded
              ? "overloaded"
              : null,
        };
        break;
      }
      case "createEntity": {
        handleCardOps(mutation);
        const id = mutation.value.entity!.id;
        if (disposingEntities.includes(id)) {
          disposingEntities.splice(disposingEntities.indexOf(id), 1);
        } else {
          enteringEntities.push(id);
        }
        break;
      }
      case "createAttachment": {
        const id = mutation.value.masterCardId;
        triggeringEntities.push(id);
        break;
      }
      case "moveEntity": {
        handleCardOps(mutation);
        break;
      }
      case "removeEntity": {
        handleCardOps(mutation);
        const id = mutation.value.entity!.id;
        if (enteringEntities.includes(id)) {
          enteringEntities.splice(enteringEntities.indexOf(id), 1);
        } else {
          disposingEntities.push(id);
        }
        break;
      }
      case "playerStatusChange": {
        if (mutation.value.status === PbPlayerStatus.ACTING) {
          roundAndPhase.who = mutation.value.who as 0 | 1;
          roundAndPhase.value = "action";
        }
        break;
      }
      case "setPlayerFlag": {
        if (mutation.value.flagName === PbPlayerFlag.DECLARED_END) {
          roundAndPhase.who = mutation.value.who as 0 | 1;
          roundAndPhase.value = "declareEnd";
        }
        break;
      }
      case "stepRound": {
        roundAndPhase.showRound = true;
        break;
      }
      case "changePhase": {
        if (
          [PbPhaseType.ROLL, PbPhaseType.ACTION, PbPhaseType.END].includes(
            mutation.value.newPhase,
          )
        ) {
          roundAndPhase.value = mutation.value.newPhase;
        }
        break;
      }
    }
  }
  return {
    raw: mutations,
    roundAndPhase,
    playingCard,
    animatingCards,
    damages: damagesByTarget.values().toArray().flat(),
    notificationBox,
    enteringEntities,
    triggeringEntities,
    disposingEntities,
  };
}
