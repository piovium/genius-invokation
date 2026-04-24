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
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import "./stub.js";
// Encoding API is a WHATWG Living Standard.
// Not included in ECMA-262, so V8 doesn't support it. Add a polyfill for that.
import "fast-text-encoding";
import "core-js/es/promise/with-resolvers";
import "core-js/proposals/iterator-helpers";
import "core-js/proposals/explicit-resource-management";

import getData from "@gi-tcg/data";
import {
  RpcRequest,
  RpcResponse,
  Notification,
  PbPhaseType,
} from "@gi-tcg/typings";
import {
  CURRENT_VERSION,
  deserializeGameStateLog,
  GiTcgIoError,
  Game as InternalGame,
  runLegacyQuery,
  serializeGameStateLog,
  VERSIONS,
  type AnyState,
  type CreateInitialStateConfig,
  type DeckConfig,
  type GameState as InternalState,
  type Mutation,
  type Version,
} from "@gi-tcg/core";
import * as c from "./constant";
import { io } from "@gi-tcg/cbinding-io";

class GameCreateParameter {
  config: Omit<CreateInitialStateConfig, "decks" | "data" | "versionBehavior"> =
    {};
  decks: [DeckConfig, DeckConfig] = [
    {
      characters: [],
      cards: [],
    },
    {
      characters: [],
      cards: [],
    },
  ];
  dataVersion: Version | undefined = void 0;

  #assertNumber(value: unknown): asserts value is number {
    if (typeof value !== "number") {
      throw new Error(`Invalid value: ${value}`);
    }
  }

  setDeck(who: 0 | 1, characters_or_cards: 1 | 2, value: number[]) {
    if (who !== 0 && who !== 1) {
      throw new Error(`Invalid who: ${who}`);
    }
    if (characters_or_cards === c.GITCG_SET_DECK_CHARACTERS) {
      this.decks[who].characters = value;
    } else if (characters_or_cards === c.GITCG_SET_DECK_CARDS) {
      this.decks[who].cards = value;
    } else {
      throw new Error(`Invalid characters_or_cards: ${characters_or_cards}`);
    }
  }

  setAttribute(attribute: number, value: string | number) {
    switch (attribute) {
      case c.GITCG_ATTR_CREATEPARAM_DATA_VERSION: {
        if (VERSIONS.includes(value as any)) {
          this.dataVersion = value as Version;
        } else {
          throw new Error(`Invalid data version: ${value}`);
        }
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_RANDOM_SEED: {
        this.#assertNumber(value);
        this.config.randomSeed = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_INITIAL_HANDS_COUNT: {
        this.#assertNumber(value);
        this.config.initialHandsCount = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_HANDS_COUNT: {
        this.#assertNumber(value);
        this.config.maxHandsCount = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_ROUNDS_COUNT: {
        this.#assertNumber(value);
        this.config.maxRoundsCount = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_SUPPORTS_COUNT: {
        this.#assertNumber(value);
        this.config.maxSupportsCount = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_SUMMONS_COUNT: {
        this.#assertNumber(value);
        this.config.maxSummonsCount = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_INITIAL_DICE_COUNT: {
        this.#assertNumber(value);
        this.config.initialDiceCount = value;
        break;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_DICE_COUNT: {
        this.#assertNumber(value);
        this.config.maxDiceCount = value;
        break;
      }
      case c.GITCG_ATTR_CREATEPARAM_NO_SHUFFLE_0: {
        this.#assertNumber(value);
        this.decks[0].noShuffle = !!value;
        break;
      }
      case c.GITCG_ATTR_CREATEPARAM_NO_SHUFFLE_1: {
        this.#assertNumber(value);
        this.decks[1].noShuffle = !!value;
        break;
      }
      default: {
        throw new Error(`Invalid attribute: ${attribute}`);
      }
    }
  }

  createState(): State {
    if (this.decks[0].characters.length === 0) {
      throw new Error("Deck 0 has no characters");
    }
    if (this.decks[1].characters.length === 0) {
      throw new Error("Deck 1 has no characters");
    }
    return new State(
      InternalGame.createInitialState({
        ...this.config,
        data: getData(this.dataVersion),
        versionBehavior: this.dataVersion,
        decks: this.decks,
      }),
      this.dataVersion ?? CURRENT_VERSION,
    );
  }
}

class Entity {
  public readonly entity: AnyState;
  constructor(entity: AnyState) {
    this.entity = entity;
  }
  get type(): number {
    switch (this.entity.definition.type) {
      case "character":
        return c.GITCG_ENTITY_TYPE_CHARACTER;
      case "equipment":
        return c.GITCG_ENTITY_TYPE_EQUIPMENT;
      case "status":
        return c.GITCG_ENTITY_TYPE_STATUS;
      case "combatStatus":
        return c.GITCG_ENTITY_TYPE_COMBAT_STATUS;
      case "summon":
        return c.GITCG_ENTITY_TYPE_SUMMON;
      case "support":
        return c.GITCG_ENTITY_TYPE_SUPPORT;
      case "eventCard":
        return c.GITCG_ENTITY_TYPE_EVENT_CARD;
      case "attachment":
        return c.GITCG_ENTITY_TYPE_ATTACHMENT;
      default: {
        const _check: never = this.entity.definition;
        throw new Error(`Unreachable: invalid entity type`);
      }
    }
  }

  get definitionId() {
    return this.entity.definition.id;
  }

  get id() {
    return this.entity.id;
  }

  getVariable(name: string): number {
    const result = this.entity.variables[name];
    if (typeof result !== "number") {
      throw new Error(`Variable ${name} not found on entity id=${this.id}`);
    }
    return result;
  }
}

class State {
  public readonly state: InternalState;
  public readonly gameVersion: Version;
  constructor(state: InternalState, gameVersion: Version) {
    this.state = state;
    this.gameVersion = gameVersion;
  }

  toJson(): string {
    return JSON.stringify({
      gv: this.gameVersion,
      ...serializeGameStateLog([{ state: this.state, canResume: false }]),
    });
  }
  static fromJson(json: string): State {
    const parsed = JSON.parse(json);
    const { gv } = parsed;
    return new State(
      deserializeGameStateLog(getData(gv), parsed)[0]!.state,
      gv,
    );
  }
  query(who: 0 | 1, query: string): Entity[] {
    return runLegacyQuery(this.state, who, query).map((st) => new Entity(st));
  }
  getAttribute(attribute: number): number {
    switch (attribute) {
      case c.GITCG_ATTR_STATE_CONFIG_RANDOM_SEED: {
        return this.state.config.randomSeed;
      }
      case c.GITCG_ATTR_STATE_CONFIG_INITIAL_HANDS_COUNT: {
        return this.state.config.initialHandsCount;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_HANDS_COUNT: {
        return this.state.config.maxHandsCount;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_ROUNDS_COUNT: {
        return this.state.config.maxRoundsCount;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_SUPPORTS_COUNT: {
        return this.state.config.maxSupportsCount;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_SUMMONS_COUNT: {
        return this.state.config.maxSummonsCount;
      }
      case c.GITCG_ATTR_STATE_CONFIG_INITIAL_DICE_COUNT: {
        return this.state.config.initialDiceCount;
      }
      case c.GITCG_ATTR_STATE_CONFIG_MAX_DICE_COUNT: {
        return this.state.config.maxDiceCount;
      }
      case c.GITCG_ATTR_STATE_PHASE: {
        switch (this.state.phase) {
          case "initActives":
            return PbPhaseType.INIT_ACTIVES;
          case "initHands":
            return PbPhaseType.INIT_HANDS;
          case "roll":
            return PbPhaseType.ROLL;
          case "action":
            return PbPhaseType.ACTION;
          case "end":
            return PbPhaseType.END;
          case "gameEnd":
            return PbPhaseType.GAME_END;
          default:
            return -1;
        }
      }
      case c.GITCG_ATTR_STATE_ROUND_NUMBER: {
        return this.state.roundNumber;
      }
      case c.GITCG_ATTR_STATE_CURRENT_TURN: {
        return this.state.currentTurn;
      }
      case c.GITCG_ATTR_STATE_WINNER: {
        return this.state.winner ?? -1;
      }
      case c.GITCG_ATTR_STATE_PLAYER_DECLARED_END_0: {
        return +this.state.players[0].declaredEnd;
      }
      case c.GITCG_ATTR_STATE_PLAYER_DECLARED_END_1: {
        return +this.state.players[1].declaredEnd;
      }
      case c.GITCG_ATTR_STATE_PLAYER_HAS_DEFEATED_0: {
        return +this.state.players[0].hasDefeated;
      }
      case c.GITCG_ATTR_STATE_PLAYER_HAS_DEFEATED_1: {
        return +this.state.players[1].hasDefeated;
      }
      case c.GITCG_ATTR_STATE_PLAYER_CAN_CHARGED_0: {
        return +this.state.players[0].canCharged;
      }
      case c.GITCG_ATTR_STATE_PLAYER_CAN_CHARGED_1: {
        return +this.state.players[1].canCharged;
      }
      case c.GITCG_ATTR_STATE_PLAYER_CAN_PLUNGING_0: {
        return +this.state.players[0].canPlunging;
      }
      case c.GITCG_ATTR_STATE_PLAYER_CAN_PLUNGING_1: {
        return +this.state.players[1].canPlunging;
      }
      case c.GITCG_ATTR_STATE_PLAYER_LEGEND_USED_0: {
        return +this.state.players[0].legendUsed;
      }
      case c.GITCG_ATTR_STATE_PLAYER_LEGEND_USED_1: {
        return +this.state.players[1].legendUsed;
      }
      case c.GITCG_ATTR_STATE_PLAYER_SKIP_NEXT_TURN_0: {
        return +this.state.players[0].skipNextTurn;
      }
      case c.GITCG_ATTR_STATE_PLAYER_SKIP_NEXT_TURN_1: {
        return +this.state.players[1].skipNextTurn;
      }
      case c.GITCG_ATTR_STATE_PLAYER_DEFEATED_SWITCHING_0: {
        return +this.state.players[0].defeatedSwitching;
      }
      case c.GITCG_ATTR_STATE_PLAYER_DEFEATED_SWITCHING_1: {
        return +this.state.players[1].defeatedSwitching;
      }
      default: {
        throw new Error(`Invalid attribute: ${attribute}`);
      }
    }
  }
  getDice(who: 0 | 1): readonly number[] {
    return this.state.players[who].dice;
  }
}

export class Game {
  static CreateParameter = GameCreateParameter;
  static stateFromJson = State.fromJson.bind(State);

  #game: InternalGame;
  readonly id: number;
  readonly gameVersion: Version;

  constructor(id: number, state: State) {
    this.id = id;
    this.gameVersion = state.gameVersion;
    this.#game = new InternalGame(state.state);
    this.#game.onPause = (st, m, r) => this.#onPause(st, m, r);
    this.#game.onIoError = (e) => this.#onIoError(e);
    this.#game.players[0].io.notify = (data) => this.#notify(0, data);
    this.#game.players[1].io.notify = (data) => this.#notify(1, data);
    this.#game.players[0].io.rpc = (data) => this.#rpc(0, data);
    this.#game.players[1].io.rpc = (data) => this.#rpc(1, data);
  }

  #notify(who: 0 | 1, data: Notification) {
    io(
      this.id,
      c.GITCG_INTERNAL_IO_NOTIFICATION,
      who,
      Notification.encode(data).finish(),
    );
  }
  async #rpc(who: 0 | 1, data: RpcRequest): Promise<RpcResponse> {
    const response = io(
      this.id,
      c.GITCG_INTERNAL_IO_RPC,
      who,
      RpcRequest.encode(data).finish(),
    );
    return RpcResponse.decode(response);
  }

  // step is awaiting on this promise
  #stepResolvers = Promise.withResolvers();
  // pause is awaiting on this promise
  #stepDoneResolvers = Promise.withResolvers();

  #mutations: Mutation[] = [];
  async #onPause(
    state: InternalState,
    mutations: Mutation[],
    resumable: boolean,
  ) {
    this.#mutations = mutations;
    this.#resumable = resumable;
    this.#stepDoneResolvers = Promise.withResolvers();
    this.#stepResolvers.resolve();
    try {
      await this.#stepDoneResolvers.promise;
    } finally {
      this.#resumable = false;
    }
  }
  #encoder = new TextEncoder();
  async #onIoError(e: GiTcgIoError) {
    io(
      this.id,
      c.GITCG_INTERNAL_IO_ERROR,
      e.who,
      this.#encoder.encode(e.message),
    );
  }

  #status = c.GITCG_GAME_STATUS_NOT_STARTED;
  #error: unknown = null;
  #resumable = false;
  get state() {
    return new State(this.#game.state, this.gameVersion);
  }
  get winner(): number {
    return this.#game.state.winner ?? -1;
  }
  get status() {
    return this.#status;
  }
  get error() {
    return this.#error;
  }
  get resumable() {
    return this.#resumable;
  }
  get lastMutations() {
    return this.#mutations;
  }

  async step(): Promise<void> {
    switch (this.#status) {
      case c.GITCG_GAME_STATUS_NOT_STARTED: {
        this.#status = c.GITCG_GAME_STATUS_RUNNING;
        this.#game
          .start()
          .then((e) => {
            this.#status = c.GITCG_GAME_STATUS_FINISHED;
            this.#stepResolvers.resolve();
          })
          .catch((e) => {
            this.#status = c.GITCG_GAME_STATUS_ABORTED;
            this.#error = e;
            this.#stepResolvers.reject(e);
          });
      }
      case c.GITCG_GAME_STATUS_RUNNING: {
        this.#stepResolvers = Promise.withResolvers();
        this.#stepDoneResolvers.resolve();
        await this.#stepResolvers.promise;
      }
      case c.GITCG_GAME_STATUS_RUNNING: {
        return;
      }
      case c.GITCG_GAME_STATUS_ABORTED: {
        throw new Error("Game got aborted, cannot step");
      }
    }
  }

  getAttribute(attribute: number): number {
    switch (attribute) {
      case c.GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_0: {
        return +this.#game.players[0].config.allowTuningAnyDice;
      }
      case c.GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_1: {
        return +this.#game.players[1].config.allowTuningAnyDice;
      }
      case c.GITCG_ATTR_PLAYER_ALWAYS_OMNI_0: {
        return +this.#game.players[0].config.alwaysOmni;
      }
      case c.GITCG_ATTR_PLAYER_ALWAYS_OMNI_1: {
        return +this.#game.players[1].config.alwaysOmni;
      }
      default: {
        return this.state.getAttribute(attribute);
      }
    }
  }
  setAttribute(attribute: number, value: number) {
    switch (attribute) {
      case c.GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_0: {
        this.#game.players[0].config.allowTuningAnyDice = !!value;
        break;
      }
      case c.GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_1: {
        this.#game.players[1].config.allowTuningAnyDice = !!value;
        break;
      }
      case c.GITCG_ATTR_PLAYER_ALWAYS_OMNI_0: {
        this.#game.players[0].config.alwaysOmni = !!value;
        break;
      }
      case c.GITCG_ATTR_PLAYER_ALWAYS_OMNI_1: {
        this.#game.players[1].config.alwaysOmni = !!value;
        break;
      }
      default: {
        throw new Error(`Invalid attribute: ${attribute}`);
      }
    }
  }

  giveUp(who: 0 | 1) {
    this.#game.giveUp(who);
  }
}
