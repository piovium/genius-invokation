import { badRequest } from "../errors";
import { isGuestId } from "../auth/guest-id";
import type { PlayerId } from "./types";

export function parsePlayerId(value: string): PlayerId {
  if (value.trim() === "") throw badRequest("Player ID must not be blank");
  const playerId = Number(value);
  if (Number.isSafeInteger(playerId)) return playerId;
  if (isGuestId(value)) return value;
  throw badRequest(
    `Player ID must be a safe integer or a guest ID, but received ${JSON.stringify(value)}`,
  );
}

export function parseRoomId(value: string): number {
  const roomId = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(roomId))
    throw badRequest(
      `Room ID must be a non-negative integer, but received ${JSON.stringify(value)}`,
    );
  return roomId;
}
