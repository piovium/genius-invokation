import {
  decodeGameFrame,
  encodeGameFrame,
  MAX_GAME_FRAME_BYTES,
  type GameRpcRequest,
  type GameRpcTimer,
} from "@gi-tcg/typings";
import type { PlayerInfo } from "./utils";

export interface RoomInitialized {
  type: "initialized";
  who: 0 | 1;
  config: { watchable: boolean; gameVersion: string };
  myPlayerInfo: PlayerInfo;
  oppPlayerInfo: PlayerInfo;
}

export type RoomEvent =
  | RoomInitialized
  | { type: "waiting" }
  | { type: "notification"; data: Uint8Array }
  | { type: "rpc"; data: GameRpcRequest | null }
  | { type: "oppRpc"; oppTimer: GameRpcTimer | null };

export type RoomConnectionState =
  "connecting" | "connected" | "reconnecting" | "closed" | "failed";

export class RoomConnectionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = "RoomConnectionError";
  }
}

interface ConnectionOptions {
  url: string;
  /** An empty token is an explicit anonymous spectator request. */
  token: () => string;
  onEvent: (event: RoomEvent) => void;
  onState?: (state: RoomConnectionState) => void;
  onError?: (error: RoomConnectionError) => void;
  WebSocketImpl?: typeof WebSocket;
  authTimeoutMs?: number;
  ackTimeoutMs?: number;
  commandTimeoutMs?: number;
  reconnectDelayMs?: number;
  reconnectDeadlineMs?: number;
  idleTimeoutMs?: number;
}

interface PendingCommand {
  type: "actionResponse" | "giveUp";
  id?: number;
  frame: Uint8Array<ArrayBuffer> | string;
  sessionId: string;
  resolve: () => void;
  reject: (error: RoomConnectionError) => void;
  deadline: ReturnType<typeof setTimeout>;
  ackTimer?: ReturnType<typeof setTimeout>;
  sentGeneration: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isRpcTimer = (value: unknown): value is GameRpcTimer =>
  isRecord(value) &&
  isFiniteNumber(value.current) &&
  isFiniteNumber(value.total);
const isSessionId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 128;
const isRoomInitialized = (value: unknown): value is RoomInitialized => {
  if (!isRecord(value) || !isRecord(value.config)) return false;
  const { config } = value;
  return (
    (value.who === 0 || value.who === 1) &&
    typeof config.watchable === "boolean" &&
    typeof config.gameVersion === "string" &&
    isRecord(value.myPlayerInfo) &&
    isRecord(value.oppPlayerInfo)
  );
};

/** Largest JSON control message the client accepts from the server. */
const MAX_CONTROL_MESSAGE_BYTES = 64 * 1024;
const textEncoder = new TextEncoder();

/**
 * Client send-congestion guard: the browser cannot close its own socket, so it
 * only fails fast once a whole maximum frame is already queued.
 */
const MAX_BUFFERED_BYTES = MAX_GAME_FRAME_BYTES;

/** WebSocket close code for an ordinary client-initiated shutdown. */
const CLOSE_NORMAL = 1000;
/** The server refusing the connection, such as on failed authentication. */
const CLOSE_POLICY_VIOLATION = 1008;
/** The server rejecting a frame larger than its protocol limit. */
const CLOSE_MESSAGE_TOO_BIG = 1009;

/**
 * A game endpoint must never embed credentials, query parameters or a
 * fragment: the token is the only credential, sent in the first control frame.
 */
const isBareEndpointUrl = (url: URL): boolean =>
  !url.search && !url.hash && !url.username && !url.password;

/**
 * Build a WebSocket URL whose path mirrors the HTTP API, converting the
 * protocol and never carrying credentials or query parameters.
 */
export function roomWebSocketUrl(
  baseUrl: string,
  roomId: number | string,
  playerId: number | string,
  documentUrl: string,
): string {
  const base = new URL(
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    documentUrl,
  );
  if (!["http:", "https:"].includes(base.protocol) || !isBareEndpointUrl(base))
    throw new Error("Invalid room API URL");
  const url = new URL(
    `rooms/${encodeURIComponent(roomId)}/players/${encodeURIComponent(playerId)}/ws`,
    base,
  );
  url.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * One authenticated room view and at most one uncertain command. A disconnect
 * never means rejection: re-authenticate the same session, receive its current
 * RPC, and replay only the original encoded command until ACK or a definite
 * rejection. Server-side deduplication is required for this retry protocol.
 */
export class RoomConnection {
  /**
   * State for one room view. `onState` reports the coarse phase (connecting ->
   * connected -> reconnecting -> closed/failed); the flags below stay separate
   * because they describe orthogonal facts rather than one linear phase:
   * `disposed`/`terminal` mean no socket will open again (see `stopped`),
   * `finished` means the game ended and only a lost final ACK is being
   * recovered, and the per-generation `authenticated`/`synchronized` pair
   * tracks the handshake.
   */
  private socket: WebSocket | null = null;
  private removeSocketListeners: (() => void) | null = null;
  private generation = 0;
  private started = false;
  private disposed = false;
  private terminal = false;
  private finished = false;
  private authenticated = false;
  private synchronized = false;
  private currentSessionId: string | null = null;
  private latestRpc: GameRpcRequest | null = null;
  private acceptedRpcId = -1;
  private pending: PendingCommand | null = null;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private socketTimer?: ReturnType<typeof setTimeout>;
  private outageStarted = 0;
  private reconnectAttempt = 0;

  /** No further socket may open: the view was disposed or has terminated. */
  private get stopped(): boolean {
    return this.disposed || this.terminal;
  }

  constructor(private readonly options: ConnectionOptions) {
    const url = new URL(options.url);
    if (!["ws:", "wss:"].includes(url.protocol) || !isBareEndpointUrl(url))
      throw new Error(
        "WebSocket URL cannot contain credentials or query parameters",
      );
  }

  get sessionId(): string | null {
    return this.currentSessionId;
  }
  get hasPendingCommand(): boolean {
    return this.pending !== null;
  }
  get requestToken(): string | null {
    return this.authenticated && this.synchronized && this.latestRpc
      ? `${this.generation}:${this.latestRpc.id}`
      : null;
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    this.outageStarted = Date.now();
    this.options.onState?.("connecting");
    this.connect();
  }

  private connect(): void {
    if (this.stopped) return;
    if (
      Date.now() - this.outageStarted >
      (this.options.reconnectDeadlineMs ?? 30_000)
    ) {
      this.fail(
        this.connectionError(
          "Unable to reconnect to this game. Please reload the room.",
          "RECONNECT_TIMEOUT",
        ),
      );
      return;
    }
    const generation = ++this.generation;
    this.authenticated = false;
    this.synchronized = false;
    const WebSocketImpl = this.options.WebSocketImpl ?? WebSocket;
    let socket: WebSocket;
    try {
      socket = new WebSocketImpl(this.options.url);
    } catch {
      this.reconnect();
      return;
    }
    this.socket = socket;
    socket.binaryType = "arraybuffer";
    const active = () => !this.stopped && generation === this.generation;
    const onOpen = () => {
      if (!active()) return;
      try {
        socket.send(
          JSON.stringify({ type: "auth", token: this.options.token() }),
        );
      } catch {
        this.reconnect();
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (!active()) return;
      try {
        this.receive(event.data);
        if (active() && this.authenticated)
          this.armSocketTimer(this.options.idleTimeoutMs ?? 45_000);
      } catch (error) {
        this.fail(
          error instanceof RoomConnectionError
            ? error
            : this.connectionError(
                error instanceof Error ? error.message : "Invalid game message",
                "PROTOCOL_ERROR",
              ),
        );
      }
    };
    const onClose = (event: CloseEvent) => {
      if (!active()) return;
      if (
        event.code === CLOSE_POLICY_VIOLATION ||
        event.code === CLOSE_MESSAGE_TOO_BIG
      ) {
        this.fail(
          this.connectionError(
            event.reason || "The server refused this room connection.",
            event.code === CLOSE_POLICY_VIOLATION
              ? "ACCESS_DENIED"
              : "MESSAGE_TOO_BIG",
          ),
        );
      } else {
        // reconnect() already settles a finished view with no pending command.
        this.reconnect();
      }
    };
    const onError = () => {
      if (active()) this.reconnect();
    };
    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);
    this.removeSocketListeners = () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("error", onError);
    };
    this.armSocketTimer(this.options.authTimeoutMs ?? 7_000);
  }

  private armSocketTimer(timeoutMs: number): void {
    clearTimeout(this.socketTimer);
    this.socketTimer = setTimeout(() => this.reconnect(), timeoutMs);
  }

  private disconnectSocket(): void {
    ++this.generation;
    clearTimeout(this.socketTimer);
    this.removeSocketListeners?.();
    this.removeSocketListeners = null;
    const socket = this.socket;
    this.socket = null;
    this.authenticated = false;
    this.synchronized = false;
    if (socket && socket.readyState <= WebSocket.OPEN)
      socket.close(CLOSE_NORMAL, "Client reconnect or cleanup");
    if (this.pending) clearTimeout(this.pending.ackTimer);
  }

  /** Cancel any scheduled reconnect and drop the current socket. */
  private haltReconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.disconnectSocket();
  }

  private reconnect(): void {
    if (this.stopped) return;
    if (this.finished && !this.pending) {
      this.stopFinishedConnection();
      return;
    }
    this.disconnectSocket();
    this.outageStarted ||= Date.now();
    if (this.reconnectTimer !== undefined) return;
    this.options.onState?.("reconnecting");
    const delay = Math.min(
      (this.options.reconnectDelayMs ?? 250) *
        2 ** Math.min(this.reconnectAttempt++, 4),
      4_000,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private receive(data: unknown): void {
    if (typeof data !== "string") {
      if (!this.authenticated)
        throw new Error("Game data received before authentication");
      if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array))
        throw new Error("Unsupported binary message");
      const value = decodeGameFrame(data);
      if (value.type === "actionResponse")
        throw new Error("Server sent an action response");
      if (value.type === "rpc") this.receiveRpc(value.data);
      else this.options.onEvent(value);
      return;
    }
    if (textEncoder.encode(data).byteLength > MAX_CONTROL_MESSAGE_BYTES)
      throw new Error("Control message exceeds size limit");
    const value: unknown = JSON.parse(data);
    if (!isRecord(value) || typeof value.type !== "string")
      throw new Error("Invalid control message");
    // `ready` completes the handshake and `error` must stay readable without
    // one; every other control message below requires authentication.
    if (value.type === "ready") {
      if (this.authenticated || !isSessionId(value.sessionId))
        throw new Error("Invalid ready session");
      if (
        this.currentSessionId !== null &&
        value.sessionId !== this.currentSessionId
      )
        throw this.connectionError(
          "The room belongs to a different game session. Reload before playing.",
          "SESSION_CHANGED",
        );
      this.currentSessionId = value.sessionId;
      this.authenticated = true;
      this.outageStarted = 0;
      this.reconnectAttempt = 0;
      this.options.onState?.("connected");
      return;
    }
    if (value.type === "error")
      throw this.connectionError(
        typeof value.message === "string"
          ? value.message
          : "The game stopped unexpectedly.",
        "SERVER_ERROR",
      );
    if (!this.authenticated)
      throw new Error("Control message received before authentication");
    switch (value.type) {
      case "ping":
        return;
      case "ack":
      case "commandError":
        this.receiveAcknowledgement(value);
        return;
      case "waiting":
        this.options.onEvent({ type: "waiting" });
        return;
      case "initialized": {
        if (!isRoomInitialized(value))
          throw new Error("Invalid room initialization");
        this.options.onEvent(value);
        return;
      }
      case "rpc": {
        if (value.data !== null)
          throw new Error("Game RPC must use binary framing");
        this.receiveRpc(null);
        return;
      }
      case "oppRpc": {
        const { oppTimer } = value;
        if (oppTimer !== null && !isRpcTimer(oppTimer))
          throw new Error("Invalid opponent timer");
        this.options.onEvent({ type: "oppRpc", oppTimer });
        return;
      }
      default:
        throw new Error(`Unsupported game control message: ${value.type}`);
    }
  }

  private receiveRpc(rpc: GameRpcRequest | null): void {
    this.latestRpc = rpc;
    this.synchronized = true;
    if (this.pending) this.writePending();
    else if (this.shouldDeliverRpc(rpc))
      this.options.onEvent({ type: "rpc", data: rpc });
  }

  /** A null RPC clears the UI request; a newer id has not been shown yet. */
  private shouldDeliverRpc(rpc: GameRpcRequest | null): boolean {
    return rpc === null || rpc.id > this.acceptedRpcId;
  }

  private receiveAcknowledgement(value: Record<string, unknown>): void {
    const pending = this.pending;
    if (!pending || value.command !== pending.type || value.id !== pending.id)
      throw new Error("Unmatched command acknowledgement");
    // Only `ack` and `commandError` reach this handler. Each branch validates
    // the fields it uses, so no type assertions are needed below.
    if (value.type === "ack") {
      if (value.sessionId !== pending.sessionId)
        throw new Error("Acknowledgement belongs to a different game session");
      this.pending = null;
      clearTimeout(pending.deadline);
      clearTimeout(pending.ackTimer);
      if (pending.id !== undefined)
        this.acceptedRpcId = Math.max(this.acceptedRpcId, pending.id);
      pending.resolve();
      if (this.finished) {
        this.stopFinishedConnection();
        return;
      }
    } else {
      if (typeof value.message !== "string" || typeof value.code !== "string")
        throw new Error("Invalid command rejection");
      this.rejectPending(new RoomConnectionError(value.message, value.code));
      // A rejected command is never retried. Refresh the state and remaining
      // timer before asking the UI again, including for INVALID_RESPONSE.
      this.reconnect();
      return;
    }
    // Let the promise consumer finish the old UI request before opening the
    // newest one, which may already have arrived while an ACK was uncertain.
    const generation = this.generation;
    queueMicrotask(() => {
      if (
        this.stopped ||
        generation !== this.generation ||
        this.pending ||
        !this.synchronized
      )
        return;
      if (this.shouldDeliverRpc(this.latestRpc))
        this.options.onEvent({ type: "rpc", data: this.latestRpc });
    });
  }

  private writePending(): void {
    const pending = this.pending;
    const socket = this.socket;
    if (
      !pending ||
      !this.authenticated ||
      !this.synchronized ||
      !socket ||
      pending.sentGeneration === this.generation
    )
      return;
    if (pending.sessionId !== this.currentSessionId) {
      this.fail(
        this.connectionError(
          "Cannot retry a command in a different game session.",
          "SESSION_CHANGED",
        ),
      );
      return;
    }
    try {
      if (socket.bufferedAmount > MAX_BUFFERED_BYTES)
        throw new Error("Socket is congested");
      pending.sentGeneration = this.generation;
      socket.send(pending.frame);
      pending.ackTimer = setTimeout(
        () => this.reconnect(),
        this.options.ackTimeoutMs ?? 5_000,
      );
    } catch {
      this.reconnect();
    }
  }

  sendResponse(
    id: number,
    response: Uint8Array,
    requestToken = this.requestToken,
  ): Promise<void> {
    if (
      !requestToken ||
      requestToken !== this.requestToken ||
      this.latestRpc?.id !== id ||
      id <= this.acceptedRpcId
    )
      return Promise.reject(
        new RoomConnectionError(
          "This action request has changed. Wait for the current game state.",
          "STALE_LOCAL_RPC",
        ),
      );
    // Encoding copies the response; a caller cannot mutate uncertain retries.
    return this.submit(
      "actionResponse",
      encodeGameFrame({ type: "actionResponse", id, response }),
      id,
    );
  }

  giveUp(): Promise<void> {
    return this.submit("giveUp", JSON.stringify({ type: "giveUp" }));
  }

  private submit(
    type: PendingCommand["type"],
    frame: PendingCommand["frame"],
    id?: number,
  ): Promise<void> {
    if (
      this.stopped ||
      !this.authenticated ||
      !this.synchronized ||
      !this.currentSessionId
    )
      return Promise.reject(
        new RoomConnectionError(
          "The room is reconnecting. Wait for the current game state.",
          "NOT_CONNECTED",
        ),
      );
    if (this.pending)
      return Promise.reject(
        new RoomConnectionError(
          "The previous command is still awaiting confirmation.",
          "COMMAND_PENDING",
          true,
        ),
      );
    const sessionId = this.currentSessionId;
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const deadline = setTimeout(
      () =>
        this.fail(
          new RoomConnectionError(
            "The command result is still unknown. Reload to synchronize the game.",
            "COMMAND_TIMEOUT",
            true,
          ),
        ),
      this.options.commandTimeoutMs ?? 30_000,
    );
    this.pending = {
      type,
      id,
      frame,
      sessionId,
      resolve,
      reject,
      deadline,
      sentGeneration: -1,
    };
    this.writePending();
    return promise;
  }

  /** The UI decoded a terminal game snapshot. Finish pending ACK recovery first. */
  markFinished(): void {
    this.finished = true;
    if (!this.pending) this.stopFinishedConnection();
  }

  private stopFinishedConnection(): void {
    this.terminal = true;
    this.haltReconnect();
    this.options.onState?.("closed");
  }

  private rejectPending(error: RoomConnectionError): void {
    const pending = this.pending;
    this.pending = null;
    if (!pending) return;
    clearTimeout(pending.deadline);
    clearTimeout(pending.ackTimer);
    pending.reject(error);
  }

  /**
   * A failure only leaves the command's outcome ambiguous while an ACK is still
   * awaited: without a pending command the server either never acted or
   * already refused, so the caller may always stop safely.
   */
  private connectionError(message: string, code: string): RoomConnectionError {
    return new RoomConnectionError(message, code, this.hasPendingCommand);
  }

  private fail(error: RoomConnectionError): void {
    if (this.stopped) return;
    this.terminal = true;
    this.haltReconnect();
    this.rejectPending(error);
    this.options.onState?.("failed");
    this.options.onError?.(error);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.haltReconnect();
    this.rejectPending(this.connectionError("Room view closed.", "DISPOSED"));
  }
}
