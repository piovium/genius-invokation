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

import { Elysia, status } from "elysia";
import { identity } from "../auth/identity";
import type { Auth } from "../auth/session";
import { unauthorized } from "../errors";
import { parseRoomId } from "./ids";
import { parseCreateRoom, parseJoinRoom } from "./request";
import type { Rooms } from "./rooms";

/**
 * The room API. Each handler asks the identity plugin for exactly the token it
 * needs: a guest listing hashes nothing, a room command cannot run without a
 * verified caller, and only a registered account may host a saved deck.
 */
export const createRoomsRoutes = (rooms: Rooms, auth: Auth) =>
  new Elysia({ prefix: "/rooms" })
    .use(identity(auth))
    .get("/", ({ identity }) => rooms.getAllRooms(identity?.user !== 1), {
      identity: true,
    })
    .post(
      "/",
      async ({ identity, body }) => {
        if (identity?.user === 1)
          return status(
            201,
            await rooms.createRoomFromUser(
              identity.sub,
              parseCreateRoom(body, true),
            ),
          );
        const { room, playerId } = await rooms.createRoomFromGuest(
          parseCreateRoom(body, false),
        );
        return status(201, {
          room,
          playerId,
          accessToken: await auth.signGuest(playerId),
        });
      },
      { identity: true },
    )
    .get(
      "/current",
      ({ identity }) => {
        const playerId = identity?.sub;
        const room =
          playerId === undefined ? null : rooms.currentRoom(playerId);
        return room === null ? Response.json(null) : room;
      },
      { identity: true },
    )
    .get(
      "/:roomId",
      ({ identity, params }) => {
        const room = rooms.getRoom(parseRoomId(params.roomId));
        if (identity?.user !== 1 && !room.config.allowGuest)
          throw unauthorized("This room does not allow guests");
        return room;
      },
      { identity: true },
    )
    .get(
      "/:roomId/gameLog",
      ({ player, params }) =>
        rooms.getRoomGameLog(player.sub, parseRoomId(params.roomId)),
      { player: true },
    )
    .delete(
      "/:roomId",
      ({ player, params }) => {
        rooms.deleteRoom(player.sub, parseRoomId(params.roomId));
        return { message: "room deleted" };
      },
      { player: true },
    )
    .post(
      "/:roomId/players",
      async ({ identity, params, body }) => {
        const roomId = parseRoomId(params.roomId);
        if (identity?.user === 1) {
          await rooms.joinRoomFromUser(
            identity.sub,
            roomId,
            parseJoinRoom(body, true).deckId,
          );
          return status(201, { message: "joined" });
        }
        const { playerId } = await rooms.joinRoomFromGuest(
          roomId,
          parseJoinRoom(body, false),
        );
        return status(201, {
          playerId,
          accessToken: await auth.signGuest(playerId),
        });
      },
      { identity: true },
    );
