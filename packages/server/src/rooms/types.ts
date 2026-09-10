import type { GameConfig, Version } from "@gi-tcg/core";
import type { Deck, GameWireFrame } from "@gi-tcg/typings";

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
export interface RpcTimer {
  current: number;
  total: number;
}
export interface Initialized {
  type: "initialized";
  who: 0 | 1;
  config: RoomConfig | null;
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
  id?: number;
}
export interface RoomSubscriber {
  send(event: RoomEvent): void;
  close(code: number, reason: string): void;
}
/** Why a room command was refused; the transport maps each one to a wire code. */
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
