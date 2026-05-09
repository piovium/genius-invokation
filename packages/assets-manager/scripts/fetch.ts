// Copyright (C) 2025 Guyutongxue
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

import path from "node:path";
import {
  ALL_CATEGORIES,
  getDeckData,
  AssetsManager,
  type ActionCardRawData,
  type CharacterRawData,
  type EntityRawData,
  type KeywordRawData,
  // @ts-ignore Cross-project import, but it should be fine
} from "#src/index";
import { rm } from "node:fs/promises";

const DESTINATION_DIR = path.resolve(import.meta.dirname, "../src/data");

await rm(DESTINATION_DIR, { recursive: true, force: true });

const mapReplacer = (key: string, value: unknown) => {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  return value;
};

const write = async (data: unknown, ...paths: string[]) => {
  const finalPath = path.resolve(DESTINATION_DIR, ...paths);
  await Bun.write(finalPath, JSON.stringify(data, mapReplacer, 2) + "\n");
  console.log(`Wrote ${finalPath}`);
};

for (const language of ["EN", "CHS"] as const) {
  const manager = new AssetsManager({ language });
  const [actionCards, characters, entities, keywords] = (await Promise.all(
    ALL_CATEGORIES.map((category) => manager.getCategory(category)),
  )) as [
    ActionCardRawData[],
    CharacterRawData[],
    EntityRawData[],
    KeywordRawData[],
  ];

  const names = Object.fromEntries([
    ...[...characters, ...actionCards, ...entities, ...keywords].flatMap(
      (e) => [
        [e.id, e.name],
        ...("skills" in e ? e.skills.map((s) => [s.id, s.name]) : []),
      ],
    ),
  ]);

  await write(names, language, "names.json");
  await write(actionCards, language, "action_cards.json");
  await write(characters, language, "characters.json");
  await write(entities, language, "entities.json");
  await write(keywords, language, "keywords.json");

  // language agnostic
  if (language === "CHS") {
    const deckData = getDeckData(characters, actionCards);
    const shareMap = Object.fromEntries(
      [...characters, ...actionCards].map((card) => [card.shareId, card.id]),
    );
    await write(deckData, "deck.json");
    await write(shareMap, "share_id.json");
  }
}
