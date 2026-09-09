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

import type { Deck } from '@gi-tcg/typings';
import { VERSIONS } from '@gi-tcg/core';
import { BadRequestException } from '../errors';

export interface CreateRoomDto {
  hostFirst?: boolean; gameVersion?: number; initTotalActionTime?: number;
  rerollTime?: number; roundTotalActionTime?: number; actionTime?: number;
  randomSeed?: number; watchable?: boolean; private?: boolean; allowGuest?: boolean;
}
export interface UserCreateRoomDto extends CreateRoomDto { hostDeckId: number }
export interface GuestJoinRoomDto { name: string; deck: Deck; avatarUrl?: string }
export interface GuestCreateRoomDto extends CreateRoomDto, GuestJoinRoomDto {}
export interface UserJoinRoomDto { deckId: number }

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Expected a JSON object');
  return value as Record<string, unknown>;
}
function integer(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value)) throw new BadRequestException(field+' must be an integer');
  return value as number;
}
function boundedString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || [...value].length < 1 || [...value].length > max) throw new BadRequestException(field+' has invalid length');
  return value;
}
function deck(value: unknown): Deck {
  const record = object(value);
  const list = (value: unknown, count: number, field: string): number[] => {
    if (!Array.isArray(value) || value.length !== count) throw new BadRequestException(field+' must contain '+count+' entries');
    return value.map((id) => integer(id, field));
  };
  return { characters: list(record.characters,3,'characters'), cards: list(record.cards,30,'cards') };
}
function guestFields(input: Record<string,unknown>): GuestJoinRoomDto {
  return { name: boundedString(input.name,'name',64), deck: deck(input.deck),
    ...(input.avatarUrl === undefined || input.avatarUrl === null ? {} : { avatarUrl: boundedString(input.avatarUrl,'avatarUrl',256) }) };
}
function roomFields(input: Record<string,unknown>): CreateRoomDto {
  const out: Record<string,unknown> = {};
  for (const key of ['hostFirst','watchable','private','allowGuest']) {
    if (input[key] === undefined || input[key] === null) continue;
    if (typeof input[key] !== 'boolean') throw new BadRequestException(key+' must be boolean');
    out[key] = input[key];
  }
  const limits = { gameVersion: [0,VERSIONS.length-1], initTotalActionTime:[0,300], rerollTime:[25,300], roundTotalActionTime:[0,300], actionTime:[25,300], randomSeed:[0,2147483546] } as const;
  for (const [key,[min,max]] of Object.entries(limits)) {
    const value = input[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value<min || value>max || (key==='gameVersion'&&!Number.isInteger(value))) throw new BadRequestException(key+' is out of range');
    out[key] = value;
  }
  return out;
}
export function parseCreateRoom(value: unknown, registered: true): UserCreateRoomDto;
export function parseCreateRoom(value: unknown, registered: false): GuestCreateRoomDto;
export function parseCreateRoom(value: unknown, registered: boolean) {
  const input=object(value), config=roomFields(input);
  return registered ? { ...config,hostDeckId:integer(input.hostDeckId,'hostDeckId') } : { ...config,...guestFields(input) };
}
export function parseJoinRoom(value: unknown, registered: true): UserJoinRoomDto;
export function parseJoinRoom(value: unknown, registered: false): GuestJoinRoomDto;
export function parseJoinRoom(value: unknown, registered: boolean) {
  const input=object(value);
  return registered ? { deckId:integer(input.deckId,'deckId') } : guestFields(input);
}
