import { Elysia } from 'elysia';
import { UnauthorizedException } from '../errors';
import type { AuthService } from '../auth/auth.service';
import type { RoomsService } from './rooms.service';
import { parseCreateRoom, parseJoinRoom } from './rooms.controller';
import { parseRoomId } from './rooms.pipe';

export function createRoomsRoutes(rooms: RoomsService, auth: AuthService) {
  const identity = (request: Request) => {
    const header = request.headers.get('authorization');
    if (!header) return null;
    const bearer = /^Bearer (\S+)$/i.exec(header);
    const payload = bearer ? auth.verify(bearer[1]!) : null;
    if (!payload) throw new UnauthorizedException('Invalid bearer token');
    return payload;
  };
  const requirePlayer = (request: Request) => {
    const payload = identity(request);
    if (!payload) throw new UnauthorizedException();
    return payload.sub;
  };
  return new Elysia({ prefix: '/rooms' })
    .get('/', ({ request }) => rooms.getAllRooms(identity(request)?.user !== 1))
    .post('/', async ({ request, body, set }) => {
      const payload = identity(request);
      set.status = 201;
      if (payload?.user === 1) return rooms.createRoomFromUser(payload.sub, parseCreateRoom(body, true));
      const { room, playerId } = await rooms.createRoomFromGuest(parseCreateRoom(body, false));
      return { room, playerId, accessToken: await auth.signGuest(playerId) };
    })
    .get('/current', ({ request }) => {
      const player = identity(request)?.sub;
      const room = player === undefined ? null : rooms.currentRoom(player);
      return room === null ? Response.json(null) : room;
    })
    .get('/:roomId', ({ request, params }) => {
      const room = rooms.getRoom(parseRoomId(params.roomId));
      if (identity(request)?.user !== 1 && !room.config.allowGuest) throw new UnauthorizedException('This room does not allow guests');
      return room;
    })
    .get('/:roomId/gameLog', ({ request, params }) => rooms.getRoomGameLog(requirePlayer(request), parseRoomId(params.roomId)))
    .delete('/:roomId', ({ request, params }) => {
      rooms.deleteRoom(requirePlayer(request), parseRoomId(params.roomId));
      return { message: 'room deleted' };
    })
    .post('/:roomId/players', async ({ request, params, body, set }) => {
      const payload = identity(request);
      const roomId = parseRoomId(params.roomId);
      set.status = 201;
      if (payload?.user === 1) {
        await rooms.joinRoomFromUser(payload.sub, roomId, parseJoinRoom(body, true).deckId);
        return { message: 'joined' };
      }
      const { playerId } = await rooms.joinRoomFromGuest(roomId, parseJoinRoom(body, false));
      return { playerId, accessToken: await auth.signGuest(playerId) };
    });
}
