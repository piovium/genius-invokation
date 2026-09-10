import { badRequest } from "../errors";
import { isGuestId } from "../auth/guest-id";
import type { PlayerId } from "./types";

/** A room ID is the decimal text of a non-negative safe integer. */
const ROOM_ID_PATTERN = /^\d+$/;

/** Parses an account ID or a `guest-` tagged ID from a path segment. */
export function parsePlayerId(value: string): PlayerId {
  if (value.trim() === "") throw badRequest("Player ID must not be blank");
  const playerId = Number(value);
  if (Number.isSafeInteger(playerId)) return playerId;
  if (isGuestId(value)) return value;
  throw badRequest(
    `Player ID must be a safe integer or a guest ID, but received ${JSON.stringify(value)}`,
  );
}

/** Parses a room ID: the decimal text of a non-negative safe integer. */
export function parseRoomId(value: string): number {
  const roomId = Number(value);
  if (!ROOM_ID_PATTERN.test(value) || !Number.isSafeInteger(roomId))
    throw badRequest(
      `Room ID must be a non-negative integer, but received ${JSON.stringify(value)}`,
    );
  return roomId;
}
