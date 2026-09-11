import type { GameConfig, Version } from "@gi-tcg/core";
import type { Deck, GameRpcTimer, GameWireFrame } from "@gi-tcg/typings";

export interface RoomConfig extends Partial<GameConfig> {
  initTotalActionTime: number;
  rerollTime: number;
  roundTotalActionTime: number;
  actionTime: number;
  watchable: boolean;
  private: boolean;
  allowGuest: boolean;
  gameVersion: Version;
}

export interface CreateRoomConfig extends RoomConfig {
  hostWho: 0 | 1;
}

export type PlayerInfo = (
  { isGuest: true; id: string } | { isGuest: false; id: number }
) & {
  name: string;
  deck: Deck;
  avatarUrl?: string;
};

export type PlayerId = PlayerInfo["id"];

/** Seconds left on the current RPC and the budget it started from. */
export type RpcTimer = GameRpcTimer;

/** Sent once the room starts: the seat, the room config and both players. */
export interface Initialized {
  type: "initialized";
  who: 0 | 1;
  config: RoomConfig;
  myPlayerInfo: PlayerInfo;
  oppPlayerInfo: PlayerInfo;
}

export type RoomEvent =
  | Exclude<GameWireFrame, { type: "actionResponse" }>
  | { type: "waiting" | "ping" }
  | Initialized
  | { type: "rpc"; data: null }
  | { type: "oppRpc"; oppTimer: RpcTimer | null }
  | { type: "error"; message: string };

export interface CommandAck {
  type: "ack";
  command: "actionResponse" | "giveUp";
  sessionId: string;
  /** The acknowledged RPC ID; a give-up acknowledgement has no RPC to echo. */
  id?: number;
}

export interface RoomSubscriber {
  send(event: RoomEvent): void;
  close(code: number, reason: string): void;
}

/** RFC 6455 close codes, named once for the room layer and its transport. */
export const CLOSE_NORMAL = 1000;
export const CLOSE_POLICY_VIOLATION = 1008;
export const CLOSE_INTERNAL_ERROR = 1011;
export const CLOSE_TRY_AGAIN_LATER = 1013;

/** Why a room command was refused; the transport echoes the code to the client. */
type CommandFailure =
  | "CONFLICT"
  | "STALE_RPC"
  | "FUTURE_RPC"
  | "INVALID_RESPONSE"
  | "FORBIDDEN"
  | "GAME_FINISHED";

export class RoomCommandError extends Error {
  constructor(
    public readonly code: CommandFailure,
    message: string,
  ) {
    super(message);
  }
}
