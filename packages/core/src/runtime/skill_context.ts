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

import { Aura, DamageType, DiceType, Reaction } from "@gi-tcg/typings";

import {
  type EntityArea,
  type EntityDefinition,
  type EntityTag,
  type EntityType,
  stringifyEntityArea,
} from "../base/entity";
import type { MoveEntityM, Mutation, RemoveEntityM } from "../base/mutation";
import {
  type VariableValueChangeInfo,
  type DamageInfo,
  DamageOrHealEventArg,
  type EventAndRequest,
  type EventAndRequestConstructorArgs,
  type EventAndRequestNames,
  type HealKind,
  type StateMutationAndExposedMutation,
  type SkillDescriptionReturn,
  type PlayCardTarget,
  constructEventAndRequestArg,
  type UseSkillRequestOption,
  BeforeVariableEventArg,
  ZeroHealthEventArg,
  ReactionEventArg,
  type CoreSkillResult,
  HandCardInsertedEventArg,
  type SkillInfo,
  type SkillContextOptions,
  type SkillDescription,
} from "../base/skill";
import {
  type CharacterState as CharacterStateO,
  type EntityState as EntityStateO,
  type AttachmentState as AttachmentStateO,
  type GameData,
  type GameState,
  type PhaseType,
  type PlayerState,
  stringifyState,
} from "../base/state";
import {
  getEntityArea,
  getEntityById,
  diceCostSizeOfCard,
  isCharacterInitiativeSkill,
  sortDice,
  type PlainCharacterState,
  type PlainEntityState,
  type PlainAnyState,
  type ExPlainEntityState,
  type PlainAttachmentState,
} from "./reactive/utils";
import type {
  AppliableDamageType,
  CardHandle,
  CharacterHandle,
  CombatStatusHandle,
  ExtensionHandle,
  HandleT,
  ExEntityType,
  SkillHandle,
  StatusHandle,
  SummonHandle,
  EquipmentHandle,
  AttachmentHandle,
} from "../data/type";
import { CALLED_FROM_REACTION } from "../reaction";
import { flip, toSortedBy } from "@gi-tcg/utils";
import { GiTcgDataError, GiTcgPreviewAbortedError } from "../error";
import { DetailLogType } from "../log";
import {
  EventList,
  type InsertPileStrategy,
  type InternalHealOption,
  type InternalNotifyOption,
  type MutatorConfig,
  type ReadonlyEventList,
  StateMutator,
} from "../mutator";
import { type Draft, type Immutable, produce } from "immer";
import type { CustomEvent } from "../base/custom_event";
import {
  applyReactive,
  getRaw,
  type ApplyReactive,
  type RxEntityState,
} from "./reactive";
import { ReactiveStateSymbol } from "./reactive/base";
import { computeConvertDice, type CreateEntityOptions } from "../utils";
import { VARIABLE_NAME_CAN_EMIT_EVENTS } from "./skill";
import type { LunarReaction } from "@gi-tcg/typings";
import {
  $,
  runQuery,
  toExpression,
  type IDollar,
  type InferResult,
  type IQuery,
  type QueryFn,
} from "../query";
import type { NotFunctionPrototype } from "../query/utils";

type GeneralQueryTargetArg = IQuery | QueryFn;
type CharacterTargetArg =
  PlainCharacterState | PlainCharacterState[] | GeneralQueryTargetArg;
type EntityTargetArg =
  PlainEntityState | PlainEntityState[] | GeneralQueryTargetArg;

type EntityDefinitionFilterFn = (card: EntityDefinition) => boolean;

interface MaxCostHandsOpt {
  who?: "my" | "opp";
  filter?: (card: PlainEntityState) => boolean;
}

interface DrawCardsOpt {
  who?: "my" | "opp";
  /** 抽取带有特定标签的牌 */
  withTag?: EntityTag | null;
  /** 抽取带有特定附着效果的牌 */
  withAttachment?: AttachmentHandle | null;
  /** 抽取选定定义的牌。设置此选项会忽略 withTag */
  withDefinition?: CardHandle | null;
}

export const ENABLE_SHORTCUT = Symbol("withShortcut");

export interface HealOption {
  kind?: HealKind;
}

export interface DisposeOption {
  reason?: RemoveEntityM["reason"];
  /**
   * 是否直接弃置。
   *
   * 默认情况下，在弃置目标有 usage 的前提下，会先清空 usage 后再弃置，从而正确触发那夏镇等；
   * 在部分系统内置结算中（如弃置已有支援区实体以打出支援牌时）不适用，此时需设置 `direct: true`
   */
  direct?: boolean;
}

export interface GenerateDiceOption {
  randomIncludeOmni?: boolean;
  randomAllowDuplicate?: boolean;
}

export interface IncreaseMaxHealthOption {
  /**
   * 是否同时治疗
   * @default true
   */
  heal?: boolean;
}

type Setter<T> = (draft: Draft<T>) => void;

export type CallingAreaType = "onStage" | "offStage" | "disposed";

export type ContextMetaBase = {
  readonly: boolean;
  eventArgType: unknown;
  callerVars: string;
  callerType: ExEntityType;
  callingArea: CallingAreaType;
  associatedExtension: ExtensionHandle;
  gtsSnippets: Record<string, unknown>;
};

type MutatorResultCanEmit =
  ReadonlyEventList | { readonly events: ReadonlyEventList };

type MutatorMethodCanEmitImpl<K extends keyof StateMutator> =
  StateMutator[K] extends (...args: any[]) => MutatorResultCanEmit ? K : never;

type MutatorMethodCanEmit = {
  [K in keyof StateMutator]: MutatorMethodCanEmitImpl<K>;
}[keyof StateMutator];

type CallAndEmitResult<K extends MutatorMethodCanEmit> =
  ReturnType<StateMutator[K]> extends { readonly events: ReadonlyEventList }
    ? Omit<ReturnType<StateMutator[K]>, "events">
    : ReturnType<StateMutator[K]> extends ReadonlyEventList
      ? void
      : never;

/**
 * GTS 中，用于描述技能的上下文对象。
 * 使用 `SkillContext.encapsulate` 创建的技能描述函数会在执行时创建一个 `SkillContext` 实例供使用。
 */
export class SkillContext<Meta extends ContextMetaBase> {
  private readonly mutator: StateMutator;
  public readonly eventArg: ApplyReactive<
    Meta,
    Omit<Meta["eventArgType"], `_${string}`>
  >;

  /** @internal */
  public readonly _reactiveProxies = new Map<
    object,
    ReturnType<typeof Proxy.revocable>
  >();

  private readonly processedEvents: EventAndRequest[] = [];
  private currentEvents = new EventList();
  private causeDefeated = false;
  private mainDamage: DamageInfo | null = null;
  private readonly areaCache = new Map<number, EntityArea>();

  /**
   * 获取正在执行逻辑的实体的 `Character` 或 `Entity`。
   * @returns
   */
  private readonly _self: RxEntityState<Meta, Meta["callerType"]>;

  /** @internal */
  public _getEntityArea(id: number): EntityArea {
    let area = this.areaCache.get(id);
    if (!area) {
      area = getEntityArea(this.rawState, id);
      this.areaCache.set(id, area);
    }
    return area;
  }

  private invalidateAreaCache(state: PlainAnyState) {
    this.areaCache.delete(state.id);
    for (const entity of "entities" in state ? state.entities : []) {
      this.invalidateAreaCache(entity);
    }
    for (const attachment of "attachments" in state ? state.attachments : []) {
      this.invalidateAreaCache(attachment);
    }
  }

  private afterMutation(mutation: Mutation) {
    if (mutation.type === "moveEntity") {
      this.invalidateAreaCache(mutation.value);
    } else if (mutation.type === "removeEntity") {
      this.invalidateAreaCache(mutation.oldState);
    }
  }

  // GTS support
  public get e() {
    return this.eventArg;
  }

  /**
   *
   * @param state 触发此技能之前的游戏状态
   * @param skillInfo
   */
  constructor(
    state: GameState,
    public readonly skillInfo: SkillInfo,
    eventArg: Meta["eventArgType"],
    public readonly options: Immutable<SkillContextOptions>,
  ) {
    const mutatorConfig: MutatorConfig = {
      logger: skillInfo.logger,
      onNotify: (opt) => this.onNotify(opt),
      onPause: () =>
        Promise.reject(
          new GiTcgDataError(`Async operation is not permitted in skill`),
        ),
      onMutation: (mutation) => this.afterMutation(mutation),
      onResetState: () => this.areaCache.clear(),
    };
    this.mutator = new StateMutator(state, mutatorConfig);
    this.eventArg = applyReactive(this, eventArg);
    this._self = applyReactive(this, this.skillInfo.caller) as RxEntityState<
      Meta,
      Meta["callerType"]
    >;
    this.callSnippet = new Proxy(
      (arg: any) => this._callSnippetByName("default", arg),
      {
        get: (target, prop) => {
          if (typeof prop !== "string") {
            throw new GiTcgDataError(`Invalid snippet name ${String(prop)}`);
          }
          return (arg: any) => {
            this._callSnippetByName(prop, arg);
          };
        },
      },
    ) as typeof this.callSnippet;
  }

  static encapsulate<Meta extends ContextMetaBase>(
    options: Immutable<SkillContextOptions>,
    action: (
      context: SkillContext<Meta>,
      rawArgs: Parameters<SkillDescription<Meta["eventArgType"]>>,
    ) => void,
  ): SkillDescription<Meta["eventArgType"]> {
    return function (...rawArgs) {
      const context = new SkillContext(...rawArgs, options);
      try {
        action(context, rawArgs);
        return context.terminate();
      } catch (e) {
        return context.terminate(e);
      }
    };
  }
  static encapsulateForRet<Ret, Meta extends ContextMetaBase>(
    options: Immutable<SkillContextOptions>,
    action: (
      context: SkillContext<Meta>,
      rawArgs: Parameters<SkillDescription<Meta["eventArgType"]>>,
    ) => Ret,
  ): (
    state: GameState,
    skillInfo: SkillInfo,
    eventArg: Meta["eventArgType"],
  ) => Ret {
    return function (...rawArgs) {
      const context = new SkillContext(...rawArgs, options);
      return action(context, rawArgs);
    };
  }

  /**
   * 对技能返回的事件列表预处理。
   */
  private preprocessEvent(): CoreSkillResult {
    const emittedEvents: EventAndRequest[] = [];

    const failedPlayers = new Set<0 | 1>();
    let causeDefeated = false;

    const otherEvents: EventAndRequest[] = [];
    const hciEvents: Extract<
      EventAndRequest,
      ["onHandCardInserted", unknown]
    >[] = [];
    const safeDamageEvents: EventAndRequest[] = [];
    const criticalDamageEvents: EventAndRequest[] = [];
    // 将 currentEvents 分类
    // - 对于 damage，先判断：
    //   - 若可能击倒但应用 modifyZeroHealth 后免于被击倒，则内联执行后
    //     将事件继续添加到 currentEvents 中（通常仅有治疗事件）
    //   - 若确实击倒切无法被免于被击倒，则归类为 criticalDamageEvents，
    //     否则归类为 safeDamageEvents
    // - 对于 HCI，删去目标已被舍弃的事件，其余归入 hciEvents
    // - 其余类型归类为 otherEvents
    for (const event of this.currentEvents) {
      const [name, arg] = event;
      if (name === "onDamageOrHeal" && arg.isDamageTypeDamage()) {
        if (arg.damageInfo.causeDefeated) {
          // Wrap original EventArg to ZeroHealthEventArg
          const zeroHealthEventArg = new ZeroHealthEventArg(
            arg.onTimeState,
            arg.damageInfo,
            arg.option,
          );
          this.currentEvents.push(
            ...this.mutator.handleInlineEvent(
              this.skillInfo,
              "modifyZeroHealth",
              zeroHealthEventArg,
            ),
          );
          if (!zeroHealthEventArg._immuneInfo) {
            const defeatedCh = this.get(arg.target);
            if (defeatedCh.variables.alive) {
              this.mutator.log(
                DetailLogType.Primitive,
                `${stringifyState(
                  defeatedCh,
                )} is defeated (and no immune available)`,
              );
              this.mutate({
                type: "modifyEntityVar",
                state: defeatedCh.latest(),
                varName: "alive",
                value: 0,
                direction: "decrease",
              });
              const energyVarName =
                defeatedCh.definition.specialEnergy?.variableName ?? "energy";
              this.mutate({
                type: "modifyEntityVar",
                state: defeatedCh.latest(),
                varName: energyVarName,
                value: 0,
                direction: "decrease",
              });
              this.mutate({
                type: "modifyEntityVar",
                state: defeatedCh.latest(),
                varName: "aura",
                value: Aura.None,
                direction: null,
              });
              this.mutate({
                type: "setPlayerFlag",
                who: defeatedCh.who,
                flagName: "hasDefeated",
                value: true,
              });
              this.mutate({
                type: "removeRoundSkillLog",
                caller: defeatedCh.latest(),
              });
              const player = this.state.players[defeatedCh.who];
              const aliveCharacters = player.characters.filter(
                (ch) => ch.variables.alive,
              );
              if (aliveCharacters.length === 0) {
                failedPlayers.add(defeatedCh.who);
              }
            }
            criticalDamageEvents.push(event);
          } else {
            safeDamageEvents.push(["onDamageOrHeal", zeroHealthEventArg]);
          }
        } else {
          safeDamageEvents.push(event);
        }
      } else if (name === "onHandCardInserted") {
        let shouldEmitHci: boolean;
        if (arg.overflowed) {
          shouldEmitHci = true;
        } else {
          const area = this.get(arg.card).area;
          shouldEmitHci = area.who === arg.who && area.type === "hands";
        }
        if (shouldEmitHci) {
          hciEvents.push(event);
        }
      } else {
        otherEvents.push(event);
      }
    }

    if (this.rawState.config.hostRelatedExecution) {
      const cards = [
        ...this.rawState.players[this.rawState.config.hostWho].hands,
        ...this.rawState.players[flip(this.rawState.config.hostWho)].hands,
      ];
      const indexOfHciEvent = (e: HandCardInsertedEventArg) => {
        const index = cards.findIndex((c) => c.id === e.card.id);
        if (index === -1) {
          return Number.POSITIVE_INFINITY;
        }
        return index;
      };
      hciEvents.sort(([, a], [, b]) => indexOfHciEvent(a) - indexOfHciEvent(b));
    }

    emittedEvents.push(
      ...otherEvents,
      ...hciEvents,
      ...safeDamageEvents,
      ...criticalDamageEvents,
    );
    causeDefeated ||= criticalDamageEvents.length > 0;

    if (failedPlayers.size === 2) {
      this.mutator.log(
        DetailLogType.Other,
        `Both player has no alive characters, set winner to null`,
      );
      this.mutate({
        type: "changePhase",
        hasChange: true,
        newPhase: "gameEnd",
      });
    } else if (failedPlayers.size === 1) {
      const who = [...failedPlayers.values()][0];
      this.mutator.log(
        DetailLogType.Other,
        `player ${who} has no alive characters, set winner to ${flip(who)}`,
      );
      this.mutate({
        type: "changePhase",
        hasChange: true,
        newPhase: "gameEnd",
      });
      this.mutate({
        type: "setWinner",
        winner: flip(who),
      });
    }

    return { emittedEvents, causeDefeated };
  }

  /**
   * 技能执行完毕，发出通知，禁止后续改动。
   */
  private terminate(error: unknown = null): SkillDescriptionReturn {
    this.eventBoundary();
    this.mutator.notify();
    Object.freeze(this.processedEvents);
    Object.freeze(this);
    const resultState = this.rawState;
    for (const [, { revoke }] of this._reactiveProxies) {
      revoke();
    }
    return [
      resultState,
      {
        emittedEvents: this.processedEvents,
        innerNotify: this._savedNotify,
        error,
        mainDamage: this.mainDamage,
        causeDefeated: this.causeDefeated,
      },
    ];
  }

  private readonly _savedNotify: StateMutationAndExposedMutation = {
    stateMutations: [],
    exposedMutations: [],
  };

  // 将技能中引发的通知保存下来，最后调用 terminate 时返回
  private onNotify(opt: InternalNotifyOption): void {
    this._savedNotify.stateMutations.push(...opt.stateMutations);
    this._savedNotify.exposedMutations.push(...opt.exposedMutations);
  }

  mutate(mut: Mutation) {
    return this.mutator.mutate(mut);
  }

  get self() {
    return this._self;
  }

  get isPreview(): boolean {
    return this.skillInfo.environment === "preview";
  }

  get state(): ApplyReactive<Meta, GameState> {
    return applyReactive(this, this.mutator.state);
  }
  /** @internal */
  get rawState(): GameState {
    return this.mutator.state;
  }
  get player(): ApplyReactive<Meta, PlayerState> {
    return this.state.players[this.self.who];
  }
  get oppPlayer(): ApplyReactive<Meta, PlayerState> {
    return this.state.players[flip(this.self.who)];
  }
  private getRawPlayer(where: "my" | "opp"): PlayerState {
    const who = where === "my" ? this.self.who : flip(this.self.who);
    return this.rawState.players[who];
  }

  get roundNumber(): number {
    return this.rawState.roundNumber;
  }
  get phase(): PhaseType {
    return this.rawState.phase;
  }
  get data(): GameData {
    return this.rawState.data;
  }

  isMyTurn() {
    return this.rawState.currentTurn === this.self.who;
  }

  query<const Q extends IQuery>(
    arg: (($: IDollar) => Q) | Q,
  ): RxEntityState<Meta, InferResult<Q>["type"]> | undefined {
    const results = this.queryAll(arg);
    return results[0];
  }

  queryAll<const Q extends IQuery>(
    arg: (($: IDollar) => Q) | Q,
  ): RxEntityState<Meta, InferResult<Q>["type"]>[] {
    if (!(toExpression in arg)) {
      arg = arg($);
    }
    return runQuery(this.rawState, this.self.who, arg).map((state) =>
      this.get(state),
    );
  }

  get<T extends ExEntityType>(id: number): RxEntityState<Meta, T>;
  get<T extends ExEntityType>(
    rxState: RxEntityState<Meta, T>,
  ): RxEntityState<Meta, T>;
  get(state: PlainEntityState): ApplyReactive<Meta, EntityStateO>;
  get(state: PlainCharacterState): ApplyReactive<Meta, CharacterStateO>;
  get(state: PlainAttachmentState): ApplyReactive<Meta, AttachmentStateO>;
  get<T extends ExEntityType>(
    state: ExPlainEntityState<T>,
  ): RxEntityState<Meta, T>;
  get(x: number | PlainAnyState): unknown {
    if (typeof x === "number") {
      return applyReactive(this, getEntityById(this.rawState, x));
    }
    if (ReactiveStateSymbol in x) {
      return x;
    }
    return applyReactive(this, x);
  }

  private queryOrGet<TypeT extends ExEntityType>(
    q:
      | ExPlainEntityState<TypeT>
      | ExPlainEntityState<TypeT>[]
      | GeneralQueryTargetArg,
  ): RxEntityState<Meta, TypeT>[] {
    if (Array.isArray(q)) {
      return q.map((s) => this.get(s));
    } else if (typeof q === "function" || toExpression in q) {
      return this.queryAll(q) as RxEntityState<Meta, TypeT>[];
    } else {
      return [this.get(q)];
    }
  }

  private queryCoerceToCharacters(
    arg: CharacterTargetArg,
  ): RxEntityState<Meta, "character">[] {
    const result = this.queryOrGet(arg);
    for (const r of result) {
      if (r.definition.type !== "character") {
        throw new GiTcgDataError(
          `Expected character target, but query ${arg} found noncharacter entities`,
        );
      }
    }
    return result as RxEntityState<Meta, "character">[];
  }

  getExtensionState(): Meta["associatedExtension"]["type"] {
    if (typeof this.options.associatedExtensionId === "undefined") {
      throw new GiTcgDataError("No associated extension registered");
    }
    const ext = this.state.extensions.find(
      (ext) => ext.definition.id === this.options.associatedExtensionId,
    );
    if (!ext) {
      throw new GiTcgDataError("Associated extension not found");
    }
    return getRaw(ext).state;
  }
  /** 本回合已使用多少次本技能（仅限角色主动技能）。 */
  countOfSkill(): number;
  /**
   * 本回合我方 `characterId` 角色已使用了多少次技能 `skillId`。
   *
   * `characterId` 是定义 id 而非实体 id。
   */
  countOfSkill(characterId: CharacterHandle, skillId: SkillHandle): number;
  countOfSkill(characterId?: number, skillId?: number): number {
    characterId ??= this.self.definition.id;
    skillId ??= this.skillInfo.definition.id;
    return (
      this.player.roundSkillLog.get(characterId)?.filter((e) => e === skillId)
        .length ?? 0
    );
  }

  hasPhaseDamage(
    scope: "my" | "all",
    filter: (e: DamageOrHealEventArg<DamageInfo>) => boolean = () => true,
  ): boolean {
    const damages =
      scope === "my"
        ? this.getRawPlayer("my").phaseDamageLog
        : [
            ...this.getRawPlayer("my").phaseDamageLog,
            ...this.getRawPlayer("opp").phaseDamageLog,
          ];
    return damages.some(
      (d) =>
        d instanceof DamageOrHealEventArg &&
        d.isDamageTypeDamage() &&
        filter(d),
    );
  }
  hasPhaseReaction(
    scope: "my" | "all",
    filter: (e: ReactionEventArg) => boolean = () => true,
  ): boolean {
    const reactions =
      scope === "my"
        ? this.getRawPlayer("my").phaseReactionLog
        : [
            ...this.getRawPlayer("my").phaseReactionLog,
            ...this.getRawPlayer("opp").phaseReactionLog,
          ];
    return reactions.some((r) => r instanceof ReactionEventArg && filter(r));
  }

  /**
   * 某方玩家手牌，并按照元素骰费用降序排序
   * @param who 我方还是对方
   */
  private costSortedHands({
    who = "my",
    filter = () => true,
  }: MaxCostHandsOpt): RxEntityState<Meta, EntityType>[] {
    const player = who === "my" ? this.player : this.oppPlayer;
    const sortData = new Map(
      this.getRawPlayer(who).hands.map(
        (c) => [c.id, { cost: -diceCostSizeOfCard(this.rawState, c) }] as const,
      ),
    );
    return toSortedBy(
      player.hands.filter(filter),
      (card) => sortData.get(card.id)!.cost,
    );
  }

  /** 我方或对方当前元素骰费用最多的 `count` 张手牌 */
  maxCostHands(
    count: number,
    opt: MaxCostHandsOpt = {},
  ): RxEntityState<Meta, EntityType>[] {
    return this.costSortedHands(opt).slice(0, count);
  }

  isInInitialPile(card: PlainEntityState, who: "my" | "opp" = "my"): boolean {
    const defId = card.definition.id;
    const player = this.getRawPlayer(who);
    return player.initialPile.some((c) => c.id === defId);
  }

  /** 我方或对方支援区剩余空位 */
  remainingSupportCount(who: "my" | "opp" = "my"): number {
    const player = who === "my" ? this.player : this.oppPlayer;
    return this.state.config.maxSupportsCount - player.supports.length;
  }

  /**
   * 返回所有行动牌（指定类别/标签或自定义 filter）；通常用于随机选取其中一张。
   */
  allCardDefinitions(
    filterArg?: EntityTag | EntityType | EntityDefinitionFilterFn,
  ): EntityDefinition[] {
    const filterFn: EntityDefinitionFilterFn =
      typeof filterArg === "undefined"
        ? (c) => true
        : typeof filterArg === "function"
          ? filterArg
          : ["eventCard", "support", "equipment"].includes(filterArg)
            ? (c) => c.type === filterArg
            : (c) => c.tags.includes(filterArg as EntityTag);
    return this.state.data.entities
      .values()
      .filter((c) => {
        if (!c.obtainable) {
          return false;
        }
        return filterFn(c);
      })
      .toArray();
  }

  // MUTATIONS

  private get events() {
    return this.currentEvents;
  }

  eventBoundary() {
    const { emittedEvents, causeDefeated } = this.preprocessEvent();
    this.processedEvents.push(...emittedEvents);
    this.causeDefeated ||= causeDefeated;
    this.currentEvents = new EventList();
  }

  emitEvent<E extends EventAndRequestNames>(
    event: E,
    ...args: EventAndRequestConstructorArgs<E>
  ) {
    const arg = constructEventAndRequestArg(event, ...args);
    this.mutator.log(
      DetailLogType.Other,
      `Event ${event} (${arg.toString()}) emitted`,
    );
    this.events.push([event, arg] as EventAndRequest);
  }

  // 等效调用 this.mutator.<method>, 并将返回的 events 添加
  callAndEmit<K extends MutatorMethodCanEmit>(
    method: K,
    ...args: Parameters<StateMutator[K]>
  ): CallAndEmitResult<K> {
    const fn: any = this.mutator[method].bind(this.mutator);
    const result = fn(...args);
    if ("events" in result && Array.isArray(result.events)) {
      this.events.push(...result.events);
    } else if (Array.isArray(result)) {
      this.events.push(...result);
    }
    return result as any;
  }

  emitCustomEvent(event: CustomEvent<void>): void;
  emitCustomEvent<T, U extends T & { [ReactiveStateSymbol]?: never }>(
    event: CustomEvent<T>,
    arg: U, // forbidden reactive
  ): void;
  emitCustomEvent<T>(event: CustomEvent<T>, arg?: T) {
    this.emitEvent(
      "onCustomEvent",
      this.rawState,
      this.self.latest(),
      event,
      arg,
    );
  }

  abortPreview() {
    if (this.isPreview) {
      throw new GiTcgPreviewAbortedError();
    }
  }

  /** Call snippet passed in from GTS side */
  declare callSnippet: {
    (
      arg: Meta["gtsSnippets"] extends { default: infer DefaultT }
        ? DefaultT
        : never,
    ): void;
  } & {
    [T in keyof Meta["gtsSnippets"]]: (arg: Meta["gtsSnippets"][T]) => void;
  } & NotFunctionPrototype;

  private _callSnippetByName(name: string, arg: any) {
    const snippet = this.options.gtsSnippets.get(name);
    if (!snippet) {
      throw new GiTcgDataError(`Snippet ${name} not found`);
    }
    const previousEventArg = this.eventArg;
    Reflect.set(this, "eventArg", arg);
    snippet(this);
    Reflect.set(this, "eventArg", previousEventArg);
  }

  switchActive(target: CharacterTargetArg) {
    const targets = this.queryCoerceToCharacters(target);
    if (targets.length === 0) {
      return;
    }
    if (targets.length > 1) {
      throw new GiTcgDataError(
        "Expected exactly one target when switching active",
      );
    }
    const switchToTarget = targets[0];
    this.callAndEmit(
      "switchActive",
      switchToTarget.who,
      switchToTarget.latest(),
      {
        via: this.skillInfo,
        fromReaction: this.fromReaction,
      },
    );
  }

  gainEnergy(value: number, target: CharacterTargetArg) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      const target = t.latest();
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Gain ${value} energy to ${stringifyState(target)}`,
      );
      const { energy, maxEnergy } = target.variables;
      const finalValue = Math.min(value, maxEnergy - energy);
      this.mutate({
        type: "modifyEntityVar",
        state: target,
        varName: "energy",
        value: energy + finalValue,
        direction: "increase",
      });
    }
  }

  /** 治疗角色 */
  heal(
    value: number,
    target: CharacterTargetArg,
    { kind = "common" }: Partial<InternalHealOption> = {},
  ) {
    const targets = this.queryCoerceToCharacters(target);
    for (const target of targets) {
      this.callAndEmit("heal", value, target.latest(), {
        via: this.skillInfo,
        kind,
      });
    }
  }

  immune(newHealth: number) {
    if (!(this.eventArg instanceof ZeroHealthEventArg)) {
      throw new GiTcgDataError(
        `The .immune() must be called in .on("beforeDefeated")`,
      );
    }
    this.mutator.log(
      DetailLogType.Primitive,
      `Immune character to ${newHealth} health`,
    );
    const target = this.get(this.eventArg.damageInfo.target).latest();
    this.callAndEmit("heal", newHealth, target, {
      via: this.skillInfo,
      kind: "immuneDefeated",
    });
    this.eventArg.markImmune();
  }

  /** 增加最大生命值 */
  increaseMaxHealth(
    value: number,
    target: CharacterTargetArg,
    { heal = true }: IncreaseMaxHealthOption = {},
  ) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      const target = t.latest();
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Increase ${value} max health to ${stringifyState(target)} ${
          heal ? "and heal" : ""
        }`,
      );
      this.mutate({
        type: "modifyEntityVar",
        state: target,
        varName: "maxHealth",
        value: target.variables.maxHealth + value,
        direction: "increase",
      });
      if (heal) {
        // t.latest() here for grabbing the new maxHealth
        this.callAndEmit("heal", value, t.latest(), {
          via: this.skillInfo,
          kind: "increaseMaxHealth",
        });
      }
    }
  }

  // 发生在A玩家头上的反应是否转换为月反应需要看B玩家的角色有没有启用
  private getEnabledLunarReactions(targetWho: 0 | 1): LunarReaction[] {
    const lunarLookupWho = flip(targetWho);
    return this.state.players[lunarLookupWho].characters.flatMap(
      (ch) => ch.definition.enabledLunarReactions,
    );
  }

  damage(
    type: DamageType,
    value: number,
    target: CharacterTargetArg = $.opp.active,
  ) {
    if (type === DamageType.Heal) {
      return this.heal(value, target);
    }
    const targets = this.queryCoerceToCharacters(target);
    for (const target of targets) {
      let isSkillMainDamage = false;
      if (
        isCharacterInitiativeSkill(this.skillInfo, true) &&
        !this.fromReaction &&
        !this.mainDamage &&
        type !== DamageType.Piercing
      ) {
        isSkillMainDamage = true;
      }
      const { aura, alive, health } = target.variables;
      let damageInfo: DamageInfo = {
        source: this.skillInfo.caller,
        target: target.latest(),
        targetAura: aura,
        type,
        value,
        via: this.skillInfo,
        isSkillMainDamage,
        causeDefeated: !!alive && health <= value,
        fromReaction: this.fromReaction,
      };
      const { damageInfo: damageInfo2 } = this.callAndEmit(
        "damage",
        damageInfo,
        {
          via: this.skillInfo,
          callerWho: this.self.who,
          targetWho: target.who,
          targetIsActive: target.isActive(),
          enabledLunarReactions: this.getEnabledLunarReactions(target.who),
        },
      );
      if (isSkillMainDamage) {
        this.mainDamage = damageInfo2;
      }
    }
  }

  /**
   * 为某角色附着元素。
   * @param type 附着的元素类型
   * @param target 角色目标
   */
  apply(type: AppliableDamageType, target: CharacterTargetArg) {
    const characters = this.queryCoerceToCharacters(target);
    for (const ch of characters) {
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Apply [damage:${type}] to ${stringifyState(ch)}`,
      );
      this.callAndEmit("apply", ch.latest(), type, {
        fromDamage: null,
        via: this.skillInfo,
        callerWho: this.self.who,
        targetWho: ch.who,
        targetIsActive: ch.isActive(),
        enabledLunarReactions: this.getEnabledLunarReactions(ch.who),
      });
    }
  }

  /** 清除角色身上的元素附着 */
  cleanAura(what: Aura | "all", target: CharacterTargetArg) {
    if (what === Aura.None) {
      throw new GiTcgDataError(`Invalid: cleaning Aura.None`);
    }
    const characters = this.queryCoerceToCharacters(target);
    for (const ch of characters) {
      let newAura = ch.aura;
      if (what === "all" || ch.aura === what) {
        newAura = Aura.None;
      } else if (ch.aura === Aura.CryoDendro) {
        if (what === Aura.Cryo) {
          newAura = Aura.Dendro;
        } else if (what === Aura.Dendro) {
          newAura = Aura.Cryo;
        }
      }
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Clean aura [aura:${what}] from ${stringifyState(
          ch,
        )}, gets [aura:${newAura}]`,
      );
      this.mutate({
        type: "modifyEntityVar",
        direction: "decrease",
        state: ch.latest(),
        varName: "aura",
        value: newAura,
      });
    }
  }

  private get fromReaction(): Reaction | null {
    return (this as any)[CALLED_FROM_REACTION] ?? null;
  }

  createEntity<TypeT extends EntityType>(
    type: TypeT,
    id: HandleT<TypeT>,
    area?: EntityArea,
    opt: CreateEntityOptions = {},
  ): RxEntityState<Meta, TypeT> | null {
    const id2 = id as number;
    const def = this.state.data.entities.get(id2);
    if (typeof def === "undefined") {
      throw new GiTcgDataError(`Unknown entity definition id ${id2}`);
    }
    if (typeof area === "undefined") {
      switch (type) {
        case "combatStatus":
          area = {
            type: "combatStatuses",
            who: this.self.who,
          };
          break;
        case "summon":
          area = {
            type: "summons",
            who: this.self.who,
          };
          break;
        case "support":
          area = {
            type: "supports",
            who: this.self.who,
          };
          break;
        default:
          throw new GiTcgDataError(
            `Creating entity of type ${type} requires explicit area`,
          );
      }
    }
    const { newState } = this.callAndEmit(
      "insertEntityOnStage",
      { definition: def },
      area,
      opt,
    );
    if (newState) {
      return this.get<TypeT>(newState.id);
    } else {
      return null;
    }
  }
  moveEntity(
    state: PlainEntityState,
    area: EntityArea,
    reason: MoveEntityM["reason"] = "other",
  ) {
    const { newState } = this.callAndEmit(
      "insertEntityOnStage",
      this.get(state).latest(),
      area,
      {
        moveReason: reason,
      },
    );
    if (newState) {
      return this.get(newState.id);
    } else {
      return null;
    }
  }
  summon(
    id: SummonHandle,
    where: "my" | "opp" = "my",
    opt: CreateEntityOptions = {},
  ) {
    if (where === "my") {
      this.createEntity("summon", id, void 0, opt);
    } else {
      this.createEntity(
        "summon",
        id,
        {
          type: "summons",
          who: flip(this.self.who),
        },
        opt,
      );
    }
  }
  characterStatus(
    id: StatusHandle,
    target?: CharacterTargetArg,
    opt: CreateEntityOptions = {},
  ) {
    const targets = this.queryCoerceToCharacters(
      target ?? (this.self.latest() as PlainCharacterState),
    );
    for (const t of targets) {
      this.createEntity("status", id, t.area, opt);
    }
  }
  equip(
    idOrState: EquipmentHandle | PlainEntityState,
    target?: CharacterTargetArg,
    opt: CreateEntityOptions = {},
  ) {
    const targets = this.queryCoerceToCharacters(
      target ?? (this.self.latest() as PlainCharacterState),
    );
    const def =
      typeof idOrState === "number"
        ? this.state.data.entities.get(idOrState)
        : idOrState.definition;
    if (typeof def === "undefined") {
      throw new GiTcgDataError(`Unknown equipment definition id ${idOrState}`);
    }
    for (const t of targets) {
      // Remove existing artifact/weapon/technique first
      for (const tag of ["artifact", "weapon", "technique"] as const) {
        if (def.tags.includes(tag)) {
          const exist = t.entities.find((v) => v.definition.tags.includes(tag));
          if (exist) {
            // TODO: maybe better reason
            this.dispose(exist, {
              reason: "overflow",
              direct: true,
            });
          }
        }
      }
      if (typeof idOrState !== "number") {
        this.moveEntity(idOrState, t.area, "equip");
      } else {
        this.createEntity("equipment", idOrState, t.area, opt);
      }
    }
  }
  unequip(equipment: PlainEntityState) {
    const obj = this.get(equipment);
    const area = obj.area;
    const state = obj.latest();
    if (area.type !== "characters") {
      throw new GiTcgDataError(`Can only unequip from characters`);
    }
    this.mutate({
      type: "resetVariables",
      scope: "all",
      state,
    });
    this.mutate({
      type: "moveEntity",
      from: area,
      target: { who: area.who, type: "hands", cardId: state.id },
      value: state,
      reason: "unequip",
    });
  }
  combatStatus(
    id: CombatStatusHandle,
    where: "my" | "opp" = "my",
    opt: CreateEntityOptions = {},
  ) {
    if (where === "my") {
      this.createEntity("combatStatus", id, void 0, opt);
    } else {
      this.createEntity(
        "combatStatus",
        id,
        {
          type: "combatStatuses",
          who: flip(this.self.who),
        },
        opt,
      );
    }
  }
  attach(
    def: AttachmentHandle,
    target: PlainEntityState,
    opt: CreateEntityOptions = {},
  ) {
    const definition = this.state.data.attachments.get(def);
    if (typeof definition === "undefined") {
      throw new GiTcgDataError(`Unknown attachment definition id ${def}`);
    }
    this.callAndEmit(
      "createAttachment",
      this.get(target).latest(),
      definition,
      opt,
    );
  }

  private attachCostChange(
    target: EntityStateO,
    value: number,
    isIncrease: boolean,
  ) {
    const CostIncrease = 201 as AttachmentHandle;
    const CostReduction = 202 as AttachmentHandle;
    const [consumeDef, incomingDef] = isIncrease
      ? [CostReduction, CostIncrease]
      : [CostIncrease, CostReduction];
    const existed = this.query($.def(consumeDef).on($.id(target.id)));
    if (existed) {
      const existedLayer = existed.variables.layer;
      if (existedLayer > value) {
        this.mutator.log(
          DetailLogType.Other,
          `Attaching of [attachment:${incomingDef}] reduces layer of existing attachment ${stringifyState(
            existed,
          )} by ${value}`,
        );
        this.setVariable("layer", existedLayer - value, existed);
      } else {
        this.mutator.log(
          DetailLogType.Other,
          `Attaching of [attachment:${incomingDef}] removes existing attachment ${stringifyState(
            existed,
          )}`,
        );
        this.mutate({
          type: "removeEntity",
          from: existed.area,
          oldState: existed.latest(),
          reason: "other",
        });
      }
      value -= existedLayer;
    }
    if (value > 0) {
      this.attach(incomingDef, target, {
        overrideVariables: { layer: value },
      });
    }
  }

  /**
   * 给 `target` 附着费用增加。
   * 若 `target` 上附着有费用减少，会选择去除其层数而非新附着。
   */
  attachCostIncrease(target: EntityTargetArg, value = 1) {
    const targets = this.queryOrGet<EntityType>(target);
    for (const target of targets) {
      this.attachCostChange(target.latest(), value, true);
    }
  }

  /**
   * 给 `target` 附着费用减少。
   * 若 `target` 上附着有费用增加，会选择去除其层数而非新附着。
   */
  attachCostReduction(target: EntityTargetArg, value = 1) {
    const targets = this.queryOrGet<EntityType>(target);
    for (const target of targets) {
      this.attachCostChange(target.latest(), value, false);
    }
  }

  dispose(
    target?: EntityTargetArg,
    { reason = "other", direct }: DisposeOption = {},
  ) {
    const targets = this.queryOrGet(
      target ?? (this.self.latest() as PlainEntityState),
    );
    for (const t of targets) {
      let target = t.latest();
      if (target.definition.type === "character") {
        throw new GiTcgDataError(
          `Character caller cannot be disposed. You may forget an argument when calling \`dispose\``,
        );
      }
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Dispose ${stringifyState(target)} for ${reason}`,
      );
      if (
        !direct &&
        target.definition.type !== "attachment" &&
        target.variables.usage &&
        target.variables.usage > 0 &&
        target.definition.disposeWhenUsageIsZero
      ) {
        this.setVariable("usage", 0, target);
        target = t.latest();
      }
      this.emitEvent(
        "onDispose",
        this.rawState,
        target as EntityStateO,
        reason,
        t.area,
        this.skillInfo,
      );
      this.mutate({
        type: "removeEntity",
        from: t.area,
        oldState: target,
        reason,
      });
    }
  }

  // NOTICE: getVariable/setVariable/addVariable 应当将 caller 的严格版声明放在最后一个
  // 因为 (...args: infer R) 只能获取到重载列表中的最后一个，而严格版供链式上下文操作使用

  getVariable(prop: string, target: PlainAnyState): number;
  getVariable(prop: Meta["callerVars"]): number;
  getVariable(prop: string, target?: PlainAnyState) {
    if (target) {
      return this.get(target).getVariable(prop);
    } else {
      return this.self.getVariable(prop);
    }
  }

  setVariable(prop: string, value: number, target: PlainAnyState): void;
  setVariable(prop: Meta["callerVars"], value: number): void;
  setVariable(prop: string, value: number, target?: PlainAnyState) {
    target ??= this.self;
    this.setVariableImpl(target, {
      varName: prop,
      oldValue: target.variables[prop],
      newValue: value,
      diffValue: value - target.variables[prop],
      direction: value >= target.variables[prop] ? "increase" : "decrease",
      cancelled: false,
    });
  }

  addVariable(prop: string, value: number, target: PlainAnyState): void;
  addVariable(prop: Meta["callerVars"], value: number): void;
  addVariable(prop: any, value: number, target?: PlainAnyState) {
    target ??= this.self;
    const finalValue = value + target.variables[prop];
    this.setVariable(prop, finalValue, target);
  }

  addVariableWithMax(
    prop: string,
    value: number,
    maxLimit: number,
    target: PlainAnyState,
  ): void;
  addVariableWithMax(
    prop: Meta["callerVars"],
    value: number,
    maxLimit: number,
  ): void;
  addVariableWithMax(
    prop: any,
    value: number,
    maxLimit: number,
    target?: PlainAnyState,
  ) {
    target ??= this.self;
    if (target.variables[prop] > maxLimit) {
      // 如果当前值已经超过可叠加的上限，则不再叠加
      return;
    }
    const finalValue = Math.min(maxLimit, value + target.variables[prop]);
    this.setVariable(prop, finalValue, target);
  }
  consumeUsage(count = 1, target?: PlainEntityState) {
    if (typeof target === "undefined") {
      if (this.self.definition.type === "character") {
        throw new GiTcgDataError(`Cannot consume usage of character`);
      }
      target = this.self as PlainEntityState;
    }
    if (!Reflect.has(target.definition.varConfigs, "usage")) {
      return;
    }
    const current = this.getVariable("usage", target);
    if (current > 0) {
      this.addVariable("usage", -Math.min(count, current), target);
      if (
        target.definition.disposeWhenUsageIsZero &&
        this.getVariable("usage", target) <= 0
      ) {
        this.dispose(target, { direct: true });
      }
    }
  }
  consumeUsagePerRound(count = 1) {
    const varName = this.skillInfo.definition.usagePerRoundVariableName;
    if (varName === null) {
      throw new GiTcgDataError(
        `This skill ${this.skillInfo.definition.id} do not have usagePerRound`,
      );
    }
    const current = this.getVariable(varName, this.self);
    if (current > 0) {
      this.addVariable(varName, -Math.min(count, current), this.self);
    }
  }

  private setVariableImpl(
    target: PlainAnyState,
    info: VariableValueChangeInfo,
  ) {
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Set ${stringifyState(target)}'s variable ${info.varName} to ${
        info.newValue
      } (diff: ${info.diffValue}, direction: ${info.direction})`,
    );

    const MAX_VALUE = 2 ** 31 - 1; // 2147483647
    if (info.newValue > MAX_VALUE) {
      this.mutator.log(
        DetailLogType.Other,
        `Variable value ${info.newValue} exceeds max limit, omitted`,
      );
      return;
    }
    let state = this.get(target).latest();
    if (VARIABLE_NAME_CAN_EMIT_EVENTS.includes(info.varName)) {
      const modifyEventArg = new BeforeVariableEventArg(
        this.rawState,
        state,
        info,
      );
      this.callAndEmit(
        "handleInlineEvent",
        this.skillInfo,
        "modifyChangeVariable",
        modifyEventArg,
      );
      info = modifyEventArg.info;
      if (info.cancelled) {
        return;
      }
    }
    this.mutate({
      type: "modifyEntityVar",
      state,
      varName: info.varName,
      value: info.newValue,
      direction: info.direction,
    });
    state = this.get(target).latest();
    this.emitEvent("onChangeVariable", this.rawState, state, info);
  }

  transformDefinition<DefT extends EntityType | "character">(
    x: ExPlainEntityState<DefT>,
    newDefId: HandleT<DefT>,
  ) {
    const targets = this.queryOrGet<DefT>(x);
    for (const t of targets) {
      const target = t.latest();
      const oldDef = target.definition;
      const def = this.state.data[oldDef.__definition].get(newDefId);
      if (typeof def === "undefined") {
        throw new GiTcgDataError(`Unknown definition id ${newDefId}`);
      }
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Transform ${stringifyState(target)}'s definition to [${def.type}:${
          def.id
        }]`,
      );
      this.mutate({
        type: "transformDefinition",
        state: target,
        newDefinition: def,
      });
      this.emitEvent("onTransformDefinition", this.rawState, target, def);
    }
  }

  swapCharacterPosition(a: CharacterTargetArg, b: CharacterTargetArg) {
    const character0 = this.queryCoerceToCharacters(a);
    const character1 = this.queryCoerceToCharacters(b);
    if (character0.length !== 1 || character1.length !== 1) {
      throw new GiTcgDataError(
        "Expected exactly one target for swapping character",
      );
    }
    if (character0[0].who !== character1[0].who) {
      throw new GiTcgDataError("Cannot swap characters of different players");
    }
    this.mutate({
      type: "swapCharacterPosition",
      who: character0[0].who,
      characters: [character0[0].latest(), character1[0].latest()],
    });
  }

  absorbDice(strategy: "seq" | "diff", count: number): DiceType[] {
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Absorb ${count} dice with strategy ${strategy}`,
    );
    const countMap = new Map<DiceType, number>();
    for (const dice of this.player.dice) {
      countMap.set(dice, (countMap.get(dice) ?? 0) + 1);
    }
    // 元素骰吸收序算法，用于自动选择被吸收的骰子：
    // 1. 万能骰优先
    // 2. 数量多的骰子优先
    // 3. 骰子类型编号
    const sorted = toSortedBy(this.player.dice, (dice) => [
      +(dice === DiceType.Omni),
      -countMap.get(dice)!,
      dice,
    ]);
    switch (strategy) {
      case "seq": {
        const newDice = sorted.slice(0, count);
        this.mutate({
          type: "resetDice",
          who: this.self.who,
          value: sorted.slice(count),
          reason: "absorb",
        });
        return newDice;
      }
      case "diff": {
        const collected: DiceType[] = [];
        const dice = [...sorted];
        for (let i = 0; i < count; i++) {
          let found = false;
          for (let j = 0; j < dice.length; j++) {
            // 万能骰子或者不重复的骰子
            if (dice[j] === DiceType.Omni || !collected.includes(dice[j])) {
              collected.push(dice[j]);
              dice.splice(j, 1);
              found = true;
              break;
            }
          }
          if (!found) {
            break;
          }
        }
        this.mutate({
          type: "resetDice",
          who: this.self.who,
          value: dice,
          reason: "absorb",
        });
        return collected;
      }
      default: {
        const _: never = strategy;
        throw new GiTcgDataError(`Invalid strategy ${strategy}`);
      }
    }
  }
  convertDice(
    target: DiceType,
    count: number | "all",
    where: "my" | "opp" = "my",
  ) {
    const player = this.getRawPlayer(where);
    const who = where === "my" ? this.self.who : flip(this.self.who);
    const finalDice = computeConvertDice(player, target, count);
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Convert ${who}'s ${count} dice to [dice:${target}]`,
    );
    this.mutate({
      type: "resetDice",
      who,
      value: finalDice,
      reason: "convert",
      conversionTargetHint: target,
    });
  }
  generateDice(
    type: DiceType | "randomElement",
    count: number,
    option: GenerateDiceOption = {},
  ) {
    const maxCount = this.state.config.maxDiceCount - this.player.dice.length;
    const { randomIncludeOmni = false, randomAllowDuplicate = false } = option;
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Generate ${count}${
        maxCount < count ? ` (only ${maxCount} due to limit)` : ""
      } dice of ${typeof type === "string" ? type : `[dice:${type}]`}`,
    );
    count = Math.min(count, maxCount);
    let insertedDice: DiceType[] = [];
    if (type === "randomElement") {
      const diceTypes: DiceType[] = [
        DiceType.Anemo,
        DiceType.Cryo,
        DiceType.Dendro,
        DiceType.Electro,
        DiceType.Geo,
        DiceType.Hydro,
        DiceType.Pyro,
      ];
      if (randomIncludeOmni) {
        diceTypes.push(DiceType.Omni);
      }
      for (let i = 0; i < count; i++) {
        const generated = this.random(diceTypes);
        insertedDice.push(generated);
        if (!randomAllowDuplicate) {
          diceTypes.splice(diceTypes.indexOf(generated), 1);
        }
      }
    } else {
      insertedDice = new Array<DiceType>(count).fill(type);
    }
    const player = this.getRawPlayer("my");
    const newDice = sortDice(player, [...player.dice, ...insertedDice]);
    this.mutate({
      type: "resetDice",
      who: this.self.who,
      value: newDice,
      reason: "generate",
    });
    for (const d of insertedDice) {
      this.emitEvent(
        "onGenerateDice",
        this.rawState,
        this.self.who,
        this.skillInfo,
        d,
      );
    }
  }

  createHandCard(
    cardId: CardHandle,
    where: "my" | "opp" = "my",
  ): RxEntityState<Meta, EntityType> | undefined {
    const player = this.getRawPlayer(where);
    const who = where === "my" ? this.self.who : flip(this.self.who);
    const cardDef = this.state.data.entities.get(cardId);
    if (typeof cardDef === "undefined") {
      throw new GiTcgDataError(`Unknown card definition id ${cardId}`);
    }
    if (player.hands.length >= this.state.config.maxHandsCount) {
      this.mutator.log(
        DetailLogType.Other,
        `Cannot create hand card [${cardDef.type}:${cardId}] because player's hand is full`,
      );
      return;
    }
    const { state } = this.callAndEmit("createHandCard", who, cardDef);
    return this.get(state);
  }

  drawCards(count: number, opt?: DrawCardsOpt): void;
  drawCards(...cards: PlainEntityState[]): void;
  drawCards(
    countOrCard: number | PlainEntityState,
    optOrCard?: DrawCardsOpt | PlainEntityState,
    ...cards: PlainEntityState[]
  ) {
    if (typeof countOrCard !== "number") {
      const cardList: PlainEntityState[] = [countOrCard];
      if (typeof optOrCard !== "undefined") {
        cardList.push(optOrCard as PlainEntityState);
      }
      cardList.push(...cards);
      for (const card of cardList) {
        const cardEntity = this.get(card);
        const cardState = cardEntity.latest();
        const area = cardEntity.area;
        if (area.type !== "pile") {
          throw new GiTcgDataError(
            `Cannot draw card ${stringifyState(
              cardState,
            )} from ${stringifyEntityArea(area)}`,
          );
        }
        using l = this.mutator.subLog(
          DetailLogType.Primitive,
          `Player ${area.who} draw card ${stringifyState(cardState)}`,
        );
        this.callAndEmit("insertHandCard", {
          type: "moveEntity",
          from: { who: area.who, type: "pile", cardId: cardState.id },
          target: { who: area.who, type: "hands", cardId: cardState.id },
          value: cardState,
          reason: "draw",
        });
      }
      return;
    }
    const {
      withTag = null,
      withAttachment = null,
      withDefinition = null,
      who: myOrOpt = "my",
    } = (optOrCard ?? {}) as DrawCardsOpt;
    const who = myOrOpt === "my" ? this.self.who : flip(this.self.who);
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Player ${who} draw ${countOrCard} cards, withTag=${withTag}, withAttachment=${withAttachment}, withDefinition=${withDefinition}`,
    );
    if (
      withTag === null &&
      withAttachment === null &&
      withDefinition === null
    ) {
      // 如果没有限定，则从牌堆顶部摸牌
      this.callAndEmit("drawCardsPlain", who, countOrCard);
    } else {
      const check = (card: PlainEntityState) => {
        if (withDefinition !== null) {
          return card.definition.id === withDefinition;
        }
        if (withTag !== null) {
          return card.definition.tags.includes(withTag);
        }
        if (withAttachment !== null) {
          return card.attachments.some(
            (a) => a.definition.id === withAttachment,
          );
        }
        return false;
      };
      // 否则，随机选中一张满足条件的牌
      const player = () => this.rawState.players[who];
      for (let i = 0; i < countOrCard; i++) {
        const candidates = player().pile.filter(check);
        if (candidates.length === 0) {
          break;
        }
        const chosen = this.random(candidates);
        this.callAndEmit("insertHandCard", {
          type: "moveEntity",
          from: { who, type: "pile", cardId: chosen.id },
          target: { who, type: "hands", cardId: chosen.id },
          value: chosen,
          reason: "draw",
        });
      }
    }
  }

  createPileCards(
    cardId: CardHandle,
    count: number,
    strategy: InsertPileStrategy,
    where: "my" | "opp" = "my",
  ) {
    const who = where === "my" ? this.self.who : flip(this.self.who);
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Create pile cards ${count} * [card:${cardId}], strategy ${strategy}`,
    );
    const cardDef = this.state.data.entities.get(cardId);
    if (typeof cardDef === "undefined") {
      throw new GiTcgDataError(`Unknown card definition id ${cardId}`);
    }
    const cardTemplate = {
      id: 0,
      definition: cardDef,
      variables: {},
      attachments: [],
    };
    const payloads = Array.from(
      { length: count },
      () =>
        ({
          type: "createEntity",
          target: { who, type: "pile", cardId: 0 },
          value: { ...cardTemplate },
        }) as const,
    );
    this.callAndEmit("insertPileCards", payloads, strategy, who);
  }
  undrawCards(
    cards: PlainEntityState[],
    strategy: InsertPileStrategy,
    where: "my" | "opp" = "my",
  ) {
    const who = where === "my" ? this.self.who : flip(this.self.who);
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Undraw cards ${cards
        .map((c) => `[card:${c.definition.id}]`)
        .join(", ")}, strategy ${strategy}`,
    );
    const payloads = cards.map(
      (card) =>
        ({
          type: "moveEntity",
          from: { who, type: "hands", cardId: card.id },
          target: { who, type: "pile", cardId: card.id },
          value: this.get(card).latest(),
          reason: "undraw",
        }) as const,
    );
    this.callAndEmit("insertPileCards", payloads, strategy, who);
  }

  // TODO use mutator method
  stealHandCard(card: PlainEntityState) {
    const cardState = this.get(card).latest();
    const who = flip(this.self.who);
    this.mutate({
      type: "moveEntity",
      from: { who, type: "hands", cardId: card.id },
      target: { who: this.self.who, type: "hands", cardId: card.id },
      value: cardState,
      reason: "steal",
    });
    let overflowed = false;
    if (this.oppPlayer.hands.length > this.state.config.maxHandsCount) {
      this.mutate({
        type: "removeEntity",
        from: { who, type: "hands", cardId: card.id },
        oldState: cardState,
        reason: "overflow",
      });
      overflowed = true;
    }
    this.emitEvent(
      "onHandCardInserted",
      this.rawState,
      this.self.who,
      cardState,
      "steal",
      overflowed,
    );
  }

  swapPlayerHandCards() {
    const myHands = this.getRawPlayer("my").hands;
    const oppHands = this.getRawPlayer("opp").hands;
    for (const card of oppHands) {
      this.mutate({
        type: "moveEntity",
        from: {
          who: flip(this.self.who),
          type: "hands",
          cardId: card.id,
        },
        target: { who: this.self.who, type: "hands", cardId: card.id },
        value: card,
        reason: "swap",
      });
      this.emitEvent(
        "onHandCardInserted",
        this.rawState,
        this.self.who,
        card,
        "steal",
        false,
      );
    }
    for (const card of myHands) {
      this.mutate({
        type: "moveEntity",
        from: { who: this.self.who, type: "hands", cardId: card.id },
        target: {
          who: flip(this.self.who),
          type: "hands",
          cardId: card.id,
        },
        value: card,
        reason: "swap",
      });
      this.emitEvent(
        "onHandCardInserted",
        this.rawState,
        flip(this.self.who),
        card,
        "steal",
        false,
      );
    }
  }

  /** 舍弃一张行动牌，并触发其“舍弃时”效果。 */
  discard(...cards: PlainEntityState[]) {
    for (const c of cards) {
      const card = this.get(c);
      const cardState = card.latest();
      const area = card.area;
      if (area.type !== "hands" && area.type !== "pile") {
        throw new GiTcgDataError(
          `Cannot dispose card ${stringifyState(card)} from player ${
            area.who
          }, not found in either hands or pile`,
        );
      }
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Dispose card ${stringifyState(cardState)} from player ${area.who}`,
      );
      this.emitEvent(
        "onDispose",
        this.rawState,
        cardState as EntityStateO,
        "discarded",
        area,
        this.skillInfo,
      );
      this.mutate({
        type: "removeEntity",
        from: area,
        oldState: cardState,
        reason: "discarded",
      });
    }
  }

  /**
   * 舍弃我方当前元素骰费用最多的 `count` 张牌
   * @param count 舍弃的牌数
   * @param option.allowPreview 总是允许预览（即使版本行为 `discardMaxCostHandsAbortPreview = true` 也如此）
   */
  discardMaxCostHands(count: number, option: { allowPreview?: boolean } = {}) {
    const disposed = this.maxCostHands(count);
    if (
      this.state.versionBehavior.discardMaxCostHandsAbortPreview &&
      !option.allowPreview
    ) {
      this.abortPreview();
    }
    this.discard(...disposed);
    return disposed;
  }

  /**
   * `target` 消耗 `count` 点夜魂值
   * @param target
   * @param count
   */
  consumeNightsoul(target: CharacterTargetArg, count = 1) {
    const targets = this.queryCoerceToCharacters(target);
    for (const target of targets) {
      const st = target.hasNightsoulsBlessing();
      if (st) {
        const oldValue = this.getVariable("nightsoul", st);
        const newValue = Math.max(0, oldValue - count);
        this.setVariable("nightsoul", newValue, st);
      }
    }
  }

  /**
   * `target` 获得 `count` 点夜魂值（但不超过该角色关联的夜魂值上限）
   * @param target
   * @param count
   */
  gainNightsoul(target: CharacterTargetArg, count = 1) {
    const targets = this.queryCoerceToCharacters(target);
    for (const target of targets) {
      if (!target.definition.associatedNightsoulsBlessing) {
        continue;
      }
      let nightsoulStatus = target.hasNightsoulsBlessing();
      if (!nightsoulStatus) {
        nightsoulStatus = this.createEntity(
          "status",
          target.definition.associatedNightsoulsBlessing.id as StatusHandle,
          target.area,
          {
            modifyOverriddenVariablesOnly: true,
            overrideVariables: {
              nightsoul: 0,
            },
          },
        );
        if (!nightsoulStatus) {
          console?.warn?.(
            `Failed to create nightsouls blessing for ${stringifyState(
              target,
            )}`,
          );
          continue;
        }
      }
      // awkward...
      // TODO: make setVariable clamped to some configs
      const oldValue = nightsoulStatus.variables.nightsoul ?? 0;
      const { recreateBehavior } =
        nightsoulStatus.definition.varConfigs.nightsoul ?? {};
      const maxValue =
        recreateBehavior?.type === "append"
          ? recreateBehavior.appendLimit
          : Infinity;
      this.setVariable(
        "nightsoul",
        Math.min(maxValue, oldValue + count),
        nightsoulStatus,
      );
    }
  }

  /** 某方（默认 `my`）继续行动 */
  continueNextTurn(who: "my" | "opp" = "my") {
    const skipWho = who === "my" ? flip(this.self.who) : this.self.who;
    this.mutate({
      type: "setPlayerFlag",
      who: skipWho,
      flagName: "skipNextTurn",
      value: true,
    });
  }

  setExtensionState(setter: Setter<Meta["associatedExtension"]["type"]>) {
    const oldState = this.getExtensionState();
    const newState = produce(oldState, (d) => {
      setter(d);
    });
    this.mutate({
      type: "mutateExtensionState",
      extensionId: this.options.associatedExtensionId!,
      newState,
    });
  }

  switchCards() {
    this.emitEvent("requestSwitchHands", this.skillInfo, this.self.who);
  }
  rerollDice(times: number) {
    this.emitEvent("requestReroll", this.skillInfo, this.self.who, times);
  }
  triggerEndPhaseSkill(target: PlainEntityState) {
    const state = this.get(target).latest();
    this.emitEvent(
      "requestTriggerEndPhaseSkill",
      this.skillInfo,
      this.self.who,
      state,
    );
  }
  useSkill(skill: SkillHandle | "normal", option: UseSkillRequestOption = {}) {
    let skillId: number;
    if (skill === "normal") {
      const normalSkill = this.query($.my.active)?.definition.skills.find(
        (sk) => sk.skillType === "normal",
      );
      if (normalSkill) {
        skillId = normalSkill.id;
      } else {
        this.mutator.log(DetailLogType.Other, `No normal skill found`);
        return;
      }
    } else {
      skillId = skill;
    }
    this.emitEvent(
      "requestUseSkill",
      this.skillInfo,
      this.self.who,
      skillId,
      option,
    );
  }
  playCard(
    card: PlainEntityState,
    target: PlayCardTarget<PlainCharacterState | PlainEntityState>,
  ) {
    const cardEntity = this.get(card);
    const cardState = cardEntity.latest();
    if (cardEntity.area.type !== "hands") {
      throw new GiTcgDataError(
        `Cannot play card ${stringifyState(cardState)} from player ${
          cardEntity.area.who
        }, not found in hands`,
      );
    }
    this.emitEvent(
      "requestPlayCard",
      this.skillInfo,
      this.self.who,
      cardState,
      {
        target:
          typeof target !== "string"
            ? target.map((state) => this.get(state).latest())
            : target,
        viaSelect: false,
      },
    );
  }

  private getCardsDefinition(cards: (CardHandle | EntityDefinition)[]) {
    return cards.map((defOrId) => {
      if (typeof defOrId === "number") {
        const def = this.state.data.entities.get(defOrId);
        if (!def) {
          throw new GiTcgDataError(`Unknown card definition id ${defOrId}`);
        }
        return def;
      } else {
        return defOrId;
      }
    });
  }

  selectAndSummon(summons: (SummonHandle | EntityDefinition)[]) {
    this.emitEvent("requestSelectCard", this.skillInfo, this.self.who, {
      type: "createEntity",
      cards: summons.map((defOrId) => {
        if (typeof defOrId === "number") {
          const def = this.state.data.entities.get(defOrId);
          if (!def) {
            throw new GiTcgDataError(`Unknown entity definition id ${defOrId}`);
          }
          return def;
        } else {
          return defOrId;
        }
      }),
    });
  }
  selectAndCreateHandCard(cards: (CardHandle | EntityDefinition)[]) {
    this.emitEvent("requestSelectCard", this.skillInfo, this.self.who, {
      type: "createHandCard",
      cards: this.getCardsDefinition(cards),
    });
  }
  selectAndPlay(
    cards: (CardHandle | EntityDefinition)[],
    target: PlayCardTarget<
      PlainCharacterState | PlainEntityState
    > = "skipIfRequired",
  ) {
    this.emitEvent("requestSelectCard", this.skillInfo, this.self.who, {
      type: "requestPlayCard",
      cards: this.getCardsDefinition(cards),
      target:
        typeof target !== "string"
          ? target.map((state) => this.get(state).latest())
          : target,
    });
  }
  /** 冒险 */
  adventure() {
    this.emitEvent("requestAdventure", this.skillInfo, this.self.who);
  }

  /** 完成冒险：弃置自身，生成出战状态“完成冒险”（若版本支持）。 */
  finishAdventure() {
    if (!(
      this.self.definition.type === "support" &&
      this.self.definition.tags.includes("adventureSpot")
    )) {
      throw new GiTcgDataError(
        `Only support card with adventureSpot tag can call .finishAdventure()`,
      );
    }
    const ADVENTURE_COMPLETE_ID = 171 as CombatStatusHandle;
    if (this.state.data.entities.has(ADVENTURE_COMPLETE_ID)) {
      this.combatStatus(ADVENTURE_COMPLETE_ID);
    }
    this.dispose();
  }

  random<T>(items: readonly T[]): T {
    return items[this.mutator.stepRandom() % items.length];
  }
  private shuffleTail<T>(items: readonly T[], count: number): T[] {
    const itemsCopy = [...items];
    const stopIndex = Math.max(0, itemsCopy.length - count);
    for (let i = itemsCopy.length - 1; i >= stopIndex; i--) {
      const j = this.mutator.stepRandom() % (i + 1);
      [itemsCopy[i], itemsCopy[j]] = [itemsCopy[j], itemsCopy[i]];
    }
    return itemsCopy;
  }
  shuffle<T>(items: readonly T[]): T[] {
    return this.shuffleTail(items, items.length);
  }
  randomSubset<T>(items: readonly T[], count: number): T[] {
    if (count <= 0) return [];
    const partiallyShuffled = this.shuffleTail(
      items,
      Math.min(count, items.length),
    );
    return partiallyShuffled.slice(-count);
  }
}

type InternalProp = never;

type SkillContextMutativeProps =
  | "mutate"
  | "eventBoundary"
  | "emitEvent"
  | "emitCustomEvent"
  | "switchActive"
  | "gainEnergy"
  | "heal"
  | "immune"
  | "increaseMaxHealth"
  | "damage"
  | "apply"
  | "cleanAura"
  | "createEntity"
  | "moveEntity"
  | "summon"
  | "combatStatus"
  | "characterStatus"
  | "equip"
  | "attach"
  | "attachCostIncrease"
  | "attachCostReduction"
  | "dispose"
  | "setVariable"
  | "addVariable"
  | "addVariableWithMax"
  | "consumeUsage"
  | "consumeUsagePerRound"
  | "consumeNightsoul"
  | "gainNightsoul"
  | "transformDefinition"
  | "absorbDice"
  | "convertDice"
  | "generateDice"
  | "createHandCard"
  | "createPileCards"
  | "discard"
  | "discardMaxCostHands"
  | "drawCards"
  | "undrawCards"
  | "stealHandCard"
  | "swapPlayerHandCards"
  | "continueNextTurn"
  | "setExtensionState"
  | "switchCards"
  | "reroll"
  | "useSkill"
  | "selectAndSummon"
  | "selectAndCreateHandCard"
  | "adventure"
  | "finishAdventure";

/**
 * 所谓 `Typed` 是指，若 `Readonly` 则忽略那些可以改变游戏状态的方法。
 *
 * `TypedCharacter` 等同理。
 */
export type TypedSkillContext<Meta extends ContextMetaBase> =
  Meta["readonly"] extends true
    ? Omit<SkillContext<Meta>, SkillContextMutativeProps | InternalProp>
    : Omit<SkillContext<Meta>, InternalProp>;
