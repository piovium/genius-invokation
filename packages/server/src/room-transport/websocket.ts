import { decodeGameFrame, encodeGameFrame } from "@gi-tcg/typings";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import type { Auth } from "../auth/session";
import type { Rooms } from "../rooms/rooms";
import { parsePlayerId, parseRoomId } from "../rooms/ids";
import {
  RoomCommandError,
  type PlayerId,
  type RoomEvent,
  type RoomSubscriber,
} from "../rooms/types";

const MAX_UNAUTHENTICATED = 128;
const MAX_BUFFERED_BYTES = 512 * 1024;
const MAX_FRAME_BYTES = 64 * 1024;
const MAX_TOKEN_LENGTH = 4_096;
const AUTH_TIMEOUT_MS = 5_000;
const PING_INTERVAL_MS = 10_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const CLOSE_DEADLINE_MS = 1_000;

/** RFC 6455 close codes: a rejected peer, a broken transport, or backpressure. */
const CLOSE_POLICY_VIOLATION = 1008;
const CLOSE_INTERNAL_ERROR = 1011;
const CLOSE_TRY_AGAIN_LATER = 1013;

interface RawSocket {
  send(data: string | Uint8Array): boolean;
  close(code?: number, reason?: string): void;
  getBufferedAmount(): number;
}
interface Socket {
  raw: RawSocket;
  data: { params: RouteParams };
}
interface Connection {
  roomId: number;
  target: PlayerId;
  visitor: PlayerId | null;
  sessionId: string | null;
  authenticated: boolean;
  closed: boolean;
  authTimer: ReturnType<typeof setTimeout>;
  pingTimer?: ReturnType<typeof setInterval>;
  unsubscribe?: () => void;
}

type RouteParams = { roomId: string; targetPlayerId: string };

/** Resolves the seat named by a `.../rooms/:roomId/players/:playerId/ws` route. */
function parseRoute(
  params: RouteParams,
): { roomId: number; target: PlayerId } | null {
  try {
    return {
      roomId: parseRoomId(params.roomId),
      target: parsePlayerId(params.targetPlayerId),
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Control frames are JSON objects; anything else stays opaque to the caller. */
function parseControlFrame(message: unknown): Record<string, unknown> | null {
  try {
    const parsed: unknown =
      typeof message === "string" ? JSON.parse(message) : message;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Normalize every payload shape `ws` may deliver into one `Uint8Array`. */
function toUint8Array(data: RawData | Uint8Array): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Array.isArray(data)) return Buffer.concat(data);
  return data;
}

/** A binary payload arrives as a `Uint8Array` or, on some adapters, an `ArrayBuffer`. */
function isBinaryFrame(message: unknown): message is Uint8Array | ArrayBuffer {
  return message instanceof Uint8Array || message instanceof ArrayBuffer;
}

/** Notifications and non-null RPCs travel as encoded game frames; the rest is JSON. */
const carriesGameFrame = (event: RoomEvent) =>
  event.type === "notification" ||
  (event.type === "rpc" && event.data !== null);

/** Only the player sitting in the seat may act; spectators are read only. */
function actingPlayer(state: Connection, action: string): PlayerId {
  if (state.visitor === null || state.visitor !== state.target) {
    throw new RoomCommandError("FORBIDDEN", `Spectators cannot ${action}`);
  }
  return state.visitor;
}

export interface RoomSocketHandlers {
  open(socket: Socket): void;
  message(socket: Socket, message: unknown): void;
  close(socket: Socket): void;
}

export interface RoomWebSocketServer {
  webSockets: WebSocketServer;
  close(): Promise<void>;
}

/** No application frames are emitted before the immutable authenticated binding. */
export function createRoomSocketHandlers(
  rooms: Pick<
    Rooms,
    "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"
  >,
  auth: Pick<Auth, "verify">,
): RoomSocketHandlers {
  const states = new WeakMap<RawSocket, Connection>();
  let unauthenticated = 0;
  function release(raw: RawSocket, state: Connection) {
    if (state.closed) return;
    state.closed = true;
    if (!state.authenticated) unauthenticated--;
    clearTimeout(state.authTimer);
    clearInterval(state.pingTimer);
    state.unsubscribe?.();
    states.delete(raw);
  }
  function close(
    raw: RawSocket,
    state: Connection,
    code: number,
    reason: string,
  ) {
    release(raw, state);
    raw.close(code, reason);
  }
  function send(raw: RawSocket, state: Connection, data: string | Uint8Array) {
    if (state.closed) return;
    const bytes =
      typeof data === "string" ? Buffer.byteLength(data) : data.byteLength;
    if (raw.getBufferedAmount() + bytes > MAX_BUFFERED_BYTES) {
      close(raw, state, CLOSE_TRY_AGAIN_LATER, "SLOW_CONSUMER");
      return;
    }
    try {
      if (!raw.send(data))
        close(raw, state, CLOSE_TRY_AGAIN_LATER, "DELIVERY_DROPPED");
    } catch {
      close(raw, state, CLOSE_INTERNAL_ERROR, "DELIVERY_FAILED");
    }
  }
  const sendJson = (raw: RawSocket, state: Connection, value: unknown) =>
    send(raw, state, JSON.stringify(value));

  function subscribe(
    raw: RawSocket,
    state: Connection,
    control: Record<string, unknown> | null,
  ) {
    const token = control?.type === "auth" ? control.token : undefined;
    if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) {
      close(raw, state, CLOSE_POLICY_VIOLATION, "AUTH_REQUIRED");
      return;
    }
    // An empty token binds an anonymous spectator to the target seat.
    const payload = token === "" ? null : auth.verify(token);
    if (token !== "" && payload === null) {
      close(raw, state, CLOSE_POLICY_VIOLATION, "INVALID_TOKEN");
      return;
    }
    const visitor: PlayerId | null = payload?.sub ?? null;
    const subscriber: RoomSubscriber = {
      send: (event) => {
        if (carriesGameFrame(event)) send(raw, state, encodeGameFrame(event));
        else sendJson(raw, state, event);
      },
      close: (code, reason) => close(raw, state, code, reason),
    };
    try {
      const binding = rooms.subscribePlayer(
        state.roomId,
        visitor,
        state.target,
        subscriber,
      );
      state.visitor = visitor;
      state.sessionId = binding.sessionId;
      state.authenticated = true;
      unauthenticated--;
      clearTimeout(state.authTimer);
      sendJson(raw, state, { type: "ready", sessionId: binding.sessionId });
      if (state.closed) return;
      // `subscribe` hands back its own unsubscribe function.
      const unsubscribe: (() => void) | void = binding.subscribe();
      if (typeof unsubscribe === "function") state.unsubscribe = unsubscribe;
      if (state.closed) {
        state.unsubscribe?.();
        return;
      }
      state.pingTimer = setInterval(
        () => sendJson(raw, state, { type: "ping" }),
        PING_INTERVAL_MS,
      );
    } catch {
      close(raw, state, CLOSE_POLICY_VIOLATION, "FORBIDDEN");
    }
  }

  function handleCommand(
    raw: RawSocket,
    state: Connection,
    bytes: Uint8Array | null,
    control: Record<string, unknown> | null,
  ) {
    if (control?.type === "auth") {
      close(raw, state, CLOSE_POLICY_VIOLATION, "DUPLICATE_AUTH");
      return;
    }
    const command = control?.type === "giveUp" ? "giveUp" : "actionResponse";
    let id: number | undefined;
    try {
      if (bytes) {
        const frame = decodeGameFrame(bytes);
        if (frame.type !== "actionResponse") {
          close(raw, state, CLOSE_POLICY_VIOLATION, "UNEXPECTED_GAME_FRAME");
          return;
        }
        id = frame.id;
        const playerId = actingPlayer(state, "submit actions");
        sendJson(
          raw,
          state,
          rooms.receivePlayerResponse(
            state.roomId,
            playerId,
            frame.id,
            frame.response,
          ),
        );
      } else if (control?.type === "giveUp") {
        const playerId = actingPlayer(state, "give up a game");
        sendJson(raw, state, rooms.receivePlayerGiveUp(state.roomId, playerId));
      } else {
        close(raw, state, CLOSE_POLICY_VIOLATION, "BINARY_RESPONSE_REQUIRED");
      }
    } catch (error) {
      if (!(error instanceof RoomCommandError)) {
        close(raw, state, CLOSE_POLICY_VIOLATION, "INVALID_COMMAND");
        return;
      }
      sendJson(raw, state, {
        type: "commandError",
        command,
        ...(id === undefined ? {} : { id }),
        sessionId: state.sessionId,
        code: error.code,
        message: error.message,
        ...(error.code === "STALE_RPC" ? { resyncRequired: true } : {}),
      });
    }
  }

  return {
    open(socket: Socket) {
      const raw = socket.raw;
      if (unauthenticated >= MAX_UNAUTHENTICATED) {
        raw.close(CLOSE_TRY_AGAIN_LATER, "AUTH_CAPACITY");
        return;
      }
      const route = parseRoute(socket.data.params);
      if (!route) {
        raw.close(CLOSE_POLICY_VIOLATION, "INVALID_ROUTE");
        return;
      }
      const state: Connection = {
        roomId: route.roomId,
        target: route.target,
        visitor: null,
        sessionId: null,
        authenticated: false,
        closed: false,
        authTimer: setTimeout(
          () => close(raw, state, CLOSE_POLICY_VIOLATION, "AUTH_TIMEOUT"),
          AUTH_TIMEOUT_MS,
        ),
      };
      unauthenticated++;
      states.set(raw, state);
    },
    message(socket: Socket, message: unknown) {
      const raw = socket.raw;
      const state = states.get(raw);
      if (!state || state.closed) return;
      const bytes = isBinaryFrame(message) ? toUint8Array(message) : null;
      const control = bytes ? null : parseControlFrame(message);
      if (state.authenticated) handleCommand(raw, state, bytes, control);
      else subscribe(raw, state, control);
    },
    close(socket: Socket) {
      const state = states.get(socket.raw);
      if (state) release(socket.raw, state);
    },
  };
}

/** Node's ws receives binary frames unchanged; the Elysia Node adapter currently
 * converts incoming WebSocket payloads to text before invoking route handlers. */
export function attachRoomWebSocketServer(
  server: Server,
  rooms: Pick<
    Rooms,
    "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"
  >,
  auth: Pick<Auth, "verify">,
  apiPrefix = "/api",
): RoomWebSocketServer {
  const handlers = createRoomSocketHandlers(rooms, auth);
  const prefix = `/${apiPrefix}`.replace(/\/+/g, "/").replace(/\/$/, "");
  const route = new RegExp(
    `^${RegExp.escape(prefix)}/rooms/([^/]+)/players/([^/]+)/ws$`,
  );
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME_BYTES,
    perMessageDeflate: false,
  });
  /** `noServer` upgrades never reach a route handler, so reject them inline. */
  const reject = (stream: Duplex, status: string) =>
    stream.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  const onUpgrade = (
    request: IncomingMessage,
    stream: Duplex,
    head: Buffer,
  ) => {
    let params: RouteParams;
    try {
      const match = route.exec(
        new URL(request.url ?? "", "http://localhost").pathname,
      );
      if (!match) {
        reject(stream, "404 Not Found");
        return;
      }
      params = {
        roomId: decodeURIComponent(match[1]!),
        targetPlayerId: decodeURIComponent(match[2]!),
      };
      if (!parseRoute(params)) {
        reject(stream, "400 Bad Request");
        return;
      }
    } catch {
      reject(stream, "400 Bad Request");
      return;
    }
    wss.handleUpgrade(request, stream, head, (webSocket) => {
      let closeTimer: ReturnType<typeof setTimeout> | undefined;
      let alive = true;
      const enforceCloseDeadline = () => {
        if (webSocket.readyState === WebSocket.CLOSED) return;
        closeTimer ??= setTimeout(
          () => webSocket.terminate(),
          CLOSE_DEADLINE_MS,
        );
        closeTimer.unref();
      };
      const raw: RawSocket = {
        getBufferedAmount: () => webSocket.bufferedAmount,
        send(data) {
          if (webSocket.readyState !== WebSocket.OPEN) return false;
          webSocket.send(
            data,
            { binary: typeof data !== "string" },
            (error) => {
              if (error) webSocket.terminate();
            },
          );
          return true;
        },
        close(code, reason) {
          webSocket.close(code, reason);
          enforceCloseDeadline();
        },
      };
      const socket: Socket = { raw, data: { params } };
      const heartbeat = setInterval(() => {
        if (!alive) {
          webSocket.terminate();
          return;
        }
        alive = false;
        webSocket.ping();
      }, HEARTBEAT_INTERVAL_MS);
      heartbeat.unref();
      webSocket.on("pong", () => {
        alive = true;
      });
      webSocket.on("message", (data, binary) => {
        const bytes = toUint8Array(data);
        handlers.message(
          socket,
          binary ? bytes : Buffer.from(bytes).toString("utf8"),
        );
      });
      webSocket.on("error", () => {
        if (webSocket.readyState === WebSocket.OPEN)
          raw.close(CLOSE_INTERNAL_ERROR, "TRANSPORT_ERROR");
        else enforceCloseDeadline();
      });
      webSocket.on("close", () => {
        clearTimeout(closeTimer);
        clearInterval(heartbeat);
        handlers.close(socket);
      });
      handlers.open(socket);
      // `noServer` mode never emits this by itself, while listeners such as the
      // transport tests track accepted sockets through it.
      wss.emit("connection", webSocket, request);
    });
  };
  server.on("upgrade", onUpgrade);
  return {
    webSockets: wss,
    async close() {
      server.off("upgrade", onUpgrade);
      for (const socket of wss.clients) socket.terminate();
      await new Promise<void>((resolve, reject) =>
        wss.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
