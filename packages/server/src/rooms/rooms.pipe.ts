import { BadRequestException } from '../errors';
import { isGuestId } from '../auth/guest-id';
import type { PlayerId } from './types';
export function parsePlayerId(value: string): PlayerId {
  if (value.trim()==='') throw new BadRequestException('Player ID is empty');
  const number=Number(value);
  if (Number.isSafeInteger(number)) return number;
  if (isGuestId(value)) return value;
  throw new BadRequestException('Invalid player ID');
}
export function parseRoomId(value: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new BadRequestException('Invalid room ID');
  return Number(value);
}
