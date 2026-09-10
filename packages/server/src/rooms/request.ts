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
import { VERSIONS } from "@gi-tcg/core";
import { badRequest } from "../errors";

export interface CreateRoomDto {
  hostFirst?: boolean;
  gameVersion?: number;
  initTotalActionTime?: number;
  rerollTime?: number;
  roundTotalActionTime?: number;
  actionTime?: number;
  randomSeed?: number;
  watchable?: boolean;
  private?: boolean;
  allowGuest?: boolean;
}
export interface UserCreateRoomDto extends CreateRoomDto {
  hostDeckId: number;
}
export interface GuestJoinRoomDto {
  name: string;
  deck: Deck;
  avatarUrl?: string;
}
export interface GuestCreateRoomDto extends CreateRoomDto, GuestJoinRoomDto {}
export interface UserJoinRoomDto {
  deckId: number;
}

/** How much of an offending value a 400 message repeats back. */
const MAX_ECHOED_VALUE_LENGTH = 48;

/**
 * Renders an offending input for a 400 message. Long values are truncated, so a
 * large request body cannot inflate the response, and arrays are described by
 * their length rather than dumped.
 */
function describeValue(value: unknown): string {
  const text = Array.isArray(value)
    ? `an array of ${value.length}`
    : typeof value === "string"
      ? JSON.stringify(value)
      : String(value);
  return text.length <= MAX_ECHOED_VALUE_LENGTH
    ? text
    : `${text.slice(0, MAX_ECHOED_VALUE_LENGTH)}...`;
}

/** Absent and `null` mean the same thing for every optional room field. */
function isOmitted(value: unknown): boolean {
  return value === undefined || value === null;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw badRequest(
      `Expected a JSON object, but received ${describeValue(value)}`,
    );
  return value as Record<string, unknown>;
}
function parseInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value))
    throw badRequest(
      `${field} must be an integer, but received ${describeValue(value)}`,
    );
  return value as number;
}
function boundedString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string")
    throw badRequest(
      `${field} must be a string, but received ${describeValue(value)}`,
    );
  const length = [...value].length;
  if (length === 0 || length > max)
    throw badRequest(
      `${field} must be 1 to ${max} characters long, but received ${length}`,
    );
  return value;
}

function parseIdList(value: unknown, count: number, field: string): number[] {
  if (!Array.isArray(value))
    throw badRequest(
      `${field} must be an array of ${count} entries, but received ${describeValue(value)}`,
    );
  if (value.length !== count)
    throw badRequest(
      `${field} must hold exactly ${count} entries, but received ${value.length}`,
    );
  return value.map((id, index) => parseInteger(id, `${field}[${index}]`));
}

/** A deck is three characters and thirty cards, in that order. */
function parseDeck(value: unknown): Deck {
  const record = parseObject(value);
  return {
    characters: parseIdList(record.characters, 3, "characters"),
    cards: parseIdList(record.cards, 30, "cards"),
  };
}
function guestFields(input: Record<string, unknown>): GuestJoinRoomDto {
  return {
    name: boundedString(input.name, "name", 64),
    deck: parseDeck(input.deck),
    ...(isOmitted(input.avatarUrl)
      ? {}
      : { avatarUrl: boundedString(input.avatarUrl, "avatarUrl", 256) }),
  };
}

const BOOLEAN_ROOM_FIELDS = [
  "hostFirst",
  "watchable",
  "private",
  "allowGuest",
] as const;

/** Accepted range of each numeric room field; `gameVersion` indexes VERSIONS. */
const NUMBER_ROOM_FIELDS: Record<
  string,
  { min: number; max: number; integer?: boolean }
> = {
  gameVersion: { min: 0, max: VERSIONS.length - 1, integer: true },
  initTotalActionTime: { min: 0, max: 300 },
  rerollTime: { min: 25, max: 300 },
  roundTotalActionTime: { min: 0, max: 300 },
  actionTime: { min: 25, max: 300 },
  randomSeed: { min: 0, max: 2147483546 },
};

function roomFields(input: Record<string, unknown>): CreateRoomDto {
  const out: Record<string, unknown> = {};
  for (const key of BOOLEAN_ROOM_FIELDS) {
    if (isOmitted(input[key])) continue;
    if (typeof input[key] !== "boolean")
      throw badRequest(
        `${key} must be a boolean, but received ${describeValue(input[key])}`,
      );
    out[key] = input[key];
  }
  for (const [key, { min, max, integer }] of Object.entries(
    NUMBER_ROOM_FIELDS,
  )) {
    const value = input[key];
    if (isOmitted(value)) continue;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    )
      throw badRequest(
        `${key} must be ${integer ? "an integer" : "a number"} from ${min} to ${max}, but received ${describeValue(value)}`,
      );
    out[key] = value;
  }
  return out;
}
export function parseCreateRoom(
  value: unknown,
  registered: true,
): UserCreateRoomDto;
export function parseCreateRoom(
  value: unknown,
  registered: false,
): GuestCreateRoomDto;
export function parseCreateRoom(value: unknown, registered: boolean) {
  const input = parseObject(value);
  const config = roomFields(input);
  return registered
    ? { ...config, hostDeckId: parseInteger(input.hostDeckId, "hostDeckId") }
    : { ...config, ...guestFields(input) };
}
export function parseJoinRoom(
  value: unknown,
  registered: true,
): UserJoinRoomDto;
export function parseJoinRoom(
  value: unknown,
  registered: false,
): GuestJoinRoomDto;
export function parseJoinRoom(value: unknown, registered: boolean) {
  const input = parseObject(value);
  return registered
    ? { deckId: parseInteger(input.deckId, "deckId") }
    : guestFields(input);
}
