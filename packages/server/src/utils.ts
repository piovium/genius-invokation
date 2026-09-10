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

/**
 * 校验牌组合法性
 * @param param0 牌组
 * @returns 牌组可以打出的最低游戏版本
 */
export async function verifyDeck({
  characters,
  cards,
}: Deck): Promise<Version> {
  const DEC = DeckVerificationErrorCode;
  const versions = new Set<string | undefined>();
  const characterSet = new Set(characters);
  if (characterSet.size !== 3) {
    throw new DeckVerificationError(
      DEC.SizeError,
      "deck must contain 3 characters",
    );
  }
  if (cards.length !== 30) {
    throw new DeckVerificationError(
      DEC.SizeError,
      "deck must contain 30 cards",
    );
  }
  const characterTags = [];
  for (const chId of characters) {
    const character = getData<CharacterMetadata>(chId);
    if (!character) {
      throw new DeckVerificationError(
        DEC.NotFoundError,
        `character id ${chId} not found`,
      );
    }
    if (typeof character.shareId !== "number") {
      throw new DeckVerificationError(
        DEC.NotFoundError,
        `character id ${chId} not obtainable`,
      );
    }
    characterTags.push(...character.tags);
    versions.add(character.sinceVersion);
  }
  const cardCounts = new Map<number, number>();
  for (const cardId of cards) {
    const card = getData<ActionCardMetadata>(cardId);
    if (!card) {
      throw new DeckVerificationError(
        DEC.NotFoundError,
        `card id ${cardId} not found`,
      );
    }
    const cardMaxCount = SINGLETON_REQUIRED_TAGS.some((tag) =>
      card?.tags.includes(tag),
    )
      ? 1
      : 2;
    if (cardCounts.has(cardId)) {
      const count = cardCounts.get(cardId)! + 1;
      if (count > cardMaxCount) {
        throw new DeckVerificationError(
          DEC.CountLimitError,
          `card id ${cardId} exceeds max count`,
        );
      }
      cardCounts.set(cardId, count);
    } else {
      if (typeof card.shareId !== "number") {
        throw new DeckVerificationError(
          DEC.RelationError,
          `card id ${cardId} not obtainable`,
        );
      }
      if (
        card.relatedCharacterId !== null &&
        !characters.includes(card.relatedCharacterId)
      ) {
        throw new DeckVerificationError(
          DEC.RelationError,
          `card id ${cardId} related character not in deck`,
        );
      }
      const tempCharacterTags = [...characterTags];
      for (const requiredTag of card.relatedCharacterTags) {
        const idx = tempCharacterTags.indexOf(requiredTag);
        if (idx === -1) {
          throw new DeckVerificationError(
            DEC.RelationError,
            `card id ${cardId} related character tags not in deck`,
          );
        }
        tempCharacterTags.splice(idx, 1);
      }
      cardCounts.set(cardId, 1);
      versions.add(card.sinceVersion);
    }
  }
  return maxVersion(versions);
}

function maxVersion(versions: Iterable<string | undefined>): Version {
  const ver = [...versions]
    .filter((v): v is string => !!v)
    .toSorted(semverCompare)
    .at(-1);
  if (!VERSIONS.includes(ver as Version)) {
    return CURRENT_VERSION;
  } else {
    return ver as Version;
  }
}

export async function minimumRequiredVersionOfDeck({
  characters,
  cards,
}: Deck): Promise<Version> {
  return maxVersion(
    [...characters, ...cards].map(
      (p) => getData<CharacterMetadata | ActionCardMetadata>(p)?.sinceVersion,
    ),
  );
}

export function parseStringToInt({ value }: { value: unknown }): number {
  return typeof value !== "string" || value.trim() === "" ? NaN : Number(value);
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
