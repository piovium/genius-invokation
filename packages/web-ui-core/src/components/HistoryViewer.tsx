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

import { DamageType, DiceType, Reaction } from "@gi-tcg/typings";
import {
  createSignal,
  createContext,
  useContext,
  For,
  Match,
  Show,
  Switch,
  type JSX,
  createResource,
  createMemo,
  createEffect,
  untrack,
} from "solid-js";
import { useUiContext } from "../hooks/context";
import type {
  CardHistoryChildren,
  CharacterHistoryChildren,
  CreateEntityHistoryChild,
  EnergyHistoryChild,
  HistoryBlock,
  HistoryChildren,
  HistoryDetailBlock,
  HistoryHintBlock,
} from "../history/typings";
import { Image } from "./Image";
import type { ActionCardRawData, EntityRawData } from "@gi-tcg/assets-manager";
import TuningIcon from "../svg/TuningIcon.svg?fb";
import DefeatedPreviewIcon from "../svg/DefeatedPreviewIcon.svg?fb";
import RevivePreviewIcon from "../svg/RevivePreviewIcon.svg?fb";
import SwitchActiveHistoryIcon from "../svg/SwitchActiveHistoryIcon.svg?fb";
import TriggerIcon from "../svg/TriggerIcon.svg?fb";
import CardFrameSummon from "../svg/CardFrameSummon.svg?fb";
import CardbackNormal from "../svg/CardbackNormal.svg?fb";
import CardFrameNormal from "../svg/CardFrameNormal.svg?fb";
import { DAMAGE_COLOR } from "./Damage";
import { REACTION_TEXT_MAP } from "./Reaction";
import { RichText } from "./RichText";
import { MoreStatus } from "./StatusGroup";

interface ChildHealthChange {
  type: "damage" | "heal";
  value: number;
  special: boolean;
}

interface HistoryChildData {
  opp: boolean;
  imageId?: number | "tuning";
  imageType?: "cardFace" | "icon" | "unspecified";
  title?: string;
  healthChange?: ChildHealthChange;
  content: string;
}

export const WhoContext = createContext<() => 0 | 1>(() => 0 as 0 | 1);
export function useWho() {
  return useContext(WhoContext);
}

const createRenderName = () => {
  const { assetsManager } = useUiContext();
  return (definitionId?: number) =>
    definitionId ? assetsManager().getNameSync(definitionId) : "???";
};

const renderHistoryChild = (
  child: HistoryChildren,
  parentCallerDefinitionId?: number,
) => {
  const who = useWho();
  const { assetsManager, t } = useUiContext();
  let result: HistoryChildData;
  const opp = (historyOwner: 0 | 1) => historyOwner !== who();

  const renderName = createRenderName();

  const diceIconAndText = (type: DiceType) => {
    const manager = assetsManager();
    if (type === DiceType.Void) {
      return t("history.unknownDice");
    }
    if (type === DiceType.Omni) {
      return `<image type="dice" id="${type}" />` + manager.getNameSync(-411);
    }
    return (
      `<image type="dice" id="${type}" />` + manager.getNameSync(-300 - type)
    );
  };

  const damageIconAndText = (type: DamageType) => {
    const manager = assetsManager();
    const icon = type <= 7 ? `<image type="element" id="${type}" />` : "";
    const color =
      type >= 1 && type <= 7 ? `color="var(--c-${DAMAGE_COLOR[type]})"` : "";
    if (type === DamageType.Piercing) {
      return `${icon}<font ${color}>${manager.getNameSync(-5)}</font>`;
    } else {
      return `${icon}<font ${color}>${manager.getNameSync(-100 - type)}</font>`;
    }
  };

  const applyIconAndText = (type: DamageType) => {
    const icon = `<image type="element" id="${type}" />`;
    const color = `color="var(--c-${DAMAGE_COLOR[type]})"`;
    const manager = assetsManager();
    return `${icon}<font ${color}>${manager.getNameSync(-300 - type)}</font>`;
  };

  const reactionIconAndText = (reaction: Reaction, apply: DamageType) => {
    const { elements: element, nameKey } = REACTION_TEXT_MAP[reaction];
    const base = element.find((e) => e !== apply) as DamageType;
    return `(<image type="element" id="${base}" /><image type="element" id="${apply}" />${t(nameKey)})`;
  };

  const variableNameText = (id: number, name: string) => {
    const manager = assetsManager();
    const data = manager.getDataSync(id);
    const tokenName = "shownTokenName" in data ? data.shownTokenName : name;
    return `<tooltip title="${name}">${tokenName}</tooltip>`;
  };

  switch (child.type) {
    case "switchActive": {
      result = {
        opp: opp(child.who),
        imageId: child.characterDefinitionId,
        imageType: "cardFace",
        title: renderName(child.characterDefinitionId),
        content: `${t("history.switchActive")}(${
          child.isOverloaded ? t("history.overloaded") : t("history.cardEffect")
        })`,
      };
      break;
    }
    case "willTriggered": {
      result = {
        opp: opp(child.who),
        imageId: child.callerDefinitionId,
        title: renderName(child.callerDefinitionId),
        content: t("history.willTriggered"),
      };
      break;
    }
    case "drawCard": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: parentCallerDefinitionId,
        title: renderName(parentCallerDefinitionId),
        content: t(isOpp ? "history.oppDrawCards" : "history.myDrawCards", {
          count: child.drawCardsCount,
        }),
      };
      break;
    }
    case "stealHand": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: child.cardDefinitionId,
        imageType: "cardFace",
        title: renderName(child.cardDefinitionId),
        content: t(isOpp ? "history.oppStealMyHand" : "history.myStealOppHand"),
      };
      break;
    }
    case "createEntity": {
      const isOpp = opp(child.who);
      if (["status", "equipment", "attachment"].includes(child.entityType)) {
        result = {
          opp: isOpp,
          imageId: child.masterDefinitionId,
          imageType: "cardFace",
          title: renderName(child.masterDefinitionId),
          content:
            t(
              child.entityType === "equipment"
                ? "history.createEquipment"
                : "history.createStatus",
            ) +
            `<image id="${child.entityDefinitionId}" />` +
            renderName(child.entityDefinitionId),
        };
      } else {
        // child.entityType === "combatStatus" | "summon" | "support"
        const key =
          `history.${isOpp ? "opp" : "my"}Create${child.entityType === "combatStatus" ? "CombatStatus" : child.entityType === "summon" ? "Summon" : "Support"}` as const;
        result = {
          opp: isOpp,
          imageId: child.entityDefinitionId,
          title: renderName(child.entityDefinitionId),
          content: t(key),
        };
      }
      break;
    }
    case "generateDice": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: parentCallerDefinitionId,
        title: renderName(parentCallerDefinitionId),
        content: t(`history.${isOpp ? "opp" : "my"}GenerateDice`, {
          count: child.count,
          diceType: diceIconAndText(child.diceType),
        }),
      };
      break;
    }
    case "absorbDice": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: parentCallerDefinitionId,
        title: renderName(parentCallerDefinitionId),
        content: t(isOpp ? "history.oppAbsorbDice" : "history.myAbsorbDice", {
          count: child.count,
        }),
      };
      break;
    }
    case "createCard": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: child.cardDefinitionId,
        imageType: "cardFace",
        title: renderName(child.cardDefinitionId),
        content: t(
          child.target === "pile"
            ? isOpp
              ? "history.oppCreateCardToPile"
              : "history.myCreateCardToPile"
            : isOpp
              ? "history.oppGainHandCard"
              : "history.myGainHandCard",
        ),
      };
      break;
    }
    case "switchCard": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: parentCallerDefinitionId,
        title: renderName(parentCallerDefinitionId),
        content: t(
          isOpp ? "history.oppSwitchHandOnce" : "history.mySwitchHandOnce",
        ),
      };
      break;
    }
    case "undrawCard": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: parentCallerDefinitionId,
        title: renderName(parentCallerDefinitionId),
        content: t(
          isOpp ? "history.oppPutHandToPile" : "history.myPutHandToPile",
          { count: child.count },
        ),
      };
      break;
    }
    case "rerollDice": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: parentCallerDefinitionId,
        title: renderName(parentCallerDefinitionId),
        content: t(
          isOpp ? "history.oppRerolledTimes" : "history.myRerolledTimes",
          { count: child.count },
        ),
      };
      break;
    }
    case "damage": {
      const reactionText = child.reaction
        ? reactionIconAndText(child.reaction, child.damageType)
        : "";
      result = {
        opp: opp(child.who),
        imageId: child.characterDefinitionId,
        imageType: "cardFace",
        title: renderName(child.characterDefinitionId),
        healthChange: {
          type: "damage",
          value: child.damageValue,
          special: child.causeDefeated,
        },
        content:
          t("history.takeDamage", {
            count: child.damageValue,
            damageType: damageIconAndText(child.damageType),
          }) +
          reactionText +
          t("history.healthTo", {
            old: child.oldHealth,
            next: child.newHealth,
          }) +
          (child.causeDefeated ? t("history.defeated") : ""),
      };
      break;
    }
    case "heal": {
      const prefixTextKey =
        child.healType === "revive"
          ? "history.reviveAnd"
          : child.healType === "immuneDefeated"
            ? "history.immuneDefeatedAnd"
            : ("history.healed" as const);

      result = {
        opp: opp(child.who),
        imageId: child.characterDefinitionId,
        imageType: "cardFace",
        title: renderName(child.characterDefinitionId),
        healthChange: {
          type: "heal",
          value: child.healValue,
          special: child.healType !== "normal",
        },
        content:
          t(prefixTextKey, { count: child.healValue }) +
          t("history.healthTo", {
            old: child.oldHealth,
            next: child.newHealth,
          }),
      };
      break;
    }
    case "apply": {
      const reactionText = child.reaction
        ? reactionIconAndText(child.reaction, child.elementType)
        : "";
      result = {
        opp: opp(child.who),
        imageId: child.characterDefinitionId,
        imageType: "cardFace",
        title: renderName(child.characterDefinitionId),
        content:
          t("history.applyElement", {
            elementType: applyIconAndText(child.elementType),
          }) + reactionText,
      };
      break;
    }
    case "increaseMaxHealth": {
      const increaseValue = child.newMaxHealth - child.oldMaxHealth;
      result = {
        opp: opp(child.who),
        imageId: child.characterDefinitionId,
        imageType: "cardFace",
        title: renderName(child.characterDefinitionId),
        content: t("history.gainMaxHealth", {
          count: increaseValue,
          old: child.oldMaxHealth,
          next: child.newMaxHealth,
        }),
      };
      break;
    }
    case "energy": {
      const energyValue = child.newEnergy - child.oldEnergy;
      const payload = {
        count: Math.abs(energyValue),
        old: child.oldEnergy,
        next: child.newEnergy,
      };
      result = {
        opp: opp(child.who),
        imageId: child.characterDefinitionId,
        imageType: "cardFace",
        title: renderName(child.characterDefinitionId),
        content: t(
          energyValue > 0 ? "history.gainEnergy" : "history.loseEnergy",
          payload,
        ),
      };
      break;
    }
    case "removeCard": {
      const isOpp = opp(child.who);
      result = {
        opp: isOpp,
        imageId: child.cardDefinitionId,
        imageType: "cardFace",
        title: renderName(child.cardDefinitionId),
        content: t(isOpp ? "history.oppDiscardHand" : "history.myDiscardHand"),
      };
      break;
    }
    case "variableChange": {
      result = {
        opp: opp(child.who),
        imageId: child.cardDefinitionId,
        title: renderName(child.cardDefinitionId),
        content: `${variableNameText(child.cardDefinitionId, child.variableName)}: ${child.oldValue}→${child.newValue}`,
      };
      break;
    }
    case "removeEntity": {
      if (["status", "equipment", "attachment"].includes(child.entityType)) {
        result = {
          opp: opp(child.who),
          imageId: child.masterDefinitionId,
          imageType: "cardFace",
          title: renderName(child.masterDefinitionId),
          content: t(
            child.entityType === "equipment"
              ? "history.removeEquipment"
              : "history.removeStatus",
            {
              entity:
                `<image id="${child.entityDefinitionId}" />` +
                renderName(child.entityDefinitionId),
            },
          ),
        };
      } else {
        // child.entityType === "combatStatus" | "summon" | "support"
        result = {
          opp: opp(child.who),
          imageId: child.entityDefinitionId,
          title: renderName(child.entityDefinitionId),
          content: t(
            child.entityType === "combatStatus"
              ? "history.removeCombatStatus"
              : child.entityType === "summon"
                ? "history.removeSummon"
                : "history.removeSupport",
          ),
        };
      }
      break;
    }
    case "convertDice": {
      const isOpp = opp(child.who);
      // 对方转换元素骰的数目由不完整的数据计算得到，为避免误导始终显示 SomeDice
      const uncertain = isOpp && !child.isTuning;
      const key =
        `history.${isOpp ? "opp" : "my"}Convert${uncertain ? "Some" : "To"}Dice` as const;
      result = {
        opp: isOpp,
        imageId: child.isTuning ? "tuning" : parentCallerDefinitionId,
        title: child.isTuning
          ? t("history.elementalTuning")
          : renderName(parentCallerDefinitionId),
        content: t(key, {
          diceType: diceIconAndText(child.diceType),
          count: child.count,
        }),
      };
      break;
    }
    case "playCardNoEffect": {
      result = {
        opp: opp(child.who),
        imageId: child.cardDefinitionId,
        imageType: "cardFace",
        title: renderName(child.cardDefinitionId),
        content: t("history.blockedNoEffect"),
      };
      break;
    }
    case "transformDefinition": {
      result = {
        opp: opp(child.who),
        imageId: child.cardDefinitionId,
        title: renderName(child.cardDefinitionId),
        content: t(
          child.stage === "old"
            ? "history.transformOld"
            : "history.transformNew",
        ),
      };
      break;
    }
    case "swapCharacterPosition": {
      result = {
        opp: opp(child.who),
        imageId: child.character0DefinitionId,
        title: renderName(child.character0DefinitionId),
        content: t("history.swapPosition", {
          name: renderName(child.character1DefinitionId) ?? "???",
        }),
      };
      break;
    }
    case "overflowCard": {
      result = {
        opp: opp(child.who),
        imageId: child.cardDefinitionId,
        imageType: "cardFace",
        title: renderName(child.cardDefinitionId),
        content: t("history.overflowCard"),
      };
      break;
    }
    default: {
      result = {
        opp: false,
        title: "",
        content: "",
      };
      break;
    }
  }
  return result;
};

interface HistoryHintData {
  type: "changePhase" | "action";
  opp?: boolean;
  content: string;
}

const renderHistoryHint = (block: HistoryHintBlock) => {
  const who = useWho();
  const { t } = useUiContext();
  let result: HistoryHintData;
  const opp = (historyOwner: 0 | 1) => historyOwner !== who();

  switch (block.type) {
    case "changePhase": {
      switch (block.newPhase) {
        case "initHands":
          result = {
            type: block.type,
            content: t("history.replaceInitialHand"),
          };
          break;
        case "initActives":
          result = {
            type: block.type,
            content: t("history.chooseInitialActiveCharacter"),
          };
          break;
        case "action":
          result = {
            type: block.type,
            content: t("history.roundStart", { round: block.roundNumber }),
          };
          break;
        case "end":
          result = {
            type: block.type,
            content: t("history.endPhase"),
          };
          break;
        default:
          result = {
            type: block.type,
            content: `???`,
          };
          break;
      }
      break;
    }
    case "action": {
      switch (block.actionType) {
        case "action":
          result = {
            type: block.type,
            opp: opp(block.who),
            content: t(
              opp(block.who) ? "history.oppActionTurn" : "history.myActionTurn",
            ),
          };
          break;
        case "declareEnd":
          result = {
            type: block.type,
            opp: opp(block.who),
            content: t(
              opp(block.who)
                ? "history.oppDeclareEndTurn"
                : "history.myDeclareEndTurn",
            ),
          };
          break;
      }
      break;
    }
  }
  return result;
};

interface HistoryChildrenSummary {
  characterSummary: CharacterSummary[];
  cardSummary: CardSummary[];
}
interface CharacterSummary {
  characterDefinitionId: number;
  who: 0 | 1;
  damage: boolean;
  damageSum: number;
  defeated: boolean;
  heal: boolean;
  healSum: number;
  revive: boolean;
  switchActive: boolean;
  elemental: DamageType[][];
  status: number[];
  combatStatus: number[];
  children: CharacterHistoryChildren[];
}
interface CardSummary {
  cardDefinitionId: number;
  who: 0 | 1;
  type: (
    | "removeCard"
    | "createCard"
    | "overflowCard"
    | "removeEntity"
    | "createEntity"
    | "createAttachment"
  )[];
  children: CardHistoryChildren[];
  attachment: number[];
}

function getOrCreateCharacterSummary(
  charMap: Map<string, CharacterSummary>,
  c: {
    characterDefinitionId: number;
    who: 0 | 1;
  },
): CharacterSummary {
  const charId = c.characterDefinitionId;
  const who = c.who;
  const key = `${charId}:${who}`;
  if (!charMap.has(key)) {
    charMap.set(key, {
      characterDefinitionId: charId,
      who: who,
      damage: false,
      damageSum: 0,
      defeated: false,
      heal: false,
      healSum: 0,
      revive: false,
      switchActive: false,
      elemental: [],
      status: [],
      combatStatus: [],
      children: [],
    });
  }
  return charMap.get(key)!;
}

function getOrCreateCardSummary(
  cardMap: Map<string, CardSummary>,
  c: {
    cardDefinitionId: number;
    who: 0 | 1;
  },
): CardSummary {
  const charId = c.cardDefinitionId;
  const who = c.who;
  const key = `${charId}:${who}`;
  if (!cardMap.has(key)) {
    cardMap.set(key, {
      cardDefinitionId: charId,
      who: who,
      type: [],
      children: [],
      attachment: [],
    });
  }
  return cardMap.get(key)!;
}

function buildSummary(children: HistoryChildren[]): HistoryChildrenSummary {
  const charMap = new Map<string, CharacterSummary>();
  const cardMap = new Map<string, CardSummary>();

  let summary: CharacterSummary | CardSummary | undefined;

  for (const c of children) {
    if (c.type === "damage") {
      summary = getOrCreateCharacterSummary(charMap, c);
      summary.children.push(c);
      summary.damage = true;
      summary.damageSum += c.damageValue;
      if (c.causeDefeated) {
        summary.defeated = true;
      }
      if (c.reaction) {
        summary.elemental.push(
          REACTION_TEXT_MAP[c.reaction].elements as DamageType[],
        );
      } else if (c.damageType >= 1 && c.damageType <= 7) {
        summary.elemental.push([c.damageType]);
      }
    } else if (c.type === "heal") {
      summary = getOrCreateCharacterSummary(charMap, c);
      summary.children.push(c);
      summary.heal = true;
      summary.healSum += c.healValue;
      if (c.healType === "revive" || c.healType === "immuneDefeated") {
        summary.revive = true;
      }
    } else if (c.type === "switchActive") {
      summary = getOrCreateCharacterSummary(charMap, c);
      summary.children.push(c);
      summary.switchActive = true;
    } else if (c.type === "apply") {
      summary = getOrCreateCharacterSummary(charMap, c);
      summary.children.push(c);
      if (c.reaction) {
        summary.elemental.push(
          REACTION_TEXT_MAP[c.reaction].elements as DamageType[],
        );
      } else {
        summary.elemental.push([c.elementType]);
      }
    } else if (c.type === "createEntity") {
      if (c.entityType === "status") {
        summary = getOrCreateCharacterSummary(charMap, {
          characterDefinitionId: c.masterDefinitionId!,
          who: c.who,
        });
        summary.children.push(
          c as Extract<CreateEntityHistoryChild, { entityType: "state" }>,
        );
        summary.status.push(c.entityDefinitionId);
      } else if (c.entityType === "combatStatus") {
        summary = getOrCreateCharacterSummary(charMap, {
          characterDefinitionId: c.masterDefinitionId!,
          who: c.who,
        });
        summary.children.push(
          c as Extract<
            CreateEntityHistoryChild,
            { entityType: "combatStatus" }
          >,
        );
        summary.combatStatus.push(c.entityDefinitionId);
      } else if (c.entityType === "summon") {
        summary = getOrCreateCardSummary(cardMap, {
          cardDefinitionId: c.entityDefinitionId,
          who: c.who,
        });
        summary.children.push(
          c as Extract<CreateEntityHistoryChild, { entityType: "summon" }>,
        );
        summary.type.push(c.type);
      } else if (c.entityType === "support") {
        summary = getOrCreateCardSummary(cardMap, {
          cardDefinitionId: c.entityDefinitionId,
          who: c.who,
        });
        summary.children.push(
          c as Extract<CreateEntityHistoryChild, { entityType: "support" }>,
        );
        summary.type.push(c.type);
      } else if (c.entityType === "attachment") {
        summary = getOrCreateCardSummary(cardMap, {
          cardDefinitionId: c.masterDefinitionId!,
          who: c.who,
        });
        summary.children.push(
          c as Extract<CreateEntityHistoryChild, { entityType: "attachment" }>,
        );
        summary.type.push("createAttachment");
        summary.attachment.push(c.entityDefinitionId);
      }
    } else if (c.type === "createCard" && c.target === "hands") {
      summary = getOrCreateCardSummary(cardMap, c);
      summary.children.push(c);
      summary.type.push(c.type);
    } else if (c.type === "overflowCard") {
      summary = getOrCreateCardSummary(cardMap, c);
      summary.type.push(c.type);
    } else if (c.type === "removeCard") {
      summary = getOrCreateCardSummary(cardMap, c);
      summary.children.push(c);
      summary.type.push(c.type);
    } else if (c.type === "removeEntity") {
      if (c.entityType === "summon") {
        summary = getOrCreateCardSummary(cardMap, {
          cardDefinitionId: c.entityDefinitionId,
          who: c.who,
        });
        summary.children.push(
          c as Extract<CreateEntityHistoryChild, { entityType: "summon" }>,
        );
        summary.type.push(c.type);
      } else if (c.entityType === "support") {
        summary = getOrCreateCardSummary(cardMap, {
          cardDefinitionId: c.entityDefinitionId,
          who: c.who,
        });
        summary.children.push(
          c as Extract<CreateEntityHistoryChild, { entityType: "support" }>,
        );
        summary.type.push(c.type);
      }
    }
  }
  return {
    characterSummary: Array.from(charMap.values()),
    cardSummary: Array.from(cardMap.values()),
  };
}

interface SummaryShot {
  size: "normal" | "summon";
  who: 0 | 1 | "both";
  cardFace: number[];
  aura?: DamageType[] | "more";
  inner?: "damage" | "heal" | "switch" | "defeated";
  innerValue?: number | "more";
  innerValueSpecial?: boolean;
  status?: number[] | "more";
  combat?: number[] | "more";
}

function renderSummary(children: HistoryChildren[]): SummaryShot[] {
  const { characterSummary, cardSummary } = buildSummary(children);
  const shotGroups = {
    damage: [] as CharacterSummary[],
    heal: [] as CharacterSummary[],
    apply: [] as CharacterSummary[],
    switch: [] as CharacterSummary[],
    status: [] as CharacterSummary[],
    discard: [] as CardSummary[],
    getcard: [] as CardSummary[],
    create: [] as CardSummary[],
    remove: [] as CardSummary[],
    attachment: [] as CardSummary[],
  } as const;
  const INNER_MAP: Partial<Record<ShotType, SummaryShot["inner"]>> = {
    damage: "damage",
    heal: "heal",
    switch: "switch",
    remove: "defeated",
    discard: "defeated",
  };

  type ShotGroup = typeof shotGroups;
  type ShotType = keyof ShotGroup;
  type ShotGroupEntry = {
    [K in ShotType]: ShotGroup[K] & { KEY: K };
  }[ShotType];
  type CardSummaryEntry = Extract<ShotGroupEntry, CardSummary[]>;
  type CharacterSummaryEntry = Extract<ShotGroupEntry, CharacterSummary[]>;

  const allSummaries = (): ShotGroupEntry[] => {
    return Object.entries(shotGroups).map(([key, value]) => {
      Object.defineProperty(value, "KEY", {
        value: key,
        configurable: true,
        enumerable: true,
      });
      return value as ShotGroupEntry;
    });
  };
  const isCharacterSummary = (
    e: ShotGroupEntry,
  ): e is CharacterSummaryEntry => {
    return ["damage", "heal", "apply", "switch", "status"].includes(e.KEY);
  };
  const isCardSummary = (e: ShotGroupEntry): e is CardSummaryEntry => {
    return ["discard", "getcard", "create", "remove", "attachment"].includes(
      e.KEY,
    );
  };

  for (const c of characterSummary) {
    if (c.damage || c.heal || !!c.elemental.length || c.switchActive) {
      if (c.damage) {
        shotGroups.damage.push(c);
      }
      if (c.heal && !c.damage) {
        shotGroups.heal.push(c);
      }
      if (c.heal && c.damage) {
        shotGroups.heal.push({
          ...c,
          damage: false,
          damageSum: 0,
          defeated: false,
          switchActive: false,
          elemental: [],
          status: [],
          combatStatus: [],
        });
      }
      if (!!c.elemental.length && !c.damage && !c.heal) {
        shotGroups.apply.push(c);
      }
      if (!!c.elemental.length && !c.damage && c.heal) {
        shotGroups.apply.push({
          ...c,
          damage: false,
          damageSum: 0,
          defeated: false,
          heal: false,
          healSum: 0,
          revive: false,
          switchActive: false,
          status: [],
          combatStatus: [],
        });
      }
      if (c.switchActive && !c.damage && !c.heal && !c.elemental.length) {
        shotGroups.switch.push(c);
      }
      if (c.switchActive && (c.damage || c.heal || !!c.elemental.length)) {
        shotGroups.switch.push({
          ...c,
          damage: false,
          damageSum: 0,
          defeated: false,
          heal: false,
          healSum: 0,
          revive: false,
          elemental: [],
          status: [],
          combatStatus: [],
        });
      }
    } else if (c.status.length > 0) {
      shotGroups.status.push(c);
    } else if (c.combatStatus.length > 0) {
      shotGroups.status.push(c);
    }
  }
  for (const c of cardSummary) {
    if (c.type.includes("createAttachment")) {
      shotGroups.attachment.push(c);
    }
    if (!(c.type.includes("createCard") && c.type.includes("removeCard"))) {
      if (c.type.includes("createCard") && !c.type.includes("overflowCard")) {
        shotGroups.getcard.push({ ...c, attachment: [] });
      }
      if (c.type.includes("removeCard")) {
        shotGroups.discard.push({ ...c, attachment: [] });
      }
    }
    if (!(c.type.includes("createEntity") && c.type.includes("removeEntity"))) {
      if (c.type.includes("createEntity")) {
        shotGroups.create.push({ ...c, attachment: [] });
      }
      if (c.type.includes("removeEntity")) {
        shotGroups.remove.push({ ...c, attachment: [] });
      }
    }
  }

  const makeAura = (l: CharacterSummary[]) => {
    const all = l.flatMap((ch) => ch.elemental);
    if (!all.length) {
      return;
    }
    return l.length === 1 && all.length === 1 ? all[0] : "more";
  };
  const makeStatus = (l: CharacterSummary[]) => {
    const all = l.flatMap((ch) => ch.status);
    if (!all.length) {
      return;
    }
    return l.length === 1 ? all : "more";
  };
  const makeCombat = (l: CharacterSummary[]) => {
    const all = l.flatMap((ch) => ch.combatStatus);
    if (!all.length) {
      return;
    }
    return l.length === 1 ? all : "more";
  };
  const makeValue = <T, K extends keyof T, const More>(
    list: T[],
    prop: K,
    more: More,
  ): T[K] | More => {
    if (list.length === 1) {
      return list[0][prop];
    }
    return more;
  };
  const makeAttachment = (l: CardSummary[]) => {
    const all = l.flatMap((c) => c.attachment);
    if (!all.length) {
      return;
    }
    return l.length === 1
      ? l[0].cardDefinitionId || all.length === 1
        ? all
        : "more"
      : "more";
  };

  const summaryShot: SummaryShot[] = [];
  for (const list of allSummaries()) {
    const type = list.KEY;
    if (!list.length) {
      continue;
    }

    const uniqueWhos = new Set(list.map((c) => c.who));
    const shot: SummaryShot = {
      size: ["remove", "create"].includes(type) ? "summon" : "normal",
      who: uniqueWhos.size === 1 ? [...uniqueWhos][0] : "both",
      cardFace: isCardSummary(list)
        ? list.map((c) => c.cardDefinitionId)
        : list.map((c) => c.characterDefinitionId),
      aura: isCharacterSummary(list) ? makeAura(list) : void 0,
      inner: INNER_MAP[type],
      innerValue:
        type === "damage"
          ? makeValue(list, "damageSum", "more")
          : type === "heal"
            ? makeValue(list, "healSum", "more")
            : void 0,
      innerValueSpecial:
        type === "damage"
          ? makeValue(list, "defeated", void 0)
          : type === "heal"
            ? makeValue(list, "revive", void 0)
            : void 0,
      status: isCharacterSummary(list)
        ? makeStatus(list)
        : makeAttachment(list),
      combat: isCharacterSummary(list) ? makeCombat(list) : void 0,
    };
    summaryShot.push(shot);
  }
  return summaryShot;
}

const CardDescriptionPart = (props: { cardDefinitionId: number }) => {
  const { assetsManager, t } = useUiContext();
  const [data] = createResource(
    () => [props.cardDefinitionId, assetsManager()] as const,
    ([id, manager]) => manager.getData(id),
  );
  return (
    <Switch>
      <Match when={props.cardDefinitionId === 0}>
        <p>???</p>
      </Match>
      <Match when={data.loading}>
        <p>{t("history.loading")}</p>
      </Match>
      <Match when={data.error}>
        <p>{t("history.loadFailed")}</p>
      </Match>
      <Match when={data()}>
        {(data) => (
          <p class="whitespace-pre-wrap">
            {(data() as ActionCardRawData | EntityRawData).description}
          </p>
        )}
      </Match>
    </Switch>
  );
};

const SkillTriggeredPart = (props: {
  subtitle: string;
  imageId: number;
  name?: string;
}) => {
  return (
    <>
      <div class="text-3 text-#d4bc8e font-bold mb-1">{props.subtitle}</div>
      <div class="flex flex-row items-center gap-1">
        <Image
          imageId={props.imageId}
          type="icon"
          class="h-7 w-7"
          fallback="skill"
        />
        <span class="text-#fff3e0 text-3">{props.name}</span>
      </div>
    </>
  );
};

interface HistoryBlockData {
  type:
    | "switchOrChooseActive"
    | "useSkill"
    | "triggered"
    | "playCard"
    | "selectCard"
    | "elementalTuning"
    | "pocket";
  opp: boolean;
  title: string;
  indent: number;
  imageId?: number;
  imageSize: "normal" | "summon";
  callerId?: number;
  energyChange?: blockEnergyProps;
  status?: number;
  combatStatus?: number;
  content: BlockDetailProps;
  summary: SummaryShot[];
}

interface BlockDetailProps {
  opp: boolean;
  imageId?: number;
  name?: string;
  content?: JSX.Element;
}

interface blockEnergyProps {
  oldEnergy: number;
  newEnergy: number;
  energyValue: number;
  how: "gain" | "loss";
  maxEnergy: number;
}

const renderHistoryBlock = (block: HistoryDetailBlock) => {
  const who = useWho();
  const { t } = useUiContext();
  const renderName = createRenderName();

  let result: HistoryBlockData;
  const opp = (historyOwner: 0 | 1) => historyOwner !== who();

  function extractBlockEnergyProps(
    block: {
      characterDefinitionId: number;
      children: HistoryChildren[];
    },
    maxEnergy: number,
  ): blockEnergyProps | undefined {
    const energyChildren = block.children.filter(
      (c): c is EnergyHistoryChild =>
        c.type === "energy" &&
        c.characterDefinitionId === block.characterDefinitionId,
    );
    if (energyChildren.length === 0) return;
    const first = energyChildren[0];
    const last = energyChildren[energyChildren.length - 1];
    const energyValue = last.newEnergy - first.oldEnergy;
    return {
      oldEnergy: first.oldEnergy,
      newEnergy: last.newEnergy,
      energyValue,
      how: energyValue >= 0 ? "gain" : "loss",
      maxEnergy: maxEnergy,
    };
  }

  switch (block.type) {
    case "switchOrChooseActive": {
      const isOpp = opp(block.who);
      const titleKey =
        block.how === "init"
          ? isOpp
            ? "history.oppInitialActiveTitle"
            : "history.myInitialActiveTitle"
          : block.how === "switch"
            ? isOpp
              ? "history.oppSwitchActiveTitle"
              : "history.mySwitchActiveTitle"
            : isOpp
              ? "history.oppChooseActiveTitle"
              : "history.myChooseActiveTitle";
      result = {
        type: block.type,
        opp: isOpp,
        title: t(titleKey),
        indent: block.indent,
        imageId: block.characterDefinitionId,
        imageSize: "normal",
        callerId: block.characterDefinitionId,
        energyChange: extractBlockEnergyProps(block, 0), // 可填写maxEnergy
        content: {
          opp: opp(block.who),
          imageId: block.characterDefinitionId,
          name: renderName(block.characterDefinitionId),
          content: (
            <span class="text-3 text-#d4bc8e font-bold">
              {t("history.switchActive")}
            </span>
          ),
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    case "useSkill": {
      const isOpp = opp(block.who);
      result = {
        type: block.type,
        opp: isOpp,
        title: t(
          block.skillType === "technique"
            ? isOpp
              ? "history.oppUseTechniqueTitle"
              : "history.myUseTechniqueTitle"
            : isOpp
              ? "history.oppUseSkillTitle"
              : "history.myUseSkillTitle",
        ),
        indent: block.indent,
        imageId: block.callerDefinitionId,
        imageSize: "normal",
        callerId: block.callerDefinitionId,
        energyChange:
          block.skillType === "technique"
            ? void 0
            : extractBlockEnergyProps(
                {
                  characterDefinitionId: block.callerDefinitionId,
                  children: block.children,
                },
                0, // 可填写maxEnergy
              ),
        content: {
          opp: opp(block.who),
          imageId: block.callerDefinitionId,
          name: renderName(block.callerDefinitionId),
          content: (
            <SkillTriggeredPart
              subtitle={t(
                `history.use${block.skillType === "technique" ? "Technique" : "Skill"}`,
              )}
              imageId={block.skillDefinitionId}
              name={renderName(block.skillDefinitionId)}
            />
          ),
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    case "triggered": {
      result = {
        type: block.type,
        opp: opp(block.who),
        title: t("history.triggered"),
        indent: block.indent,
        imageId:
          block.entityType === "equipment"
            ? block.callerOrSkillDefinitionId
            : block.masterOrCallerDefinitionId,
        imageSize:
          block.entityType === "summon" || block.entityType === "support"
            ? "summon"
            : "normal",
        callerId: block.callerOrSkillDefinitionId,
        energyChange: extractBlockEnergyProps(
          {
            characterDefinitionId: block.masterOrCallerDefinitionId,
            children: block.children,
          },
          0, // 可填写maxEnergy
        ),
        status:
          block.entityType === "status" || block.entityType === "attachment"
            ? block.callerOrSkillDefinitionId
            : undefined,
        combatStatus:
          block.entityType === "combatStatus"
            ? block.callerOrSkillDefinitionId
            : undefined,
        content: {
          opp: opp(block.who),
          imageId: block.masterOrCallerDefinitionId,
          name: renderName(block.masterOrCallerDefinitionId),
          content: !block.callerOrSkillDefinitionId ? (
            <div class="text-3 text-#d4bc8e font-bold">
              {t("history.willTriggered")}
            </div>
          ) : block.callerOrSkillDefinitionId ===
            block.masterOrCallerDefinitionId ? (
            <CardDescriptionPart
              cardDefinitionId={block.masterOrCallerDefinitionId}
            />
          ) : (
            <SkillTriggeredPart
              subtitle={t("history.willTriggered")}
              imageId={block.callerOrSkillDefinitionId}
              name={renderName(block.callerOrSkillDefinitionId)}
            />
          ),
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    case "playCard": {
      const isOpp = opp(block.who);
      result = {
        type: block.type,
        opp: isOpp,
        title: t(
          isOpp ? "history.oppPlayCardTitle" : "history.myPlayCardTitle",
        ),
        indent: block.indent,
        imageId: block.cardDefinitionId,
        imageSize: "normal",
        callerId: block.cardDefinitionId,
        content: {
          opp: opp(block.who),
          imageId: block.cardDefinitionId,
          name: renderName(block.cardDefinitionId),
          content: (
            <CardDescriptionPart cardDefinitionId={block.cardDefinitionId} />
          ),
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    case "selectCard": {
      const isOpp = opp(block.who);
      result = {
        type: block.type,
        opp: isOpp,
        title: t(
          isOpp ? "history.oppSelectCardTitle" : "history.mySelectCardTitle",
        ),
        indent: block.indent,
        imageId: block.cardDefinitionId,
        imageSize: "normal",
        callerId: block.cardDefinitionId,
        content: {
          opp: opp(block.who),
          imageId: block.cardDefinitionId,
          name: renderName(block.cardDefinitionId),
          content: (
            <span class="text-3 text-#d4bc8e font-bold">
              {t(
                isOpp
                  ? "history.oppTriggeredSelectEffect"
                  : "history.myTriggeredSelectEffect",
              )}
            </span>
          ),
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    case "elementalTuning": {
      const isOpp = opp(block.who);
      result = {
        type: block.type,
        opp: isOpp,
        title: t(
          isOpp
            ? "history.oppElementalTuningTitle"
            : "history.myElementalTuningTitle",
        ),
        indent: block.indent,
        imageId: block.cardDefinitionId,
        imageSize: "normal",
        callerId: block.cardDefinitionId,
        content: {
          opp: opp(block.who),
          imageId: block.cardDefinitionId,
          name: renderName(block.cardDefinitionId),
          content: (
            <CardDescriptionPart cardDefinitionId={block.cardDefinitionId} />
          ),
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    case "pocket": {
      result = {
        type: "pocket",
        opp: false,
        title: t("history.judgeAction"),
        indent: block.indent,
        imageSize: "normal",
        content: {
          opp: false,
        },
        summary: renderSummary(block.children),
      };
      break;
    }
    default: {
      result = {
        type: "pocket",
        opp: false,
        title: "",
        indent: 0,
        imageSize: "normal",
        content: {
          opp: false,
        },
        summary: [],
      };
      break;
    }
  }
  return result;
};

export interface HistoryCardProps {
  definitionId?: number;
  class?: string;
}

export function HistoryCard(props: HistoryCardProps) {
  return (
    <Show
      when={!!props.definitionId}
      fallback={<CardbackNormal class={props.class} />}
    >
      <>
        <Image
          class={`text-0 ${props.class ?? ""}`}
          imageId={props.definitionId as number}
          fallback="card"
        />
        <CardFrameNormal class={`pointer-events-none ${props.class ?? ""}`} />
      </>
    </Show>
  );
}

export function HistorySummon(props: HistoryCardProps) {
  return (
    <Show
      when={!!props.definitionId}
      fallback={
        <div class={`bg-gray-700 b-2 b-white/50 ${props.class ?? ""}`} />
      }
    >
      <>
        <Image
          class={`text-0 rounded-sm ${props.class ?? ""}`}
          imageId={props.definitionId as number}
          fallback="card"
        />
        <CardFrameSummon class={`pointer-events-none ${props.class ?? ""}`} />
      </>
    </Show>
  );
}

function HistoryChildBox(props: { data: HistoryChildData }) {
  return (
    <div
      class="w-full min-h-11.6 flex flex-row items-center shrink-0 bg-white/4 gap-2 p-1 b-l-4 b-#806440 data-[opp]:b-#48678b"
      bool:data-opp={props.data.opp}
    >
      <Switch>
        <Match when={!props.data.imageId}>
          <CardbackNormal class="w-5.6 h-9.6 shrink-0" />
        </Match>
        <Match when={props.data.imageId === "tuning"}>
          <div class="w-5.6 h-5.6 shrink-0">
            <TuningIcon />
          </div>
        </Match>
        <Match when={true}>
          <Image
            imageId={props.data.imageId as number}
            type={props.data.imageType}
            class="w-5.6 shrink-0 min-h-5.6 max-h-9.6"
            fallback="skill"
          />
        </Match>
      </Switch>
      <div class="flex-1">
        <div class="flex gap-2 h-4 text-3 text-white mb-1">
          <span>{props.data.title}</span>
          <Show when={props.data.healthChange}>
            {(healthChange) => (
              <div
                class="flex h-4 px-3 gap-1 rounded-full b-1 b-black bg-#d14f51 data-[increase]:bg-#6e9b3a"
                bool:data-increase={healthChange().type === "heal"}
              >
                <Show when={healthChange().special}>
                  <Switch>
                    <Match when={healthChange().type === "heal"}>
                      <RevivePreviewIcon class="h-5 w-5 mx--1 mt--1.5 shrink-0" />
                    </Match>
                    <Match when={healthChange().type === "damage"}>
                      <DefeatedPreviewIcon class="h-5 w-5 mx--1 mt--1.5 shrink-0" />
                    </Match>
                  </Switch>
                </Show>
                <span class="line-height-3.5 font-bold">
                  {`${healthChange().type === "heal" ? "+" : "-"}${healthChange().value}`}
                </span>
              </div>
            )}
          </Show>
        </div>
        <p class="text-2.5 text-#b2afa8 history-children">
          <RichText content={props.data.content} />
        </p>
      </div>
    </div>
  );
}

function HistorySummaryShot(props: { data: SummaryShot }) {
  return (
    <div
      class="w-24 grid grid-cols-1 grid-rows-[1fr_6fr_1fr] isolate"
      style={{ width: `${2.375 + props.data.cardFace.length * 0.25}rem` }}
    >
      <div class="grid-area-[1/1] w-10.5 flex justify-center">
        <Switch>
          <Match when={props.data.aura === "more"}>
            <MoreStatus class="w-3 h-3" />
          </Match>
          <Match when={!!props.data.aura}>
            <For each={props.data.aura as DamageType[]}>
              {(damageType) => (
                <Image imageId={damageType} class="h-3 w-3" fallback="state" />
              )}
            </For>
          </Match>
        </Switch>
      </div>
      <Switch>
        <Match when={props.data.size === "normal"}>
          <For each={props.data.cardFace.toReversed()}>
            {(imageId, index) => (
              <HistoryCard
                definitionId={imageId}
                class={`grid-area-[2/1] justify-self-end w-10.5 h-18 mr-${index()}`}
              />
            )}
          </For>
        </Match>
        <Match when={props.data.size === "summon"}>
          <For each={props.data.cardFace.toReversed()}>
            {(imageId, index) => (
              <HistorySummon
                definitionId={imageId}
                class={`grid-area-[2/1] justify-self-end self-center w-10.5 h-12.5 mr-${index()}`}
              />
            )}
          </For>
        </Match>
      </Switch>
      <Switch>
        <Match when={props.data.inner === "switch"}>
          <SwitchActiveHistoryIcon class="grid-area-[2/1] self-center h-9 w-9 mx-0.75" />
        </Match>
        <Match when={props.data.inner === "defeated"}>
          <DefeatedPreviewIcon class="grid-area-[2/1] self-center h-8 w-8 mx-1.25" />
        </Match>
      </Switch>
      <Switch>
        <Match when={props.data.inner === "damage"}>
          <div class="grid-area-[2/1] self-center h-4 w-12 z-1 mx--0.75 flex flex-row gap-1 justify-center text-white text-3 rounded-full b-1 b-black bg-#d14f51">
            <Show when={props.data.innerValueSpecial}>
              <DefeatedPreviewIcon class="h-5 w-5 mx--1 mt--1.5 shrink-0" />
            </Show>
            <span class="line-height-3.5 font-bold">
              {props.data.innerValue === "more"
                ? "···"
                : `-${props.data.innerValue}`}
            </span>
          </div>
        </Match>
        <Match when={props.data.inner === "heal"}>
          <div class="grid-area-[2/1] self-center h-4 w-12 z-1 mx--0.75 flex flex-row gap-1 justify-center text-white text-3 rounded-full b-1 b-black bg-#6e9b3a">
            <Show when={props.data.innerValueSpecial}>
              <RevivePreviewIcon class="h-5 w-5 mx--1 mt--1.5 shrink-0" />
            </Show>
            <span class="line-height-3.5 font-bold">
              {props.data.innerValue === "more"
                ? "···"
                : `+${props.data.innerValue}`}
            </span>
          </div>
        </Match>
      </Switch>
      <div class="grid-area-[2/1] self-end m-0.5 flex">
        <Switch>
          <Match when={props.data.status === "more"}>
            <MoreStatus class="w-3 h-3" />
          </Match>
          <Match when={!!props.data.status}>
            <For each={props.data.status as number[]}>
              {(status) => (
                <Image imageId={status} type="icon" class="h-3 w-3" />
              )}
            </For>
          </Match>
        </Switch>
      </div>
      <div class="grid-area-[3/1] flex">
        <Switch>
          <Match when={props.data.combat === "more"}>
            <MoreStatus class="w-3 h-3" />
          </Match>
          <Match when={!!props.data.combat}>
            <For each={props.data.combat as number[]}>
              {(combat) => (
                <Image imageId={combat} type="icon" class="h-3 w-3" />
              )}
            </For>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

function HistoryBlockBox(props: {
  data: HistoryBlockData;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      class={`w-full h-31 flex flex-col rounded-sm shrink-0 bg-[var(--bg-color)] border-[var(--bd-color)] b-2 relative overflow-clip history-block`}
      bool:data-opp={props.data.opp}
      bool:data-selected={props.isSelected}
      onClick={() => props.onClick()}
    >
      <div class="w-full h-6 bg-[var(--title-color)] flex flex-row items-center px-1 gap-1">
        <div
          class="text-[var(--text-color)] text-3 font-bold whitespace-nowrap flex-1"
          bool:data-opp={props.data.opp}
        >
          {props.data.title}
        </div>
        <For each={Array.from({ length: props.data.indent + 1 }, (_, i) => i)}>
          {() => <div class="w-1 h-full bg-[var(--bd-color)]" />}
        </For>
      </div>
      <div class="h-24 flex flex-row items-center justify-center gap-1.5">
        <div class="w-10.5 h-24 grid grid-cols-1 grid-rows-[1fr_6fr_1fr]">
          <Switch>
            <Match when={props.data.imageSize === "normal"}>
              <HistoryCard
                definitionId={props.data.imageId}
                class="grid-area-[2/1] w-10.5 h-18"
              />
            </Match>
            <Match when={props.data.imageSize === "summon"}>
              <HistorySummon
                definitionId={props.data.imageId}
                class="grid-area-[2/1] place-self-center w-10.5 h-12.5"
              />
            </Match>
          </Switch>
          <Switch>
            <Match when={props.data.type === "switchOrChooseActive"}>
              <SwitchActiveHistoryIcon class="grid-area-[2/1] place-self-center h-9 w-9" />
            </Match>
            <Match when={props.data.type === "triggered"}>
              <TriggerIcon class="grid-area-[2/1] place-self-center h-9 w-9" />
            </Match>
            <Match when={props.data.type === "elementalTuning"}>
              <TuningIcon class="grid-area-[2/1] place-self-center h-8 w-8" />
            </Match>
          </Switch>
          <div class="grid-area-[2/1] self-end m-0.5 flex">
            <Show when={!!props.data.status}>
              <Image
                imageId={props.data.status as number}
                type="icon"
                class="h-3 w-3"
              />
            </Show>
          </div>
          <div class="grid-area-[3/1] flex">
            <Show when={!!props.data.combatStatus}>
              <Image
                imageId={props.data.combatStatus as number}
                type="icon"
                class="h-3 w-3"
              />
            </Show>
          </div>
        </div>
        <Show when={props.data.summary.length}>
          <div class="w-4 font-bold text-white/80">→</div>
          <For each={props.data.summary.slice(0, 3)}>
            {(summary) => <HistorySummaryShot data={summary} />}
          </For>
          <Show when={props.data.summary.length > 3}>
            <div class="w-4 font-bold text-3 text-white/80">···</div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

function PocketHistoryBlockBox(props: {
  data: HistoryBlockData;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      class={`w-full h-6 rounded-sm shrink-0 text-center text-3 font-bold line-height-5 b-2 bg-#b1ada8 b-white text-#212933 opacity-60 data-[selected]:opacity-100`}
      bool:data-selected={props.isSelected}
      onClick={() => props.onClick()}
    >
      {props.data.title}
    </div>
  );
}

function HistoryHintBox(props: { data: HistoryHintData }) {
  return (
    <Switch>
      <Match when={props.data.type === "changePhase"}>
        <div class="w-full h-6 rounded-sm shrink-0 text-center text-3 font-bold line-height-loose bg-#212933 text-#b1ada8">
          {props.data.content}
        </div>
      </Match>
      <Match when={props.data.type === "action"}>
        <div
          class="w-full h-6 rounded-sm shrink-0 text-center text-3 font-bold line-height-loose bg-#885e2e data-[opp]:bg-#3e69a8 text-#efb264 data-[opp]:text-#9bc6ff"
          bool:data-opp={props.data.opp}
        >
          {props.data.content}
        </div>
      </Match>
    </Switch>
  );
}

function HistoryBlockItem(props: {
  block: HistoryBlock;
  isSelected: boolean;
  onSelect: (block: HistoryBlock) => void;
}) {
  const isHint = (b: HistoryBlock = props.block): b is HistoryHintBlock =>
    b.type === "changePhase" || b.type === "action";

  const hintData = createMemo(() => {
    if (!isHint(props.block)) return null;
    return renderHistoryHint(props.block);
  });

  const detailData = createMemo(() => {
    if (isHint(props.block)) return null;
    return renderHistoryBlock(props.block);
  });

  return (
    <Switch>
      <Match when={isHint()}>
        <HistoryHintBox data={hintData() as HistoryHintData} />
      </Match>
      <Match when={props.block.type === "pocket"}>
        <PocketHistoryBlockBox
          data={detailData() as HistoryBlockData}
          isSelected={props.isSelected}
          onClick={() => props.onSelect(props.block)}
        />
      </Match>
      <Match when={true}>
        <HistoryBlockBox
          data={detailData() as HistoryBlockData}
          isSelected={props.isSelected}
          onClick={() => props.onSelect(props.block)}
        />
      </Match>
    </Switch>
  );
}

export interface HistoryPanelProps {
  who: 0 | 1;
  history: HistoryBlock[];
  onBackdropClick: () => void;
}

export function HistoryPanel(props: HistoryPanelProps) {
  const [selectedBlock, setSelectedBlock] = createSignal<HistoryBlock | null>(
    null,
  );
  const [keepScrollingBottom, setKeepScrollingBottom] = createSignal(true);
  const [showBackToBottom, setShowBackToBottom] = createSignal(false);
  let scrollRef!: HTMLDivElement;

  const scrollToBottom = (behavior?: ScrollBehavior) => {
    scrollRef.scrollTo({ top: scrollRef.scrollHeight, behavior });
  };

  const handleScroll = () => {
    const distance =
      scrollRef.scrollHeight - scrollRef.scrollTop - scrollRef.clientHeight;
    setShowBackToBottom(distance > 100);
    setKeepScrollingBottom(distance <= 100);
  };

  const who = createMemo(() => props.who);

  createEffect(() => {
    void props.history.at(-1);
    if (untrack(keepScrollingBottom)) {
      scrollToBottom("smooth");
    }
  });

  return (
    <WhoContext.Provider value={who}>
      <div
        class="w-full h-full bg-black/50 z-4"
        onClick={() => {
          if (selectedBlock()) {
            setSelectedBlock(null);
          } else {
            props.onBackdropClick();
          }
        }}
      />
      <div class="justify-self-end z-5 w-70 h-full pt-12 pb-5 relative select-none min-h-0 touch-pan history-panel-bg">
        <div
          class="w-full h-full flex flex-col space-y-1.5 overflow-y-scroll pl-2 history-scrollbar"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <For each={props.history}>
            {(block) => (
              <HistoryBlockItem
                block={block}
                isSelected={selectedBlock() === block}
                onSelect={(b) => {
                  if (b.type !== "changePhase" && b.type !== "action") {
                    setSelectedBlock(b);
                  }
                }}
              />
            )}
          </For>
        </div>
        <Show when={showBackToBottom()}>
          <button
            class={`absolute h-6 left-2 right-2 bottom-2 rounded-full
              bg-#e9e2d3 opacity-80 text-#3b4255 text-3 font-bold
              hover:b-white hover:b-2 hover:opacity-100`}
            onClick={() => scrollToBottom("instant")}
          >
            {useUiContext().t("history.jumpLatest")}
          </button>
        </Show>
      </div>
      <Show when={selectedBlock()}>
        {(block) => (
          <HistoryBlockDetailPanel
            block={block() as HistoryDetailBlock}
            onClose={() => setSelectedBlock(null)}
          />
        )}
      </Show>
    </WhoContext.Provider>
  );
}

function HistoryBlockDetailPanel(props: {
  block: HistoryDetailBlock;
  onClose: () => void;
}) {
  const renderBlock = createMemo(() => renderHistoryBlock(props.block));
  return (
    <div
      class={`justify-self-end mr-71 z-5 w-90 select-none
        p-3 pr-1 bg-#2f333b/98 b-#404a56 b-1 rounded`}
      onClick={(e) => e.stopPropagation()}
    >
      <div class="overflow-y-scroll max-h-120 flex flex-col gap-1 history-scrollbar">
        <Show when={renderBlock().type !== "pocket"}>
          <div class="relative w-full bg-#2d333a rounded-t-md grid grid-cols-[3.625rem_1fr] self-start b-2 b-white/10 shrink-0">
            <div
              class="absolute top-1px left-1px w-3.5 h-3.5 rounded-lt bg-#806440 data-[opp]:bg-#48678b history-card-hint"
              bool:data-opp={renderBlock().content.opp}
            />
            <HistoryCard
              definitionId={renderBlock().content.imageId}
              class="grid-area-[1/1] w-10.5 h-18 m-2"
            />
            <div class="grid-area-[1/2] py-1.5 pr-2 flex flex-col text-2.5 text-#b2afa8">
              <div class="text-3.5 text-#fff3e0 font-bold">
                {renderBlock().content.name}
              </div>
              {renderBlock().content.content}
            </div>
          </div>
        </Show>
        <For each={props.block.children}>
          {(child) => (
            <HistoryChildBox
              data={renderHistoryChild(child, renderBlock().callerId)}
            />
          )}
        </For>
      </div>
    </div>
  );
}
