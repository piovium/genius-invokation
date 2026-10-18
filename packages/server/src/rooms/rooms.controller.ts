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

import { Hono, type Context } from "hono";
import { UnauthorizedException } from "../errors";
import { streamSSE } from "hono/streaming";
import { type } from "arktype";
import { sValidator } from "@hono/standard-validator";
import { type Observable, Subscription } from "rxjs";
import { roomsService, authService } from "../services";
import type { SSEPayload } from "./rooms.service";
import { VERSIONS } from "@gi-tcg/core";
import { DeckDto } from "../decks/decks.controller";
import { IntParam, stringLength, validate } from "../utils";
import { ParsePlayerIdPipe } from "./rooms.pipe";
import { getUserId, getUserOrGuestId } from "../auth/user.decorator";

export const CreateRoomDto = type({
  "hostFirst?": "boolean",
  "gameVersion?": type("number.integer >= 0").atMost(VERSIONS.length - 1),
  "initTotalActionTime?": "0 <= number <= 300",
  "rerollTime?": "25 <= number <= 300",
  "roundTotalActionTime?": "0 <= number <= 300",
  "actionTime?": "25 <= number <= 300",
  "randomSeed?": "0 <= number <= 2147483546",
  "watchable?": "boolean",
  "private?": "boolean",
  "allowGuest?": "boolean",
});
export type CreateRoomDto = typeof CreateRoomDto.infer;

export const UserCreateRoomDto = CreateRoomDto.merge({
  hostDeckId: "number.integer",
});
export type UserCreateRoomDto = typeof UserCreateRoomDto.infer;

export const GuestJoinRoomDto = type({
  name: stringLength(1, 64),
  deck: DeckDto,
  "avatarUrl?": stringLength(1, 256).or("null"),
});
export type GuestJoinRoomDto = typeof GuestJoinRoomDto.infer;

export const GuestCreateRoomDto = CreateRoomDto.merge(GuestJoinRoomDto);
export type GuestCreateRoomDto = typeof GuestCreateRoomDto.infer;

export const UserJoinRoomDto = type({ deckId: "number.integer" });
export type UserJoinRoomDto = typeof UserJoinRoomDto.infer;

export const PlayerActionResponseDto = type({
  id: "number.integer",
  response: "string.base64",
});
export type PlayerActionResponseDto = typeof PlayerActionResponseDto.infer;

const RoomParam = type({ roomId: IntParam });
const PlayerParam = RoomParam.merge({ targetPlayerId: ParsePlayerIdPipe });

export function streamNotification(
  c: Context,
  source: Observable<{ data: SSEPayload }>,
) {
  c.header("X-Accel-Buffering", "no");
  return streamSSE(c, async (stream) => {
    const finished = Promise.withResolvers<void>();
    const subscription = new Subscription();
    let pending = Promise.resolve();
    let stopped = false;
    let id = 0;
    stream.onAbort(() => {
      stopped = true;
      subscription.unsubscribe();
      finished.resolve();
    });
    try {
      if (stream.aborted) {
        return;
      }
      subscription.add(
        source.subscribe({
          next: ({ data }) => {
            pending = pending
              .then(async () => {
                if (!stopped) {
                  await stream.writeSSE({
                    data: JSON.stringify(data),
                    id: String(++id),
                  });
                }
              })
              .catch((error) => {
                stopped = true;
                subscription.unsubscribe();
                finished.reject(error);
              });
          },
          error: (error) => {
            subscription.unsubscribe();
            void pending.then(() => finished.reject(error));
          },
          complete: () => {
            subscription.unsubscribe();
            void pending.then(() => finished.resolve());
          },
        }),
      );
      await finished.promise;
    } finally {
      stopped = true;
      subscription.unsubscribe();
    }
  });
}

export const RoomsController = new Hono()
  .get("/", async (c) => {
    const userId = await getUserId(c);
    return c.json(roomsService.getAllRooms(userId === null));
  })
  .post("/", sValidator("json", type.unknown), async (c) => {
    const payload = await c.req.valid("json");
    const userId = await getUserId(c);
    if (userId !== null) {
      const dto = validate(UserCreateRoomDto, payload);
      return c.json(await roomsService.createRoomFromUser(userId, dto), 201);
    } else {
      const dto = validate(GuestCreateRoomDto, payload);
      const { playerId, room } = await roomsService.createRoomFromGuest(dto);
      return c.json(
        {
          accessToken: await authService.signGuest(playerId),
          playerId,
          room,
        },
        201,
      );
    }
  })
  .get("/current", async (c) => {
    const playerId = await getUserOrGuestId(c);
    return c.json(
      playerId === null ? null : roomsService.currentRoom(playerId),
    );
  })
  .get("/:roomId", sValidator("param", RoomParam), async (c) => {
    const userId = await getUserId(c);
    const room = roomsService.getRoom(c.req.valid("param").roomId);
    if (userId === null && !room.config.allowGuest) {
      throw new UnauthorizedException("This room does not allow guests");
    }
    return c.json(room);
  })
  .get("/:roomId/gameLog", sValidator("param", RoomParam), async (c) => {
    const playerId = await getUserOrGuestId(c);
    if (playerId === null) {
      throw new UnauthorizedException();
    }
    return c.json(
      roomsService.getRoomGameLog(playerId, c.req.valid("param").roomId),
    );
  })
  .delete("/:roomId", sValidator("param", RoomParam), async (c) => {
    const playerId = await getUserOrGuestId(c);
    if (playerId === null) {
      throw new UnauthorizedException();
    }
    roomsService.deleteRoom(playerId, c.req.valid("param").roomId);
    return c.body(null, 200);
  })
  .post(
    "/:roomId/players",
    sValidator("param", RoomParam),
    sValidator("json", type.unknown),
    async (c) => {
      const { roomId } = c.req.valid("param");
      const payload = await c.req.valid("json");
      const userId = await getUserId(c);
      if (userId !== null) {
        const dto = validate(UserJoinRoomDto, payload);
        await roomsService.joinRoomFromUser(userId, roomId, dto.deckId);
        return c.body(null, 201);
      } else {
        const dto = validate(GuestJoinRoomDto, payload);
        const { playerId } = await roomsService.joinRoomFromGuest(roomId, dto);
        return c.json(
          {
            accessToken: await authService.signGuest(playerId),
            playerId,
          },
          201,
        );
      }
    },
  )
  .get(
    "/:roomId/players/:targetPlayerId/notification",
    sValidator("param", PlayerParam),
    async (c) => {
      const { roomId, targetPlayerId } = c.req.valid("param");
      const playerId = await getUserOrGuestId(c);
      const source = roomsService.playerNotification(
        roomId,
        playerId,
        targetPlayerId,
      );
      return streamNotification(c, source);
    },
  )
  .post(
    "/:roomId/players/:targetPlayerId/actionResponse",
    sValidator("param", PlayerParam),
    sValidator("json", PlayerActionResponseDto),
    async (c) => {
      const playerId = await getUserOrGuestId(c);
      const { roomId, targetPlayerId } = c.req.valid("param");
      if (playerId !== targetPlayerId) {
        throw new UnauthorizedException(
          "You can only post your own action responses",
        );
      }
      roomsService.receivePlayerResponse(roomId, playerId, c.req.valid("json"));
      return c.json({ message: "response received" }, 201);
    },
  )
  .post(
    "/:roomId/players/:targetPlayerId/giveUp",
    sValidator("param", PlayerParam),
    async (c) => {
      const playerId = await getUserOrGuestId(c);
      const { roomId, targetPlayerId } = c.req.valid("param");
      if (playerId !== targetPlayerId) {
        throw new UnauthorizedException("You can only give up your own game");
      }
      roomsService.receivePlayerGiveUp(roomId, playerId);
      return c.json({ message: "given up" }, 201);
    },
  );
