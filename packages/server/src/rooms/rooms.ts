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

import {
  badRequest,
  conflict,
  internalError,
  Logger,
  notFound,
  unauthorized,
} from "../errors";
import {
  Game as InternalGame,
  createGameStateLogSerializer,
  CORE_VERSION,
  VERSIONS,
  CURRENT_VERSION,
  type GameState,
  setAsyncContext,
} from "@gi-tcg/core";
import getData from "@gi-tcg/data";
import { flip } from "@gi-tcg/utils";
import { createGuestId, DeckVerificationError, verifyDeck } from "../utils";
import type { Metrics, RoomMetricsSnapshot } from "../metrics/metrics";
import type {
  CreateRoomDto,
  GuestCreateRoomDto,
  GuestJoinRoomDto,
  UserCreateRoomDto,
} from "./request";
import type { Decks } from "../decks/decks";
import type { Users } from "../users/users";
import type { Games } from "../games/games";
import { inspect } from "node:util";
import { randomUUID } from "node:crypto";
import semver from "semver";
import { redis } from "../redis";
import { Player } from "./player";
import {
  RoomCommandError,
  type PlayerInfo,
  type PlayerId,
  type RoomConfig,
  type CreateRoomConfig,
  type RoomSubscriber,
  type CommandAck,
} from "./types";
export type { PlayerId } from "./types";

let s3Promise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;
async function uploadReplay(roomId: number, gameData: string) {
  if (!process.env.S3_ENDPOINT) return;
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = await (s3Promise ??= Promise.resolve(
    new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    }),
  ));
  const now = new Date().toISOString();
  const date = now.slice(0, 10),
    time = now.slice(11, 19).replaceAll(":", "");
  const prefix = process.env.S3_PREFIX ? process.env.S3_PREFIX + "/" : "";
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: prefix + "logs/" + date + "/" + time + "-" + roomId + ".json",
      Body: gameData,
      ContentType: "application/json",
    }),
  );
}

interface GameStopInfo {
  hasGame: boolean;
  phase: string | null;
  winner: 0 | 1 | null;
}
type GameStopHandler = (
  room: Room,
  info: GameStopInfo,
) => void | Promise<unknown>;

export enum RoomStatus {
  Waiting = "waiting",
  Playing = "playing",
  Finished = "finished",
}

export interface RoomInfo {
  id: number;
  config: RoomConfig;
  status: RoomStatus;
  watchable: boolean;
  players: PlayerInfo[];
}

/** The replay document a finished room publishes, as the client stores it. */
export type StateLog = ReturnType<Room["getStateLog"]>;

function sendDebugLog(name: string, message: unknown) {
  if (process.env.DEBUG_LOG_RECEIVE_URL) {
    fetch(process.env.DEBUG_LOG_RECEIVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${name}.json"`,
      },
      body: JSON.stringify(message),
    })
      .then(() => {
        console.log(
          `Debug log ${name} sent to ${process.env.DEBUG_LOG_RECEIVE_URL}`,
        );
      })
      .catch(() => ({}));
  }
}

await setAsyncContext(true);

class Room {
  public static readonly CORE_VERSION = CORE_VERSION;
  private game: InternalGame | null = null;
  private hostWho: 0 | 1;
  public readonly config: RoomConfig;
  private host: Player | null = null;
  private participant: Player | null = null;
  private readonly stateLog = createGameStateLogSerializer();
  public readonly sessionId: string = randomUUID();
  private readonly giveUpAcks = new Map<PlayerId, CommandAck>();
  private terminated = false;
  private onStopHandlers: GameStopHandler[] = [];
  private startedAt: Date | null = null;
  private endedAt: Date | null = null;
  private waitingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public readonly id: number,
    createRoomConfig: CreateRoomConfig,
  ) {
    const { hostWho, ...config } = createRoomConfig;
    this.hostWho = hostWho;
    this.config = config;
  }
  getHost() {
    return this.host;
  }
  getParticipant() {
    return this.participant;
  }
  private get players(): [Player | null, Player | null] {
    return this.hostWho === 0
      ? [this.host, this.participant]
      : [this.participant, this.host];
  }
  getPlayer(who: 0 | 1): Player | null {
    return this.players[who];
  }
  getPlayers(): Player[] {
    return this.players.filter((player): player is Player => player !== null);
  }
  get status(): RoomStatus {
    if (this.terminated && this.startedAt) return RoomStatus.Finished;
    if (!this.game) return RoomStatus.Waiting;
    return RoomStatus.Playing;
  }

  setHost(player: Player) {
    if (this.host !== null) {
      throw conflict("host already set");
    }
    this.host = player;
    return this.hostWho;
  }
  setParticipant(player: Player) {
    if (this.participant !== null) {
      throw conflict("participant already set");
    }
    this.participant = player;
    return flip(this.hostWho);
  }
  setWaitingTimeout(timer: ReturnType<typeof setTimeout>) {
    this.waitingTimeout = timer;
  }
  start() {
    if (this.terminated) {
      throw conflict("room terminated");
    }
    const [player0, player1] = this.players;
    if (player0 === null || player1 === null) {
      throw conflict("player not ready");
    }
    if (this.waitingTimeout) clearTimeout(this.waitingTimeout);
    this.waitingTimeout = null;
    let state: GameState;
    try {
      player0.setTimeoutConfig(this.config);
      player1.setTimeoutConfig(this.config);
      state = InternalGame.createInitialState({
        decks: [player0.playerInfo.deck, player1.playerInfo.deck],
        data: getData(this.config.gameVersion),
        versionBehavior: this.config.gameVersion,
        hostRelatedExecution: true,
        hostWho: this.hostWho,
        randomSeed: this.config.randomSeed,
      });
    } catch (e) {
      this.stop();
      throw internalError(
        `Failed to create initial game state: ${e}; propably due to invalid decks`,
      );
    }
    this.startedAt = new Date();
    const game = new InternalGame(state);
    game.onPause = async (state, mutations, canResume) => {
      this.stateLog.append({ state, canResume });
      for (const mut of mutations) {
        if (mut.type === "changePhase" && mut.newPhase === "roll") {
          player0.resetRoundTimeout();
          player1.resetRoundTimeout();
        }
      }
    };
    game.onIoError = (e) => {
      if (e.who === 0) {
        player0.onError(e);
      } else if (e.who === 1) {
        player1.onError(e);
      }
    };
    game.players[0].io = player0;
    game.players[1].io = player1;
    player0.onInitialized(0, game, player1);
    player1.onInitialized(1, game, player0);
    (async () => {
      try {
        this.game = game;
        await game.start();
      } catch (e) {
        player0.onError(e);
        player1.onError(e);
        sendDebugLog("gameErrorLog", {
          em: inspect(e),
          gv: this.config.gameVersion,
          ...this.stateLog.serialize(),
        });
      } finally {
        this.stop();
      }
    })();
  }

  giveUp(userId: PlayerId): CommandAck {
    const old = this.giveUpAcks.get(userId);
    if (old) return old;
    const who = this.players.findIndex((p) => p?.playerInfo.id === userId);
    if (who !== 0 && who !== 1) throw notFound("Player not found");
    if (!this.startedAt)
      throw new RoomCommandError("GAME_FINISHED", "No game is running");
    const ack: CommandAck = {
      type: "ack",
      command: "giveUp",
      sessionId: this.sessionId,
    };
    this.giveUpAcks.set(userId, ack);
    if (!this.terminated) this.game?.giveUp(who);
    return ack;
  }

  stop() {
    if (this.terminated) return;
    this.terminated = true;
    if (this.waitingTimeout) clearTimeout(this.waitingTimeout);
    this.waitingTimeout = null;
    this.endedAt = new Date();
    const info: GameStopInfo = {
      hasGame: this.game !== null,
      phase: this.game?.state.phase ?? null,
      winner: this.game?.state.winner ?? null,
    };
    this.players[0]?.complete();
    this.players[1]?.complete();
    this.game = null;
    for (const cb of this.onStopHandlers.splice(0)) {
      Promise.resolve()
        .then(() => cb(this, info))
        .catch((error) =>
          console.error("Room finalization failed", this.id, error),
        );
    }
  }

  onStop(cb: GameStopHandler) {
    this.onStopHandlers.push(cb);
  }

  getStateLog() {
    const players = ([0, 1] as const).map((who) => {
      const player = this.getPlayer(who)?.playerInfo;
      return player && { who, id: player.id, name: player.name };
    });
    return {
      ...this.stateLog.serialize(),
      gv: this.config.gameVersion,
      m: {
        roomId: this.id,
        startedAt: this.startedAt?.toISOString() ?? null,
        endedAt: this.endedAt?.toISOString() ?? null,
        players,
      },
    };
  }

  getRoomInfo(): RoomInfo {
    return {
      id: this.id,
      config: this.config,
      status: this.status,
      watchable: this.config.watchable,
      players: this.getPlayers().map((player) => player.playerInfo),
    };
  }
}

function toShuffled<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i]!, result[j]!] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * The room registry: which rooms exist, who sits in them, and how each room's
 * game is torn down. The state itself lives in the closure of `createRooms`, so
 * callers can only reach it through the operations published below.
 */
export interface Rooms {
  /** Resolves once the last room has been removed; used to drain on shutdown. */
  close(): Promise<void>;
  /** The unfinished room this player sits in, if any. */
  currentRoom(playerId: PlayerId): RoomInfo | null;
  createRoomFromUser(
    userId: number,
    params: UserCreateRoomDto,
  ): Promise<{ room: RoomInfo }>;
  createRoomFromGuest(
    params: GuestCreateRoomDto,
  ): Promise<{ playerId: string; room: RoomInfo }>;
  deleteRoom(playerId: PlayerId, roomId: number): void;
  joinRoomFromUser(
    userId: number,
    roomId: number,
    deckId: number,
  ): Promise<void>;
  joinRoomFromGuest(
    roomId: number,
    params: GuestJoinRoomDto,
  ): Promise<{ playerId: string }>;
  getRoom(roomId: number): RoomInfo;
  getRoomGameLog(playerId: PlayerId, roomId: number): StateLog;
  getAllRooms(guest: boolean): RoomInfo[];
  subscribePlayer(
    roomId: number,
    visitorPlayerId: PlayerId | null,
    watchingPlayerId: PlayerId,
    subscriber: RoomSubscriber,
  ): RoomSubscription;
  receivePlayerResponse(
    roomId: number,
    playerId: PlayerId,
    id: number,
    response: Uint8Array,
  ): void;
  receivePlayerGiveUp(roomId: number, playerId: PlayerId): CommandAck;
}

/** A spectator's live binding to one seat of a room. */
interface RoomSubscription {
  sessionId: string;
  ownPlayer: boolean;
  subscribe: () => void;
}

export function createRooms(
  users: Users,
  decks: Decks,
  games: Games,
  metrics: Metrics,
): Rooms {
  const logger = new Logger("rooms");
  const roomIdPool = toShuffled(Array.from({ length: 10000 }, (_, i) => i));
  const rooms = new Map<number, Room>();
  let shutdownResolvers: PromiseWithResolvers<void> | null = null;

  metrics.setRoomMetricsProvider(() => roomMetricsSnapshot());

  async function close() {
    shutdownResolvers ??= Promise.withResolvers();
    if (rooms.size === 0) shutdownResolvers.resolve();
    await shutdownResolvers.promise;
  }

  function currentRoom(playerId: PlayerId) {
    for (const room of rooms.values()) {
      if (room.status === RoomStatus.Finished) {
        continue;
      }
      if (
        room.getPlayers().some((player) => player.playerInfo.id === playerId)
      ) {
        return room.getRoomInfo();
      }
    }
    return null;
  }

  function roomMetricsSnapshot(): RoomMetricsSnapshot {
    const snapshot: RoomMetricsSnapshot = {
      activeRooms: 0,
      roomPlayers: 0,
      roomsByStatus: {
        waiting: 0,
        playing: 0,
        finished: 0,
      },
    };

    for (const room of rooms.values()) {
      switch (room.status) {
        case RoomStatus.Waiting:
        case RoomStatus.Playing: {
          const statusKey =
            room.status === RoomStatus.Waiting ? "waiting" : "playing";
          snapshot.roomsByStatus[statusKey]++;
          snapshot.activeRooms++;
          snapshot.roomPlayers += room.getPlayers().length;
          break;
        }
        case RoomStatus.Finished:
          snapshot.roomsByStatus.finished++;
          break;
      }
    }

    return snapshot;
  }

  async function createRoomFromUser(userId: number, params: UserCreateRoomDto) {
    const user = await users.findById(userId);
    if (user === null) {
      throw notFound(`User ${userId} not found`);
    }
    if (currentRoom(userId) !== null) {
      throw conflict(`User ${userId} is already in a room`);
    }
    const deck = await decks.getDeck(userId, params.hostDeckId);
    if (deck === null) {
      throw notFound(`Deck ${params.hostDeckId} not found`);
    }
    const playerInfo: PlayerInfo = {
      isGuest: false,
      id: userId,
      name: user.name ?? user.login,
      deck,
    };
    const room = await createRoom(playerInfo, params);
    return { room };
  }

  async function createRoomFromGuest(params: GuestCreateRoomDto) {
    const playerId = createGuestId();
    const playerInfo: PlayerInfo = {
      isGuest: true,
      id: playerId,
      name: params.name,
      deck: params.deck,
      avatarUrl: params.avatarUrl,
    };
    const room = await createRoom(playerInfo, params);
    return {
      playerId,
      room,
    };
  }

  async function createRoom(playerInfo: PlayerInfo, params: CreateRoomDto) {
    let deploying = (await redis?.get("meta:deploying")) ?? null;
    if (shutdownResolvers || deploying !== null) {
      throw conflict(
        "Creating room is disabled now; we are planning a maintenance",
      );
    }

    const hostWho =
      typeof params.hostFirst === "undefined"
        ? Math.random() > 0.5
          ? 0
          : 1
        : params.hostFirst
          ? 0
          : 1;

    const roomConfig: CreateRoomConfig = {
      hostWho,
      randomSeed: params.randomSeed,
      gameVersion:
        typeof params.gameVersion === "number"
          ? VERSIONS[params.gameVersion]!
          : CURRENT_VERSION,
      initTotalActionTime: params.initTotalActionTime ?? 45,
      rerollTime: params.rerollTime ?? 40,
      roundTotalActionTime: params.roundTotalActionTime ?? 60,
      actionTime: params.actionTime ?? 25,
      watchable: params.watchable ?? false,
      private: params.private ?? false,
      allowGuest: params.allowGuest ?? true,
    };

    try {
      const version = await verifyDeck(playerInfo.deck);
      if (semver.compare(version, roomConfig.gameVersion) > 0) {
        throw badRequest(
          `Deck version required ${version}, it's higher game version ${roomConfig.gameVersion}`,
        );
      }
    } catch (e) {
      if (e instanceof DeckVerificationError) {
        throw badRequest(`Deck verification failed: ${e.message}`);
      } else {
        throw e;
      }
    }

    const roomId = roomIdPool[0];
    if (typeof roomId === "undefined") {
      throw internalError("no room available");
    }
    const room = new Room(roomId, roomConfig);
    rooms.set(roomId, room);
    roomIdPool.shift();
    metrics.incrementCreatedRooms();
    logger.log(`Room ${room.id} created, host is ${playerInfo.name}`);

    room.onStop(async (room, info) => {
      if (info.hasGame) {
        metrics.incrementFinishedRooms();
      }
      const deploying = await redis?.get("meta:deploying").catch((error) => {
        logger.warn(`Failed to read maintenance status: ${error}`);
        return null;
      });

      const keepRoomDuration =
        (shutdownResolvers || deploying ? 1 : 5) * 60 * 1000;
      logger.log(
        `Room ${room.id} stopped, status ${room.status}, keep it for ${keepRoomDuration} ms`,
      );
      logger.log(`Room ${room.id} game phase: ${info.phase}`);
      if (room.status !== RoomStatus.Waiting) {
        await new Promise((r) => setTimeout(r, keepRoomDuration));
      }
      logger.log(`Room ${room.id} removed`);
      await redis?.hdel("meta:active_rooms", String(room.id)).catch((error) => {
        logger.warn(
          `Failed to remove room ${room.id} from Redis: ${error}`,
        );
      });

      for (const player of room.getPlayers()) player.dispose();
      rooms.delete(room.id);
      roomIdPool.push(room.id);
      if (rooms.size === 0) {
        shutdownResolvers?.resolve();
      }
    });

    room.setHost(new Player(playerInfo, room.sessionId));
    // 闲置五分钟后删除房间
    room.setWaitingTimeout(
      setTimeout(
        () => {
          if (room.status === RoomStatus.Waiting) {
            room.stop();
          }
        },
        5 * 60 * 1000,
      ),
    );
    return room.getRoomInfo();
  }

  function deleteRoom(playerId: PlayerId, roomId: number) {
    const room = rooms.get(roomId);
    if (!room) {
      throw notFound(`Room ${roomId} not found`);
    }
    if (room.status !== RoomStatus.Waiting) {
      throw conflict(
        `${roomId} has status ${room.status}, while only waiting room can be deleted`,
      );
    }
    if (room.getHost()?.playerInfo.id !== playerId) {
      throw unauthorized(`You are not the host of room ${roomId}`);
    }
    room.stop();
  }

  async function joinRoomFromUser(userId: number, roomId: number, deckId: number) {
    const user = await users.findById(userId);
    if (user === null) {
      throw notFound(`User ${userId} not found`);
    }
    const deck = await decks.getDeck(userId, deckId);
    if (deck === null) {
      throw notFound(`Deck ${deckId} not found`);
    }
    const playerInfo: PlayerInfo = {
      isGuest: false,
      id: userId,
      name: user.name ?? user.login,
      deck,
    };
    return joinRoom(playerInfo, roomId);
  }

  async function joinRoomFromGuest(roomId: number, params: GuestJoinRoomDto) {
    const playerId = createGuestId();
    const playerInfo: PlayerInfo = {
      isGuest: true,
      id: playerId,
      name: params.name,
      deck: params.deck,
      avatarUrl: params.avatarUrl,
    };
    await joinRoom(playerInfo, roomId);
    return { playerId };
  }

  async function joinRoom(playerInfo: PlayerInfo, roomId: number) {
    const allRooms = getAllRooms(true);
    const room = rooms.get(roomId);
    if (!room) {
      throw notFound(`Room ${roomId} not found`);
    }
    if (room.status !== RoomStatus.Waiting) {
      throw conflict(`Room ${roomId} is not waiting`);
    }
    if (playerInfo.isGuest && !room.config.allowGuest) {
      throw unauthorized(`Room ${roomId} does not allow guest`);
    }
    if (
      allRooms.some((room) => room.players.some((p) => p.id === playerInfo.id))
    ) {
      throw conflict(`Player ${playerInfo.id} is already in a room`);
    }

    try {
      const version = await verifyDeck(playerInfo.deck);
      if (semver.compare(version, room.config.gameVersion) > 0) {
        throw badRequest(
          `Deck version required ${version}, it's higher game version ${room.config.gameVersion}`,
        );
      }
    } catch (e) {
      if (e instanceof DeckVerificationError) {
        throw badRequest(`Deck verification failed: ${e.message}`);
      } else {
        throw e;
      }
    }

    room.setParticipant(new Player(playerInfo, room.sessionId));
    // Add to game database when room stopped
    room.onStop((room, info) => {
      if (!info.hasGame) {
        return;
      }
      const players = room.getPlayers();
      const registered = players.every((player) => !player.playerInfo.isGuest);
      if (!registered && !process.env.S3_ENDPOINT) return;
      const gameData = JSON.stringify(room.getStateLog());
      void uploadReplay(room.id, gameData).catch((error) =>
        logger.warn(
          "Failed to upload room " + room.id + " game log: " + error,
        ),
      );
      if (!registered) {
        return;
      }
      const playerIds = players.map(
        (player) => player.playerInfo.id,
      ) as number[];
      const winnerWho = info.winner;
      const winnerId = winnerWho === null ? null : playerIds[winnerWho]!;
      return games.addGame({
        coreVersion: Room.CORE_VERSION,
        gameVersion: room.config.gameVersion,
        data: gameData,
        winnerId,
        playerIds,
      });
    });
    room.start();
    try {
      await redis?.hset(
        "meta:active_rooms",
        String(roomId),
        JSON.stringify(room.config),
      );
      await redis?.hexpire(
        "meta:active_rooms",
        1 * 60 * 60,
        "FIELDS",
        1,
        String(roomId),
      );
    } catch (e) {
      logger.warn(
        `Failed to update meta:active_rooms for room ${room.id}: ${e}`,
      );
    }
    metrics.incrementStartedRooms();
  }

  function getRoom(roomId: number): RoomInfo {
    const room = rooms.get(roomId);
    if (!room) {
      throw notFound(`Room not found`);
    }
    return room.getRoomInfo();
  }

  function getRoomGameLog(playerId: PlayerId, roomId: number) {
    const room = rooms.get(roomId);
    if (!room) {
      throw notFound(`Room not found`);
    }
    if (room.status !== RoomStatus.Finished) {
      throw conflict(`Room ${roomId} is not finished`);
    }
    if (
      room.config.watchable ||
      room.getPlayers().some((p) => p.playerInfo.id === playerId)
    ) {
      return room.getStateLog();
    } else {
      throw unauthorized(
        `Room ${roomId} is not watchable, and you are not in the room`,
      );
    }
  }

  function getAllRooms(guest: boolean): RoomInfo[] {
    const result: RoomInfo[] = [];
    for (const room of rooms.values()) {
      if (room.status === RoomStatus.Finished) {
        continue;
      }
      if (room.config.private) {
        continue;
      }
      if (guest && !room.config.allowGuest) {
        continue;
      }
      result.push(room.getRoomInfo());
    }
    return result;
  }

  function subscribePlayer(
    roomId: number,
    visitorPlayerId: PlayerId | null,
    watchingPlayerId: PlayerId,
    subscriber: RoomSubscriber,
  ) {
    const room = rooms.get(roomId);
    if (!room) throw notFound("Room not found");
    const players = room.getPlayers();
    const player = players.find((p) => p.playerInfo.id === watchingPlayerId);
    if (!player) throw notFound("Player not in room");
    if (!room.config.watchable && visitorPlayerId !== watchingPlayerId)
      throw unauthorized("Room cannot be watched by others");
    if (
      players.some((p) => p.playerInfo.id === visitorPlayerId) &&
      visitorPlayerId !== watchingPlayerId
    )
      throw unauthorized("You cannot watch your opponent");
    return {
      sessionId: room.sessionId,
      ownPlayer: visitorPlayerId === watchingPlayerId,
      subscribe: () => player.subscribe(subscriber),
    };
  }

  function receivePlayerResponse(
    roomId: number,
    playerId: PlayerId,
    id: number,
    response: Uint8Array,
  ) {
    const room = rooms.get(roomId);
    if (!room) throw notFound("Room not found");
    const player = room
      .getPlayers()
      .find((player) => player.playerInfo.id === playerId);
    if (!player) throw notFound("Player not in room");
    return player.receiveResponse(id, response);
  }

  function receivePlayerGiveUp(roomId: number, playerId: PlayerId): CommandAck {
    const room = rooms.get(roomId);
    if (!room) throw notFound("Room not found");
    return room.giveUp(playerId);
  }

  return {
    close,
    currentRoom,
    createRoomFromUser,
    createRoomFromGuest,
    deleteRoom,
    joinRoomFromUser,
    joinRoomFromGuest,
    getRoom,
    getRoomGameLog,
    getAllRooms,
    subscribePlayer,
    receivePlayerResponse,
    receivePlayerGiveUp,
  };
}
