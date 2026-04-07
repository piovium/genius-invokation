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
import { ActionCardRawData, actionCards, entities } from "./data";
import { NEW_VERSION } from "./config";

export function getCardTypeAndTags(card: ActionCardRawData) {
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
  };
  const tags = card.tags.map((t) => TAG_MAP[t]).filter((t) => t);
  const TYPE_MAP: Record<string, string> = {
    GCG_CARD_ASSIST: "support",
    GCG_CARD_EVENT: "event",
    GCG_CARD_MODIFY: "equipment",
  };
  const type = TYPE_MAP[card.type];
  return { type, tags };
}

export function getCardCode(card: ActionCardRawData, extra = ""): string {
  const { type, tags } = getCardTypeAndTags(card);
  let typeCode = "";
  if (type === "equipment") {
    const tag = tags.shift();
    if (tag === "artifact") {
      typeCode = `\n  .artifact()`;
    } else if (tag === "technique") {
      typeCode = `\n  .technique()`;
    } else if (
      tag &&
      ["bow", "sword", "catalyst", "pole", "claymore"].includes(tag)
    ) {
      typeCode = `\n  .weapon("${tag}")`;
    }
  } else if (type === "support") {
    const tag = tags.shift();
    if (tag === "place" && tags.includes("adventureSpot")) {
      typeCode = `\n  .adventureSpot()`;
    } else if (tag) {
      typeCode = `\n  .support("${tag}")`;
    } else {
      typeCode = `\n  .support()`;
    }
  }
  const tagCode =
    tags.length > 0 ? `\n  .tags(${tags.map((t) => `"${t}"`).join(", ")})` : "";
  const cost = getCostCode(card.playCost);
  return `export const ${identifier(card.englishName)} = card(${card.id})
  .since("${NEW_VERSION}")${cost}${tagCode}${extra}${typeCode}
  // TODO
  .done();`;
}

export async function generateCards() {
  const INIT_CARD_CODE = `import { card, $ } from "@gi-tcg/core/builder";\n`;
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

  for (const card of actionCards) {
    if (card.id < 100) {
      // 莫名其妙的元素附魔系列？
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
    const { type, tags } = getCardTypeAndTags(card);
    let target: SourceInfo[];
    if (isLegend(card.playCost)) {
      target = legends;
    } else if (tags.includes("food")) {
      target = foods;
    } else if (type === "equipment") {
      if (typeof equipsCode[tags[0]] === "undefined") {
        throw new Error(`${card.id} ${card.name} has unsupported equip type`);
      }
      target = equipsCode[tags[0]];
    } else if (type === "support") {
      if (typeof supportCode[tags[0]] === "undefined") {
        target = supportCode.other;
      } else if (tags.includes("adventureSpot")) {
        target = supportCode.adventureSpot;
      } else {
        target = supportCode[tags[0]];
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
          skill.playCost
        )}) ${skill.description}`;
      }
    }
    target.push({
      id: card.id,
      name: card.name,
      description: description,
      code: getCardCode(card),
    });
  }
  return Promise.all([
    writeSourceCode("cards/event/food.ts", INIT_CARD_CODE, foods),
    writeSourceCode("cards/event/legend.ts", INIT_CARD_CODE, legends),
    writeSourceCode("cards/event/other.ts", INIT_CARD_CODE, others),
    writeSourceCode(
      "cards/equipment/weapon/bow.ts",
      INIT_CARD_CODE,
      equipsCode.bow
    ),
    writeSourceCode(
      "cards/equipment/weapon/sword.ts",
      INIT_CARD_CODE,
      equipsCode.sword
    ),
    writeSourceCode(
      "cards/equipment/weapon/catalyst.ts",
      INIT_CARD_CODE,
      equipsCode.catalyst
    ),
    writeSourceCode(
      "cards/equipment/weapon/pole.ts",
      INIT_CARD_CODE,
      equipsCode.pole
    ),
    writeSourceCode(
      "cards/equipment/weapon/claymore.ts",
      INIT_CARD_CODE,
      equipsCode.claymore
    ),
    writeSourceCode(
      "cards/equipment/artifacts.ts",
      INIT_CARD_CODE,
      equipsCode.artifact
    ),
    writeSourceCode(
      "cards/equipment/techniques.ts",
      INIT_CARD_CODE,
      equipsCode.technique
    ),
    writeSourceCode("cards/support/ally.ts", INIT_CARD_CODE, supportCode.ally),
    writeSourceCode(
      "cards/support/place.ts",
      INIT_CARD_CODE,
      supportCode.place
    ),
    writeSourceCode("cards/support/item.ts", INIT_CARD_CODE, supportCode.item),
    writeSourceCode(
      "cards/support/adventure.ts",
      INIT_CARD_CODE,
      supportCode.adventureSpot
    ),
    writeSourceCode("cards/support/blessing.ts", INIT_CARD_CODE, supportCode.blessing),
    // writeSourceCode("cards/support/other.ts", INIT_CARD_CODE, supportCode.other),
  ]);
}
