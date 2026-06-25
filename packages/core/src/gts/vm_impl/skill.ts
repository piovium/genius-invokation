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

import { defineViewModel, type AR, type Meta } from "@gi-tcg/gts-runtime";
import type {
  CharacterInitiativeSkillEntry,
  CharacterPassiveSkillEntry,
} from "../../builder/registry";
import { type AnyState, type GameState } from "../../base/state";
import { toExpression, type InferResult, type IQuery } from "../../query";
import type {
  UsagePerRoundVariableNames,
  VariableConfig,
} from "../../base/entity";
import { ListenTo, type CustomEvent } from "../../builder";
import {
  buildTargetGetter,
  detailedEventDictionary,
  wrapSkillInfoWithExt,
  type DetailedEventArgOf,
  type DetailedEventNames,
  type InitiativeSkillTargetKind,
  type ReadonlyMetaOf,
  type SkillOperation,
  type SkillOperationFilter,
  type StrictInitiativeSkillEventArg,
} from "../../builder/skill";
import {
  SkillContext,
  type TypedSkillContext,
} from "../../builder/context/skill";
import { DEFAULT_ENTITY_VM_META, type EntityVMMeta } from "./entity";
import type {
  ExEntityType,
  PassiveSkillHandle,
  SkillHandle,
} from "../../builder/type";
import {
  DEFAULT_VERSION_INFO,
  type Version,
  type VersionInfo,
} from "../../base/version";
import { costSize, diceCostSize, normalizeCost } from "../../utils";
import type {
  CommonSkillType,
  CustomEventEventArg,
  InitiativeSkillDefinition,
  SkillActionFilter,
  SkillDefinition,
  SkillDescription,
  SkillInfo,
} from "../../base/skill";
import type { DiceRequirement, DiceType } from "@gi-tcg/typings";
import { createVariable } from "../../builder/utils";
import { VariablesVM } from "./variables";
import { isCustomEvent } from "../../base/custom_event";

class SkillModel {
  id!: number;

  isInitiativeSkill = true;
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  associatedExtensionId: number | null = null;

  protected preOperations: SkillOperation<any>[] = [];
  action: SkillOperation<any> = () => {};
  protected postOperations: SkillOperation<any>[] = [];
  protected filters: SkillOperationFilter<any>[] = [];
  userFilters: SkillOperationFilter<any>[] = [];

  protected buildAction(): SkillDescription<any> {
    const extId = this.associatedExtensionId;
    const operations = [
      ...this.preOperations,
      this.action,
      ...this.postOperations,
    ];
    return function (state: GameState, skillInfo: SkillInfo, arg: any) {
      const context = new SkillContext(
        state,
        wrapSkillInfoWithExt(skillInfo, extId),
        arg,
      );
      for (const action of operations) {
        action(context, context.eventArg);
      }
      return context._terminate();
    };
  }
  protected buildFilter(): SkillActionFilter<any> {
    const extId = this.associatedExtensionId;
    const filters = [...this.filters, ...this.userFilters];
    return function (state: GameState, skillInfo: SkillInfo, arg: any) {
      const context = new SkillContext(
        state,
        wrapSkillInfoWithExt(skillInfo, extId),
        arg,
      );
      for (const filter of filters) {
        if (!filter(context, context.eventArg)) {
          return false;
        }
      }
      return true;
    };
  }
}

class TriggeredSkillModel extends SkillModel {
  // triggered configs
  // TODO we should check this carefully later.
  defaultDefeatedDispose = false;

  asSkillType: CommonSkillType | null = null;
  callerType: ExEntityType;
  detailedEventName: DetailedEventNames | CustomEvent;
  enableHandTriggering = false;
  enablePileTriggering = false;
  usageOpt: { name: string; autoDecrease: boolean } | null = null;
  usagePerRoundOpt: {
    name: UsagePerRoundVariableNames;
    autoDecrease: boolean;
  } | null = null;
  listenTo: ListenTo = ListenTo.SameArea;

  constructor(
    callerType: ExEntityType,
    detailedEventName: DetailedEventNames | CustomEvent,
  ) {
    super();
    this.callerType = callerType;
    this.detailedEventName = detailedEventName;
  }
  buildSkillDefinition(): SkillDefinition {
    // 【可用次数自动扣除】
    if (this.usagePerRoundOpt?.autoDecrease) {
      this.postOperations.push((c) => {
        c.consumeUsagePerRound();
      });
    }
    if (this.usageOpt?.autoDecrease) {
      if (this.usageOpt.name === "usage") {
        // 若变量名为 usage，则消耗可用次数时可能调用 c.dispose
        // 使用 consumeUsage 方法实现相关操作
        this.postOperations.push((c) => {
          c.consumeUsage();
        });
      } else {
        // 否则手动扣除使用次数
        const name = this.usageOpt.name;
        this.postOperations.push((c) => {
          c.self.addVariable(name, -1);
        });
      }
    }

    // 【添加各种 filter】
    this.filters = [];

    // 0. 对于并非响应自身弃置的技能，当实体已经被弃置时，不再响应
    if (this.detailedEventName !== "selfDispose") {
      this.filters.push((c, e) => {
        return c.self.area.type !== "removedEntities";
      });
    }
    // 1. 默认禁止手牌 & 牌库区实体响应事件，除非显式启用
    if (!this.enableHandTriggering) {
      this.filters.push((c) => {
        return c.self.area.type !== "hands";
      });
    }
    if (!this.enablePileTriggering) {
      this.filters.push((c) => {
        return c.self.area.type !== "pile";
      });
    }
    // 2. 被动技能要求角色存活
    if (
      this.callerType === "character" &&
      this.detailedEventName !== "defeated"
    ) {
      this.filters.push((c) => c.self.variables.alive);
    }
    // 3. 状态和装备的技能默认要求角色存活，默认击倒弃置除外
    if (
      !this["defaultDefeatedDispose"] &&
      (this.callerType === "status" || this.callerType === "equipment")
    ) {
      this.filters.push((c) => {
        if (c.self.area.type === "characters") {
          return c.self.cast<"status" | "equipment">().master.variables.alive;
        }
        return true;
      });
    }
    // 4. 基于 listenTo 的 filter
    const [triggerOn, filterDescriptor] =
      detailedEventDictionary[
        isCustomEvent(this.detailedEventName)
          ? "customEvent"
          : (this.detailedEventName as DetailedEventNames)
      ];
    const listenTo = this.listenTo;
    this.filters.push(function (c, e) {
      const { area, id } = c.self;
      return filterDescriptor(
        e as any,
        {
          callerArea: area,
          callerId: id,
          listenTo,
        },
        c.rawState,
      );
    });
    // 5. 自定义事件：确保事件名一致
    if (isCustomEvent(this.detailedEventName)) {
      const customEvent = this.detailedEventName;
      this.filters.push(function (c, e) {
        return (
          (e as unknown as CustomEventEventArg).customEvent === customEvent
        );
      });
    }

    // 【构造技能定义并向父级实体添加】
    const filter = this.buildFilter();
    const action = this.buildAction();
    return {
      type: "skill",
      id: this.id,
      ownerType: this.callerType,
      skillType: this.asSkillType,
      triggerOn,
      initiativeSkillConfig: null,
      filter,
      action,
      usagePerRoundVariableName: this.usagePerRoundOpt?.name ?? null,
    };
  }
}

export interface TriggeredSkillVMMeta extends EntityVMMeta {
  eventArgType: unknown;
}
export const DEFAULT_TRIGGERED_SKILL_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  eventArgType: null as never,
} as const satisfies TriggeredSkillVMMeta;

type TriggeredSkillVMToBuilderMeta<Meta extends TriggeredSkillVMMeta> = {
  callerType: Meta["type"];
  associatedExtension: Meta["associatedExtension"];
  callerVars: Meta["variables"];
  eventArgType: Meta["eventArgType"];
};
type TriggeredSkillOperationOfVM<Meta extends TriggeredSkillVMMeta> =
  SkillOperation<TriggeredSkillVMToBuilderMeta<Meta>>;
type TriggeredSkillFilterOfVM<Meta extends TriggeredSkillVMMeta> =
  SkillOperationFilter<TriggeredSkillVMToBuilderMeta<Meta>>;

const TriggeredSkillVM = defineViewModel(
  TriggeredSkillModel,
  (h) => ({
    listenTo: h.simpleAttribute({
      uniqueKey: "listenTo",
    })(function (listenTo: "player" | "all") {
      if (listenTo === "player") {
        this.listenTo = ListenTo.SamePlayer;
      } else if (listenTo === "all") {
        this.listenTo = ListenTo.All;
      } else {
        throw new Error(`Invalid listenTo value: ${listenTo}`);
      }
    }),
    when: h.attribute<{
      <Meta extends TriggeredSkillVMMeta>(
        this: AR.This<Meta>,
        filter: TriggeredSkillFilterOfVM<Meta>,
      ): AR.Done;
    }>((model, [filter]) => {
      model.userFilters.push(filter);
    }),

    usage: h.attribute<{
      <Meta extends TriggeredSkillVMMeta>(
        this: AR.This<Meta>,
        count: number,
      ): AR.Done; // TODO usage config
    }>((model) => {
      // TODO
    }),

    "~action": h.attribute<{
      <Meta extends TriggeredSkillVMMeta>(
        this: AR.This<Meta>,
        operation: TriggeredSkillOperationOfVM<Meta>,
      ): AR.Done;
      uniqueKey(): "~action";
    }>((model, [operation]) => {
      model.action = operation;
    }),
  }),
  DEFAULT_TRIGGERED_SKILL_VM_META,
);

type TargetGetter = (ctx: SkillContext<any>) => AnyState[];

class InitiativeSkillModel extends SkillModel {
  skillType: CommonSkillType | null = null;
  omitEvents = false;
  hidden = false;
  gainEnergy = true;
  alwaysCharged = false;
  alwaysPlunging = false;
  targetGetters: TargetGetter[] = [];
  cost: DiceRequirement = new Map();

  buildSkillDefinition(): InitiativeSkillDefinition {
    return {
      type: "skill",
      id: this.id,
      ownerType: "character",
      skillType: this.skillType,
      initiativeSkillConfig: {
        requiredCost: normalizeCost(this.cost),
        computed$costSize: costSize(this.cost),
        computed$diceCostSize: diceCostSize(this.cost),
        gainEnergy: this.gainEnergy,
        shouldFast: false,
        alwaysCharged: this.alwaysCharged,
        alwaysPlunging: this.alwaysPlunging,
        hidden: this.hidden,
        omitEvents: this.omitEvents,
        getTarget: buildTargetGetter(
          this.targetGetters,
          this.associatedExtensionId,
        ),
      },
      triggerOn: "initiative",
      action: this.buildAction(),
      filter: this.buildFilter(),
      usagePerRoundVariableName: null,
    };
  }
}

class CharacterSkillModel extends InitiativeSkillModel {
  varConfigs = new Map<string, VariableConfig>();
  passiveSkillDefinitions: SkillDefinition[] = [];

  getEntry(): CharacterInitiativeSkillEntry | CharacterPassiveSkillEntry {
    if (this.isInitiativeSkill) {
      return {
        type: "initiativeSkill",
        __definition: "initiativeSkills",
        id: this.id,
        version: this.versionInfo,
        skill: this.buildSkillDefinition(),
      };
    } else {
      return {
        type: "passiveSkill",
        __definition: "passiveSkills",
        id: this.id,
        version: this.versionInfo,
        skills: this.passiveSkillDefinitions,
        varConfigs: Object.fromEntries(this.varConfigs.entries()),
      };
    }
  }
}

export interface CharacterSkillVMMeta extends EntityVMMeta {
  readonly targetTypes: InitiativeSkillTargetKind;
  readonly isInitiativeSkill?: true;
}
export const DEFAULT_CHARACTER_SKILL_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  type: "character",
  targetTypes: [],
  isInitiativeSkill: true,
} as const satisfies CharacterSkillVMMeta;

type OnlyInitiativeThis<Meta extends CharacterSkillVMMeta> = Meta extends {
  isInitiativeSkill: true;
}
  ? AR.This<Meta>
  : never;
type OnlyPassiveThis<Meta extends CharacterSkillVMMeta> = Meta extends {
  isInitiativeSkill: true;
}
  ? never
  : AR.This<Meta>;
type TargetQueryTypeInfo =
  | {
      type: "character";
      areaType: "characters";
    }
  | {
      type: "summon";
      areaType: "summons";
    }
  | {
      type: "support";
      areaType: "supports";
    };

type CharacterSkillVMToBuilderMeta<Meta extends CharacterSkillVMMeta> = {
  callerType: Meta["type"];
  associatedExtension: Meta["associatedExtension"];
  callerVars: Meta["variables"];
  eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
};

type CharacterSkillOperationOfVM<Meta extends CharacterSkillVMMeta> =
  SkillOperation<CharacterSkillVMToBuilderMeta<Meta>>;
type CharacterSkillFilterOfVM<Meta extends CharacterSkillVMMeta> =
  SkillOperationFilter<CharacterSkillVMToBuilderMeta<Meta>>;

export const CharacterSkillViewModel = defineViewModel(
  CharacterSkillModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      required(): true;
      uniqueKey(): "id";
      as<Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
      ): Meta extends { isInitiativeSkill: true }
        ? SkillHandle
        : PassiveSkillHandle;
    }>(
      (model, [id]) => {
        model.id = id;
      },
      (_, [id]) => id as any,
    ),
    skillType: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
        type: "normal" | "elemental" | "burst",
      ): AR.Done;
      <Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
        type: "passive",
      ): AR.DoneRewriteMeta<Omit<Meta, "isInitiativeSkill">>;
      required(): true;
      uniqueKey(): "type";
    }>((model, [type]) => {
      if (type === "passive") {
        model.isInitiativeSkill = false;
      } else {
        model.skillType = type;
      }
    }),
    since: h.simpleAttribute({
      uniqueKey: "version",
    })(function (version: Version) {
      this.versionInfo = {
        from: "official",
        value: { predicate: "since", version },
      };
    }),
    until: h.simpleAttribute({
      uniqueKey: "version",
    })(function (version: Version) {
      this.versionInfo = {
        from: "official",
        value: { predicate: "until", version },
      };
    }),

    // --- initiative attributes ---

    prepared: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
      ): AR.Done;
      uniqueKey(): "prepared";
    }>((model) => {
      model.omitEvents = true;
      model.gainEnergy = false;
      model.hidden = true;
    }),
    hidden: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
      ): AR.Done;
      uniqueKey(): "hidden";
    }>((model) => {
      model.hidden = true;
    }),
    noEnergy: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
      ): AR.Done;
      uniqueKey(): "noEnergy";
    }>((model) => {
      model.gainEnergy = false;
    }),
    cost: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
        type: DiceType,
        amount: number,
      ): AR.Done;
    }>((model, [type, amount]) => {
      model.cost.set(type, amount);
    }),

    addTarget: h.attribute<{
      <Meta extends CharacterSkillVMMeta, Q extends IQuery>(
        this: OnlyInitiativeThis<Meta>,
        query: InferResult<Q> extends TargetQueryTypeInfo ? Q : never,
      ): AR.DoneRewriteMeta<
        Omit<Meta, "targetTypes"> & {
          targetTypes: [
            ...Meta["targetTypes"],
            InferResult<Q> extends { type: infer T } ? T : never,
          ];
        }
      >;
      <Meta extends CharacterSkillVMMeta, Q extends IQuery>(
        this: OnlyInitiativeThis<Meta>,
        queryFn: (
          context: TypedSkillContext<
            ReadonlyMetaOf<CharacterSkillVMToBuilderMeta<Meta>>
          >,
        ) => InferResult<Q> extends TargetQueryTypeInfo ? Q : never,
      ): AR.DoneRewriteMeta<
        Omit<Meta, "targetTypes"> & {
          targetTypes: [
            ...Meta["targetTypes"],
            InferResult<Q> extends { type: infer T } ? T : never,
          ];
        }
      >;

      <Meta extends CharacterSkillVMMeta, Ret extends AnyState[]>(
        this: OnlyInitiativeThis<Meta>,
        queryFn: (
          context: TypedSkillContext<
            ReadonlyMetaOf<CharacterSkillVMToBuilderMeta<Meta>>
          >,
        ) => Ret[number] extends { type: InitiativeSkillTargetKind }
          ? Ret
          : never,
      ): AR.DoneRewriteMeta<
        Omit<Meta, "targetTypes"> & {
          targetTypes: [
            ...Meta["targetTypes"],
            Ret[number] extends { type: InitiativeSkillTargetKind }
              ? Ret
              : never,
          ];
        }
      >;
    }>((model, query: any) => {
      if (toExpression in query) {
        query = () => query;
      }
      model.targetGetters.push((ctx) => {
        const result: AnyState[] | IQuery = query(ctx);
        if (result && toExpression in result) {
          return ctx.queryAll(result).map((s) => s.latest());
        }
        return result;
      });
    }),

    filter: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
        filter: CharacterSkillFilterOfVM<Meta>,
      ): AR.Done;
    }>((model, [filter]) => {
      model.userFilters.push(filter);
    }),

    "~action": h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
        operation: CharacterSkillOperationOfVM<Meta>,
      ): AR.Done;
      uniqueKey(): "~action";
    }>((model, [operation]) => {
      model.action = operation;
    }),

    // --- passive attributes ---
    variable: h.attribute<{
      <Meta extends CharacterSkillVMMeta, const Name extends string>(
        this: OnlyPassiveThis<Meta>,
        name: Name,
        initialValue: number,
      ): AR.WithRewriteMeta<
        typeof VariablesVM,
        Omit<Meta, "variables"> & {
          variables: Meta["variables"] | Name;
        }
      >;
    }>((model, [name, initValue], subView) => {
      const options = VariablesVM.parse(subView);
      // TODO other configs
      const varConfig = createVariable(initValue);
      model.varConfigs.set(name, varConfig);
    }),
    on: h.attribute<{
      <
        Meta extends CharacterSkillVMMeta,
        const Event extends DetailedEventNames,
      >(
        this: OnlyPassiveThis<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillVM,
        Omit<Meta, "targetTypes"> & {
          eventArgType: DetailedEventArgOf<Event>;
        }
      >;
      <Meta extends CharacterSkillVMMeta, T = void>(
        this: OnlyPassiveThis<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillVM,
        Omit<Meta, "targetTypes"> & {
          eventArgType: CustomEventEventArg<T>;
        }
      >;
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillVM.parse(
        subView,
        "character",
        eventName,
      );
      const skillDef = skillModel.buildSkillDefinition();
      model.passiveSkillDefinitions.push(skillDef);
    }),
  }),
  DEFAULT_CHARACTER_SKILL_VM_META,
);
