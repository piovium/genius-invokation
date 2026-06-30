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
  EntityRawData,
  characters,
  actionCards,
  entities,
  ActionCardRawData,
} from "./data";

import { snakeCase } from "case-anything";
import { writeSourceCode, SourceInfo, identifier } from "./source";
import { getCostCode, inlineCostDescription } from "./cost";
import { getCardCode, getCardTypeAndTags, TODO_LINE } from "./cards";
import { NEW_VERSION } from "./config";

interface AuxiliaryFound {
  items: SourceInfo[];
}

function getAuxiliaryOfCharacter(id: number): AuxiliaryFound {
  const candidates: EntityRawData[] = [];
  for (const obj of entities) {
    if (
      Math.floor(obj.id / 10) === 10000 + id &&
      !candidates.find((c) => c.id === obj.id)
    ) {
      candidates.push(obj);
    }
  }
  type EntityRawDataWithKind = EntityRawData & { kind: string };
  const mySummons: EntityRawDataWithKind[] = [];
  const myStatuses: EntityRawDataWithKind[] = [];
  const myCards: ((EntityRawData | ActionCardRawData) & { kind: string })[] =
    [];
  const myCombatStatuses: EntityRawDataWithKind[] = [];
  const myUnknownEntities: EntityRawDataWithKind[] = [];
  for (const obj of candidates) {
    if (obj.hidden) {
      continue;
    }
    switch (obj.type) {
      case "GCG_CARD_SUMMON":
        mySummons.push({ ...obj, kind: "summon" });
        break;
      case "GCG_CARD_STATE":
        myStatuses.push({ ...obj, kind: "status" });
        break;
      case "GCG_CARD_ONSTAGE":
        myCombatStatuses.push({ ...obj, kind: "combatStatus" });
        break;
      case "GCG_CARD_MODIFY":
      case "GCG_CARD_ASSIST":
        myCards.push({ ...obj, kind: "card" });
        break;
      case "GCG_CARD_UNKNOWN":
        // beta data
        myUnknownEntities.push({ ...obj, kind: "unknown" });
        break;
    }
  }
  for (const obj of actionCards) {
    if (
      obj.type === "GCG_CARD_EVENT" &&
      Math.floor(obj.id / 10) === 10000 + id &&
      !candidates.find((c) => c.id === obj.id)
    ) {
      myCards.push({ ...obj, kind: "card" });
    }
  }
  const items = [
    ...mySummons,
    ...myStatuses,
    ...myCards,
    ...myCombatStatuses,
    ...myUnknownEntities,
  ].map<SourceInfo>((obj) => {
    let description = obj.description;
    if (obj.playingDescription?.includes("$")) {
      description += "\n【此卡含描述变量】";
    }
    if (obj.tags.includes("GCG_TAG_VEHICLE")) {
      const et = entities.find((et) => et.id === obj.id)!;
      for (const skill of et.skills) {
        description += `\n[${skill.id}: ${skill.name}] (${inlineCostDescription(
          skill.playCost,
        )}) ${skill.description}`;
      }
    }
    return {
      id: obj.id,
      name: obj.name,
      description: description,
      code: `define ${obj.kind} {
  id ${obj.id} as ${identifier(obj.englishName)};
  since "${NEW_VERSION}";
  // TODO
}`,
    };
  });
  return {
    items,
  };
}

function getTalentCard(id: number, name: string): SourceInfo[] {
  const card = actionCards.find(
    (c) =>
      c.tags.includes("GCG_TAG_TALENT") && Math.floor(c.id / 10) === 20000 + id,
  );
  if (!card) {
    return [];
  }
  const { type } = getCardTypeAndTags(card);
  const methodName = type === "equipment" ? "talent" : "eventTalent";
  return [
    {
      id: card.id,
      name: card.name,
      description: card.description,
      code: getCardCode(
        card,
        `\n  ${methodName} ${identifier(name)} {\n    ${TODO_LINE}  }`,
      ),
    },
  ];
}

export async function generateCharacters() {
  for (const ch of characters) {
    const filename =
      "characters/" +
      ch.tags[0].split("_").pop()!.toLowerCase() +
      "/" +
      snakeCase(ch.englishName);

    const { items } =
      getAuxiliaryOfCharacter(ch.id);
    const initCode = `import { DiceType, DamageType, $ } from "@gi-tcg/core/builder";\n`;
    const skills = ch.skills;

    const todoLine = items.push(
      ...skills.map<SourceInfo>((sk) => {
        const TYPE_MAP: Record<string, string> = {
          GCG_SKILL_TAG_A: "normal",
          GCG_SKILL_TAG_E: "elemental",
          GCG_SKILL_TAG_Q: "burst",
          GCG_SKILL_TAG_PASSIVE: "passive",
        };
        return {
          id: sk.id,
          name: sk.name,
          description: sk.description,
          code: `define skill {
  id ${sk.id} as ${identifier(sk.englishName)};
  skillType ${TYPE_MAP[sk.type]}${
    TYPE_MAP[sk.type] === "passive"
      ? ` {\n    ${TODO_LINE}  }`
      : `;${getCostCode(sk.playCost)}
  ${TODO_LINE}`
  }
}`,
        };
      }),
    );

    const tagCode = ch.tags
      .map((t) => t.split("_").pop()!.toLowerCase())
      .filter((s) => s !== "none")
      .join(", ");

    items.push({
      id: ch.id,
      name: ch.name,
      description: ch.storyText ?? "",
      code: `define character {
  id ${ch.id} as ${identifier(ch.englishName)};
  since "${NEW_VERSION}";
  tags ${tagCode};
  health ${ch.hp};
  energy ${ch.maxEnergy};
  skills ${skills.map((sk) => identifier(sk.englishName)).join(", ")};
}`,
    });
    items.push(...getTalentCard(ch.id, ch.englishName));

    await writeSourceCode(filename, initCode, items, true);
  }
}
