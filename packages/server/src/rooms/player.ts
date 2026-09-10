import { createHash } from "node:crypto";
import { inspect } from "node:util";
import type {
  Game,
  Notification,
  PlayerIO,
  RpcRequest,
  RpcResponse,
} from "@gi-tcg/core";
import {
  Notification as PbNotification,
  RpcResponse as PbRpcResponse,
  RpcRequest as PbRpcRequest,
  dispatchRpc,
  DiceType,
} from "@gi-tcg/typings";
import { checkDice } from "@gi-tcg/utils";
import {
  RoomCommandError,
  type CommandAck,
  type Initialized,
  type PlayerInfo,
  type RoomConfig,
  type RoomEvent,
  type RoomSubscriber,
  type RpcTimer,
} from "./types";

const ACK_CACHE_LIMIT = 32;
const SUBSCRIBER_LIMIT = 16;
interface PendingRpc {
  id: number;
  request: RpcRequest;
  requestBytes: Uint8Array;
  timeout: number;
  totalTimeout: number;
  settle(response: RpcResponse): void;
  cancel(error: Error): void;
}

export class Player implements PlayerIO {
  private subscribers = new Set<RoomSubscriber>();
  private initialized: Initialized | null = null;
  private latestNotification: Extract<
    RoomEvent,
    { type: "notification" }
  > | null = null;
  private latestError: Extract<RoomEvent, { type: "error" }> | null = null;
  private completed = false;
  private nextRpcId = 0;
  private pending: PendingRpc | null = null;
  private accepted = new Map<number, { digest: string; ack: CommandAck }>();
  private timeoutConfig: RoomConfig | null = null;
  private roundTimeout = Infinity;
  private initialRoundTimeout = Infinity;
  private mutationExtraTimeout = 0;
  private contiguousTimeouts = 0;
  private opponent: Player | null = null;
  private game: Game | null = null;
  private who: 0 | 1 = 0;

  constructor(
    public readonly playerInfo: PlayerInfo,
    public readonly sessionId: string,
  ) {}

  subscribe(subscriber: RoomSubscriber): () => void {
    if (this.subscribers.size >= SUBSCRIBER_LIMIT)
      throw new Error("Too many room subscriptions");
    this.subscribers.add(subscriber);
    subscriber.send(this.initialized ?? { type: "waiting" });
    if (this.latestNotification) subscriber.send(this.latestNotification);
    if (this.latestError) subscriber.send(this.latestError);
    subscriber.send(this.currentAction());
    subscriber.send({
      type: "oppRpc",
      oppTimer: this.opponent?.getTimer() ?? null,
    });
    // A finished-room reconnect can still recover a lost final ACK. Keep it
    // writable until the client leaves or the ordinary room-retention expires.
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
  private emit(event: RoomEvent) {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.send(event);
      } catch {
        subscriber.close(1011, "DELIVERY_FAILED");
        this.subscribers.delete(subscriber);
      }
    }
  }
  setTimeoutConfig(config: RoomConfig) {
    this.timeoutConfig = config;
    this.initialRoundTimeout = this.roundTimeout = config.initTotalActionTime;
  }
  resetRoundTimeout() {
    this.initialRoundTimeout = this.roundTimeout =
      this.timeoutConfig?.roundTotalActionTime ?? Infinity;
  }
  currentAction(): RoomEvent {
    return this.pending
      ? {
          type: "rpc",
          data: {
            id: this.pending.id,
            request: this.pending.requestBytes,
            timer: this.getTimer()!,
          },
        }
      : { type: "rpc", data: null };
  }
  getTimer(): RpcTimer | null {
    return this.pending
      ? { current: this.pending.timeout, total: this.pending.totalTimeout }
      : null;
  }

  receiveResponse(id: number, bytes: Uint8Array): CommandAck {
    const digest = createHash("sha256").update(bytes).digest("hex");
    const old = this.accepted.get(id);
    if (old) {
      if (old.digest !== digest)
        throw new RoomCommandError(
          "CONFLICT",
          "RPC ID already accepted with different response bytes",
        );
      return old.ack;
    }
    const pending = this.pending;
    if (!pending || id !== pending.id) {
      if (id >= this.nextRpcId)
        throw new RoomCommandError("FUTURE_RPC", "RPC ID has not been issued");
      throw new RoomCommandError(
        "STALE_RPC",
        "RPC has finished and its acknowledgment is no longer retained; resynchronize",
      );
    }
    let response: RpcResponse;
    try {
      response = PbRpcResponse.decode(bytes);
      this.validateResponse(pending.request, response);
    } catch (error) {
      throw new RoomCommandError(
        "INVALID_RESPONSE",
        error instanceof Error ? error.message : "Invalid RPC response",
      );
    }
    const ack: CommandAck = {
      type: "ack",
      command: "actionResponse",
      id,
      sessionId: this.sessionId,
    };
    // Cache before resolving IO, in one synchronous turn. A second socket sees
    // the accepted ID even before the engine resumes from its awaited response.
    this.accepted.set(id, { digest, ack });
    while (this.accepted.size > ACK_CACHE_LIMIT)
      this.accepted.delete(this.accepted.keys().next().value!);
    pending.settle(response);
    return ack;
  }

  private validateResponse(request: RpcRequest, response: RpcResponse) {
    const req = request.request;
    const resp = response.response;
    if (!req || !resp || req.$case !== resp.$case)
      throw new Error("RPC response method mismatch");
    const own = this.game?.state.players[this.who];
    const assertAvailableDice = (dice: readonly number[]) => {
      const remaining = [...(own?.dice ?? [])] as number[];
      for (const die of dice) {
        const index = remaining.indexOf(die);
        if (index < 0) throw new Error("Selected dice are not available");
        remaining.splice(index, 1);
      }
    };
    switch (resp.$case) {
      case "chooseActive":
        if (
          req.$case !== "chooseActive" ||
          !req.value.candidateIds.includes(resp.value.activeCharacterId)
        )
          throw new Error("Active character is not an advertised candidate");
        break;
      case "selectCard":
        if (
          req.$case !== "selectCard" ||
          !req.value.candidateDefinitionIds.includes(
            resp.value.selectedDefinitionId,
          )
        )
          throw new Error("Selected card is not an advertised candidate");
        break;
      case "switchHands": {
        const ids = resp.value.removedHandIds;
        if (
          new Set(ids).size !== ids.length ||
          ids.some((id) => !own?.hands.some((card) => card.id === id))
        )
          throw new Error("Selected hand cards are not available");
        break;
      }
      case "rerollDice":
        assertAvailableDice(resp.value.diceToReroll);
        break;
      case "action": {
        if (req.$case !== "action")
          throw new Error("RPC response method mismatch");
        const selected = req.value.action[resp.value.chosenActionIndex];
        if (!selected || selected.validity !== 0 || !selected.action)
          throw new Error("Selected action is not legal");
        assertAvailableDice(resp.value.usedDice);
        if (
          !checkDice(
            new Map(
              selected.requiredCost.map(({ type, count }) => [
                type as number as DiceType,
                count,
              ]),
            ),
            resp.value.usedDice as number[] as DiceType[],
          )
        )
          throw new Error("Selected dice do not satisfy the action cost");
        if (
          selected.action.$case === "elementalTuning" &&
          !selected.action.value.allowTuningAnyDice &&
          (resp.value.usedDice[0] === DiceType.Omni ||
            resp.value.usedDice[0] === selected.action.value.targetDice)
        )
          throw new Error("Invalid elemental tuning die");
        break;
      }
    }
  }
  notify(notification: Notification) {
    this.latestNotification = {
      type: "notification",
      data: PbNotification.encode(notification).finish(),
    };
    this.emit(this.latestNotification);
    this.mutationExtraTimeout += 0.5 * notification.mutation.length;
  }
  sendOppRpc(oppTimer: RpcTimer | null) {
    this.emit({ type: "oppRpc", oppTimer });
  }
  private timeoutRpc(request: RpcRequest): Promise<RpcResponse> {
    if (this.playerInfo.isGuest && ++this.contiguousTimeouts >= 3) {
      this.game?.giveUp(this.who);
      return Promise.reject(
        new Error("Give up actions due to too many timeout of guest"),
      );
    }
    return dispatchRpc({
      action: async ({ action }) => ({
        chosenActionIndex: action.findIndex(
          (candidate) => candidate.action?.$case === "declareEnd",
        ),
        usedDice: [],
      }),
      chooseActive: async ({ candidateIds }) => ({
        activeCharacterId: candidateIds[0]!,
      }),
      rerollDice: async () => ({ diceToReroll: [] }),
      switchHands: async () => ({ removedHandIds: [] }),
      selectCard: async ({ candidateDefinitionIds }) => ({
        selectedDefinitionId: candidateDefinitionIds[0]!,
      }),
    })(request);
  }
  private clearPending(id: number) {
    if (this.pending?.id === id) this.pending = null;
  }
  async rpc(request: RpcRequest): Promise<RpcResponse> {
    if (this.completed) throw new Error("Game finished");
    if (this.pending) throw new Error("Player already has a pending RPC");
    const id = this.nextRpcId++;
    const reroll = request.request?.$case === "rerollDice";
    const actionTimeout = reroll
      ? (this.timeoutConfig?.rerollTime ?? Infinity)
      : (this.timeoutConfig?.actionTime ?? Infinity);
    const roundTimeout = this.roundTimeout;
    const totalTimeout = this.initialRoundTimeout + actionTimeout;
    const timeout =
      Math.ceil(this.mutationExtraTimeout) +
      actionTimeout +
      (reroll ? 0 : roundTimeout);
    const setRoundTimeout = (remain: number) => {
      if (!reroll) this.roundTimeout = Math.min(roundTimeout, remain + 1);
      this.mutationExtraTimeout = 0;
    };
    try {
      return await new Promise<RpcResponse>((resolve, reject) => {
        let settled = false;
        let timer: ReturnType<typeof setInterval>;
        const finish = (
          value?: RpcResponse,
          error?: Error,
          timedOut = false,
        ) => {
          if (settled) return;
          settled = true;
          clearInterval(timer);
          this.pending = null;
          setRoundTimeout(timedOut ? 0 : pending.timeout);
          if (!timedOut) this.contiguousTimeouts = 0;
          error ? reject(error) : resolve(value!);
        };
        const pending: PendingRpc = {
          id,
          request,
          requestBytes: PbRpcRequest.encode(request).finish(),
          timeout,
          totalTimeout,
          settle: (response) => finish(response),
          cancel: (error) => finish(undefined, error),
        };
        this.pending = pending;
        timer = setInterval(() => {
          pending.timeout--;
          if (pending.timeout <= -2) {
            clearInterval(timer);
            this.pending = null;
            this.timeoutRpc(request).then(
              (value) => finish(value, undefined, true),
              (error) => finish(undefined, error, true),
            );
          }
        }, 1000);
        this.emit(this.currentAction());
        this.opponent?.sendOppRpc(this.getTimer());
      });
    } finally {
      this.clearPending(id);
      this.emit({ type: "rpc", data: null });
      this.opponent?.sendOppRpc(null);
    }
  }
  onError(error: unknown) {
    this.latestError = { type: "error", message: inspect(error) };
    this.emit(this.latestError);
  }
  onInitialized(who: 0 | 1, game: Game, opponent: Player) {
    this.who = who;
    this.game = game;
    this.opponent = opponent;
    this.initialized = {
      type: "initialized",
      who,
      config: this.timeoutConfig,
      myPlayerInfo: this.playerInfo,
      oppPlayerInfo: opponent.playerInfo,
    };
    this.emit(this.initialized);
  }
  complete() {
    if (this.completed) return;
    this.completed = true;
    this.pending?.cancel(new Error("Game finished"));
    this.game = null;
    this.opponent = null;
    for (const subscriber of this.subscribers)
      subscriber.close(1000, "GAME_FINISHED");
    this.subscribers.clear();
  }
  dispose() {
    this.complete();
    for (const subscriber of this.subscribers)
      subscriber.close(1000, "ROOM_RELEASED");
    this.subscribers.clear();
    this.latestNotification = null;
    this.latestError = null;
    this.accepted.clear();
  }
}
