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

import type { ActionCardRawData, CharacterRawData } from "./data_types";

export interface DeckDataCharacterInfo {
  id: number;
  tags: string[];
  version: number;
}

export interface DeckDataActionCardInfo {
  id: number;
  type: string;
  tags: string[];
  version: number;
  relatedCharacterId: number | null;
  relatedCharacterTag: string | null;
}

export interface DeckData {
  allTags: string[];
  allTypes: string[];
  allVersions: string[];
  characters: Map<number, DeckDataCharacterInfo>;
  actionCards: Map<number, DeckDataActionCardInfo>;
}

export function getDeckData(
  characters: CharacterRawData[],
  actionCards: ActionCardRawData[],
): DeckData {
  const chs = characters.filter((ch) => !!ch.shareId);
  const acs = actionCards.filter((ac) => !!ac.shareId);

  const allTags = [...new Set([...chs, ...acs].flatMap((x) => x.tags))];

  const allTypes = [...new Set([...acs.map((ac) => ac.type)])];
  const allVersions = [
    ...new Set([...chs, ...acs].map((x) => x.sinceVersion ?? "v3.3.0")),
  ].toSorted();

  return {
    allTags,
    allTypes,
    allVersions,
    characters: new Map(
      chs.map((ch) => [
        ch.id,
        {
          id: ch.id,
          tags: ch.tags,
          version: allVersions.indexOf(ch.sinceVersion!),
        },
      ]),
    ),
    actionCards: new Map(
      acs.map((ac) => [
        ac.id,
        {
          id: ac.id,
          type: ac.type,
          tags: ac.tags,
          version: allVersions.indexOf(ac.sinceVersion!),
          relatedCharacterId: ac.relatedCharacterId,
          relatedCharacterTag: (() => {
            const t = ac.relatedCharacterTags;
            if (t.length === 0) return null;
            else if (t.length !== 2 || t[0] !== t[1]) {
              throw new Error(`unsupported now`);
            } else {
              return t[0]!;
            }
          })(),
        },
      ]),
    ),
  };
}
