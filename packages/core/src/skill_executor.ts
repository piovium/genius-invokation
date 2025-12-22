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

import {
  type DamageInfo,
  DamageOrHealEventArg,
  defineSkillInfo,
  DisposeEventArg,
  type Event,
  type EventAndRequest,
  EventArg,
  type InitiativeSkillEventArg,
  RequestArg,
  SelectCardEventArg,
  type SelectCardInfo,
  type SkillInfo,
  type SwitchActiveInfo,
  type TriggeredSkillDefinition,
  UseSkillEventArg,
  ZeroHealthEventArg,
} from "./base/skill";
import {
  type AnyState,
  type CharacterState,
  StateSymbol,
  stringifyState,
} from "./base/state";
import { Aura, PbSkillType, type ExposedMutation } from "@gi-tcg/typings";
import {
  allSkills,
  type CallerAndTriggeredSkill,
  checkImmune,
  getActiveCharacterIndex,
  getEntityArea,
  getEntityById,
  initiativeSkillsOfPlayer,
  isCharacterInitiativeSkill,
  isChargedPlunging,
  isSkillDisabled,
  playSkillOfCard,
} from "./utils";
import { flip } from "@gi-tcg/utils";
import { DetailLogType } from "./log";
import { StateMutator } from "./mutator";
import type { Mutation } from "./base/mutation";

export type GeneralSkillArg = EventArg | InitiativeSkillEventArg;

interface SkillExecutorConfig {
  readonly preview: boolean;
}

export class SkillExecutor {
  constructor(
    private mutator: StateMutator,
    private readonly config: SkillExecutorConfig,
  ) {}

  get state() {
    return this.mutator.state;
  }

  private mutate(mutation: Mutation) {
    this.mutator.mutate(mutation);
  }

  /**
   * 执行并应用技能效果，返回执行过程中触发的事件列表
   * @param skillInfo
   * @param arg
   * @returns
   */
  private executeSkill(
    skillInfo: SkillInfo,
    arg: GeneralSkillArg,
  ): readonly EventAndRequest[] {
    if (this.state.phase === "gameEnd") {
      return [];
    }
    using l = this.mutator.subLog(
      DetailLogType.Skill,
      `Using skill [skill:${skillInfo.definition.id}]${
        skillInfo.charged ? " (charged)" : ""
      }${skillInfo.plunging ? " (plunging)" : ""}`,
    );
    this.mutator.log(
      DetailLogType.Other,
      `skill caller: ${stringifyState(skillInfo.caller)}`,
    );
    const skillDef = skillInfo.definition;
    const { who } = getEntityArea(this.state, skillInfo.caller.id);

    // 重置下落攻击判定。
    // 官方描述：“角色被切换为「出战角色」后，本回合内的下一次使用技能（非特技）若为「普通攻击」，则被视为「下落攻击」”
    // 本次技能使用后便不再判定下落攻击， canPlunging 更新为 false
    if (isCharacterInitiativeSkill(skillInfo)) {
      this.mutate({
        type: "setPlayerFlag",
        who,
        flagName: "canPlunging",
        value: false,
      });
    }

    const oldState = this.state;
    this.mutator.notify();
    const [newState, { innerNotify, emittedEvents }] = (0, skillDef.action)(
      this.state,
      {
        ...skillInfo,
        isPreview: this.config.preview,
        logger: this.mutator.logger,
      },
      arg as any,
    );

    const prependMutations: ExposedMutation[] = [];
    if (
      skillDef.ownerType !== "extension" &&
      skillDef.initiativeSkillConfig?.skillType !== "playCard"
    ) {
      let skillType: PbSkillType;
      switch (skillDef.initiativeSkillConfig?.skillType) {
        case "normal":
          skillType = PbSkillType.NORMAL;
          break;
        case "elemental":
          skillType = PbSkillType.ELEMENTAL;
          break;
        case "burst":
          skillType = PbSkillType.BURST;
          break;
        case "technique":
          skillType = PbSkillType.TECHNIQUE;
          break;
        default: {
          if (skillInfo.caller.definition.type === "character") {
            skillType = PbSkillType.CHARACTER_PASSIVE;
          } else {
            skillType = PbSkillType.TRIGGERED;
          }
        }
      }
      if (skillDef.initiativeSkillConfig || newState !== oldState) {
        prependMutations.push({
          $case: "skillUsed",
          who,
          callerId: skillInfo.caller.id,
          callerDefinitionId: skillInfo.caller.definition.id,
          skillDefinitionId: skillDef.id,
          skillType,
          triggeredOn: skillDef.triggerOn,
        });
      }
    }

    innerNotify.exposedMutations.unshift(...prependMutations);
    this.mutator.resetState(newState, innerNotify);

    return emittedEvents;
  }

  async finalizeSkill(
    skillInfo: SkillInfo,
    arg: GeneralSkillArg,
  ): Promise<void> {
    if (this.state.phase === "gameEnd") {
      return;
    }
    let emittedEvents = [...this.executeSkill(skillInfo, arg)];
    await this.mutator.notifyAndPause();

    const nonDamageEvents: EventAndRequest[] = [];
    const safeDamageEvents: DamageOrHealEventArg<DamageInfo>[] = [];
    const criticalDamageEvents: DamageOrHealEventArg<DamageInfo>[] = [];

    do {
      const damageEventArgs: DamageOrHealEventArg<DamageInfo>[] = [];
      const zeroHealthEventArgs: ZeroHealthEventArg[] = [];

      const failedPlayers = new Set<0 | 1>();

      // 将 emittedEvents 分成 nonDamage 和 damage 两类，
      // 同时收集 zeroHealth 以处理击倒和免于被击倒
      for (const event of emittedEvents) {
        const [name, arg] = event;
        if (name === "onDamageOrHeal" && arg.isDamageTypeDamage()) {
          if (arg.damageInfo.causeDefeated) {
            // Wrap original EventArg to ZeroHealthEventArg
            const zeroHealthEventArg = new ZeroHealthEventArg(
              arg.onTimeState,
              arg.damageInfo,
            );
            if (checkImmune(this.state, zeroHealthEventArg)) {
              zeroHealthEventArgs.push(zeroHealthEventArg);
            } else {
              const { id } = arg.target;
              const ch = getEntityById(this.state, id) as CharacterState;
              const { who } = getEntityArea(this.state, id);
              if (ch.variables.alive) {
                this.mutator.log(
                  DetailLogType.Primitive,
                  `${stringifyState(ch)} is defeated (and no immune available)`,
                );
                this.mutate({
                  type: "modifyEntityVar",
                  state: ch,
                  varName: "alive",
                  value: 0,
                  direction: "decrease",
                });
                const energyVarName =
                  ch.definition.specialEnergy?.variableName ?? "energy";
                this.mutate({
                  type: "modifyEntityVar",
                  state: ch,
                  varName: energyVarName,
                  value: 0,
                  direction: "decrease",
                });
                this.mutate({
                  type: "modifyEntityVar",
                  state: ch,
                  varName: "aura",
                  value: Aura.None,
                  direction: null,
                });
                this.mutate({
                  type: "setPlayerFlag",
                  who,
                  flagName: "hasDefeated",
                  value: true,
                });
                const player = this.state.players[who];
                const aliveCharacters = player.characters.filter(
                  (ch) => ch.variables.alive,
                );
                if (aliveCharacters.length === 0) {
                  failedPlayers.add(who);
                }
              }
            }
            damageEventArgs.push(zeroHealthEventArg);
          } else {
            damageEventArgs.push(arg);
          }
        } else {
          nonDamageEvents.push(event);
        }
      }

      if (failedPlayers.size === 2) {
        this.mutator.log(
          DetailLogType.Other,
          `Both player has no alive characters, set winner to null`,
        );
        this.mutate({
          type: "changePhase",
          newPhase: "gameEnd",
        });
        await this.mutator.notifyAndPause();
        return;
      } else if (failedPlayers.size === 1) {
        const who = [...failedPlayers.values()][0];
        this.mutator.log(
          DetailLogType.Other,
          `player ${who} has no alive characters, set winner to ${flip(who)}`,
        );
        this.mutate({
          type: "changePhase",
          newPhase: "gameEnd",
        });
        this.mutate({
          type: "setWinner",
          winner: flip(who),
        });
        await this.mutator.notifyAndPause();
        return;
      }

      for (const event of damageEventArgs) {
        if (event.damageInfo.causeDefeated) {
          criticalDamageEvents.push(event);
        } else {
          safeDamageEvents.push(event);
        }
      }

      if (criticalDamageEvents.length > 0) {
        await this.mutator.notifyAndPause();
      }

      // 继续收集在执行免于被击倒的 onDamageOrHeal 响应时产生的事件
      emittedEvents = [];
      for (const arg of zeroHealthEventArgs) {
        emittedEvents.push(
          ...this.handleEventShallow(["modifyZeroHealth", arg]),
        );
        if (arg._immuneInfo !== null) {
          const { skill: via, newHealth } = arg._immuneInfo;
          this.mutator.log(
            DetailLogType.Primitive,
            `${stringifyState(
              arg.target,
            )} is immune to defeated. Revive him to ${newHealth}`,
          );
          const ch = getEntityById(this.state, arg.target.id) as CharacterState;
          const events = this.mutator.heal(newHealth, ch, {
            via,
            kind: "immuneDefeated",
          });
          await this.mutator.notifyAndPause();
          emittedEvents.push(...this.handleEventShallow(...events));
        }
      }
    } while (emittedEvents.length > 0);

    if (
      skillInfo.caller.definition.type === "character" &&
      skillInfo.definition.triggerOn === "initiative"
    ) {
      // 增加此回合技能计数
      const ch = getEntityById(
        this.state,
        skillInfo.caller.id,
      ) as CharacterState;
      this.mutate({
        type: "pushRoundSkillLog",
        // intentional bug here: 使用技能发起时的定义 id 而非当前的定义 id
        // e.g. 艾琳不会对导致变身的若陀龙王的技能计数
        caller: /* ch */ skillInfo.caller as CharacterState,
        skillId: skillInfo.definition.id,
      });
      // 增加充能
      if (skillInfo.definition.initiativeSkillConfig.gainEnergy) {
        if (ch.variables.alive && !ch.definition.specialEnergy) {
          this.mutator.log(
            DetailLogType.Other,
            `using skill gain 1 energy for ${stringifyState(ch)}`,
          );
          const currentEnergy = ch.variables.energy;
          const newEnergy = Math.min(currentEnergy + 1, ch.variables.maxEnergy);
          this.mutate({
            type: "modifyEntityVar",
            state: ch,
            varName: "energy",
            value: newEnergy,
            direction: "increase",
          });
          await this.mutator.notifyAndPause();
        }
      }
    }

    await this.handleEvent(...nonDamageEvents);
    for (const arg of safeDamageEvents) {
      await this.handleEvent(["onDamageOrHeal", arg]);
    }
    for (const arg of criticalDamageEvents) {
      await this.handleEvent(["onDamageOrHeal", arg]);
    }
    // 接下来处理出战角色倒下后的切人
    // 仅当本次技能的使用造成倒下时才会处理
    if (criticalDamageEvents.length === 0) {
      return;
    }
    const switchPromises: [
      null | Promise<SwitchActiveInfo>,
      null | Promise<SwitchActiveInfo>,
    ] = [null, null];
    for (const who of [0, 1] as const) {
      const player = this.state.players[who];
      const [activeCh] = player.characters.shiftLeft(
        getActiveCharacterIndex(player),
      );
      if (activeCh.variables.alive) {
        continue;
      }
      this.mutator.log(
        DetailLogType.Other,
        `Active character of player ${who} is defeated. Waiting user choice`,
      );
      switchPromises[who] = this.mutator.chooseActive(who).then((to) => ({
        type: "switchActive",
        who,
        from: activeCh,
        to,
        fromReaction: false,
        fast: null,
      }));
    }
    const switchInfos = await Promise.all(switchPromises);
    this.mutator.postChooseActive(
      ...switchInfos.map((info) => info?.to ?? null),
    );
    const currentTurn = this.state.currentTurn;
    const switchEvents: EventAndRequest[][] = [[], []];
    for (const info of switchInfos) {
      if (info) {
        using l = this.mutator.subLog(
          DetailLogType.Primitive,
          `Player ${info.who} switch active from ${
            info.from ? stringifyState(info.from) : "(null)"
          } to ${stringifyState(info.to)}`,
        );
        switchEvents[info.who].push(
          ...this.mutator.switchActive(info.who, info.to),
        );
      }
    }
    for (const who of [currentTurn, flip(currentTurn)]) {
      await this.handleEvent(...switchEvents[who]);
    }
  }

  /**
   * 将事件广播到当前棋盘，查找响应该事件的全部技能定义
   * @param event
   * @returns 响应该事件的技能定义及其 caller 的列表
   */
  private broadcastEvent(event: Event) {
    const [name, arg] = event;
    const callerAndSkills: CallerAndTriggeredSkill[] = [];
    // 对于弃置事件，额外地使被弃置的实体本身也能响应
    if (arg instanceof DisposeEventArg) {
      const caller = arg.entity as AnyState;
      const onDisposeSkills = caller.definition.skills.filter(
        (sk): sk is TriggeredSkillDefinition => sk.triggerOn === name,
      );
      callerAndSkills.push(
        ...onDisposeSkills.map((skill) => ({ caller, skill })),
      );
    }
    // 收集其它待响应技能
    callerAndSkills.push(...allSkills(this.state, name));
    return callerAndSkills;
  }

  /**
   * 执行监听 `event` 事件的技能。此过程并不结算这些技能：技能中引发的级联事件将作为结果返回。
   * @param event
   * @returns
   */
  private handleEventShallow(...events: EventAndRequest[]): EventAndRequest[] {
    const result: EventAndRequest[] = [];
    for (const event of events) {
      const [name, arg] = event;
      if (arg instanceof RequestArg) {
        result.push(event);
        continue;
      }
      using guard = this.createHandleEventNotifies(name);
      const callerAndSkills = this.broadcastEvent(event as Event);
      for (const { caller, skill } of callerAndSkills) {
        const skillInfo = defineSkillInfo({
          caller,
          definition: skill,
        });
        arg._currentSkillInfo = skillInfo;
        if (!(0, skill.filter)(this.state, skillInfo, arg)) {
          continue;
        }
        const emittedEvents = this.executeSkill(skillInfo, arg);
        result.push(...emittedEvents);
      }
    }
    return result;
  }

  private createHandleEventNotifies(name: string) {
    this.mutator.notify({
      mutations: [
        {
          $case: "handleEvent",
          isClose: false,
          eventName: name,
        },
      ],
    });
    return {
      [Symbol.dispose]: () => {
        this.mutator.notify({
          mutations: [
            {
              $case: "handleEvent",
              isClose: true,
              eventName: name,
            },
          ],
        });
      },
    };
  }

  /**
   * 处理事件 `events`。监听它们的技能将会被递归结算。
   * @param events
   */
  async handleEvent(...events: EventAndRequest[]) {
    for (const event of events) {
      const [name, arg] = event;
      using guard = this.createHandleEventNotifies(name);
      if (name === "requestReroll") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to reroll`,
        );
        await this.mutator.reroll(arg.who, arg.times);
      } else if (name === "requestSwitchHands") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to switch hands`,
        );
        const events = await this.mutator.switchHands(arg.who);
        await this.handleEvent(...events);
      } else if (name === "requestSelectCard") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to select card`,
        );
        const events = await this.mutator.selectCard(
          arg.who,
          arg.via,
          arg.info,
        );
        await this.handleEvent(...events);
        await this.handleEvent([
          "onSelectCard",
          new SelectCardEventArg(this.state, arg.who, arg.info),
        ]);
      } else if (name === "requestUseSkill") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `another skill [skill:${arg.requestingSkillId}] is requested:`,
        );
        const player = this.state.players[arg.who];
        const availableSkills = initiativeSkillsOfPlayer(player, true);
        const activeCh = player.characters[getActiveCharacterIndex(player)];
        const skillDisabled = isSkillDisabled(activeCh);
        if (skillDisabled) {
          this.mutator.log(
            DetailLogType.Other,
            `Skill [skill:${
              arg.requestingSkillId
            }] (requested by ${stringifyState(
              arg.via.caller,
            )}) is requested, but current active character ${stringifyState(
              activeCh,
            )} is marked as skill-disabled`,
          );
          continue;
        }
        const skillAndCaller = availableSkills.find(
          ({ skill }) => skill.id === arg.requestingSkillId,
        );
        if (!skillAndCaller) {
          this.mutator.log(
            DetailLogType.Other,
            `Skill [skill:${
              arg.requestingSkillId
            }] (requested by ${stringifyState(
              arg.via.caller,
            )}) is not available on current active character ${stringifyState(
              activeCh,
            )}`,
          );
          continue;
        }
        const { caller, skill } = skillAndCaller;
        const { charged, plunging } = isChargedPlunging(skill, player);
        const skillInfo = defineSkillInfo({
          caller,
          definition: skill,
          requestBy: arg.via,
          charged,
          plunging,
          prepared: arg.requestOption.asPrepared ?? false,
        });
        const callerArea = getEntityArea(this.state, caller.id);
        await this.handleEvent([
          "onBeforeUseSkill",
          new UseSkillEventArg(this.state, callerArea, skillInfo),
        ]);
        await this.finalizeSkill(skillInfo, { targets: [] });
        await this.handleEvent([
          "onUseSkill",
          new UseSkillEventArg(this.state, callerArea, skillInfo),
        ]);
      } else if (name === "requestPlayCard") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to play card [card:${arg.cardDefinition.id}]`,
        );

        // 临时将这张卡放到我方手牌，随后执行其打出后效果
        const { state } = this.mutator.createHandCard(
          arg.who,
          arg.cardDefinition,
          {
            noOverflow: true,
          },
        );
        const skillDef = playSkillOfCard(state.definition);
        if (!skillDef) {
          this.mutator.log(
            DetailLogType.Other,
            `Card [card:${arg.cardDefinition.id}] has no play skill, skip playing`,
          );
          continue;
        }
        const skillInfo = defineSkillInfo({
          caller: state,
          definition: skillDef,
          requestBy: arg.via,
        });
        await this.finalizeSkill(skillInfo, { targets: arg.targets });
      } else if (name === "requestAdventure") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `request player ${arg.who} to adventure`,
        );
        const hisSupports = this.state.players[arg.who].supports;
        const currentSpot = hisSupports.find((et) =>
          et.definition.tags.includes("adventureSpot"),
        );
        if (currentSpot) {
          const { events } = this.mutator.insertEntityOnStage(
            { definition: currentSpot.definition },
            {
              type: "supports",
              who: arg.who,
            },
            {
              modifyOverriddenVariablesOnly: true,
              overrideVariables: {
                exp: 1,
              },
            },
          );
          await this.handleEvent(...events);
        } else if (hisSupports.length < this.state.config.maxSupportsCount) {
          const spots = this.state.data.entities
            .values()
            .filter((d) => d.tags.includes("adventureSpot"))
            .toArray();
          const selectCardInfo: SelectCardInfo = {
            type: "requestPlayCard",
            cards: spots,
            targets: [],
          };
          const events = await this.mutator.selectCard(
            arg.who,
            arg.via,
            selectCardInfo,
          );
          await this.handleEvent(...events);
          await this.handleEvent([
            "onSelectCard",
            new SelectCardEventArg(this.state, arg.who, selectCardInfo),
          ]);
        }
      } else if (name === "requestTriggerEndPhaseSkill") {
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `Triggering end phase skills of ${arg.requestedEntity}`,
        );
        for (const skill of arg.requestedEntity.definition.skills) {
          if (skill.triggerOn !== "onEndPhase") {
            continue;
          }
          const skillInfo = defineSkillInfo({
            caller: arg.requestedEntity,
            definition: skill,
            requestBy: arg.via,
          });
          const eventArg = new EventArg(this.state);
          if (!(0, skill.filter)(this.state, skillInfo, eventArg)) {
            continue;
          }
          await this.finalizeSkill(skillInfo, eventArg);
        }
      } else {
        // onDamageOrHeal / onReaction 事件可以被延迟到 onUseSkill 事件后处理
        // 故在发生事件时将 events 记录，并在 useSkill 之前清空记录
        /** @see TriggeredSkillBuilder#delayedToSkill */
        if (name === "onDamageOrHeal" || name === "onReaction") {
          this.mutate({
            type: "pushDelayingEvent",
            eventName: name,
            eventArg: arg,
          });
        }
        if (name === "onBeforeUseSkill") {
          this.mutate({
            type: "clearDelayingEvent",
          });
        }
        using l = this.mutator.subLog(
          DetailLogType.Event,
          `Handling event ${name} (${arg.toString()}):`,
        );
        const callerAndSkills = this.broadcastEvent(event);
        for (const { caller, skill } of callerAndSkills) {
          const skillInfo = defineSkillInfo({
            caller,
            definition: skill,
          });
          arg._currentSkillInfo = skillInfo;
          if (!(0, skill.filter)(this.state, skillInfo, arg)) {
            continue;
          }
          await this.finalizeSkill(skillInfo, arg);
        }
      }
    }
  }

  getState() {
    return this.state;
  }

  static async executeSkill(
    mutator: StateMutator,
    skill: SkillInfo,
    arg: GeneralSkillArg,
  ) {
    const executor = new SkillExecutor(mutator, { preview: false });
    await executor.finalizeSkill(skill, arg);
    return executor.state;
  }
  static async handleEvent(mutator: StateMutator, ...event: EventAndRequest) {
    return SkillExecutor.handleEvents(mutator, [event]);
  }
  static async handleEvents(mutator: StateMutator, events: EventAndRequest[]) {
    const executor = new SkillExecutor(mutator, { preview: false });
    await executor.handleEvent(...events);
    return executor.state;
  }
}
