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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import type { Deck } from "@gi-tcg/typings";
import type {
  ActionCardRawData,
  CharacterRawData,
} from "@gi-tcg/assets-manager";
import { staticDecode, staticEncode } from "../generated/sharing";
import deckMetadata from "../generated/deck-metadata";
import { CURRENT_VERSION, VERSIONS, type Version } from "@gi-tcg/core";
import { compare as semverCompare } from "semver";
export { createGuestId, isGuestId } from "./auth/guest-id";

export enum DeckVerificationErrorCode {
  SizeError = "SizeError",
  NotFoundError = "NotFoundError",
  CountLimitError = "CountLimitError",
  RelationError = "RelationError",
}

export class DeckVerificationError extends Error {
  constructor(
    public readonly code: DeckVerificationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const { SizeError, NotFoundError, CountLimitError, RelationError } =
  DeckVerificationErrorCode;

function fail(code: DeckVerificationErrorCode, message: string): never {
  throw new DeckVerificationError(code, message);
}

export const ASSETS_MANAGER = Object.freeze({
  encode: staticEncode,
  decode: staticDecode,
});
type CharacterMetadata = Pick<
  CharacterRawData,
  "id" | "shareId" | "tags" | "sinceVersion"
>;
type ActionCardMetadata = Pick<
  ActionCardRawData,
  | "id"
  | "shareId"
  | "tags"
  | "sinceVersion"
  | "relatedCharacterId"
  | "relatedCharacterTags"
>;
const getData = <T extends CharacterMetadata | ActionCardMetadata>(
  id: number,
): T | undefined => deckMetadata[id] as T | undefined;

const SINGLETON_REQUIRED_TAGS = ["GCG_TAG_LEGEND", "GCG_TAG_CARD_BLESSING"];

const CHARACTER_COUNT = 3;
const CARD_COUNT = 30;

/** 校验牌组合法性，返回该牌组可以打出的最低游戏版本。 */
export async function verifyDeck({
  characters,
  cards,
}: Deck): Promise<Version> {
  const characterSet = new Set(characters);
  if (characterSet.size !== CHARACTER_COUNT) {
    fail(SizeError, `deck must contain ${CHARACTER_COUNT} characters`);
  }
  if (cards.length !== CARD_COUNT) {
    fail(SizeError, `deck must contain ${CARD_COUNT} cards`);
  }
  const characterTags: string[] = [];
  const versions = new Set<string | undefined>();
  for (const characterId of characters) {
    const character = getData<CharacterMetadata>(characterId);
    if (!character) {
      fail(NotFoundError, `character id ${characterId} not found`);
    }
    if (typeof character.shareId !== "number") {
      fail(NotFoundError, `character id ${characterId} not obtainable`);
    }
    characterTags.push(...character.tags);
    versions.add(character.sinceVersion);
  }
  const cardCounts = new Map<number, number>();
  for (const cardId of cards) {
    const card = getData<ActionCardMetadata>(cardId);
    if (!card) {
      fail(NotFoundError, `card id ${cardId} not found`);
    }
    const cardMaxCount = SINGLETON_REQUIRED_TAGS.some((tag) =>
      card.tags.includes(tag),
    )
      ? 1
      : 2;
    const count = (cardCounts.get(cardId) ?? 0) + 1;
    if (count > cardMaxCount) {
      fail(CountLimitError, `card id ${cardId} exceeds max count`);
    }
    cardCounts.set(cardId, count);
    // The related-character rules only depend on the first copy of a card.
    if (count > 1) continue;
    if (typeof card.shareId !== "number") {
      fail(RelationError, `card id ${cardId} not obtainable`);
    }
    if (
      card.relatedCharacterId !== null &&
      !characterSet.has(card.relatedCharacterId)
    ) {
      fail(RelationError, `card id ${cardId} related character not in deck`);
    }
    const remainingTags = [...characterTags];
    for (const requiredTag of card.relatedCharacterTags) {
      const index = remainingTags.indexOf(requiredTag);
      if (index === -1) {
        fail(
          RelationError,
          `card id ${cardId} related character tags not in deck`,
        );
      }
      remainingTags.splice(index, 1);
    }
    versions.add(card.sinceVersion);
  }
  return maxVersion(versions);
}

const isVersion = (value: string | undefined): value is Version =>
  value !== undefined && VERSIONS.includes(value as Version);

function maxVersion(versions: Iterable<string | undefined>): Version {
  const latest = [...versions]
    .filter((value): value is string => Boolean(value))
    .toSorted(semverCompare)
    .at(-1);
  return isVersion(latest) ? latest : CURRENT_VERSION;
}

export async function minimumRequiredVersionOfDeck({
  characters,
  cards,
}: Deck): Promise<Version> {
  return maxVersion(
    [...characters, ...cards].map(
      (id) => getData<CharacterMetadata | ActionCardMetadata>(id)?.sinceVersion,
    ),
  );
}

export function parseStringToInt({ value }: { value: unknown }): number {
  return typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
}

export class PaginationDto {
  skip?: number;
  take?: number;
}

export interface PaginationResult<T> {
  count: number;
  data: T[];
}

export async function validateDto<T>(
  value: unknown,
  type: { validate(value: unknown): T },
): Promise<T> {
  return type.validate(value);
}
