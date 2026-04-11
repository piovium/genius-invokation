// Copyright (C) 2024-2025 Guyutongxue
// Copyright (C) 2026 Piovium Labs
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

import { checkDice, flip } from "@gi-tcg/utils";
import {
  DiceType,
  type ExposedMutation,
  type RpcMethod,
  type DiceRequirement,
  PbPlayerStatus,
  type RpcRequestPayloadOf,
  type RpcResponsePayloadOf,
  createRpcRequest,
  type PbExposedMutation,
  unFlattenOneof,
  ActionValidity,
  type Deck,
} from "@gi-tcg/typings";
import {
  getDefaultGameConfig,
  getVersionBehavior,
  StateSymbol,
  stringifyState,
  type EntityState,
  type AnyState,
  type CharacterState,
  type EntityDefinition,
  type ErrorLevel,
  type ExtensionState,
  type GameConfig,
  type GameState,
  type PlayerState,
  type VersionBehavior,
} from "./base/state";
import { CURRENT_VERSION, type Version } from "./base/version";
import type { Mutation } from "./base/mutation";
import {
  type IoErrorHandler,
  type PauseHandler,
  exposeAction,
  exposeMutation,
  exposeState,
  verifyRpcResponse,
} from "./io";
import {
  elementOfCharacter,
  getActiveCharacterIndex,
  findReplaceAction,
  shuffle,
  sortDice,
  toSortedBy,
  isSkillDisabled,
  initiativeSkillsOfPlayer,
  getEntityArea,
  playSkillOfCard,
  type Writable,
  applyAutoSelectedDiceToAction,
  isChargedPlunging,
  applyAttachmentModifications,
} from "./utils";
import type { GameData } from "./builder/registry";
import {
  ActionEventArg,
  type ActionInfo,
  DisposeEventArg,
  type EventAndRequest,
  EventArg,
  ModifyRollEventArg,
  PlayCardEventArg,
  PlayerEventArg,
  type SkillInfo,
  UseSkillEventArg,
  type InitiativeSkillEventArg,
  defineSkillInfo,
} from "./base/skill";
import { runLegacyQuery } from "./query-legacy";
import {
  GiTcgCoreInternalError,
  GiTcgDataError,
  GiTcgError,
  GiTcgIoError,
} from "./error";
import { DetailLogType, DetailLogger } from "./log";
import { type GeneralSkillArg, SkillExecutor } from "./skill_executor";
import {
  type InternalNotifyOption,
  type InternalPauseOption,
  type MutatorConfig,
  type ReadonlyEventList,
  StateMutator,
} from "./mutator";
import { type ActionInfoWithModification, ActionPreviewer } from "./preview";
import { Player } from "./player";
import type { CharacterDefinition } from "./base/character";
import { $, runQuery, toExpression, type QueryFn } from "./query";
import type { IQuery } from "./query/utils";

export interface DeckConfig extends Deck {
  noShuffle?: boolean;
}

/** A helper class to iterate id when constructing initial state */
class IdIter {
  static readonly INITIAL_ID = -500000;
  #id = IdIter.INITIAL_ID;
  get id() {
    return this.#id--;
  }
}

/** 根据 deck 初始化玩家状态 */
function initPlayerState(
  who: 0 | 1,
  data: GameData,
  deck: DeckConfig,
  idIter: IdIter,
): PlayerState {
  let initialPile: readonly EntityDefinition[] = deck.cards.map((id) => {
    const def = data.entities.get(id);
    if (typeof def === "undefined") {
      throw new GiTcgDataError(`Unknown card id ${id}`);
    }
    return def;
  });
  const characterDefs: readonly CharacterDefinition[] = deck.characters.map(
    (id) => {
      const def = data.characters.get(id);
      if (typeof def === "undefined") {
        throw new GiTcgDataError(`Unknown character id ${id}`);
      }
      return def;
    },
  );
  if (!deck.noShuffle) {
    initialPile = shuffle(initialPile);
  }
  // 将秘传牌放在最前面
  const compFn = (def: EntityDefinition) => {
    if (def.tags.includes("legend")) {
      return 0;
    } else {
      return 1;
    }
  };
  initialPile = toSortedBy(initialPile, compFn);
  const characters: CharacterState[] = [];
  const pile: EntityState[] = [];
  for (const definition of characterDefs) {
    characters.push({
      [StateSymbol]: "character",
      id: idIter.id,
      definition,
      variables: Object.fromEntries(
        Object.entries(definition.varConfigs).map(
          ([name, { initialValue }]) => [name, initialValue],
        ),
      ) as any,
      entities: [],
    });
  }
  for (const definition of initialPile) {
    pile.push({
      [StateSymbol]: "entity",
      id: idIter.id,
      definition,
      variables: Object.fromEntries(
        Object.entries(definition.varConfigs).map(
          ([name, { initialValue }]) => [name, initialValue],
        ),
      ),
      attachments: [],
    });
  }
  return {
    [StateSymbol]: "player",
    who,
    activeCharacterId: 0,
    characters,
    initialPile,
    pile,
    hands: [],
    dice: [],
    combatStatuses: [],
    summons: [],
    supports: [],
    declaredEnd: false,
    canCharged: false,
    canPlunging: false,
    hasDefeated: false,
    legendUsed: false,
    skipNextTurn: false,
    defeatedSwitching: false,
    roundSkillLog: new Map(),
    phaseDamageLog: [],
    phaseReactionLog: [],
    removedEntities: [],
  };
}

export interface CreateInitialStateConfig
  extends Writable<Partial<GameConfig>> {
  versionBehavior?: VersionBehavior | Version;
  decks: readonly [DeckConfig, DeckConfig];
  data: GameData;
}

const VOID_1_DICE_REQUIREMENT: DiceRequirement = new Map([[DiceType.Void, 1]]);
const EMPTY_DICE_REQUIREMENT: DiceRequirement = new Map();

export class Game {
  private readonly logger: DetailLogger;

  private _terminated = false;
  private finishResolvers: PromiseWithResolvers<0 | 1 | null> | null = null;

  private readonly mutator: StateMutator;
  private readonly mutatorConfig: MutatorConfig;
  readonly players: readonly [Player, Player];

  public onPause: PauseHandler | null = null;
  public onIoError: IoErrorHandler | null = null;

  constructor(initialState: GameState) {
    this.logger = new DetailLogger();
    this.mutatorConfig = {
      logger: this.logger,
      onNotify: (opt) => this.mutatorNotifyHandler(opt),
      onPause: (opt) => this.mutatorPauseHandler(opt),
      howToChooseActive: (who, chs) => this.rpcChooseActive(who, chs),
      howToReroll: (who) => this.rpcReroll(who),
      howToSwitchHands: (who) => this.rpcSwitchHands(who),
      howToSelectCard: (who, cards) => this.rpcSelectCard(who, cards),
    };
    this.mutator = new StateMutator(initialState, this.mutatorConfig);
    this.players = [new Player(), new Player()];
    // this.initPlayerCards(0);
    // this.initPlayerCards(1);
  }

  static createInitialState(opt: CreateInitialStateConfig): GameState {
    const {
      decks,
      data,
      versionBehavior = CURRENT_VERSION,
      ...partialConfig
    } = opt;
    const extensions = data.extensions
      .values()
      .map<ExtensionState>((v) => ({
        [StateSymbol]: "extension",
        definition: v,
        state: v.initialState,
      }))
      .toArray();
    const config = mergeGameConfigWithDefault(partialConfig);
    const behavior =
      typeof versionBehavior === "string"
        ? getVersionBehavior(versionBehavior)
        : versionBehavior;
    const idIter = new IdIter();
    const state: GameState = {
      [StateSymbol]: "game",
      data,
      config,
      versionBehavior: behavior,
      players: [
        initPlayerState(0, data, decks[0], idIter),
        initPlayerState(1, data, decks[1], idIter),
      ],
      iterators: {
        random: config.randomSeed,
        id: idIter.id,
      },
      phase: "initHands",
      currentTurn: 0,
      roundNumber: 0,
      winner: null,
      extensions,
    };
    return state;
  }

  get config() {
    return this.state.config;
  }

  get detailLog() {
    return this.logger.getLogs();
  }

  get state() {
    return this.mutator.state;
  }

  mutate(mutation: Mutation) {
    if (!this._terminated) {
      this.mutator.mutate(mutation);
    }
  }

  query(who: 0 | 1, query: string | QueryFn | IQuery): AnyState[] {
    if (typeof query === "string") {
      return runLegacyQuery(this.state, who, query);
    }
    if (typeof query === "function") {
      return runQuery(this.state, who, query($));
    }
    if (toExpression in query) {
      return runQuery(this.state, who, query);
    }
    throw new GiTcgCoreInternalError(`Invalid query: ${String(query)}`);
  }

  // private lastNotifiedState: [string, string] = ["", ""];
  private notifyOneImpl(who: 0 | 1, opt: InternalNotifyOption) {
    const playerIo = this.players[who].io;
    const stateMutations = opt.stateMutations
      .map((m) => exposeMutation(who, m))
      .filter((em): em is ExposedMutation => !!em);
    const state = exposeState(who, opt.state);
    state.player[0].status = this.players[0].status;
    state.player[1].status = this.players[1].status;
    const mutation: PbExposedMutation[] = [
      ...stateMutations,
      ...opt.exposedMutations,
    ].map((m) => ({
      mutation: unFlattenOneof<PbExposedMutation["mutation"]>(m),
    }));
    playerIo.notify({ mutation, state });
  }
  private notifyOne(who: 0 | 1, mutation?: ExposedMutation, state?: GameState) {
    this.notifyOneImpl(who, {
      state: state ?? this.state,
      canResume: false,
      stateMutations: [],
      exposedMutations: mutation ? [mutation] : [],
    });
  }

  private async mutatorNotifyHandler(opt: InternalNotifyOption) {
    if (this._terminated) {
      return;
    }
    for (const i of [0, 1] as const) {
      this.notifyOneImpl(i, opt);
    }
  }
  private async mutatorPauseHandler(opt: InternalPauseOption) {
    if (this._terminated) {
      return;
    }
    const { state, canResume, stateMutations } = opt;
    await this.onPause?.(state, [...stateMutations], canResume);
    if (state.phase === "gameEnd") {
      this.gotWinner(state.winner);
    }
  }

  private async tryPhase(fn: (this: Game) => Promise<void>) {
    try {
      await fn.call(this);
    } catch (e) {
      if (e instanceof GiTcgError && this.config.errorLevel === "skipPhase") {
        // skip.
      } else {
        throw e;
      }
    }
  }

  async start(): Promise<0 | 1 | null> {
    if (this.finishResolvers !== null) {
      throw new GiTcgCoreInternalError(
        `Game already started. Please use a new Game instance instead of start multiple time.`,
      );
    }
    this.finishResolvers = Promise.withResolvers();
    this.logger.clearLogs();
    (async () => {
      try {
        await this.mutator.notifyAndPause({ force: true, canResume: true });
        while (!this._terminated) {
          switch (this.state.phase) {
            case "initHands":
              await this.tryPhase(this.initHands);
              break;
            case "initActives":
              await this.tryPhase(this.initActives);
              break;
            case "roll":
              await this.tryPhase(this.rollPhase);
              break;
            case "action":
              await this.tryPhase(this.actionPhase);
              break;
            case "end":
              await this.tryPhase(this.endPhase);
              break;
            default:
              break;
          }
          this.mutate({ type: "clearRemovedEntities" });
          this.mutate({ type: "clearPhaseLogs" });
          await this.mutator.notifyAndPause({ canResume: true });
        }
      } catch (e) {
        if (e instanceof GiTcgIoError) {
          this.onIoError?.(e);
          await this.gotWinner(flip(e.who));
        } else if (e instanceof GiTcgError) {
          this.finishResolvers?.reject(e);
        } else {
          let message = String(e);
          if (e instanceof Error) {
            message = e.message;
            if (e.stack) {
              message += "\n" + e.stack;
            }
          }
          this.finishResolvers?.reject(
            new GiTcgCoreInternalError(`Unexpected error: ` + message),
          );
        }
      }
    })();
    return this.finishResolvers.promise;
  }

  giveUp(who: 0 | 1) {
    this.gotWinner(flip(who));
  }

  /** 胜负已定，切换到 gameEnd 阶段 */
  private async gotWinner(winner: 0 | 1 | null) {
    if (this.state.phase !== "gameEnd") {
      this.mutate({
        type: "changePhase",
        newPhase: "gameEnd",
      });
      if (winner !== null) {
        this.mutate({
          type: "setWinner",
          winner,
        });
      }
      await this.mutator.notifyAndPause();
    }
    this.finishResolvers?.resolve(winner);
    if (!this._terminated) {
      this._terminated = true;
      Object.freeze(this);
    }
  }
  /** 强制终止游戏，不再进行额外改动 */
  terminate() {
    this.finishResolvers?.reject(
      new GiTcgCoreInternalError("User call terminate."),
    );
    if (!this._terminated) {
      this._terminated = true;
      Object.freeze(this);
    }
  }

  private setPlayerStatus(who: 0 | 1, method: RpcMethod | null) {
    let status;
    switch (method) {
      case "action":
        status = PbPlayerStatus.ACTING;
        break;
      case "chooseActive":
        status = PbPlayerStatus.CHOOSING_ACTIVE;
        break;
      case "selectCard":
        status = PbPlayerStatus.SELECTING_CARDS;
        break;
      case "rerollDice":
        status = PbPlayerStatus.REROLLING;
        break;
      case "switchHands":
        status = PbPlayerStatus.SWITCHING_HANDS;
        break;
      default:
        status = PbPlayerStatus.UNSPECIFIED;
    }
    // @ts-expect-error writing private props
    this.players[who]._status = status;
    this.mutator.notify({
      mutations: [
        {
          $case: "playerStatusChange",
          who,
          status,
        },
      ],
    });
  }

  private async rpc<M extends RpcMethod>(
    who: 0 | 1,
    method: M,
    request: RpcRequestPayloadOf<M>,
  ): Promise<RpcResponsePayloadOf<M>> {
    if (this._terminated) {
      throw new GiTcgCoreInternalError(`Game has been terminated`);
    }
    try {
      this.setPlayerStatus(who, method);
      const resp = await this.players[who].io.rpc(
        createRpcRequest(method, request as any),
      );
      const { value } = resp.response!;
      verifyRpcResponse(method, value);
      return value;
    } catch (e) {
      if (e instanceof Error) {
        throw new GiTcgIoError(who, e.message, { cause: e?.cause });
      } else {
        throw new GiTcgIoError(who, String(e));
      }
    } finally {
      this.setPlayerStatus(who, null);
    }
  }

  private async initHands() {
    using l = this.mutator.subLog(DetailLogType.Phase, `In initHands phase:`);
    for (const who of [0, 1] as const) {
      const events = this.mutator.drawCardsPlain(
        who,
        this.config.initialHandsCount,
      );
      await this.handleEvents(events);
    }
    await this.mutator.notifyAndPause();
    const events = (
      await Promise.all([
        this.mutator.switchHands(0),
        this.mutator.switchHands(1),
      ])
    ).flat(1);
    await this.handleEvents(events);
    this.mutate({
      type: "changePhase",
      newPhase: "initActives",
    });
  }

  private async initActives() {
    using l = this.mutator.subLog(DetailLogType.Phase, `In initActive phase:`);
    const [a0, a1] = await Promise.all([
      this.mutator.chooseActive(0),
      this.mutator.chooseActive(1),
    ]);
    this.mutator.postChooseActive(a0, a1);
    await this.switchActive(0, a0, null);
    await this.switchActive(1, a1, null);
    await this.handleEvent("onBattleBegin", new EventArg(this.state));
    this.mutate({
      type: "changePhase",
      newPhase: "roll",
    });
    this.mutate({
      type: "stepRound",
    });
  }

  private async rpcChooseActive(
    who: 0 | 1,
    candidateIds: number[],
  ): Promise<number> {
    const { activeCharacterId } = await this.rpc(who, "chooseActive", {
      candidateIds,
    });
    if (!candidateIds.includes(activeCharacterId)) {
      throw new GiTcgIoError(
        who,
        `Invalid active character id ${activeCharacterId}`,
      );
    }
    this.notifyOne;
    return activeCharacterId;
  }

  private async rollPhase() {
    using l = this.mutator.subLog(
      DetailLogType.Phase,
      `In roll phase (round ${this.state.roundNumber}):`,
    );
    await this.handleEvent("onRoundBegin", new EventArg(this.state));
    // onRoll event
    interface RollParams {
      fixed: readonly DiceType[];
      count: number;
    }
    const rollParams: RollParams[] = [];
    for (const who of [0, 1] as const) {
      const rollModifier = new ModifyRollEventArg(this.state, who);
      await this.handleEvent("modifyRoll", rollModifier);
      rollParams.push({
        fixed: rollModifier._fixedDice,
        count: 1 + rollModifier._extraRerollCount,
      });
    }

    await Promise.all(
      ([0, 1] as const).map(async (who) => {
        const { fixed, count } = rollParams[who];
        const initDice = sortDice(this.state.players[who], [
          ...fixed,
          ...this.mutator.randomDice(
            Math.max(0, this.config.initialDiceCount - fixed.length),
            this.players[who].config.alwaysOmni,
          ),
        ]);
        this.mutate({
          type: "resetDice",
          who,
          value: initDice,
          reason: "roll",
        });
        this.notifyOne(who);
        await this.mutator.reroll(who, count);
      }),
    );
    this.mutate({
      type: "changePhase",
      newPhase: "action",
    });
    await this.handleEvent("onActionPhase", new EventArg(this.state));
  }
  private async actionPhase() {
    const who = this.state.currentTurn;
    // 使用 getter 防止状态变化后原有 player 过时的问题
    const player = () => this.state.players[who];
    const activeCh = () =>
      player().characters[getActiveCharacterIndex(player())];
    this.mutate({
      type: "setPlayerFlag",
      who,
      flagName: "canCharged",
      value: player().dice.length % 2 === 0,
    });
    if (player().declaredEnd) {
      this.mutate({
        type: "switchTurn",
      });
    } else if (player().skipNextTurn) {
      this.mutate({
        type: "setPlayerFlag",
        who,
        flagName: "skipNextTurn",
        value: false,
      });
      this.mutate({
        type: "switchTurn",
      });
    } else {
      using l = this.mutator.subLog(
        DetailLogType.Phase,
        `In action phase (round ${this.state.roundNumber}, turn ${this.state.currentTurn}):`,
      );
      await this.handleEvent(
        "onBeforeAction",
        new PlayerEventArg(this.state, who),
      );
      // A test reported that there do have a clearPhaseLog between onBeforeAction and action.
      // See packages/test/__tests__/superconduct_blessing.test.tsx involving Heizou's one
      this.mutate({ type: "clearPhaseLogs" });
      const replaceActionEventArg = new PlayerEventArg(this.state, who);
      const replacedSkill = findReplaceAction(
        this.state,
        replaceActionEventArg,
      );
      if (replacedSkill) {
        this.mutator.log(
          DetailLogType.Other,
          `Found replaced action from ${stringifyState(replacedSkill.caller)}`,
        );
        await this.executeSkill(replacedSkill, replaceActionEventArg);
        this.mutate({
          type: "switchTurn",
        });
      } else {
        const actions = await this.availableActions();
        const { chosenActionIndex, usedDice } = await this.rpc(who, "action", {
          action: actions.map(exposeAction),
        });
        if (chosenActionIndex < 0 || chosenActionIndex >= actions.length) {
          throw new GiTcgIoError(who, `User chosen index out of range`);
        }
        const actionInfo = actions[chosenActionIndex];
        if (actionInfo.validity !== ActionValidity.VALID) {
          throw new GiTcgIoError(
            who,
            `User-selected action is invalid: ${
              ActionValidity[actionInfo.validity]
            }`,
          );
        }
        await this.handleEvent("modifyAction0", actionInfo.eventArg);
        await this.handleEvent("modifyAction1", actionInfo.eventArg);
        await this.handleEvent("modifyAction2", actionInfo.eventArg);
        await this.handleEvent("modifyAction3", actionInfo.eventArg);
        await this.handleEvent("modifyAction4", actionInfo.eventArg);

        // 检查骰子
        if (!checkDice(actionInfo.cost, usedDice as DiceType[])) {
          throw new GiTcgIoError(
            who,
            `Selected dice doesn't meet requirement:\nRequired: ${JSON.stringify(
              Object.fromEntries(actionInfo.cost.entries()),
            )}, selected: ${JSON.stringify(usedDice)}`,
          );
        }
        if (
          !this.players[who].config.allowTuningAnyDice &&
          actionInfo.type === "elementalTuning" &&
          (usedDice[0] === DiceType.Omni || usedDice[0] === actionInfo.result)
        ) {
          throw new GiTcgIoError(
            who,
            `Elemental tuning cannot use omni dice or active character's element`,
          );
        }
        // 消耗骰子
        const operatingDice = [...player().dice];
        for (const type of usedDice) {
          const idx = operatingDice.indexOf(type as DiceType);
          if (idx === -1) {
            throw new GiTcgIoError(
              who,
              `Selected dice ${type} doesn't found in player`,
            );
          }
          operatingDice.splice(idx, 1);
        }
        this.mutate({
          type: "resetDice",
          who,
          value: operatingDice,
          reason: "consume",
        });
        // 消耗能量
        const requiredEnergy = actionInfo.cost.get(DiceType.Energy) ?? 0;
        const currentEnergy = activeCh().variables.energy;
        if (requiredEnergy > 0) {
          if (currentEnergy < requiredEnergy) {
            throw new GiTcgIoError(
              who,
              `Active character does not have enough energy`,
            );
          }
          this.mutate({
            type: "modifyEntityVar",
            state: activeCh(),
            varName: "energy",
            value: currentEnergy - requiredEnergy,
            direction: "decrease",
          });
        }

        switch (actionInfo.type) {
          case "useSkill": {
            const callerArea = getEntityArea(this.state, activeCh().id);
            await this.handleEvent(
              "onBeforeUseSkill",
              new UseSkillEventArg(this.state, callerArea, actionInfo.skill),
            );
            await this.executeSkill(actionInfo.skill, {
              targets: actionInfo.targets,
            });
            await this.handleEvent(
              "onUseSkill",
              new UseSkillEventArg(this.state, callerArea, actionInfo.skill),
            );
            break;
          }
          case "playCard": {
            const card = actionInfo.skill.caller;
            if (card.definition.tags.includes("legend")) {
              this.mutate({
                type: "setPlayerFlag",
                who,
                flagName: "legendUsed",
                value: true,
              });
            }
            await this.handleEvent(
              "onBeforePlayCard",
              new PlayCardEventArg(this.state, actionInfo),
            );
            // 无效化
            if (actionInfo.willBeEffectless) {
              this.mutate({
                type: "removeEntity",
                from: { who, type: "hands", cardId: card.id },
                oldState: card,
                reason: "eventCardPlayNoEffect",
              });
            } else {
              await this.executeSkill(actionInfo.skill, {
                targets: actionInfo.targets,
              });
            }
            await this.handleEvent(
              "onPlayCard",
              new PlayCardEventArg(this.state, actionInfo),
            );
            break;
          }
          case "switchActive": {
            await this.switchActive(who, actionInfo.to, actionInfo.fast);
            break;
          }
          case "elementalTuning": {
            const tuneCardEventArg = new DisposeEventArg(
              this.state,
              actionInfo.card,
              "elementalTuning",
              { who, type: "hands", cardId: actionInfo.card.id },
              null,
            );
            this.mutate({
              type: "removeEntity",
              from: { who, type: "hands", cardId: actionInfo.card.id },
              oldState: actionInfo.card,
              reason: "elementalTuning",
            });
            const targetDice = actionInfo.result;
            this.mutate({
              type: "resetDice",
              who,
              value: sortDice(player(), [...player().dice, targetDice]),
              reason: "elementalTuning",
              conversionTargetHint: targetDice,
            });
            await this.handleEvent("onDispose", tuneCardEventArg);
            break;
          }
          case "declareEnd": {
            this.mutate({
              type: "setPlayerFlag",
              who,
              flagName: "declaredEnd",
              value: true,
            });
            break;
          }
        }
        await this.handleEvent(
          "onAction",
          new ActionEventArg(this.state, actionInfo),
        );
        if (!actionInfo.fast) {
          this.mutate({
            type: "switchTurn",
          });
        }
      }
    }
    if (
      this.state.players[0].declaredEnd &&
      this.state.players[1].declaredEnd
    ) {
      this.mutate({
        type: "changePhase",
        newPhase: "end",
      });
      // 进入结束阶段时，清空双方的宣布结束 flag。
      // 这会完全模拟“看到那小子挣钱”在结束阶段仍然触发生骰的行为
      // 也会保证“自由的新风”在结束阶段可以生效使下回合连续行动一次
      // 参见 test package 的 fresh_wind_of_freedom.test.tsx
      for (const who of [0, 1] as const) {
        this.mutate({
          type: "setPlayerFlag",
          who,
          flagName: "declaredEnd",
          value: false,
        });
      }
    }
  }
  private async endPhase() {
    using l = this.mutator.subLog(
      DetailLogType.Phase,
      `In end phase (round ${this.state.roundNumber}, turn ${this.state.currentTurn}):`,
    );
    await this.handleEvent("onEndPhase", new EventArg(this.state));
    for (const who of [this.state.currentTurn, flip(this.state.currentTurn)]) {
      const events = this.mutator.drawCardsPlain(who, 2);
      await this.handleEvents(events);
    }
    await this.handleEvent("onRoundEnd", new EventArg(this.state));
    for (const who of [0, 1] as const) {
      for (const flagName of ["hasDefeated", "canPlunging"] as const) {
        this.mutate({
          type: "setPlayerFlag",
          who,
          flagName,
          value: false,
        });
      }
    }
    this.mutate({
      type: "clearRoundLogs",
    });
    this.mutate({
      type: "stepRound",
    });
    if (this.state.roundNumber >= this.config.maxRoundsCount) {
      this.gotWinner(null);
    } else {
      this.mutate({
        type: "changePhase",
        newPhase: "roll",
      });
    }
  }

  async availableActions(): Promise<ActionInfoWithModification[]> {
    const who = this.state.currentTurn;
    const player = this.state.players[who];
    const activeCh = player.characters[getActiveCharacterIndex(player)];
    const result: ActionInfo[] = [];

    // Skills
    const skillDisabled = isSkillDisabled(activeCh);
    for (const { caller, skill } of initiativeSkillsOfPlayer(player)) {
      const { charged, plunging } = isChargedPlunging(skill, player);
      const skillInfo = defineSkillInfo({
        caller,
        definition: skill,
        charged,
        plunging,
      });
      const actionInfoBase = {
        type: "useSkill" as const,
        who,
        skill: skillInfo,
        targets: [],
        fast: skill.initiativeSkillConfig.shouldFast,
        cost: skill.initiativeSkillConfig.requiredCost,
        autoSelectedDice: [],
      };
      if (skillDisabled) {
        const fakeActionInfo: ActionInfo = {
          ...actionInfoBase,
          validity: ActionValidity.DISABLED,
        };
        result.push(fakeActionInfo);
        continue;
      }
      const allTargets = (0, skill.initiativeSkillConfig.getTarget)(
        this.state,
        skillInfo,
      );
      if (allTargets.length === 0) {
        const fakeActionInfo: ActionInfo = {
          ...actionInfoBase,
          validity: ActionValidity.NO_TARGET,
        };
        result.push(fakeActionInfo);
        continue;
      }
      for (const arg of allTargets) {
        if (!(0, skill.filter)(this.state, skillInfo, arg)) {
          const fakeActionInfo: ActionInfo = {
            ...actionInfoBase,
            validity: ActionValidity.CONDITION_NOT_MET,
          };
          result.push(fakeActionInfo);
          continue;
        }
        const actionInfo: ActionInfo = {
          ...actionInfoBase,
          targets: arg.targets,
          validity: ActionValidity.VALID,
        };
        result.push(actionInfo);
      }
    }

    // Cards & Elemental Tuning
    const defaultTunedToType = elementOfCharacter(activeCh.definition);
    for (const card of player.hands) {
      let allTargets: InitiativeSkillEventArg[];
      const {
        disableTuning,
        willBeEffectless,
        shouldFast,
        requiredCost,
        tunedToType = defaultTunedToType,
      } = applyAttachmentModifications(this.state, card);
      const skillDef = playSkillOfCard(card.definition);
      if (skillDef) {
        const skillInfo = defineSkillInfo({
          caller: card,
          definition: skillDef,
        });
        const actionInfoBase = {
          type: "playCard" as const,
          who,
          skill: skillInfo,
          cost: requiredCost,
          fast: shouldFast,
          autoSelectedDice: [],
          targets: [],
          willBeEffectless,
        };
        // 当支援区满时，卡牌目标为“要离场的支援牌”
        if (
          card.definition.type === "support" &&
          player.supports.length === this.state.config.maxSupportsCount
        ) {
          allTargets = player.supports.map((st) => ({ targets: [st] }));
        } else {
          allTargets = (0, skillDef.initiativeSkillConfig.getTarget)(
            this.state,
            skillInfo,
          );
        }
        if (allTargets.length === 0) {
          const fakeActionInfo: ActionInfo = {
            ...actionInfoBase,
            validity: ActionValidity.NO_TARGET,
          };
          result.push(fakeActionInfo);
        } else {
          for (const arg of allTargets) {
            if (!(0, skillDef.filter)(this.state, skillInfo, arg)) {
              const fakeActionInfo: ActionInfo = {
                ...actionInfoBase,
                validity: ActionValidity.CONDITION_NOT_MET,
              };
              result.push(fakeActionInfo);
              continue;
            }
            const actionInfo: ActionInfo = {
              ...actionInfoBase,
              targets: arg.targets,
              validity: ActionValidity.VALID,
            };
            result.push(actionInfo);
          }
        }
      } else {
        console?.warn?.(`Card ${card.definition.id} has no play skill defined.`);
      }

      result.push({
        type: "elementalTuning" as const,
        card,
        who,
        result: tunedToType,
        fast: true,
        cost: VOID_1_DICE_REQUIREMENT,
        autoSelectedDice: [],
        validity: disableTuning
          ? ActionValidity.DISABLED
          : ActionValidity.VALID,
      });
    }

    // Switch Active
    result.push(
      ...player.characters
        .filter((ch) => ch.variables.alive && ch.id !== activeCh.id)
        .map((ch) => ({
          type: "switchActive" as const,
          who,
          from: activeCh,
          to: ch,
          fromReaction: false,
          fast: false,
          cost: VOID_1_DICE_REQUIREMENT,
          autoSelectedDice: [],
          validity: ActionValidity.VALID,
        })),
    );

    // Declare End
    result.push({
      type: "declareEnd",
      who,
      fast: false,
      cost: EMPTY_DICE_REQUIREMENT,
      autoSelectedDice: [],
      validity: ActionValidity.VALID,
    });

    // Add preview and apply modifyAction
    const skipError = (
      ["toleratePreview", "skipPhase"] as ErrorLevel[]
    ).includes(this.config.errorLevel);
    const previewer = new ActionPreviewer(this.state, who, skipError);
    return await Promise.all(
      result.map((a) =>
        previewer
          .modifyAndPreview(a)
          .then((a) =>
            applyAutoSelectedDiceToAction(a, player, this.players[who].config),
          ),
      ),
    );
  }

  private async rpcSwitchHands(who: 0 | 1) {
    const { removedHandIds } = await this.rpc(who, "switchHands", {});
    this.notifyOne(who, {
      $case: "switchHandsDone",
      who,
      count: removedHandIds.length,
    });
    this.notifyOne(flip(who), {
      $case: "switchHandsDone",
      who,
      count: removedHandIds.length,
    });
    return removedHandIds;
  }

  private async rpcReroll(who: 0 | 1) {
    const { diceToReroll } = await this.rpc(who, "rerollDice", {});
    this.notifyOne(who, {
      $case: "rerollDone",
      who,
      count: diceToReroll.length,
    });
    this.notifyOne(flip(who), {
      $case: "rerollDone",
      who,
      count: 0,
    });
    return diceToReroll;
  }

  private async rpcSelectCard(who: 0 | 1, candidateDefinitionIds: number[]) {
    const { selectedDefinitionId } = await this.rpc(who, "selectCard", {
      candidateDefinitionIds,
    });
    if (!candidateDefinitionIds.includes(selectedDefinitionId)) {
      throw new GiTcgIoError(who, `Selected card not in candidates`);
    }
    this.notifyOne(who, {
      $case: "selectCardDone",
      who,
      selectedDefinitionId,
    });
    this.notifyOne(flip(who), {
      $case: "selectCardDone",
      who,
      selectedDefinitionId: 0,
    });
    return selectedDefinitionId;
  }

  private async switchActive(
    who: 0 | 1,
    to: CharacterState,
    fast: boolean | null,
  ) {
    const events = this.mutator.switchActive(who, to, { fast });
    await this.handleEvents(events);
  }

  private async executeSkill(skillInfo: SkillInfo, arg: GeneralSkillArg) {
    await SkillExecutor.executeSkill(this.mutator, skillInfo, arg);
  }
  private async handleEvent(...args: EventAndRequest) {
    await SkillExecutor.handleEvent(this.mutator, ...args);
  }
  private async handleEvents(events: ReadonlyEventList) {
    await SkillExecutor.handleEvents(this.mutator, events);
  }
}

export function mergeGameConfigWithDefault(
  config?: Partial<GameConfig>,
): GameConfig {
  config = JSON.parse(JSON.stringify(config ?? {}));
  return {
    ...getDefaultGameConfig(),
    ...config,
  };
}
