import { Elysia } from "elysia";
import { unauthorized } from "../errors";
import type { AuthService } from "../auth/auth.service";
import type { RoomsService } from "./rooms.service";
import { parseCreateRoom, parseJoinRoom } from "./rooms.controller";
import { parseRoomId } from "./rooms.pipe";

export function createRoomsRoutes(rooms: RoomsService, auth: AuthService) {
  const readIdentity = (request: Request) => {
    const authorization = request.headers.get("authorization");
    if (!authorization) return null;
    const bearerMatch = /^Bearer (\S+)$/i.exec(authorization);
    const payload = bearerMatch ? auth.verify(bearerMatch[1]!) : null;
    if (!payload) throw unauthorized("Invalid bearer token");
    return payload;
  };
  const requirePlayerId = (request: Request) => {
    const payload = readIdentity(request);
    if (!payload) throw unauthorized();
    return payload.sub;
  };
  return new Elysia({ prefix: "/rooms" })
    .get("/", ({ request }) =>
      rooms.getAllRooms(readIdentity(request)?.user !== 1),
    )
    .post("/", async ({ request, body, set }) => {
      const payload = readIdentity(request);
      set.status = 201;
      if (payload?.user === 1)
        return rooms.createRoomFromUser(
          payload.sub,
          parseCreateRoom(body, true),
        );
      const { room, playerId } = await rooms.createRoomFromGuest(
        parseCreateRoom(body, false),
      );
      return { room, playerId, accessToken: await auth.signGuest(playerId) };
    })
    .get("/current", ({ request }) => {
      const playerId = readIdentity(request)?.sub;
      const room = playerId === undefined ? null : rooms.currentRoom(playerId);
      return room === null ? Response.json(null) : room;
    })
    .get("/:roomId", ({ request, params }) => {
      const room = rooms.getRoom(parseRoomId(params.roomId));
      if (readIdentity(request)?.user !== 1 && !room.config.allowGuest)
        throw unauthorized("This room does not allow guests");
      return room;
    })
    .get("/:roomId/gameLog", ({ request, params }) =>
      rooms.getRoomGameLog(
        requirePlayerId(request),
        parseRoomId(params.roomId),
      ),
    )
    .delete("/:roomId", ({ request, params }) => {
      rooms.deleteRoom(requirePlayerId(request), parseRoomId(params.roomId));
      return { message: "room deleted" };
    })
    .post("/:roomId/players", async ({ request, params, body, set }) => {
      const payload = readIdentity(request);
      const roomId = parseRoomId(params.roomId);
      set.status = 201;
      if (payload?.user === 1) {
        await rooms.joinRoomFromUser(
          payload.sub,
          roomId,
          parseJoinRoom(body, true).deckId,
        );
        return { message: "joined" };
      }
      const { playerId } = await rooms.joinRoomFromGuest(
        roomId,
        parseJoinRoom(body, false),
      );
      return { playerId, accessToken: await auth.signGuest(playerId) };
    });
}
