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

import { DamageType, DiceType, Reaction } from "@gi-tcg/typings";

import {
  type EntityArea,
  type EntityDefinition,
  type EntityTag,
  type EntityType,
  stringifyEntityArea,
} from "../../base/entity";
import type { MoveEntityM, Mutation, RemoveEntityM } from "../../base/mutation";
import {
  type NightsoulValueChangeInfo,
  type DamageInfo,
  DamageOrHealEventArg,
  type DisposeOrTuneMethod,
  type EventAndRequest,
  type EventAndRequestConstructorArgs,
  type EventAndRequestNames,
  type HealKind,
  type StateMutationAndExposedMutation,
  type SkillDescriptionReturn,
  type SkillInfoOfContextConstruction,
  constructEventAndRequestArg,
  type UseSkillRequestOption,
  BeforeNightsoulEventArg,
} from "../../base/skill";
import {
  type CharacterState as CharacterStateO,
  type EntityState as EntityStateO,
  type GameData,
  type GameState,
  type PhaseType,
  type PlayerState,
  StateSymbol,
  stringifyState,
} from "../../base/state";
import {
  getEntityById,
  diceCostOfCard,
  isCharacterInitiativeSkill,
  sortDice,
  type PlainCharacterState,
  type PlainEntityState,
  type PlainAnyState,
  type ExPlainEntityState,
} from "./utils";
import { executeQuery } from "../../query";
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
  SupportHandle,
} from "../type";
import type { GuessedTypeOfQuery } from "../../query/types";
import { CALLED_FROM_REACTION } from "../reaction";
import { flip } from "@gi-tcg/utils";
import { GiTcgDataError } from "../../error";
import { DetailLogType } from "../../log";
import {
  type CreateEntityOptions,
  GiTcgPreviewAbortedError,
  type InsertPileStrategy,
  type InternalHealOption,
  type InternalNotifyOption,
  type MutatorConfig,
  StateMutator,
} from "../../mutator";
import { type Draft, produce } from "immer";
import { nextRandom } from "../../random";
import type { CustomEvent } from "../../base/custom_event";
import {
  applyReactive,
  getRaw,
  type ApplyReactive,
  type RxEntityState,
} from "./reactive";
import { ReactiveStateSymbol } from "./reactive_base";

type CharacterTargetArg = PlainCharacterState | PlainCharacterState[] | string;
type EntityTargetArg = PlainEntityState | PlainEntityState[] | string;

type EntityDefinitionFilterFn = (card: EntityDefinition) => boolean;

interface MaxCostHandsOpt {
  who?: "my" | "opp";
  useTieBreak?: boolean;
}

interface DrawCardsOpt {
  who?: "my" | "opp";
  /** 抽取带有特定标签的牌 */
  withTag?: EntityTag | null;
  /** 抽取选定定义的牌。设置此选项会忽略 withTag */
  withDefinition?: CardHandle | null;
}

export const ENABLE_SHORTCUT = Symbol("withShortcut");

export interface HealOption {
  kind?: HealKind;
}

export interface GenerateDiceOption {
  randomIncludeOmni?: boolean;
  randomAllowDuplicate?: boolean;
}

type Setter<T> = (draft: Draft<T>) => void;

export type ContextMetaBase = {
  readonly: boolean;
  eventArgType: unknown;
  callerVars: string;
  callerType: ExEntityType;
  associatedExtension: ExtensionHandle;
  shortcutReceiver: unknown;
};

type ShortcutReturn<
  Meta extends ContextMetaBase,
  T = void,
> = Meta["shortcutReceiver"] extends {}
  ? Meta["shortcutReceiver"] & { [ENABLE_SHORTCUT]: true }
  : T;

type MutatorResultCanEmit =
  | readonly EventAndRequest[]
  | { readonly events: readonly EventAndRequest[] };

type MutatorMethodCanEmitImpl<K extends keyof StateMutator> =
  StateMutator[K] extends (...args: any[]) => MutatorResultCanEmit ? K : never;

type MutatorMethodCanEmit = {
  [K in keyof StateMutator]: MutatorMethodCanEmitImpl<K>;
}[keyof StateMutator];

type CallAndEmitResult<K extends MutatorMethodCanEmit> = ReturnType<
  StateMutator[K]
> extends { readonly events: readonly EventAndRequest[] }
  ? Omit<ReturnType<StateMutator[K]>, "events">
  : ReturnType<StateMutator[K]> extends readonly EventAndRequest[]
    ? void
    : never;

/**
 * 用于描述技能的上下文对象。
 * 它们出现在 `.do()` 形式内，将其作为参数传入。
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

  private readonly eventAndRequests: EventAndRequest[] = [];
  private mainDamage: DamageInfo | null = null;

  private enableShortcut(): ShortcutReturn<Meta>;
  private enableShortcut<T>(value: T): ShortcutReturn<Meta, T>;
  private enableShortcut(value?: unknown) {
    return value;
  }

  /**
   * 获取正在执行逻辑的实体的 `Character` 或 `Entity`。
   * @returns
   */
  private readonly _self: RxEntityState<Meta, Meta["callerType"]>;

  public get callerArea(): EntityArea {
    return this._self.area;
  }

  /**
   *
   * @param state 触发此技能之前的游戏状态
   * @param skillInfo
   */
  constructor(
    state: GameState,
    public readonly skillInfo: SkillInfoOfContextConstruction,
    eventArg: Meta["eventArgType"],
  ) {
    const mutatorConfig: MutatorConfig = {
      logger: skillInfo.logger,
      onNotify: (opt) => this.onNotify(opt),
      onPause: () =>
        Promise.reject(
          new GiTcgDataError(`Async operation is not permitted in skill`),
        ),
    };
    this.eventArg = applyReactive(this, eventArg);
    this.mutator = new StateMutator(state, mutatorConfig);
    this._self = applyReactive(this, this.skillInfo.caller) as RxEntityState<
      Meta,
      Meta["callerType"]
    >;
  }

  /**
   * 对技能返回的事件列表预处理。
   * - 将重复目标的“伤害事件”合并。
   */
  private preprocessEventList() {
    const result: EventAndRequest[] = [];
    const damageEventIndexInResultBasedOnTarget = new Map<number, number>();
    for (const event of this.eventAndRequests) {
      const [name, arg] = event;
      if (name === "onDamageOrHeal" && arg.isDamageTypeDamage()) {
        const previousIndex = damageEventIndexInResultBasedOnTarget.get(
          arg.target.id,
        );
        if (typeof previousIndex !== "undefined") {
          // combine current event with previous event
          const previousArg = result[
            previousIndex
          ][1] as DamageOrHealEventArg<DamageInfo>;
          const combinedDamageInfo: DamageInfo = {
            ...previousArg.damageInfo,
            value: previousArg.damageInfo.value + arg.damageInfo.value,
            causeDefeated:
              previousArg.damageInfo.causeDefeated ||
              arg.damageInfo.causeDefeated,
            fromReaction:
              previousArg.damageInfo.fromReaction ||
              arg.damageInfo.fromReaction,
          };
          result[previousIndex][1] = new DamageOrHealEventArg(
            previousArg.onTimeState,
            combinedDamageInfo,
          );
        } else {
          damageEventIndexInResultBasedOnTarget.set(
            arg.target.id,
            result.length,
          );
          result.push(event);
        }
      } else {
        result.push(event);
      }
    }
    return result;
  }

  /**
   * 技能执行完毕，发出通知，禁止后续改动。
   * @internal
   */
  _terminate(): SkillDescriptionReturn {
    this.mutator.notify();
    Object.freeze(this);
    const emittedEvents = this.preprocessEventList();
    const resultState = this.rawState;
    for (const [, { revoke }] of this._reactiveProxies) {
      revoke();
    }
    return [
      resultState,
      {
        emittedEvents,
        innerNotify: this._savedNotify,
        mainDamage: this.mainDamage,
      },
    ];
  }

  private readonly _savedNotify: StateMutationAndExposedMutation = {
    stateMutations: [],
    exposedMutations: [],
  };

  // 将技能中引发的通知保存下来，最后调用 _terminate 时返回
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
    return !!this.skillInfo.isPreview;
  }

  get state(): ApplyReactive<Meta, GameState> {
    return applyReactive(this, this.mutator.state);
  }
  /** @internal */
  get rawState(): GameState {
    return this.mutator.state;
  }
  get player(): ApplyReactive<Meta, PlayerState> {
    return this.state.players[this.callerArea.who];
  }
  get oppPlayer(): ApplyReactive<Meta, PlayerState> {
    return this.state.players[flip(this.callerArea.who)];
  }
  private getRawPlayer(where: "my" | "opp"): PlayerState {
    const who =
      where === "my" ? this.callerArea.who : flip(this.callerArea.who);
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
    return this.rawState.currentTurn === this.callerArea.who;
  }

  $<const Q extends string>(
    arg: Q,
  ): RxEntityState<Meta, GuessedTypeOfQuery<Q>> | undefined {
    const result = this.$$(arg);
    return result[0];
  }

  $$<const Q extends string>(
    arg: Q,
  ): RxEntityState<Meta, GuessedTypeOfQuery<Q>>[] {
    return executeQuery(this, arg);
  }

  get<T extends ExEntityType>(
    rxState: RxEntityState<Meta, T>,
  ): RxEntityState<Meta, T>;
  get(state: PlainEntityState): ApplyReactive<Meta, EntityStateO>;
  get(state: PlainCharacterState): ApplyReactive<Meta, CharacterStateO>;
  get<T extends ExEntityType>(
    state: ExPlainEntityState<T>,
  ): RxEntityState<Meta, T>;
  get<T extends ExEntityType>(id: number): RxEntityState<Meta, T>;
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
    q: ExPlainEntityState<TypeT> | ExPlainEntityState<TypeT>[] | string,
  ): RxEntityState<Meta, TypeT>[] {
    if (Array.isArray(q)) {
      return q.map((s) => this.get(s));
    } else if (typeof q === "string") {
      return this.$$(q) as RxEntityState<Meta, TypeT>[];
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
    if (typeof this.skillInfo.associatedExtensionId === "undefined") {
      throw new GiTcgDataError("No associated extension registered");
    }
    const ext = this.state.extensions.find(
      (ext) => ext.definition.id === this.skillInfo.associatedExtensionId,
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

  /**
   * 某方玩家手牌，并按照原本元素骰费用降序排序
   * @param who 我方还是对方
   * @param useTiebreak 是否使用“破平值”，若否，使用“手牌序”（即摸上来的顺序）
   */
  private costSortedHands(
    who: "my" | "opp",
    useTieBreak: boolean,
  ): RxEntityState<Meta, EntityType>[] {
    const player = who === "my" ? this.player : this.oppPlayer;
    const tb = useTieBreak
      ? (card: RxEntityState<Meta, EntityType>) => {
          return nextRandom(card.id) ^ this.rawState.iterators.random;
        }
      : (_: RxEntityState<Meta, EntityType>) => 0;
    const sortData = new Map(
      player.hands.map(
        (c) =>
          [c.id, { cost: -diceCostOfCard(c.definition), tb: tb(c) }] as const,
      ),
    );
    return player.hands.toSortedBy((card) => [
      sortData.get(card.id)!.cost,
      sortData.get(card.id)!.tb,
    ]);
  }

  /** 我方或对方原本元素骰费用最多的 `count` 张手牌 */
  maxCostHands(
    count: number,
    opt: MaxCostHandsOpt = {},
  ): RxEntityState<Meta, EntityType>[] {
    const who = opt.who ?? "my";
    const useTieBreak = opt.useTieBreak ?? false;
    return this.costSortedHands(who, useTieBreak).slice(0, count);
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

  get events() {
    return this.eventAndRequests;
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
    this.eventAndRequests.push([event, arg] as EventAndRequest);
  }
  // 等效调用 this.mutator.<method>, 并将返回的 events 添加
  callAndEmit<K extends MutatorMethodCanEmit>(
    method: K,
    ...args: Parameters<StateMutator[K]>
  ): CallAndEmitResult<K> {
    const fn: any = this.mutator[method].bind(this.mutator);
    const result = fn(...args);
    if ("events" in result && Array.isArray(result.events)) {
      this.eventAndRequests.push(...result.events);
    } else if (Array.isArray(result)) {
      this.eventAndRequests.push(...result);
    }
    return result as any;
  }

  emitCustomEvent(event: CustomEvent<void>): ShortcutReturn<Meta>;
  emitCustomEvent<T, U extends T & { [ReactiveStateSymbol]?: never }>(
    event: CustomEvent<T>,
    arg: U, // forbidden reactive
  ): ShortcutReturn<Meta>;
  emitCustomEvent<T>(event: CustomEvent<T>, arg?: T) {
    this.emitEvent(
      "onCustomEvent",
      this.rawState,
      this.self.latest(),
      event,
      arg,
    );
    return this.enableShortcut();
  }

  abortPreview() {
    if (this.isPreview) {
      throw new GiTcgPreviewAbortedError();
    }
    return this.enableShortcut();
  }

  switchActive(target: CharacterTargetArg) {
    const RET = this.enableShortcut();
    const targets = this.queryCoerceToCharacters(target);
    if (targets.length === 0) {
      return RET;
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
    return RET;
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
    return this.enableShortcut();
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
    return this.enableShortcut();
  }

  /** 增加最大生命值 */
  increaseMaxHealth(value: number, target: CharacterTargetArg) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      const target = t.latest();
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Increase ${value} max health to ${stringifyState(target)}`,
      );
      this.mutate({
        type: "modifyEntityVar",
        state: target,
        varName: "maxHealth",
        value: target.variables.maxHealth + value,
        direction: "increase",
      });
      // t.latest() here for grabbing the new maxHealth
      this.callAndEmit("heal", value, t.latest(), {
        via: this.skillInfo,
        kind: "increaseMaxHealth",
      });
    }
    return this.enableShortcut();
  }

  damage(
    type: DamageType,
    value: number,
    target: CharacterTargetArg = "opp active",
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
          callerWho: this.callerArea.who,
          targetWho: target.who,
          targetIsActive: target.isActive(),
        },
      );
      if (isSkillMainDamage) {
        this.mainDamage = damageInfo2;
      }
    }
    return this.enableShortcut();
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
        callerWho: this.callerArea.who,
        targetWho: ch.who,
        targetIsActive: ch.isActive(),
      });
    }
    return this.enableShortcut();
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
            who: this.callerArea.who,
          };
          break;
        case "summon":
          area = {
            type: "summons",
            who: this.callerArea.who,
          };
          break;
        case "support":
          area = {
            type: "supports",
            who: this.callerArea.who,
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
    this.callAndEmit("insertEntityOnStage", this.get(state).latest(), area, {
      moveReason: reason,
    });
    return this.enableShortcut();
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
          who: flip(this.callerArea.who),
        },
        opt,
      );
    }
    return this.enableShortcut();
  }
  characterStatus(
    id: StatusHandle,
    target: CharacterTargetArg = "@self",
    opt: CreateEntityOptions = {},
  ) {
    const targets = this.queryCoerceToCharacters(target);
    for (const t of targets) {
      this.createEntity("status", id, t.area, opt);
    }
    return this.enableShortcut();
  }
  equip(
    idOrState: EquipmentHandle | PlainEntityState,
    target: CharacterTargetArg = "@self",
    opt: CreateEntityOptions = {},
  ) {
    const targets = this.queryCoerceToCharacters(target);
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
            this.dispose(exist, "overflow");
          }
        }
      }
      if (typeof idOrState !== "number") {
        this.moveEntity(idOrState, t.area, "equip");
      } else {
        this.createEntity("equipment", idOrState, t.area, opt);
      }
    }
    return this.enableShortcut();
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
      target: { who: area.who, type: "hands" },
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
          who: flip(this.callerArea.who),
        },
        opt,
      );
    }
    return this.enableShortcut();
  }

  /** @deprecated */
  transferEntity(target: EntityTargetArg, area: EntityArea) {
    const targets = this.queryOrGet(target);
    for (const target of targets) {
      const state = target.latest();
      if (state.definition.type === "character") {
        throw new GiTcgDataError(`Cannot transfer a character`);
      }
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Transfer ${stringifyState(target)} to ${stringifyEntityArea(area)}`,
      );
      this.mutate({
        type: "removeEntity",
        from: target.area,
        oldState: state,
        reason: "other",
      });
      const newState = { ...state } as EntityStateO;
      this.mutate({
        type: "createEntity",
        value: newState,
        target: area,
      });
    }
    return this.enableShortcut();
  }

  dispose(
    target: EntityTargetArg = "@self",
    reason: RemoveEntityM["reason"] = "other",
  ) {
    const targets = this.queryOrGet(target);
    for (const t of targets) {
      const target = t.latest();
      if (target.definition.type === "character") {
        throw new GiTcgDataError(
          `Character caller cannot be disposed. You may forget an argument when calling \`dispose\``,
        );
      }
      using l = this.mutator.subLog(
        DetailLogType.Primitive,
        `Dispose ${stringifyState(target)} for ${reason}`,
      );
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
    return this.enableShortcut();
  }

  // NOTICE: getVariable/setVariable/addVariable 应当将 caller 的严格版声明放在最后一个
  // 因为 (...args: infer R) 只能获取到重载列表中的最后一个，而严格版是 BuilderWithShortcut 需要的

  getVariable(prop: string, target: PlainAnyState): number;
  getVariable(prop: Meta["callerVars"]): number;
  getVariable(prop: string, target?: PlainAnyState) {
    if (target) {
      return this.get(target).getVariable(prop);
    } else {
      return this.self.getVariable(prop);
    }
  }

  setVariable(
    prop: string,
    value: number,
    target: PlainAnyState,
  ): ShortcutReturn<Meta>;
  setVariable(prop: Meta["callerVars"], value: number): ShortcutReturn<Meta>;
  setVariable(prop: any, value: number, target?: PlainAnyState) {
    target ??= this.self;
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Set ${stringifyState(target)}'s variable ${prop} to ${value}`,
    );
    const MAX_VALUE = 2 ** 31 - 1; // 2147483647
    if (value > MAX_VALUE) {
      this.mutator.log(
        DetailLogType.Other,
        `Variable value ${value} exceeds max limit, omitted`,
      );
      return;
    }
    const state = this.get(target).latest();
    this.mutate({
      type: "modifyEntityVar",
      state,
      varName: prop,
      value: value,
      direction: null,
    });
    return this.enableShortcut();
  }

  addVariable(
    prop: string,
    value: number,
    target: PlainAnyState,
  ): ShortcutReturn<Meta>;
  addVariable(prop: Meta["callerVars"], value: number): ShortcutReturn<Meta>;
  addVariable(prop: any, value: number, target?: PlainAnyState) {
    target ??= this.self;
    const finalValue = value + target.variables[prop];
    this.setVariable(prop, finalValue, target);
    return this.enableShortcut();
  }

  addVariableWithMax(
    prop: string,
    value: number,
    maxLimit: number,
    target: PlainAnyState,
  ): ShortcutReturn<Meta>;
  addVariableWithMax(
    prop: Meta["callerVars"],
    value: number,
    maxLimit: number,
  ): ShortcutReturn<Meta>;
  addVariableWithMax(
    prop: any,
    value: number,
    maxLimit: number,
    target?: PlainAnyState,
  ) {
    const RET = this.enableShortcut();
    target ??= this.self;
    if (target.variables[prop] > maxLimit) {
      // 如果当前值已经超过可叠加的上限，则不再叠加
      return RET;
    }
    const finalValue = Math.min(maxLimit, value + target.variables[prop]);
    this.setVariable(prop, finalValue, target);
    return RET;
  }
  consumeUsage(count = 1, target?: PlainEntityState) {
    const RET = this.enableShortcut();
    if (typeof target === "undefined") {
      if (this.self.definition.type === "character") {
        throw new GiTcgDataError(`Cannot consume usage of character`);
      }
      target = this.self as PlainEntityState;
    }
    if (!Reflect.has(target.definition.varConfigs, "usage")) {
      return RET;
    }
    const current = this.getVariable("usage", target);
    if (current > 0) {
      this.addVariable("usage", -Math.min(count, current), target);
      if (
        target.definition.disposeWhenUsageIsZero &&
        this.getVariable("usage", target) <= 0
      ) {
        this.dispose(target);
      }
    }
    return RET;
  }
  consumeUsagePerRound(count = 1) {
    if (!("usagePerRoundVariableName" in this.skillInfo.definition)) {
      throw new GiTcgDataError(`This skill do not have usagePerRound`);
    }
    const varName = this.skillInfo.definition.usagePerRoundVariableName;
    if (varName === null) {
      throw new GiTcgDataError(`This skill do not have usagePerRound`);
    }
    const current = this.getVariable(varName, this.self);
    if (current > 0) {
      this.addVariable(varName, -Math.min(count, current), this.self);
    }
    return this.enableShortcut();
  }

  transformDefinition<DefT extends ExEntityType>(
    target: ExPlainEntityState<DefT>,
    newDefId: HandleT<DefT>,
  ): ShortcutReturn<Meta>;
  transformDefinition(target: string, newDefId: number): ShortcutReturn<Meta>;
  transformDefinition<DefT extends ExEntityType>(
    x: string | ExPlainEntityState<DefT>,
    newDefId: number,
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
    return this.enableShortcut();
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
    return this.enableShortcut();
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
    // 万能骰排最后。其余按照数量排序，相等时按照骰子类型排序
    const sorted = this.player.dice.toSortedBy((dice) => [
      +(dice === DiceType.Omni),
      -countMap.get(dice)!,
      dice,
    ]);
    switch (strategy) {
      case "seq": {
        const newDice = sorted.slice(0, count);
        this.mutate({
          type: "resetDice",
          who: this.callerArea.who,
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
          who: this.callerArea.who,
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
    const who =
      where === "my" ? this.callerArea.who : flip(this.callerArea.who);
    if (count === "all") {
      count = player.dice.length;
    } else {
      count = Math.min(count, player.dice.length);
    }
    const oldDiceCount = player.dice.length - count;
    const oldDice = player.dice.slice(0, oldDiceCount);
    const newDice = new Array<DiceType>(count).fill(target);
    const finalDice = sortDice(player, [...oldDice, ...newDice]);
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
    return this.enableShortcut();
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
      who: this.callerArea.who,
      value: newDice,
      reason: "generate",
    });
    for (const d of insertedDice) {
      this.emitEvent(
        "onGenerateDice",
        this.rawState,
        this.callerArea.who,
        this.skillInfo,
        d,
      );
    }
    return this.enableShortcut();
  }

  createHandCard(cardId: CardHandle) {
    const cardDef = this.state.data.entities.get(cardId);
    if (typeof cardDef === "undefined") {
      throw new GiTcgDataError(`Unknown card definition id ${cardId}`);
    }
    const { state } = this.callAndEmit(
      "createHandCard",
      this.callerArea.who,
      cardDef,
    );
    return this.enableShortcut(this.get(state));
  }

  drawCards(count: number, opt: DrawCardsOpt = {}) {
    const { withTag = null, withDefinition = null, who: myOrOpt = "my" } = opt;
    const who =
      myOrOpt === "my" ? this.callerArea.who : flip(this.callerArea.who);
    using l = this.mutator.subLog(
      DetailLogType.Primitive,
      `Player ${who} draw ${count} cards, ${
        withTag ? `(with tag ${withTag})` : ""
      }`,
    );
    if (withTag === null && withDefinition === null) {
      // 如果没有限定，则从牌堆顶部摸牌
      this.callAndEmit("drawCardsPlain", who, count);
    } else {
      const check = (card: PlainEntityState) => {
        if (withDefinition !== null) {
          return card.definition.id === withDefinition;
        }
        if (withTag !== null) {
          return card.definition.tags.includes(withTag);
        }
        return false;
      };
      // 否则，随机选中一张满足条件的牌
      const player = () => this.rawState.players[who];
      for (let i = 0; i < count; i++) {
        const candidates = player().pile.filter(check);
        if (candidates.length === 0) {
          break;
        }
        const chosen = this.random(candidates);
        this.callAndEmit("insertHandCard", {
          type: "moveEntity",
          from: { who, type: "pile" },
          target: { who, type: "hands" },
          value: chosen,
          reason: "draw",
        });
      }
    }
    return this.enableShortcut();
  }

  createPileCards(
    cardId: CardHandle,
    count: number,
    strategy: InsertPileStrategy,
    where: "my" | "opp" = "my",
  ) {
    const who =
      where === "my" ? this.callerArea.who : flip(this.callerArea.who);
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
    };
    const payloads = Array.from(
      { length: count },
      () =>
        ({
          type: "createEntity",
          target: { who, type: "pile" },
          value: { ...cardTemplate },
        }) as const,
    );
    this.callAndEmit("insertPileCards", payloads, strategy, who);
    return this.enableShortcut();
  }
  undrawCards(
    cards: PlainEntityState[],
    strategy: InsertPileStrategy,
    where: "my" | "opp" = "my",
  ) {
    const who =
      where === "my" ? this.callerArea.who : flip(this.callerArea.who);
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
          from: { who, type: "hands" },
          target: { who, type: "pile" },
          value: this.get(card).latest(),
          reason: "undraw",
        }) as const,
    );
    this.callAndEmit("insertPileCards", payloads, strategy, who);
    return this.enableShortcut();
  }

  // TODO use mutator method
  stealHandCard(card: PlainEntityState) {
    const cardState = this.get(card).latest();
    const who = flip(this.callerArea.who);
    this.mutate({
      type: "moveEntity",
      from: { who, type: "hands" },
      target: { who: this.callerArea.who, type: "hands" },
      value: cardState,
      reason: "steal",
    });
    let overflowed = false;
    if (this.oppPlayer.hands.length > this.state.config.maxHandsCount) {
      this.mutate({
        type: "removeEntity",
        from: { who, type: "hands" },
        oldState: cardState,
        reason: "overflow",
      });
      overflowed = true;
    }
    this.emitEvent(
      "onHandCardInserted",
      this.rawState,
      this.callerArea.who,
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
        from: { who: flip(this.callerArea.who), type: "hands" },
        target: { who: this.callerArea.who, type: "hands" },
        value: card,
        reason: "swap",
      });
      this.emitEvent(
        "onHandCardInserted",
        this.rawState,
        this.callerArea.who,
        card,
        "steal",
        false,
      );
    }
    for (const card of myHands) {
      this.mutate({
        type: "moveEntity",
        from: { who: this.callerArea.who, type: "hands" },
        target: { who: flip(this.callerArea.who), type: "hands" },
        value: card,
        reason: "swap",
      });
      this.emitEvent(
        "onHandCardInserted",
        this.rawState,
        flip(this.callerArea.who),
        card,
        "steal",
        false,
      );
    }
    return this.enableShortcut();
  }

  /** 弃置一张行动牌，并触发其“弃置时”效果。 */
  disposeCard(...cards: PlainEntityState[]) {
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
        "cardDisposed",
        area,
        this.skillInfo,
      );
      this.mutate({
        type: "removeEntity",
        from: area,
        oldState: cardState,
        reason: "cardDisposed",
      });
    }
  }

  /**
   * 弃置我方原本元素骰费用最多的 `count` 张牌
   * @param count 弃置的牌数
   * @param option.allowPreview 总是允许预览（即使版本行为 `disposeMaxCostHandsAbortPreview = true` 也如此）
   */
  disposeMaxCostHands(count: number, option: { allowPreview?: boolean } = {}) {
    const disposed = this.maxCostHands(count, { useTieBreak: true });
    if (
      this.state.versionBehavior.disposeMaxCostHandsAbortPreview &&
      !option.allowPreview
    ) {
      this.abortPreview();
    }
    this.disposeCard(...disposed);
    return this.enableShortcut<RxEntityState<Meta, EntityType>[]>(disposed);
  }

  /**
   * `target` 消耗 `count` 点夜魂值
   * @param target
   * @param count
   */
  consumeNightsoul(target: CharacterTargetArg, count = 1) {
    const targets = this.queryCoerceToCharacters(target);
    for (const target of targets) {
      const st = target.$$(`status with tag (nightsoulsBlessing)`)[0];
      if (st) {
        const oldValue = this.getVariable("nightsoul", st);
        const newValue = Math.max(0, oldValue - count);
        let info: NightsoulValueChangeInfo = {
          type: "consume",
          oldValue,
          newValue,
          consumedValue: count,
          cancelled: false,
        };
        const modifyEventArg = new BeforeNightsoulEventArg(
          this.rawState,
          target.latest(),
          info,
        );
        this.callAndEmit(
          "handleInlineEvent",
          this.skillInfo,
          "modifyChangeNightsoul",
          modifyEventArg,
        );
        info = modifyEventArg.info;
        if (info.cancelled) {
          continue;
        }
        this.setVariable("nightsoul", info.newValue, st);
        this.emitEvent(
          "onChangeNightsoul",
          this.rawState,
          target.latest(),
          info,
        );
      }
    }
    return this.enableShortcut();
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
      const oldValue = target.hasNightsoulsBlessing()?.variables.nightsoul ?? 0;
      this.characterStatus(
        target.definition.associatedNightsoulsBlessing.id as StatusHandle,
        target,
        {
          modifyOverriddenVariablesOnly: true,
          overrideVariables: {
            nightsoul: count,
          },
        },
      );
      const newValue = target.hasNightsoulsBlessing()?.variables.nightsoul ?? 0;
      const info: NightsoulValueChangeInfo = {
        type: "gain",
        oldValue,
        newValue,
        consumedValue: count,
        cancelled: false,
      };
      this.emitEvent("onChangeNightsoul", this.rawState, target.latest(), info);
    }
    return this.enableShortcut();
  }

  /** 某方（默认 `my`）继续行动 */
  continueNextTurn(who: "my" | "opp" = "my") {
    const skipWho =
      who === "my" ? flip(this.callerArea.who) : this.callerArea.who;
    const playerToSkip = this.rawState.players[skipWho];
    if (!playerToSkip.declaredEnd) {
      this.mutate({
        type: "setPlayerFlag",
        who: skipWho,
        flagName: "skipNextTurn",
        value: true,
      });
    }
    return this.enableShortcut();
  }

  setExtensionState(setter: Setter<Meta["associatedExtension"]["type"]>) {
    const oldState = this.getExtensionState();
    const newState = produce(oldState, (d) => {
      setter(d);
    });
    this.mutate({
      type: "mutateExtensionState",
      extensionId: this.skillInfo.associatedExtensionId!,
      newState,
    });
    return this.enableShortcut();
  }

  switchCards() {
    this.emitEvent("requestSwitchHands", this.skillInfo, this.callerArea.who);
    return this.enableShortcut();
  }
  rerollDice(times: number) {
    this.emitEvent("requestReroll", this.skillInfo, this.callerArea.who, times);
    return this.enableShortcut();
  }
  triggerEndPhaseSkill(target: PlainEntityState) {
    const state = this.get(target).latest();
    this.emitEvent(
      "requestTriggerEndPhaseSkill",
      this.skillInfo,
      this.callerArea.who,
      state,
    );
    return this.enableShortcut();
  }
  useSkill(skill: SkillHandle | "normal", option: UseSkillRequestOption = {}) {
    const RET = this.enableShortcut();
    let skillId: number;
    if (skill === "normal") {
      const normalSkill = this.$("my active")!.definition.skills.find(
        (sk) => sk.initiativeSkillConfig?.skillType === "normal",
      );
      if (normalSkill) {
        skillId = normalSkill.id;
      } else {
        this.mutator.log(DetailLogType.Other, `No normal skill found`);
        return RET;
      }
    } else {
      skillId = skill;
    }
    this.emitEvent(
      "requestUseSkill",
      this.skillInfo,
      this.callerArea.who,
      skillId,
      option,
    );
    return RET;
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
    this.emitEvent("requestSelectCard", this.skillInfo, this.callerArea.who, {
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
    return this.enableShortcut();
  }
  selectAndCreateHandCard(cards: (CardHandle | EntityDefinition)[]) {
    this.emitEvent("requestSelectCard", this.skillInfo, this.callerArea.who, {
      type: "createHandCard",
      cards: this.getCardsDefinition(cards),
    });
    return this.enableShortcut();
  }
  selectAndPlay(
    cards: (CardHandle | EntityDefinition)[],
    ...targets: (PlainCharacterState | PlainEntityState)[]
  ) {
    this.emitEvent("requestSelectCard", this.skillInfo, this.callerArea.who, {
      type: "requestPlayCard",
      cards: this.getCardsDefinition(cards),
      targets: targets.map((target) => this.get(target).latest()),
    });
    return this.enableShortcut();
  }
  /** 冒险 */
  adventure() {
    this.emitEvent("requestAdventure", this.skillInfo, this.callerArea.who);
    return this.enableShortcut();
  }

  /** 完成冒险：弃置自身，生成出战状态“完成冒险”（若版本支持）。 */
  finishAdventure() {
    if (
      !(
        this.self.definition.type === "support" &&
        this.self.definition.tags.includes("adventureSpot")
      )
    ) {
      throw new GiTcgDataError(
        `Only support card with adventureSpot tag can call .finishAdventure()`,
      );
    }
    const ADVENTURE_COMPLETE_ID = 171 as CombatStatusHandle;
    if (this.state.data.entities.has(ADVENTURE_COMPLETE_ID)) {
      this.combatStatus(ADVENTURE_COMPLETE_ID);
    }
    this.dispose();
    return this.enableShortcut();
  }

  random<T>(items: readonly T[]): T {
    return items[this.mutator.stepRandom() % items.length];
  }
  private shuffleTail<T>(items: readonly T[], count: number): T[] {
    const itemsCopy = [...items];
    for (let i = itemsCopy.length - 1; i >= itemsCopy.length - count; i--) {
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
    const partiallyShuffled = this.shuffleTail(items, count);
    return partiallyShuffled.slice(-count);
  }
}

type InternalProp = "callerArea";

type SkillContextMutativeProps =
  | "mutate"
  | "events"
  | "emitEvent"
  | "emitCustomEvent"
  | "switchActive"
  | "gainEnergy"
  | "heal"
  | "increaseMaxHealth"
  | "damage"
  | "apply"
  | "createEntity"
  | "moveEntity"
  | "summon"
  | "combatStatus"
  | "characterStatus"
  | "equip"
  | "dispose"
  | "transferEntity"
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
  | "disposeCard"
  | "disposeMaxCostHands"
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
