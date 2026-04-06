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
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  type GameConfig,
  type GameStateLogEntry,
  GiTcgError,
  Game as InternalGame,
  type Notification,
  type PlayerIO,
  type RpcRequest,
  serializeGameStateLog,
  CORE_VERSION,
  VERSIONS,
  RpcResponse,
  CURRENT_VERSION,
  type Version,
  type GameState,
} from "@gi-tcg/core";
import { dispatchRpc, type Deck } from "@gi-tcg/typings";
import getData from "@gi-tcg/data";
import { flip } from "@gi-tcg/utils";
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  Subject,
  concat,
  defer,
  filter,
  finalize,
  interval,
  map,
  mergeWith,
  of,
  takeUntil,
} from "rxjs";
import { createGuestId, DeckVerificationError, verifyDeck } from "../utils";
import {
  MetricsService,
  type RoomMetricsSnapshot,
} from "../metrics/metrics.service";
import type {
  CreateRoomDto,
  GuestCreateRoomDto,
  GuestJoinRoomDto,
  PlayerActionResponseDto,
  UserCreateRoomDto,
} from "./rooms.controller";
import { DecksService } from "../decks/decks.service";
import { UsersService, type UserInfo } from "../users/users.service";
import { GamesService } from "../games/games.service";
import { redis, semver } from "bun";

interface RoomConfig extends Partial<GameConfig> {
  initTotalActionTime: number; // defaults 45
  rerollTime: number; // defaults 40
  roundTotalActionTime: number; // defaults 60
  actionTime: number; // defaults 25
  watchable: boolean; // defaults true
  private: boolean; // defaults false
  allowGuest: boolean; // defaults true
  gameVersion: Version; // defaults latest
}

interface CreateRoomConfig extends RoomConfig {
  hostWho: 0 | 1;
}

interface PlayerIOWithError extends PlayerIO {
  // notify: (notification: NotificationMessage) => void;
  // rpc: (method: RpcMethod, params: RpcRequest[RpcMethod]) => Promise<any>;
  onError: (e: GiTcgError) => void;
}

type PlayerInfo = (
  | {
      isGuest: true;
      id: string;
    }
  | {
      isGuest: false;
      id: number;
    }
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

export interface SSEWaiting {
  type: "waiting";
}

export interface SSEPing {
  type: "ping";
}

export interface SSEInitialized {
  type: "initialized";
  who: 0 | 1;
  config: RoomConfig | null;
  myPlayerInfo: PlayerInfo;
  oppPlayerInfo: PlayerInfo;
}

export interface SSENotification {
  type: "notification";
  data: Notification;
}
export interface SSEError {
  type: "error";
  message: string;
}
export interface SSERpc {
  type: "rpc";
  id: number;
  timer: RpcTimer;
  request: RpcRequest;
}
export interface SSEOppRpc {
  type: "oppRpc";
  oppTimer: RpcTimer | null;
}

export type SSEPayload =
  | SSEPing
  | SSERpc
  | SSEWaiting
  | SSEInitialized
  | SSENotification
  | SSEOppRpc
  | SSEError;

interface RpcResolver {
  id: number;
  request: RpcRequest;
  timeout: number;
  readonly totalTimeout: number;
  resolve: (response: any) => void;
}

// Keepalive ping interval (10 seconds to prevent proxy/gateway timeout)
const pingInterval = interval(10 * 1000).pipe(
  map((): SSEPing => ({ type: "ping" })),
);

class Player implements PlayerIOWithError {
  private readonly completeSubject = new Subject<void>();
  private readonly initializedSubject = new ReplaySubject<
    SSEInitialized | SSEWaiting
  >();
  private readonly actionSseSource = new Subject<SSEPayload>();
  private readonly errorSseSource = new BehaviorSubject<SSEError | null>(null);
  private readonly oppRpcSseSource = new BehaviorSubject<SSEOppRpc>({
    type: "oppRpc",
    oppTimer: null,
  });
  private readonly notificationSseSource =
    new BehaviorSubject<SSENotification | null>(null);
  public readonly notificationSse$: Observable<SSEPayload> = concat<
    (SSEPayload | null)[]
  >(this.initializedSubject, this.notificationSseSource).pipe(
    mergeWith(
      defer(() => of(this.currentAction())),
      this.errorSseSource,
    ),
    filter((data): data is SSEPayload => data !== null),
    mergeWith(this.actionSseSource, this.oppRpcSseSource, pingInterval),
    takeUntil(this.completeSubject),
  );
  constructor(public readonly playerInfo: PlayerInfo) {
    this.initializedSubject.next({ type: "waiting" });
  }

  private _nextRpcId = 0;
  private _rpcResolver: RpcResolver | null = null;
  private _timeoutConfig: RoomConfig | null = null;
  private _roundTimeout = Infinity;
  private _initialRoundTimeout = Infinity;
  private _mutationExtraTimeout = 0;

  private _contiguousTimeoutRpcExecuted = 0;
  private _oppPlayer: Player | null = null;

  private _game: InternalGame | null = null;
  private _who: 0 | 1 = 0;

  setTimeoutConfig(config: RoomConfig) {
    this._timeoutConfig = config;
    this._initialRoundTimeout = this._roundTimeout =
      this._timeoutConfig?.initTotalActionTime ?? Infinity;
  }
  resetRoundTimeout() {
    this._initialRoundTimeout = this._roundTimeout =
      this._timeoutConfig?.roundTotalActionTime ?? Infinity;
  }
  currentAction(): SSERpc | null {
    if (this._rpcResolver) {
      return {
        type: "rpc",
        id: this._rpcResolver.id,
        timer: this.getTimer()!,
        request: this._rpcResolver.request,
      };
    } else {
      return null;
    }
  }
  getTimer(): RpcTimer | null {
    if (this._rpcResolver) {
      return {
        current: this._rpcResolver.timeout,
        total: this._rpcResolver.totalTimeout,
      };
    } else {
      return null;
    }
  }

  receiveResponse(response: PlayerActionResponseDto) {
    if (!this._rpcResolver) {
      throw new NotFoundException(`No rpc now`);
    } else if (this._rpcResolver.id !== response.id) {
      console.error(this._rpcResolver, response);
      throw new NotFoundException(`Rpc id not match`);
    }
    this._rpcResolver.resolve(response.response);
  }

  notify(notification: Notification) {
    this.notificationSseSource.next({
      type: "notification",
      data: notification,
    });
    this._mutationExtraTimeout += 0.5 * notification.mutation.length;
  }
  sendOppRpc(oppTimer: RpcTimer | null) {
    this.oppRpcSseSource.next({
      type: "oppRpc",
      oppTimer,
    });
  }

  private timeoutRpc(request: RpcRequest): Promise<RpcResponse> {
    this._contiguousTimeoutRpcExecuted++;
    if (this.playerInfo.isGuest && this._contiguousTimeoutRpcExecuted >= 3) {
      if (this._game && this._who !== null) {
        this._game?.giveUp(this._who);
      }
      throw new Error(`Give up actions due to too many timeout of guest`);
    }
    return dispatchRpc({
      action: async ({ action }) => {
        const declareEndIdx = action.findIndex(
          (c) => c.action?.$case === "declareEnd",
        );
        return {
          chosenActionIndex: declareEndIdx,
          usedDice: [],
        };
      },
      chooseActive: async ({ candidateIds }) => ({
        activeCharacterId: candidateIds[0]!,
      }),
      rerollDice: async () => ({
        diceToReroll: [],
      }),
      switchHands: async () => ({
        removedHandIds: [],
      }),
      selectCard: async ({ candidateDefinitionIds }) => ({
        selectedDefinitionId: candidateDefinitionIds[0]!,
      }),
    })(request);
  }

  async rpc(request: RpcRequest): Promise<RpcResponse> {
    const id = this._nextRpcId++;
    // 计时器上限
    let totalTimeout = this._initialRoundTimeout;
    // 当前回合剩余时间
    const roundTimeout = this._roundTimeout;
    // 本行动可用时间
    let timeout = Math.ceil(this._mutationExtraTimeout);
    // 行动结束后，计算新的回合剩余时间
    let setRoundTimeout: (remained: number) => void;
    if (request.request?.$case === "rerollDice") {
      const actionTimeout = this._timeoutConfig?.rerollTime ?? Infinity;
      timeout += actionTimeout;
      totalTimeout += actionTimeout;
      setRoundTimeout = () => {
        this._mutationExtraTimeout = 0;
      };
    } else {
      const actionTimeout = this._timeoutConfig?.actionTime ?? Infinity;
      timeout += roundTimeout + actionTimeout;
      totalTimeout += actionTimeout;
      setRoundTimeout = (remain) => {
        this._roundTimeout = Math.min(roundTimeout, remain + 1);
        this._mutationExtraTimeout = 0;
      };
    }
    try {
      return await new Promise<RpcResponse>((resolve, reject) => {
        const resolver: RpcResolver = {
          id,
          request,
          timeout,
          totalTimeout,
          resolve: (r) => {
            clearInterval(interval);
            setRoundTimeout(resolver.timeout);
            this._contiguousTimeoutRpcExecuted = 0;
            resolve(r);
          },
        };
        this._rpcResolver = resolver;
        this.actionSseSource.next(this.currentAction()!);
        this._oppPlayer?.sendOppRpc(this.getTimer()!);
        const interval = setInterval(() => {
          resolver.timeout--;
          if (resolver.timeout <= -2) {
            clearInterval(interval);
            setRoundTimeout(0);
            Promise.try(() => this.timeoutRpc(request))
              .then((r) => resolve(r))
              .catch((e) => reject(e));
          }
        }, 1000);
      });
    } finally {
      this._rpcResolver = null;
      this._oppPlayer?.sendOppRpc(null);
    }
  }

  onError(e: GiTcgError) {
    this.errorSseSource.next({ type: "error", message: e.message });
  }
  onInitialized(who: 0 | 1, game: InternalGame, oppPlayer: Player) {
    this._who = who;
    this._game = game;
    this._oppPlayer = oppPlayer;
    this.initializedSubject.next({
      type: "initialized",
      who,
      config: this._timeoutConfig,
      myPlayerInfo: this.playerInfo,
      oppPlayerInfo: oppPlayer.playerInfo,
    });
    this.initializedSubject.complete();
  }
  complete() {
    this.completeSubject.next();
  }
}

type GameStopHandler = (room: Room, game: InternalGame | null) => void;

enum RoomStatus {
  Waiting = "waiting",
  Playing = "playing",
  Finished = "finished",
}

interface RoomInfo {
  id: number;
  config: RoomConfig;
  status: RoomStatus;
  watchable: boolean;
  players: PlayerInfo[];
}

function sendDebugLog(name: string, message: any) {
  if (import.meta.env.DEBUG_LOG_RECEIVE_URL) {
    fetch(import.meta.env.DEBUG_LOG_RECEIVE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${name}.json"`,
      },
      body: JSON.stringify(message),
    })
      .then(() => {
        console.log(
          `Debug log ${name} sent to ${import.meta.env.DEBUG_LOG_RECEIVE_URL}`,
        );
      })
      .catch(() => ({}));
  }
}

class Room {
  public static readonly CORE_VERSION = CORE_VERSION;
  private game: InternalGame | null = null;
  private hostWho: 0 | 1;
  public readonly config: RoomConfig;
  private host: Player | null = null;
  private participant: Player | null = null;
  private stateLog: GameStateLogEntry[] = [];
  private terminated = false;
  private onStopHandlers: GameStopHandler[] = [];

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
    if (!this.game) {
      return RoomStatus.Waiting;
    }
    if (this.terminated) {
      return RoomStatus.Finished;
    }
    return RoomStatus.Playing;
  }

  setHost(player: Player) {
    if (this.host !== null) {
      throw new ConflictException("host already set");
    }
    this.host = player;
    return this.hostWho;
  }
  setParticipant(player: Player) {
    if (this.participant !== null) {
      throw new ConflictException("participant already set");
    }
    this.participant = player;
    return flip(this.hostWho);
  }
  start() {
    if (this.terminated) {
      throw new ConflictException("room terminated");
    }
    const [player0, player1] = this.players;
    if (player0 === null || player1 === null) {
      throw new ConflictException("player not ready");
    }
    let state: GameState;
    try {
      player0.setTimeoutConfig(this.config);
      player1.setTimeoutConfig(this.config);
      state = InternalGame.createInitialState({
        decks: [player0.playerInfo.deck, player1.playerInfo.deck],
        data: getData(this.config.gameVersion),
        versionBehavior: this.config.gameVersion,
      });
    } catch (e) {
      this.stop();
      throw new InternalServerErrorException(
        `Failed to create initial game state: ${e}; propably due to invalid decks`,
      );
    }
    const game = new InternalGame(state);
    game.onPause = async (state, mutations, canResume) => {
      this.stateLog.push({ state, canResume });
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
        if (e instanceof GiTcgError) {
          player0.onError(e);
          player1.onError(e);
          sendDebugLog("gameErrorLog", {
            em: e.message,
            gv: this.config.gameVersion,
            ...serializeGameStateLog(this.stateLog),
          });
        } else {
          throw e;
        }
      } finally {
        this.stop();
      }
    })();
  }

  giveUp(userId: PlayerId) {
    if (this.players[0]?.playerInfo.id === userId) {
      this.game?.giveUp(0);
    } else if (this.players[1]?.playerInfo.id === userId) {
      this.game?.giveUp(1);
    } else {
      throw new NotFoundException(`Player ${userId} not found`);
    }
  }

  stop() {
    this.terminated = true;
    this.players[0]?.complete();
    this.players[1]?.complete();
    for (const cb of this.onStopHandlers) {
      cb(this, this.game);
    }
  }

  onStop(cb: GameStopHandler) {
    this.onStopHandlers.push(cb);
  }

  getStateLog() {
    return {
      ...serializeGameStateLog(this.stateLog),
      gv: this.config.gameVersion,
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

@Injectable()
export class RoomsService {
  private logger = new Logger(RoomsService.name);

  private roomIdPool = toShuffled(Array.from({ length: 10000 }, (_, i) => i));
  private rooms = new Map<number, Room>();
  private shutdownResolvers: PromiseWithResolvers<void> | null = null;

  constructor(
    private users: UsersService,
    private decks: DecksService,
    private games: GamesService,
    private metrics: MetricsService,
  ) {
    this.metrics.setRoomMetricsProvider(() => this.getRoomMetricsSnapshot());
    const onShutdown = async () => {
      console.log(`Waiting for ${this.rooms.size} rooms to stop...`);
      if (!this.shutdownResolvers && this.rooms.size !== 0) {
        this.shutdownResolvers = Promise.withResolvers();
      }
      await this.shutdownResolvers?.promise;
      process.exit();
    };
    process.on("SIGINT", onShutdown);
    process.on("SIGTERM", onShutdown);
    process.on("SIGQUIT", onShutdown);
  }

  currentRoom(playerId: PlayerId) {
    for (const room of this.rooms.values()) {
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

  private getRoomMetricsSnapshot(): RoomMetricsSnapshot {
    const snapshot: RoomMetricsSnapshot = {
      activeRooms: 0,
      roomPlayers: 0,
      roomsByStatus: {
        waiting: 0,
        playing: 0,
        finished: 0,
      },
    };

    for (const room of this.rooms.values()) {
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

  async createRoomFromUser(userId: number, params: UserCreateRoomDto) {
    const user = await this.users.findById(userId);
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    if (this.currentRoom(userId) !== null) {
      throw new ConflictException(`User ${userId} is already in a room`);
    }
    const deck = await this.decks.getDeck(userId, params.hostDeckId);
    if (deck === null) {
      throw new NotFoundException(`Deck ${params.hostDeckId} not found`);
    }
    const playerInfo: PlayerInfo = {
      isGuest: false,
      id: userId,
      name: user.name ?? user.login,
      deck,
    };
    const room = await this.createRoom(playerInfo, params);
    return { room };
  }

  async createRoomFromGuest(params: GuestCreateRoomDto) {
    const playerId = createGuestId();
    const playerInfo: PlayerInfo = {
      isGuest: true,
      id: playerId,
      name: params.name,
      deck: params.deck,
      avatarUrl: params.avatarUrl,
    };
    const room = await this.createRoom(playerInfo, params);
    return {
      playerId,
      room,
    };
  }

  private async createRoom(playerInfo: PlayerInfo, params: CreateRoomDto) {
    let deploying = null;
    if (process.env.REDIS_URL) {
      deploying = await redis.get("meta:deploying");
    }
    if (this.shutdownResolvers || deploying !== null) {
      throw new ConflictException(
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
      if (semver.order(version, roomConfig.gameVersion) > 0) {
        throw new BadRequestException(
          `Deck version required ${version}, it's higher game version ${roomConfig.gameVersion}`,
        );
      }
    } catch (e) {
      if (e instanceof DeckVerificationError) {
        throw new BadRequestException(`Deck verification failed: ${e.message}`);
      } else {
        throw e;
      }
    }

    const roomId = this.roomIdPool[0];
    if (typeof roomId === "undefined") {
      throw new InternalServerErrorException("no room available");
    }
    const room = new Room(roomId, roomConfig);
    if (process.env.REDIS_URL) {
      await redis.hset("meta:active_rooms", roomId, JSON.stringify(roomConfig));
      await redis.hexpire(
        "meta:active_rooms",
        1 * 60 * 60,
        "FIELDS",
        1,
        roomId,
      );
    }
    this.rooms.set(roomId, room);
    this.roomIdPool.shift();
    this.metrics.incrementCreatedRooms();
    this.logger.log(`Room ${room.id} created, host is ${playerInfo.name}`);

    room.onStop(async (room, game) => {
      if (game) {
        this.metrics.incrementFinishedRooms();
      }
      let deploying = null;
      if (process.env.REDIS_URL) {
        deploying = await redis.get("meta:deploying");
      }
      const keepRoomDuration =
        (this.shutdownResolvers || deploying ? 1 : 5) * 60 * 1000;
      this.logger.log(
        `Room ${room.id} stopped, status ${room.status}, keep it for ${keepRoomDuration} ms`,
      );
      this.logger.log(`Room ${room.id} game phase: ${game?.state.phase}`);
      if (room.status !== RoomStatus.Waiting) {
        await new Promise((r) => setTimeout(r, keepRoomDuration));
      }
      this.logger.log(`Room ${room.id} removed`);
      if (process.env.REDIS_URL) {
        await redis.hdel("meta:active_rooms", room.id);
      }
      this.rooms.delete(room.id);
      this.roomIdPool.push(room.id);
      if (this.rooms.size === 0) {
        this.shutdownResolvers?.resolve();
      }
    });

    room.setHost(new Player(playerInfo));
    // 闲置五分钟后删除房间
    setTimeout(
      () => {
        if (room.status === RoomStatus.Waiting) {
          room.stop();
        }
      },
      5 * 60 * 1000,
    );
    return room.getRoomInfo();
  }

  deleteRoom(playerId: PlayerId, roomId: number) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException(
        `${roomId} has status ${room.status}, while only waiting room can be deleted`,
      );
    }
    if (room.getHost()?.playerInfo.id !== playerId) {
      throw new UnauthorizedException(`You are not the host of room ${roomId}`);
    }
    room.stop();
  }

  async joinRoomFromUser(userId: number, roomId: number, deckId: number) {
    const user = await this.users.findById(userId);
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const deck = await this.decks.getDeck(userId, deckId);
    if (deck === null) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }
    const playerInfo: PlayerInfo = {
      isGuest: false,
      id: userId,
      name: user.name ?? user.login,
      deck,
    };
    return this.joinRoom(playerInfo, roomId);
  }

  async joinRoomFromGuest(roomId: number, params: GuestJoinRoomDto) {
    const playerId = createGuestId();
    const playerInfo: PlayerInfo = {
      isGuest: true,
      id: playerId,
      name: params.name,
      deck: params.deck,
      avatarUrl: params.avatarUrl,
    };
    await this.joinRoom(playerInfo, roomId);
    return { playerId };
  }

  private async joinRoom(playerInfo: PlayerInfo, roomId: number) {
    const allRooms = this.getAllRooms(true);
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    if (room.status !== RoomStatus.Waiting) {
      throw new ConflictException(`Room ${roomId} is not waiting`);
    }
    if (playerInfo.isGuest && !room.config.allowGuest) {
      throw new UnauthorizedException(`Room ${roomId} does not allow guest`);
    }
    if (
      allRooms.some((room) => room.players.some((p) => p.id === playerInfo.id))
    ) {
      throw new ConflictException(
        `Player ${playerInfo.id} is already in a room`,
      );
    }

    try {
      const version = await verifyDeck(playerInfo.deck);
      if (semver.order(version, room.config.gameVersion) > 0) {
        throw new BadRequestException(
          `Deck version required ${version}, it's higher game version ${room.config.gameVersion}`,
        );
      }
    } catch (e) {
      if (e instanceof DeckVerificationError) {
        throw new BadRequestException(`Deck verification failed: ${e.message}`);
      } else {
        throw e;
      }
    }

    room.setParticipant(new Player(playerInfo));
    // Add to game database when room stopped
    room.onStop((room, game) => {
      if (!game) {
        return;
      }
      const players = room.getPlayers();
      if (players.some((p) => p.playerInfo.isGuest)) {
        return;
      }
      const playerIds = players.map(
        (player) => player.playerInfo.id,
      ) as number[];
      const winnerWho = game.state.winner;
      const winnerId = winnerWho === null ? null : playerIds[winnerWho]!;
      this.games.addGame({
        coreVersion: Room.CORE_VERSION,
        gameVersion: room.config.gameVersion,
        data: JSON.stringify(room.getStateLog()),
        winnerId,
        playerIds,
      });
    });
    room.start();
    this.metrics.incrementStartedRooms();
  }

  getRoom(roomId: number): RoomInfo {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    return room.getRoomInfo();
  }

  getRoomGameLog(playerId: PlayerId, roomId: number) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    if (room.status !== RoomStatus.Finished) {
      throw new ConflictException(`Room ${roomId} is not finished`);
    }
    if (
      room.config.watchable ||
      room.getPlayers().some((p) => p.playerInfo.id === playerId)
    ) {
      return room.getStateLog();
    } else {
      throw new UnauthorizedException(
        `Room ${roomId} is not watchable, and you are not in the room`,
      );
    }
  }

  getAllRooms(guest: boolean): RoomInfo[] {
    const result: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
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

  playerNotification(
    roomId: number,
    visitorPlayerId: PlayerId | null,
    watchingPlayerId: PlayerId,
  ): Observable<{ data: SSEPayload }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    const players = room.getPlayers();
    const playerUserIds = players.map((player) => player.playerInfo.id);
    if (!playerUserIds.includes(watchingPlayerId)) {
      throw new NotFoundException(`Player ${watchingPlayerId} not in room`);
    }
    if (!room.config.watchable && visitorPlayerId !== watchingPlayerId) {
      throw new UnauthorizedException(
        `Room ${roomId} cannot be watched by other`,
      );
    }
    if (
      (playerUserIds as (PlayerId | null)[]).includes(visitorPlayerId) &&
      visitorPlayerId !== watchingPlayerId
    ) {
      throw new UnauthorizedException(
        `You cannot watch ${watchingPlayerId}, he is your opponent!`,
      );
    }
    for (const player of players) {
      if (player.playerInfo.id === watchingPlayerId) {
        const observable = player.notificationSse$;
        return observable.pipe(
          finalize(() => {
            if (
              visitorPlayerId === watchingPlayerId &&
              room.status !== RoomStatus.Finished
            ) {
              this.logger.warn(
                `Player ${visitorPlayerId} disconnected from room ${roomId} while game not finished (status=${room.status})`,
              );
            }
          }),
          map((data) => ({ data })),
        );
      }
    }
    throw new InternalServerErrorException("unreachable");
  }

  receivePlayerResponse(
    roomId: number,
    playerId: PlayerId,
    response: PlayerActionResponseDto,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    const players = room.getPlayers();
    for (const player of players) {
      if (player.playerInfo.id === playerId) {
        player.receiveResponse(response);
        return;
      }
    }
    throw new NotFoundException(`Player ${playerId} not in room`);
  }

  receivePlayerGiveUp(roomId: number, playerId: PlayerId) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundException(`Room not found`);
    }
    room.giveUp(playerId);
  }
}
