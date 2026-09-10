import { badRequest } from "../errors";
import { isGuestId } from "../auth/guest-id";
import type { PlayerId } from "./types";

export function parsePlayerId(value: string): PlayerId {
  if (value.trim() === "") throw badRequest("Player ID is empty");
  const playerId = Number(value);
  if (Number.isSafeInteger(playerId)) return playerId;
  if (isGuestId(value)) return value;
  throw badRequest("Invalid player ID");
}

export function parseRoomId(value: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw badRequest("Invalid room ID");
  return Number(value);
}
