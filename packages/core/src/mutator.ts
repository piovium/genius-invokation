import {
  DamageType,
  DiceType,
  PbHealKind,
  PbReactionType,
  PbSwitchActiveFromAction,
  Reaction,
  type ExposedMutation,
} from "@gi-tcg/typings";
import type {
  AnyState,
  AttachmentState,
  CharacterState,
  EntityType,
  GameState,
} from "./base/state";
import { DetailLogType, type IDetailLogger } from "./log";
import {
  type CreateEntityM,
  type MoveEntityM,
  type Mutation,
  type StepIdM,
  type StepRandomM,
  applyMutation,
  stringifyMutation,
} from "./base/mutation";
import {
  type EntityState,
  type EntityVariables,
  StateSymbol,
  stringifyState,
} from "./base/state";
import {
  allEntitiesAtArea,
  allSkills,
  assertValidActionCard,
  getActiveCharacterIndex,
  getEntityArea,
  getEntityById,
  getInsertedStateVariables,
  shouldEnterOverride,
  sortDice,
  type CreateEntityOptions,
  type InsertEntityOptions,
} from "./utils";
import { GiTcgCoreInternalError, GiTcgDataError, GiTcgIoError } from "./error";
import {
  CharacterEventArg,
  type DamageInfo,
  DamageOrHealEventArg,
  EnterEventArg,
  type EventAndRequest,
  type EventArgOf,
  GenericModifyDamageEventArg,
  GenericModifyHealEventArg,
  HandCardInsertedEventArg,
  type HealInfo,
  type HealKind,
  type InlineEventNames,
  ModifyReactionEventArg,
  PlayCardRequestArg,
  ReactionEventArg,
  type ReactionInfo,
  type SelectCardInfo,
  type SkillDescription,
  type SkillInfo,
  type StateMutationAndExposedMutation,
  SwitchActiveEventArg,
  type SwitchActiveInfo,
  VariableEventArg,
} from "./base/skill";
import {
  type EntityArea,
  type EntityDefinition,
  stringifyEntityArea,
} from "./base/entity";
import { getReaction, type NontrivialDamageType } from "./base/reaction";
import {
  getReactionDescription,
  type ReactionDescriptionEventArg,
} from "./builder/reaction";
import { exposeHealKind } from "./io";
import type { AttachmentDefinition } from "./base/attachment";
import type { LunarReaction } from "@gi-tcg/typings";

export class GiTcgPreviewAbortedError extends GiTcgCoreInternalError {
  constructor(message?: string) {
    super(`${message ?? "Preview aborted."} This error should be caught.`);
  }
}

export class GiTcgIoNotProvideError extends GiTcgPreviewAbortedError {
  constructor() {
    super("IO is not provided.");
  }
}

export interface NotifyOption {
  /** 即便没有积攒的 mutations，也执行 `onNotify`。适用于首次通知。 */
  readonly force?: boolean;
  readonly canResume?: boolean;
  readonly mutations?: readonly ExposedMutation[];
}

export interface InternalPauseOption {
  readonly state: GameState;
  readonly canResume: boolean;
  /** 自上次通知后，对局状态发生的所有变化 */
  readonly stateMutations: readonly Mutation[];
}
export interface InternalNotifyOption extends InternalPauseOption {
  /** 上层传入的其他变化（可直接输出前端） */
  readonly exposedMutations: readonly ExposedMutation[];
}

export interface MutatorConfig {
  /**
   * 详细日志输出器。
   */
  readonly logger?: IDetailLogger;

  /**
   * `notify` 时调用的接口。
   */
  readonly onNotify: (opt: InternalNotifyOption) => void;

  /**
   * `pause` 时调用的接口。
   */
  readonly onPause: (opt: InternalPauseOption) => Promise<void>;

  readonly howToSwitchHands?: (who: 0 | 1) => Promise<number[]>;
  readonly howToReroll?: (who: 0 | 1) => Promise<number[]>;
  readonly howToSelectCard?: (who: 0 | 1, cards: number[]) => Promise<number>;
  readonly howToChooseActive?: (
    who: 0 | 1,
    candidates: number[],
  ) => Promise<number>;
}

export interface InsertEntityResult {
  /** 若重复入场，给出被覆盖的原实体状态 */
  readonly oldState: EntityState | null;
  /** 若成功入场，给出新建的实体状态 */
  readonly newState: EntityState | null;
  /** 若成功入场，则引发的 onEnter 事件 */
  readonly events: ReadonlyEventList;
}

export interface SwitchActiveOption {
  readonly via?: SkillInfo;
  readonly fast?: boolean | null;
  readonly fromReaction?: Reaction | null;
}

export interface DamageOption {
  readonly via: SkillInfo;
  readonly enabledLunarReactions: readonly LunarReaction[];
  // 以下属性在描述元素反应时有用，需要传入
  readonly callerWho: 0 | 1;
  readonly targetWho: 0 | 1;
  readonly targetIsActive: boolean;
}
export interface ApplyOption extends DamageOption {
  readonly fromDamage: DamageInfo | null;
}

export interface InternalHealOption {
  via: SkillInfo;
  kind: HealKind;
}

export interface DamageResult {
  readonly damageInfo: DamageInfo;
  readonly events: ReadonlyEventList;
}

export type InsertHandPayload =
  | (CreateEntityM & {
      target: { type: "hands" };
    })
  | (MoveEntityM & {
      target: { type: "hands" };
    });

export type InsertPilePayload =
  | Omit<CreateEntityM, "targetIndex">
  | Omit<MoveEntityM, "targetIndex">;

export interface InsertHandCardOption {
  /** 不执行爆牌逻辑；用于直接打出的场景（冒险/汤/烟谜主） */
  noOverflow?: boolean;
}

export interface CreateHandCardResult {
  readonly state: EntityState;
  readonly events: ReadonlyEventList;
}

export type InsertPileStrategy =
  | "top"
  | "bottom"
  | "random"
  | "spaceAround"
  | `topRange${number}`
  | `topIndex${number}`;

export class EventList extends Array<EventAndRequest> {
  private damageEventIndexInResultBasedOnTarget = new Map<number, number>();

  /**
   * 将引发的事件 `[event, arg]` 添加到事件列表中。
   * Note: 如果是伤害事件，则会基于伤害目标和先前的伤害事件合并。
   * @returns
   */
  override push(...items: EventAndRequest[]) {
    for (const item of items) {
      const [event, arg] = item;
      if (event === "onDamageOrHeal" && arg.isDamageTypeDamage()) {
        const previousIndex = this.damageEventIndexInResultBasedOnTarget.get(
          arg.target.id,
        );
        if (typeof previousIndex !== "undefined") {
          // combine current event with previous event
          const previousArg = this[
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
          this[previousIndex][1] = new DamageOrHealEventArg(
            previousArg.onTimeState,
            combinedDamageInfo,
            previousArg.option,
          );
          continue;
        } else {
          this.damageEventIndexInResultBasedOnTarget.set(
            arg.target.id,
            this.length,
          );
        }
      }
      super.push(item);
    }
    return this.length;
  }
}

export interface ReadonlyEventList extends ReadonlyArray<EventAndRequest> {}

declare global {
  interface Console {
    warn?(...data: any[]): void;
    trace?(): void;
  }
  var console: Console | undefined;
}

/**
 * 管理一个状态和状态的修改；同时也进行日志管理。
 *
 * - 当状态发生修改时，向日志输出；
 * - `notify` 方法会附加所有的修改信息。
 */
export class StateMutator {
  private _state: GameState;
  private _mutationsToBeNotified: Mutation[] = [];
  private _mutationsToBePause: Mutation[] = [];

  constructor(
    initialState: GameState,
    public readonly config: MutatorConfig,
  ) {
    this._state = initialState;
  }

  get state() {
    return this._state;
  }
  get logger() {
    return this.config.logger;
  }

  /**
   * Reset state with `newState`, notify mutations specified in `withMutations`.
   * @param newState
   * @param withMutations
   * @param notifyOpt
   */
  resetState(
    newState: GameState,
    withMutations: StateMutationAndExposedMutation,
    notifyOpt?: Omit<NotifyOption, "mutations">,
  ) {
    if (this._mutationsToBeNotified.length > 0) {
      console?.warn?.("Resetting state with pending mutations not notified");
      console?.warn?.(this._mutationsToBeNotified);
      console?.trace?.();
      // debugger;
    }
    this._state = newState;
    this._mutationsToBeNotified = [...withMutations.stateMutations];
    this._mutationsToBePause = [...withMutations.stateMutations];
    this.notify({
      ...notifyOpt,
      mutations: withMutations.exposedMutations,
    });
  }

  log(type: DetailLogType, value: string): void {
    return this.config.logger?.log(type, value);
  }
  subLog(type: DetailLogType, value: string) {
    return this.config.logger?.subLog(type, value);
  }

  mutate(mutation: Mutation) {
    this._state = applyMutation(this.state, mutation);
    const str = stringifyMutation(mutation);
    if (str) {
      this.log(DetailLogType.Mutation, str);
    }
    this._mutationsToBeNotified.push(mutation);
    this._mutationsToBePause.push(mutation);
  }

  private createNotifyInternalOption(opt: NotifyOption): InternalNotifyOption {
    const result = {
      state: this.state,
      canResume: opt.canResume ?? false,
      stateMutations: this._mutationsToBeNotified,
      exposedMutations: opt.mutations ?? [],
    };
    this._mutationsToBeNotified = [];
    return result;
  }
  private createPauseInternalOption(opt: NotifyOption): InternalPauseOption {
    const result = {
      state: this.state,
      canResume: opt.canResume ?? false,
      stateMutations: this._mutationsToBePause,
      exposedMutations: opt.mutations ?? [],
    };
    this._mutationsToBePause = [];
    return result;
  }

  notify(opt: NotifyOption = {}) {
    const internalOpt = this.createNotifyInternalOption(opt);
    if (
      opt.force ||
      internalOpt.stateMutations.length > 0 ||
      internalOpt.exposedMutations.length > 0
    ) {
      this.config.onNotify(internalOpt);
    }
  }
  async notifyAndPause(opt: NotifyOption = {}) {
    this.notify(opt);
    const internalPauseOpt = this.createPauseInternalOption(opt);
    await this.config.onPause(internalPauseOpt);
  }

  stepRandom(): number {
    const mut: StepRandomM = {
      type: "stepRandom",
      value: 0,
    };
    this.mutate(mut);
    return mut.value;
  }
  stepId(): number {
    const mut: StepIdM = {
      type: "stepId",
      value: 0,
    };
    this.mutate(mut);
    return mut.value;
  }

  randomDice(count: number, alwaysOmni?: boolean): readonly DiceType[] {
    if (alwaysOmni) {
      return new Array<DiceType>(count).fill(DiceType.Omni);
    }
    const result: DiceType[] = [];
    for (let i = 0; i < count; i++) {
      result.push((this.stepRandom() % 8) + 1);
    }
    return result;
  }

  // --- INLINE SKILL HANDLING ---

  private executeInlineSkill<Arg>(
    skillDescription: SkillDescription<Arg>,
    skill: SkillInfo,
    arg: Arg,
  ): ReadonlyEventList {
    this.notify();
    const [newState, { innerNotify, emittedEvents }] = skillDescription(
      this.state,
      skill,
      arg,
    );
    this.resetState(newState, innerNotify);
    return emittedEvents;
  }
  /* private */ handleInlineEvent<E extends InlineEventNames>(
    parentSkill: SkillInfo,
    event: E,
    arg: EventArgOf<E>,
  ): ReadonlyEventList {
    using l = this.subLog(
      DetailLogType.Event,
      `Handling inline event ${event} (${arg.toString()}):`,
    );
    const events = new EventList();
    const infos = allSkills(this.state, event).map<SkillInfo>(
      ({ caller, skill }) => ({
        caller,
        definition: skill,
        requestBy: null,
        charged: false,
        plunging: false,
        prepared: false,
        environment: parentSkill.environment,
      }),
    );
    for (const info of infos) {
      arg._currentSkillInfo = info;
      if (!(0, info.definition.filter)(this.state, info, arg as any)) {
        continue;
      }
      using l = this.subLog(
        DetailLogType.Skill,
        `Using skill [skill:${info.definition.id}]`,
      );
      const desc = info.definition.action as SkillDescription<EventArgOf<E>>;
      const emitted = this.executeInlineSkill(desc, info, arg);
      events.push(...emitted);
    }
    return events;
  }

  // --- BASIC MUTATIVE PRIMITIVES ---

  apply(
    target: CharacterState,
    type: NontrivialDamageType,
    opt: ApplyOption,
  ): ReadonlyEventList {
    if (!target.variables.alive) {
      return [];
    }
    const events = new EventList();
    const aura = target.variables.aura;
    const { newAura, reaction } = getReaction({
      type,
      targetAura: aura,
      enabledLunarReactions: opt.enabledLunarReactions,
    });
    this.mutate({
      type: "modifyEntityVar",
      state: target,
      varName: "aura",
      value: newAura,
      direction: null,
    });
    if (!opt.fromDamage) {
      this.notify({
        mutations: [
          {
            $case: "applyAura",
            elementType: type,
            targetId: target.id,
            targetDefinitionId: target.definition.id,
            reactionType: reaction ?? PbReactionType.UNSPECIFIED,
            oldAura: aura,
            newAura,
          },
        ],
      });
    }
    if (reaction !== null) {
      this.log(
        DetailLogType.Other,
        `Apply reaction ${reaction} to ${stringifyState(target)}`,
      );
      let reactionInfo: ReactionInfo = {
        target: target,
        type: reaction,
        via: opt.via,
        fromDamage: opt.fromDamage,
        cancelEffects: false,
        piercingOtherDamage: 1,
        postApply: null,
      };
      const modifyEventArg = new ModifyReactionEventArg(
        this.state,
        reactionInfo,
      );
      this.handleInlineEvent(opt.via, "modifyReaction", modifyEventArg);
      reactionInfo = modifyEventArg.reactionInfo;
      const reactionEvent = new ReactionEventArg(this.state, reactionInfo);
      this.mutate({
        type: "pushPhaseReactionLog",
        reactionEvent,
      });
      events.push(["onReaction", reactionEvent]);
      const reactionDescriptionEventArg: ReactionDescriptionEventArg = {
        where: opt.targetWho === opt.callerWho ? "my" : "opp",
        here: opt.targetWho === opt.callerWho ? "opp" : "my",
        id: target.id,
        isDamage: !!opt.fromDamage,
        isActive: opt.targetIsActive,
        piercingOtherDamage: reactionInfo.piercingOtherDamage,
      };
      const reactionDescription = getReactionDescription(reaction);
      if (!reactionInfo.cancelEffects && reactionDescription) {
        events.push(
          ...this.executeInlineSkill(
            reactionDescription,
            opt.via,
            reactionDescriptionEventArg,
          ),
        );
      }
      if (reactionInfo.postApply) {
        const { newAura: postAura } = getReaction({
          targetAura: newAura,
          type: reactionInfo.postApply,
          enabledLunarReactions: opt.enabledLunarReactions,
        });
        this.mutate({
          type: "modifyEntityVar",
          state: target,
          varName: "aura",
          value: postAura,
          direction: null,
        });
      }
    }
    return events;
  }

  heal(
    value: number,
    targetState: CharacterState,
    opt: InternalHealOption,
  ): ReadonlyEventList {
    const damageType = DamageType.Heal;
    const events = new EventList();
    if (!targetState.variables.alive) {
      if (opt.kind === "revive") {
        this.log(
          DetailLogType.Other,
          `Before healing ${stringifyState(targetState)}, revive him.`,
        );
        this.mutate({
          type: "modifyEntityVar",
          state: targetState,
          varName: "alive",
          value: 1,
          direction: "increase",
        });
        events.push([
          "onRevive",
          new CharacterEventArg(this.state, targetState),
        ]);
      } else {
        // Cannot apply non-revive heal on a dead character
        return [];
      }
    } else if (
      (targetState.variables.health === 0) !==
      (opt.kind === "immuneDefeated")
    ) {
      throw new GiTcgCoreInternalError(
        `Cannot apply heal kind '${opt.kind}' on character with health ${targetState.variables.health}.`,
      );
    }
    using l = this.subLog(
      DetailLogType.Primitive,
      `Heal ${value} to ${stringifyState(targetState)}`,
    );
    const targetInjury =
      targetState.variables.maxHealth - targetState.variables.health;
    const finalValue = Math.min(value, targetInjury);

    const healId = this.stepId();
    let healInfo: HealInfo = {
      id: healId,
      type: damageType,
      cancelled: false,
      expectedValue: value,
      value: finalValue,
      healKind: opt.kind,
      source: opt.via.caller,
      via: opt.via,
      target: targetState,
      causeDefeated: false,
      fromReaction: null,
    };
    const modifier = new GenericModifyHealEventArg(
      this.state,
      healInfo,
      "HEAL",
    );
    events.push(...this.handleInlineEvent(opt.via, "modifyHeal0", modifier));
    events.push(...this.handleInlineEvent(opt.via, "modifyHeal1", modifier));
    if (modifier.cancelled) {
      return events;
    }
    healInfo = modifier.healInfo;
    const newHealth =
      opt.kind === "immuneDefeated"
        ? healInfo.value
        : targetState.variables.health + healInfo.value;
    this.mutate({
      type: "modifyEntityVar",
      state: targetState,
      varName: "health",
      value: newHealth,
      direction: "increase",
    });
    this.notify({
      mutations: [
        {
          $case: "damage",
          damageType: healInfo.type,
          sourceId: opt.via.caller.id,
          sourceDefinitionId: opt.via.caller.definition.id,
          value: healInfo.value,
          targetId: targetState.id,
          targetDefinitionId: targetState.definition.id,
          isSkillMainDamage: false,
          reactionType: PbReactionType.UNSPECIFIED,
          causeDefeated: false,
          oldAura: targetState.variables.aura,
          newAura: targetState.variables.aura,
          oldHealth: targetState.variables.health,
          newHealth: targetState.variables.health + healInfo.value,
          healKind: exposeHealKind(healInfo.healKind),
        },
      ],
    });
    events.push([
      "onDamageOrHeal",
      new DamageOrHealEventArg(this.state, healInfo, "HEAL"),
    ]);
    return events;
  }

  damage(damageInfo: DamageInfo, opt: DamageOption) {
    const target = damageInfo.target;
    using l = this.subLog(
      DetailLogType.Primitive,
      `Deal ${damageInfo.value} [damage:${
        damageInfo.type
      }] damage to ${stringifyState(target)}`,
    );
    const events = new EventList();
    if (damageInfo.type !== DamageType.Piercing) {
      const modifier = new GenericModifyDamageEventArg(
        this.state,
        damageInfo,
        opt,
      );
      events.push(
        ...this.handleInlineEvent(opt.via, "modifyDamage0", modifier),
      );
      modifier.increaseDamageByReaction();
      events.push(
        ...this.handleInlineEvent(opt.via, "modifyDamage1", modifier),
      );
      events.push(
        ...this.handleInlineEvent(opt.via, "modifyDamage2", modifier),
      );
      events.push(
        ...this.handleInlineEvent(opt.via, "modifyDamage3", modifier),
      );
      damageInfo = modifier.damageInfo;
    }
    this.log(
      DetailLogType.Other,
      `Damage info: ${damageInfo.log || "(no modification)"}`,
    );
    const finalHealth = Math.max(0, target.variables.health - damageInfo.value);
    this.mutate({
      type: "modifyEntityVar",
      state: target,
      varName: "health",
      value: finalHealth,
      direction: "decrease",
    });
    if (target.variables.alive) {
      const { newAura, reaction } = getReaction({
        ...damageInfo,
        enabledLunarReactions: opt.enabledLunarReactions,
      });
      this.notify({
        mutations: [
          {
            $case: "damage",
            damageType: damageInfo.type,
            sourceId: damageInfo.source.id,
            sourceDefinitionId: damageInfo.source.definition.id,
            value: damageInfo.value,
            targetId: target.id,
            targetDefinitionId: target.definition.id,
            isSkillMainDamage: damageInfo.isSkillMainDamage,
            reactionType: reaction ?? PbReactionType.UNSPECIFIED,
            causeDefeated: damageInfo.causeDefeated,
            oldAura: damageInfo.targetAura,
            newAura,
            oldHealth: target.variables.health,
            newHealth: finalHealth,
            healKind: PbHealKind.NOT_A_HEAL,
          },
        ],
      });
    }
    const damageEvent = new DamageOrHealEventArg(this.state, damageInfo, opt);
    this.mutate({
      type: "pushPhaseDamageLog",
      damageEvent,
    });
    events.push(["onDamageOrHeal", damageEvent]);
    if (
      damageInfo.type !== DamageType.Physical &&
      damageInfo.type !== DamageType.Piercing
    ) {
      events.push(
        ...this.apply(target, damageInfo.type, {
          fromDamage: damageInfo,
          ...opt,
        }),
      );
    }
    return { damageInfo, events };
  }

  insertHandCard(
    payload: InsertHandPayload,
    opt: InsertHandCardOption = {},
  ): ReadonlyEventList {
    const who = payload.target.who;
    const reason =
      payload.type === "createEntity" ? ("create" as const) : payload.reason;
    this.mutate(payload);
    const state: EntityState = {
      ...payload.value,
      [StateSymbol]: "entity",
    };
    let overflowed = false;
    if (
      !opt.noOverflow &&
      this.state.players[who].hands.length > this.state.config.maxHandsCount
    ) {
      this.mutate({
        type: "removeEntity",
        from: payload.target,
        oldState: state,
        reason: "overflow",
      });
      overflowed = true;
    }
    return [
      [
        "onHandCardInserted",
        new HandCardInsertedEventArg(
          this.state,
          who,
          state,
          reason,
          overflowed,
        ),
      ],
    ];
  }

  drawCardsPlain(who: 0 | 1, count: number): ReadonlyEventList {
    const events = new EventList();
    for (let i = 0; i < count; i++) {
      const card = this.state.players[who].pile[0];
      if (!card) {
        continue;
      }
      events.push(
        ...this.insertHandCard({
          type: "moveEntity",
          from: { who, type: "pile", cardId: 0 },
          target: { who, type: "hands", cardId: 0 },
          value: card,
          reason: "draw",
        }),
      );
    }
    return events;
  }

  createHandCard(
    who: 0 | 1,
    definition: EntityDefinition,
    opt: InsertHandCardOption = {},
  ): CreateHandCardResult {
    if (
      !(["support", "equipment", "eventCard"] as EntityType[]).includes(
        definition.type,
      )
    ) {
      throw new GiTcgDataError(
        `Cannot create entity of type '${definition.type}' in hand.`,
      );
    }
    using l = this.subLog(
      DetailLogType.Primitive,
      `Create hand card [card:${definition.id}]`,
    );
    const cardState: EntityState = {
      [StateSymbol]: "entity",
      id: 0,
      definition,
      variables: Object.fromEntries(
        Object.entries(definition.varConfigs).map(
          ([name, { initialValue }]) => [name, initialValue] as const,
        ),
      ),
      attachments: [],
    };
    const events = this.insertHandCard(
      {
        type: "createEntity",
        target: { who, type: "hands", cardId: 0 },
        value: cardState,
      },
      opt,
    );
    return {
      state: cardState,
      events,
    };
  }

  insertPileCards(
    payloads: InsertPilePayload[],
    strategy: InsertPileStrategy,
    who: 0 | 1,
  ): ReadonlyEventList {
    const target: EntityArea = { who, type: "pile", cardId: 0 };
    const player = this.state.players[who];
    const pileCount = player.pile.length;
    payloads = payloads.slice(
      0,
      Math.max(0, this.state.config.maxPileCount - pileCount),
    );
    if (payloads.length === 0) {
      return [];
    }
    const count = payloads.length;
    switch (strategy) {
      case "top":
        for (const mut of payloads) {
          this.mutate({
            ...mut,
            target,
            targetIndex: 0,
          });
        }
        break;
      case "bottom":
        for (const mut of payloads) {
          const targetIndex = player.pile.length;
          this.mutate({
            ...mut,
            target,
            targetIndex,
          });
        }
        break;
      case "random":
        for (let i = 0; i < count; i++) {
          const randomValue = this.stepRandom();
          const index = randomValue % (player.pile.length + 1);
          this.mutate({
            ...payloads[i],
            target,
            targetIndex: index,
          });
        }
        break;
      case "spaceAround":
        const spaces = count + 1;
        const step = Math.floor(player.pile.length / spaces);
        const rest = player.pile.length % spaces;
        for (let i = 0, j = step; i < count; i++, j += step) {
          if (i < rest) {
            j++;
          }
          this.mutate({
            ...payloads[i],
            target,
            targetIndex: i + j,
          });
        }
        break;
      default: {
        if (strategy.startsWith("topRange")) {
          let range = Number(strategy.slice(8));
          if (Number.isNaN(range)) {
            throw new GiTcgDataError(`Invalid strategy ${strategy}`);
          }
          range = Math.min(range, player.pile.length);
          for (let i = 0; i < count; i++) {
            const randomValue = this.stepRandom();
            const index = randomValue % range;
            this.mutate({
              ...payloads[i],
              target,
              targetIndex: index,
            });
          }
        } else if (strategy.startsWith("topIndex")) {
          let index = Number(strategy.slice(8));
          if (Number.isNaN(index)) {
            throw new GiTcgDataError(`Invalid strategy ${strategy}`);
          }
          index = Math.min(index, player.pile.length);
          for (let i = 0; i < count; i++) {
            this.mutate({
              ...payloads[i],
              target,
              targetIndex: index,
            });
          }
        } else {
          throw new GiTcgDataError(`Invalid strategy ${strategy}`);
        }
      }
    }
    return [];
  }

  insertEntityOnStage(
    stateOrDef: EntityState | { definition: EntityDefinition },
    area: EntityArea,
    opt: InsertEntityOptions = {},
  ): InsertEntityResult {
    if (area.type === "hands" || area.type === "pile") {
      throw new GiTcgDataError(
        `insertEntityOnStage is for the 'on stage' area, not for hands or pile.
- For action cards, use createHandCard or insertPileCards instead.
- For attachments, use createAttachment instead.`,
      );
    }
    const { definition } = stateOrDef;
    const events = new EventList();

    using l = this.subLog(
      DetailLogType.Primitive,
      `Insert entity [${definition.type}:${
        definition.id
      }] at ${stringifyEntityArea(area)}`,
    );
    const entitiesAtArea = allEntitiesAtArea(this.state, area) as EntityState[];
    // handle immuneControl vs disableSkill;
    // do not generate Frozen etc. on those characters
    const immuneControl = entitiesAtArea.find(
      (e) =>
        e.definition.type === "status" &&
        e.definition.tags.includes("immuneControl"),
    );
    if (
      immuneControl &&
      definition.type === "status" &&
      definition.tags.includes("disableSkill")
    ) {
      this.log(
        DetailLogType.Other,
        "Because of immuneControl, entities with disableSkill cannot be created",
      );
      return { oldState: null, newState: null, events: [] };
    }
    const oldState = shouldEnterOverride(entitiesAtArea, definition);
    const newVariables = getInsertedStateVariables({
      state: this.state,
      oldState,
      newStateTemplate: stateOrDef as any,
      opt,
    });

    let newStateId: number;
    const moveFrom =
      "id" in stateOrDef ? getEntityArea(this.state, stateOrDef.id) : null;
    // 移入场上，触发 onEnter
    const shouldEmitEnter =
      moveFrom === null ||
      moveFrom.type === "hands" ||
      moveFrom.type === "pile";

    if (oldState) {
      if (moveFrom) {
        this.mutate({
          type: "removeEntity",
          from: moveFrom,
          oldState: stateOrDef as EntityState,
          reason:
            opt.moveReason === "equip"
              ? "equipOverridden"
              : opt.moveReason === "createSupport"
                ? "createSupportOverridden"
                : "other",
        });
      }

      this.log(
        DetailLogType.Other,
        `Found existing entity ${stringifyState(
          oldState,
        )} at same area. Rewriting variables`,
      );
      for (const [varName, value] of Object.entries(newVariables)) {
        const oldValue = oldState.variables[varName];
        this.mutate({
          type: "modifyEntityVar",
          state: oldState,
          varName,
          value,
          direction: "increase",
        });
      }
      newStateId = oldState.id;
    } else {
      if (
        area.type === "summons" &&
        entitiesAtArea.length >= this.state.config.maxSummonsCount
      ) {
        return { oldState: null, newState: null, events: [] };
      }
      if (
        area.type === "supports" &&
        entitiesAtArea.length >= this.state.config.maxSupportsCount
      ) {
        return { oldState: null, newState: null, events: [] };
      }

      if (moveFrom) {
        const state = stateOrDef as EntityState;
        for (const attachment of state.attachments) {
          this.mutate({
            type: "removeEntity",
            from: moveFrom,
            oldState: attachment,
            reason: "other", // TODO maybe better reason?
          });
        }
        this.mutate({
          type: "moveEntity",
          from: moveFrom,
          target: area,
          value: state,
          reason: opt.moveReason ?? "other",
        });
        newStateId = state.id;
      } else {
        const stateTemplate: EntityState = {
          [StateSymbol]: "entity",
          id: 0,
          definition,
          variables: newVariables,
          attachments: [],
        };
        this.mutate({
          type: "createEntity",
          target: area,
          value: stateTemplate,
        });
        newStateId = stateTemplate.id;
      }
    }
    const newState = getEntityById(this.state, newStateId) as EntityState;
    if (shouldEmitEnter) {
      events.push([
        "onEnter",
        new EnterEventArg(this.state, {
          overridden: oldState,
          newState,
        }),
      ]);
    }
    return { oldState, newState, events };
  }
  createAttachment(
    host: EntityState,
    definition: AttachmentDefinition,
    opt: CreateEntityOptions,
  ) {
    using l = this.subLog(
      DetailLogType.Primitive,
      `Create attachment [attachment:${definition.id}] on ${stringifyState(
        host,
      )}`,
    );
    const target = getEntityArea(this.state, host.id);
    if (target.type !== "hands" && target.type !== "pile") {
      throw new GiTcgDataError(
        `Attachments can only be created on hand or pile entities.`,
      );
    }
    const oldState = shouldEnterOverride(host.attachments, definition);
    const newVariables = getInsertedStateVariables({
      state: this.state,
      oldState,
      newStateTemplate: { definition },
      opt,
    });
    let newStateId: number;
    const events = new EventList();
    if (oldState) {
      this.log(
        DetailLogType.Other,
        `Found existing attachment ${stringifyState(
          oldState,
        )} on same host. Rewriting variables`,
      );
      for (const [varName, value] of Object.entries(newVariables)) {
        this.mutate({
          type: "modifyEntityVar",
          state: oldState,
          varName,
          value,
          direction: "increase",
        });
      }
      newStateId = oldState.id;
    } else {
      const stateTemplate: AttachmentState = {
        [StateSymbol]: "attachment",
        id: 0,
        definition,
        variables: newVariables,
      };
      this.mutate({
        type: "createAttachment",
        target,
        value: stateTemplate,
      });
      newStateId = stateTemplate.id;
    }
    const newState = getEntityById(this.state, newStateId) as AttachmentState;
    events.push([
      "onEnter",
      new EnterEventArg(this.state, {
        overridden: oldState,
        newState,
      }),
    ]);
    return { oldState, newState, events };
  }

  switchActive(
    who: 0 | 1,
    target: CharacterState,
    opt: SwitchActiveOption = {},
  ): ReadonlyEventList {
    let from: CharacterState | null;
    if (this.state.players[who].activeCharacterId === 0) {
      from = null;
    } else {
      from =
        this.state.players[who].characters[
          getActiveCharacterIndex(this.state.players[who])
        ];
    }
    if (from?.id === target.id) {
      return [];
    }
    let immuneControlStatus: EntityState | undefined;
    if (
      opt.via &&
      (immuneControlStatus = from?.entities.find((st) =>
        st.definition.tags.includes("immuneControl"),
      ))
    ) {
      this.log(
        DetailLogType.Other,
        `Switch active from ${
          from ? stringifyState(from) : "(null)"
        } to ${stringifyState(target)}, but ${stringifyState(
          immuneControlStatus,
        )} disabled this!`,
      );
      return [];
    }
    using l = this.subLog(
      DetailLogType.Primitive,
      `Switch active from ${
        from ? stringifyState(from) : "(null)"
      } to ${stringifyState(target)}`,
    );
    this.mutate({
      type: "switchActive",
      who,
      value: target,
    });
    const fromReaction = opt.fromReaction ?? null;
    const switchInfo: SwitchActiveInfo = {
      type: "switchActive",
      who,
      from,
      via: opt.via,
      to: target,
      fromReaction: fromReaction !== null,
      fast: opt.fast ?? null,
    };
    this.postSwitchActive(switchInfo);
    return [
      ["onSwitchActive", new SwitchActiveEventArg(this.state, switchInfo)],
    ];
  }

  private postSwitchActive(switchInfo: SwitchActiveInfo) {
    // 处理切人时额外的操作：
    // - 通知前端
    // - 设置下落攻击 flag
    this.notify({
      mutations: [
        {
          $case: "switchActive",
          who: switchInfo.who,
          characterId: switchInfo.to.id,
          characterDefinitionId: switchInfo.to.definition.id,
          viaSkillDefinitionId: switchInfo.fromReaction
            ? Reaction.Overloaded
            : switchInfo.via
              ? Math.floor(switchInfo.via.definition.id)
              : void 0,
          fromAction:
            switchInfo.fast === null
              ? PbSwitchActiveFromAction.NONE
              : switchInfo.fast
                ? PbSwitchActiveFromAction.FAST
                : PbSwitchActiveFromAction.SLOW,
        },
      ],
    });
    this.mutate({
      type: "setPlayerFlag",
      who: switchInfo.who,
      flagName: "canPlunging",
      value: true,
    });
  }

  // --- ASYNC OPERATIONS ---

  async reroll(who: 0 | 1, times: number) {
    const howToReroll = this.config.howToReroll;
    if (!howToReroll) {
      throw new GiTcgIoNotProvideError();
    }
    for (let i = 0; i < times; i++) {
      const oldDice = [...this.state.players[who].dice];
      const diceToReroll: readonly number[] = await howToReroll(who);
      if (diceToReroll.length === 0) {
        return;
      }
      for (const dice of diceToReroll) {
        const index = oldDice.indexOf(dice);
        if (index === -1) {
          throw new GiTcgIoError(
            who,
            `Requested to-be-rerolled dice ${dice} does not exists`,
          );
        }
        oldDice.splice(index, 1);
      }
      this.mutate({
        type: "resetDice",
        who,
        value: sortDice(this.state.players[who], [
          ...oldDice,
          ...this.randomDice(diceToReroll.length),
        ]),
        reason: "roll",
      });
      this.notify();
    }
  }

  async switchHands(who: 0 | 1): Promise<ReadonlyEventList> {
    if (!this.config.howToSwitchHands) {
      throw new GiTcgIoNotProvideError();
    }
    const removedHands = await this.config.howToSwitchHands(who);
    const player = () => this.state.players[who];
    // swapIn: 从手牌到牌堆
    // swapOut: 从牌堆到手牌
    const count = removedHands.length;
    const swapInCards = removedHands.map((id) => {
      const card = player().hands.find((c) => c.id === id);
      if (typeof card === "undefined") {
        throw new GiTcgIoError(who, `switchHands return unknown card ${id}`);
      }
      return card;
    });
    const swapInCardIds = swapInCards.map((c) => c.definition.id);

    const events = new EventList();

    for (const card of swapInCards) {
      const randomValue = this.stepRandom();
      const index = randomValue % (player().pile.length + 1);
      this.mutate({
        type: "moveEntity",
        from: { who, type: "hands", cardId: card.id },
        target: { who, type: "pile", cardId: card.id },
        value: card,
        targetIndex: index,
        reason: "switch",
      });
    }
    // 如果牌堆顶的手牌是刚刚换入的同名牌，那么暂时不选它
    let topIndex = 0;
    for (let i = 0; i < count; i++) {
      let candidate: EntityState;
      while (
        topIndex < player().pile.length &&
        swapInCardIds.includes(player().pile[topIndex].definition.id)
      ) {
        topIndex++;
      }
      if (topIndex >= player().pile.length) {
        // 已经跳过了所有同名牌，只能从头开始
        candidate = player().pile[0];
      } else {
        candidate = player().pile[topIndex];
      }
      this.mutate({
        type: "moveEntity",
        from: { who, type: "pile", cardId: candidate.id },
        target: { who, type: "hands", cardId: candidate.id },
        value: candidate,
        reason: "switch",
      });
      events.push([
        "onHandCardInserted",
        new HandCardInsertedEventArg(
          this.state,
          who,
          candidate,
          "switch",
          false,
        ),
      ]);
    }
    this.notify();
    return events;
  }

  async selectCard(
    who: 0 | 1,
    via: SkillInfo,
    info: SelectCardInfo,
  ): Promise<ReadonlyEventList> {
    if (!this.config.howToSelectCard) {
      throw new GiTcgIoNotProvideError();
    }
    const selected = await this.config.howToSelectCard(
      who,
      info.cards.map((def) => def.id),
    );
    switch (info.type) {
      case "createHandCard": {
        const def = this.state.data.entities.get(selected);
        if (!def) {
          throw new GiTcgDataError(`Unknown card definition id ${selected}`);
        }
        assertValidActionCard(def);
        return this.createHandCard(who, def).events;
      }
      case "createEntity": {
        const def = this.state.data.entities.get(selected);
        if (!def) {
          throw new GiTcgDataError(`Unknown card definition id ${selected}`);
        }
        if (def.type !== "summon") {
          throw new GiTcgDataError(`Entity type ${def.type} not supported now`);
        }
        const entityArea: EntityArea = {
          who,
          type: "summons",
        };
        const { oldState, newState } = this.insertEntityOnStage(
          { definition: def },
          entityArea,
        );
        if (newState) {
          const enterInfo = {
            overridden: oldState,
            newState,
          };
          return [["onEnter", new EnterEventArg(this.state, enterInfo)]];
        } else {
          return [];
        }
      }
      case "requestPlayCard": {
        const cardDefinition = this.state.data.entities.get(selected);
        if (!cardDefinition) {
          throw new GiTcgDataError(`Unknown card definition id ${selected}`);
        }
        assertValidActionCard(cardDefinition);
        return [
          [
            "requestPlayCard",
            new PlayCardRequestArg(via, who, cardDefinition, info.targets),
          ],
        ];
      }
      default: {
        const _: never = info;
        throw new GiTcgDataError(`Not recognized selectCard type`);
      }
    }
  }

  async chooseActive(who: 0 | 1): Promise<CharacterState> {
    if (!this.config.howToChooseActive) {
      throw new GiTcgIoNotProvideError();
    }
    const player = this.state.players[who];
    const candidates = player.characters.filter(
      (ch) => ch.variables.alive && ch.id !== player.activeCharacterId,
    );
    if (candidates.length === 0) {
      throw new GiTcgCoreInternalError(
        `No available candidate active character for player ${who}.`,
      );
    }
    const activeChId = await this.config.howToChooseActive(
      who,
      candidates.map((c) => c.id),
    );
    return getEntityById(this.state, activeChId) as CharacterState;
  }

  /** notify 'chooseActiveDone' */
  postChooseActive(
    p0chosen: CharacterState | null,
    p1chosen: CharacterState | null,
  ) {
    const states = [p0chosen, p1chosen] as const;
    for (const who of [0, 1] as const) {
      const state = states[who];
      if (!state) {
        continue;
      }
      this.notify({
        mutations: [
          {
            $case: "chooseActiveDone",
            who,
            characterId: state.id,
            characterDefinitionId: state.definition.id,
          },
        ],
      });
    }
  }
}
