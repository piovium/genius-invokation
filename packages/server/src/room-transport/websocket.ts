import { decodeGameFrame, encodeGameFrame } from "@gi-tcg/typings";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import type { AuthService } from "../auth/auth.service";
import type { RoomsService } from "../rooms/rooms.service";
import { parsePlayerId, parseRoomId } from "../rooms/rooms.pipe";
import {
  RoomCommandError,
  type PlayerId,
  type RoomSubscriber,
} from "../rooms/types";

const MAX_UNAUTHENTICATED = 128;
const MAX_BUFFERED_BYTES = 512 * 1024;
const AUTH_TIMEOUT_MS = 5000;
interface RawSocket {
  send(data: string | Uint8Array): boolean;
  close(code?: number, reason?: string): void;
  getBufferedAmount(): number;
}
interface Socket {
  raw: RawSocket;
  data: { params: { roomId: string; targetPlayerId: string } };
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

/** No application frames are emitted before the immutable authenticated binding. */
export function createRoomSocketHandlers(
  rooms: Pick<
    RoomsService,
    "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"
  >,
  auth: Pick<AuthService, "verify">,
) {
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
      close(raw, state, 1013, "SLOW_CONSUMER");
      return;
    }
    try {
      if (!raw.send(data)) close(raw, state, 1013, "DELIVERY_DROPPED");
    } catch {
      close(raw, state, 1011, "DELIVERY_FAILED");
    }
  }
  const sendJson = (raw: RawSocket, state: Connection, value: unknown) =>
    send(raw, state, JSON.stringify(value));
  return {
    open(socket: Socket) {
      const raw = socket.raw;
      if (unauthenticated >= MAX_UNAUTHENTICATED) {
        raw.close(1013, "AUTH_CAPACITY");
        return;
      }
      let roomId: number, target: PlayerId;
      try {
        roomId = parseRoomId(socket.data.params.roomId);
        target = parsePlayerId(socket.data.params.targetPlayerId);
      } catch {
        raw.close(1008, "INVALID_ROUTE");
        return;
      }
      const state: Connection = {
        roomId,
        target,
        visitor: null,
        sessionId: null,
        authenticated: false,
        closed: false,
        authTimer: setTimeout(
          () => close(raw, state, 1008, "AUTH_TIMEOUT"),
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
      const binary =
        message instanceof Uint8Array || message instanceof ArrayBuffer;
      let control: Record<string, unknown> | null = null;
      if (!binary) {
        try {
          const parsed: unknown =
            typeof message === "string" ? JSON.parse(message) : message;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
            control = parsed as Record<string, unknown>;
        } catch {
          /* Auth and control errors are handled below, without echoing data. */
        }
      }
      if (!state.authenticated) {
        if (
          control?.type !== "auth" ||
          typeof control.token !== "string" ||
          control.token.length > 4096
        ) {
          close(raw, state, 1008, "AUTH_REQUIRED");
          return;
        }
        const payload =
          control.token === "" ? null : auth.verify(control.token);
        if (control.token !== "" && !payload) {
          close(raw, state, 1008, "INVALID_TOKEN");
          return;
        }
        const visitor: PlayerId | null = payload?.sub ?? null;
        const subscriber: RoomSubscriber = {
          send: (event) => {
            if (
              event.type === "notification" ||
              (event.type === "rpc" && event.data !== null)
            )
              send(raw, state, encodeGameFrame(event));
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
          state.unsubscribe = binding.subscribe();
          if (state.closed) {
            state.unsubscribe();
            return;
          }
          state.pingTimer = setInterval(
            () => sendJson(raw, state, { type: "ping" }),
            10000,
          );
        } catch {
          close(raw, state, 1008, "FORBIDDEN");
        }
        return;
      }
      if (control?.type === "auth") {
        close(raw, state, 1008, "DUPLICATE_AUTH");
        return;
      }
      let command: "actionResponse" | "giveUp" = "actionResponse";
      let id: number | undefined;
      try {
        if (binary) {
          const frame = decodeGameFrame(
            message instanceof ArrayBuffer
              ? new Uint8Array(message)
              : (message as Uint8Array),
          );
          if (frame.type !== "actionResponse") {
            close(raw, state, 1008, "UNEXPECTED_GAME_FRAME");
            return;
          }
          id = frame.id;
          if (state.visitor !== state.target || state.visitor === null)
            throw new RoomCommandError(
              "FORBIDDEN",
              "Spectators cannot submit actions",
            );
          sendJson(
            raw,
            state,
            rooms.receivePlayerResponse(
              state.roomId,
              state.visitor,
              frame.id,
              frame.response,
            ),
          );
        } else if (control?.type === "giveUp") {
          command = "giveUp";
          if (state.visitor !== state.target || state.visitor === null)
            throw new RoomCommandError(
              "FORBIDDEN",
              "Spectators cannot give up a game",
            );
          sendJson(
            raw,
            state,
            rooms.receivePlayerGiveUp(state.roomId, state.visitor),
          );
        } else {
          close(raw, state, 1008, "BINARY_RESPONSE_REQUIRED");
        }
      } catch (error) {
        if (error instanceof RoomCommandError)
          sendJson(raw, state, {
            type: "commandError",
            command,
            ...(id === undefined ? {} : { id }),
            sessionId: state.sessionId,
            code: error.code,
            message: error.message,
            ...(error.code === "STALE_RPC" ? { resyncRequired: true } : {}),
          });
        else close(raw, state, 1008, "INVALID_COMMAND");
      }
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
    RoomsService,
    "subscribePlayer" | "receivePlayerResponse" | "receivePlayerGiveUp"
  >,
  auth: Pick<AuthService, "verify">,
  apiPrefix = "/api",
) {
  const handlers = createRoomSocketHandlers(rooms, auth);
  const prefix = `/${apiPrefix}`.replace(/\/+/g, "/").replace(/\/$/, "");
  const route = new RegExp(
    `^${RegExp.escape(prefix)}/rooms/([^/]+)/players/([^/]+)/ws$`,
  );
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    perMessageDeflate: false,
  });
  const onUpgrade = (
    request: IncomingMessage,
    stream: Duplex,
    head: Buffer,
  ) => {
    let params: { roomId: string; targetPlayerId: string };
    try {
      const match = route.exec(
        new URL(request.url ?? "", "http://localhost").pathname,
      );
      if (!match) {
        stream.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        return;
      }
      params = {
        roomId: decodeURIComponent(match[1]!),
        targetPlayerId: decodeURIComponent(match[2]!),
      };
      parseRoomId(params.roomId);
      parsePlayerId(params.targetPlayerId);
    } catch {
      stream.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(request, stream, head, (webSocket) => {
      let closeTimer: ReturnType<typeof setTimeout> | undefined;
      let alive = true;
      const enforceCloseDeadline = () => {
        if (webSocket.readyState === WebSocket.CLOSED) return;
        closeTimer ??= setTimeout(() => webSocket.terminate(), 1000);
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
      }, 30000);
      heartbeat.unref();
      webSocket.on("pong", () => {
        alive = true;
      });
      webSocket.on("message", (data, binary) => {
        const bytes =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : Array.isArray(data)
              ? Buffer.concat(data)
              : data;
        handlers.message(
          socket,
          binary ? bytes : Buffer.from(bytes).toString("utf8"),
        );
      });
      webSocket.on("error", () => {
        if (webSocket.readyState === WebSocket.OPEN)
          raw.close(1011, "TRANSPORT_ERROR");
        else enforceCloseDeadline();
      });
      webSocket.on("close", () => {
        clearTimeout(closeTimer);
        clearInterval(heartbeat);
        handlers.close(socket);
      });
      handlers.open(socket);
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
