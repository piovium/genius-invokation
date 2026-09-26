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

import { getCostCode, inlineCostDescription, isLegend } from "./cost";
import { identifier, SourceInfo, writeSourceCode } from "./source";
import { EntityRawData, entities } from "./data";
import { NEW_VERSION } from "./config";

function getCardTypeAndTags(card: EntityRawData) {
  const TAG_MAP: Record<string, string> = {
    // GCG_TAG_TALENT: "talent", // use talent
    GCG_TAG_SLOWLY: "action",
    GCG_TAG_FOOD: "food",
    GCG_TAG_ARTIFACT: "artifact",
    // GCG_TAG_WEAPON: "", // implicit defined
    GCG_TAG_WEAPON_BOW: "bow",
    GCG_TAG_WEAPON_SWORD: "sword",
    GCG_TAG_WEAPON_CATALYST: "catalyst",
    GCG_TAG_ALLY: "ally",
    GCG_TAG_PLACE: "place",
    GCG_TAG_CARD_BLESSING: "blessing",
    GCG_TAG_ADVENTURE_PLACE: "adventureSpot",
    GCG_TAG_RESONANCE: "resonance",
    GCG_TAG_WEAPON_POLE: "pole",
    GCG_TAG_ITEM: "item",
    GCG_TAG_WEAPON_CLAYMORE: "claymore",
    GCG_TAG_VEHICLE: "technique",
    GCG_TAG_HEXENZIRKEL: "hexenzirkel",
  };
  const tags = card.tags.map((t) => TAG_MAP[t]).filter((t) => t);
  const TYPE_MAP: Record<string, string> = {
    GCG_CARD_ASSIST: "support",
    GCG_CARD_EVENT: "event",
    GCG_CARD_MODIFY: "equipment",
  };
  const type = TYPE_MAP[card.type] || null;
  return { type, tags };
}

export const TODO_LINE = "// TODO\n";

export function getCardCode(card: EntityRawData, extra = "") {
  const { type, tags } = getCardTypeAndTags(card);
  if (type === null) {
    return { type, tags, code: null };
  }
  let mainCode = "";
  const filteringTags = [...tags];
  const takeTag = (candidates: string[]) => {
    const index = filteringTags.findIndex((tag) => candidates.includes(tag));
    if (index < 0) {
      return;
    }
    return filteringTags.splice(index, 1)[0];
  };
  if (extra) {
    // Talent bodies are supplied by the character generator.
    mainCode = extra;
  } else if (type === "event") {
    mainCode = `\n  ${TODO_LINE}`;
  } else if (type === "equipment") {
    const tag = takeTag([
      "artifact",
      "technique",
      "bow",
      "sword",
      "catalyst",
      "pole",
      "claymore",
    ]);
    if (tag === "artifact") {
      mainCode = `\n  artifact {\n    ${TODO_LINE}  }`;
    } else if (tag === "technique") {
      mainCode = `\n  technique {\n    ${TODO_LINE}  }`;
    } else if (
      tag &&
      ["bow", "sword", "catalyst", "pole", "claymore"].includes(tag)
    ) {
      mainCode = `\n  weapon ${tag} {\n    ${TODO_LINE}  }`;
    }
  } else if (type === "support") {
    const adventureSpotCode = takeTag(["adventureSpot"])
      ? "    adventureSpot;\n"
      : "";
    const tag = takeTag(["blessing", "ally", "place", "item"]);
    if (tag === "blessing") {
      mainCode = `\n  support {\n    elementalBlessing;\n${adventureSpotCode}    ${TODO_LINE}  }`;
    } else if (tag) {
      mainCode = `\n  support ${tag} {\n${adventureSpotCode}    ${TODO_LINE}  }`;
    } else {
      mainCode = `\n  support {\n${adventureSpotCode}    ${TODO_LINE}  }`;
    }
  }
  const tagCode =
    filteringTags.length > 0 ? `\n  tags ${filteringTags.join(", ")};` : "";
  const cost = getCostCode(card.playCost);
  const undiscoverable = card.tags.includes("GCG_TAG_NON_DISCOVERABLE")
    ? "\n  undiscoverable;"
    : "";
  const code = `define card {
  id ${card.id} as ${identifier(card.englishName)};
  since "${NEW_VERSION}";${cost}${tagCode}${undiscoverable}${mainCode}
}`;
  return { type, tags, code };
}

export async function generateCards() {
  const INIT_CARD_CODE = `import { DiceType, DamageType, $ } from "@gi-tcg/core/data";\n`;
  const equipsCode: Record<string, SourceInfo[]> = {
    bow: [],
    sword: [],
    catalyst: [],
    pole: [],
    claymore: [],
    artifact: [],
    technique: [],
  };
  const supportCode: Record<string, SourceInfo[]> = {
    ally: [],
    place: [],
    adventureSpot: [],
    item: [],
    blessing: [],
    other: [],
  };
  let foods: SourceInfo[] = [];
  let legends: SourceInfo[] = [];
  let others: SourceInfo[] = [];

  for (const card of entities) {
    if (card.id <= 211) {
      // 系统，不管
      continue;
    }
    if (Math.floor(card.id / 100000) === 1) {
      // 角色衍生物，不列出
      continue;
    }
    if (card.tags.includes("GCG_TAG_TALENT")) {
      continue;
    }
    if (card.name.includes("test")) {
      // 神人
      continue;
    }
    const { type, tags, code } = getCardCode(card);
    if (!type) {
      continue;
    }
    let target: SourceInfo[];
    if (isLegend(card.playCost)) {
      target = legends;
    } else if (tags.includes("food")) {
      target = foods;
    } else if (type === "equipment") {
      const equipmentTag = tags.find((tag) => tag in equipsCode);
      if (typeof equipmentTag === "undefined") {
        throw new Error(
          `${card.id} ${card.name} has unsupported equip type ${tags.join(", ")}`,
        );
      }
      target = equipsCode[equipmentTag];
    } else if (type === "support") {
      if (tags.includes("adventureSpot")) {
        target = supportCode.adventureSpot;
      } else {
        const supportTag = tags.find((tag) => tag in supportCode) ?? "other";
        target = supportCode[supportTag];
      }
    } else {
      target = others;
    }
    let description = card.description;
    if (
      card.playingDescription?.includes("$") ||
      card.dynamicDescription?.includes("$")
    ) {
      description += "\n【此卡含描述变量】";
    }
    if (card.tags.includes("GCG_TAG_VEHICLE")) {
      const et = entities.find((et) => et.id === card.id)!;
      for (const skill of et.skills) {
        description += `\n[${skill.id}: ${skill.name}] (${inlineCostDescription(
          skill.playCost,
        )}) ${skill.description}`;
      }
    }
    target.push({
      id: card.id,
      name: card.name,
      cost: inlineCostDescription(card.playCost),
      description: description,
      code,
    });
  }
  return Promise.all([
    writeSourceCode("cards/event/food", INIT_CARD_CODE, foods),
    writeSourceCode("cards/event/legend", INIT_CARD_CODE, legends),
    writeSourceCode("cards/event/other", INIT_CARD_CODE, others),
    writeSourceCode(
      "cards/equipment/weapon/bow",
      INIT_CARD_CODE,
      equipsCode.bow,
    ),
    writeSourceCode(
      "cards/equipment/weapon/sword",
      INIT_CARD_CODE,
      equipsCode.sword,
    ),
    writeSourceCode(
      "cards/equipment/weapon/catalyst",
      INIT_CARD_CODE,
      equipsCode.catalyst,
    ),
    writeSourceCode(
      "cards/equipment/weapon/pole",
      INIT_CARD_CODE,
      equipsCode.pole,
    ),
    writeSourceCode(
      "cards/equipment/weapon/claymore",
      INIT_CARD_CODE,
      equipsCode.claymore,
    ),
    writeSourceCode(
      "cards/equipment/artifacts",
      INIT_CARD_CODE,
      equipsCode.artifact,
    ),
    writeSourceCode(
      "cards/equipment/techniques",
      INIT_CARD_CODE,
      equipsCode.technique,
    ),
    writeSourceCode("cards/support/ally", INIT_CARD_CODE, supportCode.ally),
    writeSourceCode("cards/support/place", INIT_CARD_CODE, supportCode.place),
    writeSourceCode("cards/support/item", INIT_CARD_CODE, supportCode.item),
    writeSourceCode(
      "cards/support/adventure",
      INIT_CARD_CODE,
      supportCode.adventureSpot,
    ),
    writeSourceCode(
      "cards/support/blessing",
      INIT_CARD_CODE,
      supportCode.blessing,
    ),
    // writeSourceCode("cards/support/other", INIT_CARD_CODE, supportCode.other),
  ]);
}
