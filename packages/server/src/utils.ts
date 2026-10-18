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
import {
  DEFAULT_ASSETS_MANAGER,
  type AnyData,
  type CharacterRawData,
  type EntityRawData,
} from "@gi-tcg/assets-manager";
import { type } from "arktype";
import { CURRENT_VERSION, VERSIONS, type Version } from "@gi-tcg/core";
import { compare as semverCompare } from "semver";
import { createId as createCuid, isCuid } from "@paralleldrive/cuid2";
import { BadRequestException } from "./errors";

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

export const ASSETS_MANAGER = DEFAULT_ASSETS_MANAGER;

ASSETS_MANAGER.prepareForSync();

const getData = <T extends AnyData>(id: number): Promise<T | undefined> => {
  return ASSETS_MANAGER.getData(id) as Promise<T | undefined>;
};

const SINGLETON_REQUIRED_TAGS = ["GCG_TAG_LEGEND", "GCG_TAG_CARD_BLESSING"];

/**
 * 校验牌组合法性
 * @param deck 牌组
 * @returns 牌组可以打出的最低游戏版本
 */
export async function verifyDeck(deck: Deck): Promise<Version> {
  const DEC = DeckVerificationErrorCode;
  const { characters = [], cards = [] } = deck ?? {};
  const versions = new Set<string | null>();
  const characterSet = new Set(characters);
  if (characters.length !== 3 || characterSet.size !== 3) {
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
    const character = await getData<CharacterRawData>(chId);
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
    const card = await getData<EntityRawData>(cardId);
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

function maxVersion(versions: Iterable<string | null>): Version {
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
    await Promise.all(
      [...characters, ...cards].map((p) =>
        getData<CharacterRawData | EntityRawData>(p).then(
          (d) => d?.sinceVersion ?? null,
        ),
      ),
    ),
  );
}

export function parseStringToInt(value: string): number {
  return value.trim() === "" ? NaN : Number(value);
}

export const QueryInteger = type("string")
  .pipe(parseStringToInt)
  .to("number.integer");
export const IntParam = type(/^-?\d+$/)
  .pipe(Number)
  .to("number.integer");

// Match class-validator's length constraint, including Unicode code points.
export function stringLength(min: number, max: number) {
  return type("string").narrow((value, ctx) => {
    const length = [...value].length;
    return (
      (length >= min && length <= max) ||
      ctx.reject(`a string of ${min}–${max} characters`)
    );
  });
}

export function createGuestId() {
  return `guest-${createCuid()}`;
}

export function isGuestId(id: unknown): id is string {
  if (typeof id !== "string") {
    return false;
  }
  const [tag, cuid] = id.split("-");
  return tag === "guest" && !!cuid && isCuid(cuid);
}

export const PaginationDto = type({
  "skip?": QueryInteger.to("number > 0"),
  "take?": QueryInteger.to("0 < number <= 30"),
});
export type PaginationDto = typeof PaginationDto.infer;

export interface PaginationResult<T> {
  count: number;
  data: T[];
}

export function validate<const T, R = type.infer.Out<T>>(
  schema: type.validate<T>,
  value: unknown,
): R {
  const result = type(schema as {})(value);
  if (result instanceof type.errors) {
    throw new BadRequestException(result.summary);
  }
  return result as R;
}
