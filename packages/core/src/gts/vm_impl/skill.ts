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

import { defineViewModel, type AR } from "@gi-tcg/gts-runtime";
import type {
  CharacterInitiativeSkillEntry,
  CharacterPassiveSkillEntry,
} from "../../builder/registry";
import { type AnyState, type GameState } from "../../base/state";
import { $, toExpression, type InferResult, type IQuery } from "../../query";
import type { UsagePerRoundVariableNames } from "../../base/entity";
import { ListenTo, type CustomEvent } from "../../builder";
import {
  buildTargetGetter,
  detailedEventDictionary,
  type DetailedEventNames,
  type InitiativeSkillTargetKind,
  type ReadonlyMetaOf,
  type SkillBuilderMetaBase,
  type StrictInitiativeSkillEventArg,
  type WritableMetaOf,
} from "../../builder/skill";
import {
  SkillContext,
  type TypedSkillContext,
} from "../../builder/context/skill";
import {
  DEFAULT_ENTITY_VM_META,
  EntityViewModel,
  type DefaultEntityVMMeta,
  type EntityVMMeta,
  type GtsUsageOrUsagePerRoundOptions,
  type ICaller,
} from "./entity";
import type {
  ExEntityType,
  ExtensionHandle,
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
  InitiativeSkillConfig,
  InitiativeSkillDefinition,
  SkillActionFilter,
  SkillDefinition,
  SkillDescription,
  SkillInfo,
  SkillInfoOfContextConstruction,
  SkillType,
} from "../../base/skill";
import type { DiceRequirement, DiceType } from "@gi-tcg/typings";
import { UsageVM, type UsageVMMeta } from "./variables";
import { isCustomEvent } from "../../base/custom_event";
import { GiTcgDataError } from "../../error";
import type { Computed } from "../../query/utils";
import { RESERVED, type Reserved, type ReservedMeta } from "./reserved";

export function wrapSkillInfoFromGts(
  skillInfo: SkillInfo,
  data: {
    extId: number | null;
    snippets: ReadonlyMap<string, (arg: any) => any>;
  },
): SkillInfoOfContextConstruction {
  return {
    ...skillInfo,
    associatedExtensionId: data.extId,
    gtsSnippets: data.snippets,
  };
}

type GtsSkillOperation<Meta extends SkillBuilderMetaBase> = (
  c: TypedSkillContext<WritableMetaOf<Meta>>,
) => void;

type GtsSkillOperationFilter<Meta extends SkillBuilderMetaBase> = (
  c: TypedSkillContext<ReadonlyMetaOf<Meta>>,
) => unknown;

abstract class SkillModel {
  /** skill id */
  id!: number;

  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  associatedExtensionId: number | null = null;

  protected preOperations: GtsSkillOperation<any>[] = [];
  action: GtsSkillOperation<any> = () => {};
  protected postOperations: GtsSkillOperation<any>[] = [];
  protected filters: GtsSkillOperationFilter<any>[] = [];
  userFilters: GtsSkillOperationFilter<any>[] = [];

  readonly #emptySnippets: ReadonlyMap<string, (arg: any) => any> = new Map();
  protected get snippets() {
    return this.#emptySnippets;
  }

  protected buildAction(): SkillDescription<any> {
    const wrapData = {
      extId: this.associatedExtensionId,
      snippets: this.snippets,
    };
    const operations = [
      ...this.preOperations,
      this.action,
      ...this.postOperations,
    ];
    return function (state: GameState, skillInfo: SkillInfo, arg: any) {
      const context = new SkillContext(
        state,
        wrapSkillInfoFromGts(skillInfo, wrapData),
        arg,
      );
      for (const action of operations) {
        action(context as any);
      }
      return context._terminate();
    };
  }
  protected buildFilter(): SkillActionFilter<any> {
    const wrapData = {
      extId: this.associatedExtensionId,
      // disable callSnippet in a filter
      snippets: this.#emptySnippets,
    };
    const filters = [...this.filters, ...this.userFilters];
    return function (state: GameState, skillInfo: SkillInfo, arg: any) {
      const context = new SkillContext(
        state,
        wrapSkillInfoFromGts(skillInfo, wrapData),
        arg,
      );
      for (const filter of filters) {
        if (!filter(context as any)) {
          return false;
        }
      }
      return true;
    };
  }
}

export class TriggeredSkillModel extends SkillModel {
  isDefaultDefeatedDispose = false;

  asSkillType: CommonSkillType | null = null;
  caller: ICaller;
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
    caller: ICaller,
    detailedEventName: DetailedEventNames | CustomEvent,
  ) {
    super();
    this.caller = caller;
    this.detailedEventName = detailedEventName;
  }

  override get snippets() {
    return this.caller.snippets;
  }

  setUsage(count: number, option: GtsUsageOrUsagePerRoundOptions): void {
    const perRound = option.perRound ?? false;
    const autoDecrease = option.autoDecrease ?? false;
    const name = this.caller.setUsage(count, option);
    if (perRound) {
      if (this.usagePerRoundOpt) {
        throw new GiTcgDataError(
          "Cannot set usage per round multiple times for the same skill.",
        );
      }
      this.usagePerRoundOpt = {
        name: name as UsagePerRoundVariableNames,
        autoDecrease,
      };
    } else {
      if (this.usageOpt) {
        throw new GiTcgDataError(
          "Cannot set usage multiple times for the same skill.",
        );
      }
      this.usageOpt = { name, autoDecrease };
    }
    this.userFilters.unshift((c) => c.self.getVariable(name) > 0);
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
    if (
      this.detailedEventName !== "selfDispose" &&
      this.detailedEventName !== "selfDiscard"
    ) {
      this.filters.push((c) => {
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
      this.caller.type === "character" &&
      this.detailedEventName !== "defeated"
    ) {
      this.filters.push((c) => c.self.variables.alive);
    }
    // 3. 状态和装备的技能默认要求角色存活，默认击倒弃置除外
    if (
      !this.isDefaultDefeatedDispose &&
      (this.caller.type === "status" || this.caller.type === "equipment")
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
    this.filters.push(function (c) {
      const { area, id } = c.self;
      return filterDescriptor(
        c.eventArg as any,
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
      this.filters.push(function (c) {
        return c.eventArg.customEvent === customEvent;
      });
    }

    // 【构造技能定义并向父级实体添加】
    const filter = this.buildFilter();
    const action = this.buildAction();
    return {
      type: "skill",
      id: this.id,
      ownerType: this.caller.type,
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
const DEFAULT_TRIGGERED_SKILL_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  eventArgType: null as never,
} as const satisfies TriggeredSkillVMMeta;

type TriggeredSkillVMToBuilderMeta<Meta extends TriggeredSkillVMMeta> = {
  callerType: Meta["type"];
  associatedExtension: Meta["associatedExtension"];
  callerVars: Meta["variables"];
  eventArgType: Meta["eventArgType"];
  gtsSnippets: Meta["snippets"];
};
type TriggeredSkillOperationOfVM<Meta extends TriggeredSkillVMMeta> =
  GtsSkillOperation<TriggeredSkillVMToBuilderMeta<Meta>>;
type TriggeredSkillFilterOfVM<Meta extends TriggeredSkillVMMeta> =
  GtsSkillOperationFilter<TriggeredSkillVMToBuilderMeta<Meta>>;

export const TriggeredSkillViewModel = defineViewModel(
  TriggeredSkillModel,
  (h) => ({
    listenTo: h.simpleAttribute({
      uniqueKey: "listenTo",
    })(function (listenTo: ListenTo) {
      this.listenTo = listenTo;
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
      ): AR.With<typeof UsageVM>;
      <Meta extends TriggeredSkillVMMeta>(
        this: AR.This<Meta>,
        perRound: "perRound",
        count: number,
      ): AR.With<typeof UsageVM, { name: "usagePerRound" }>;
      mergeMeta<
        Meta extends TriggeredSkillVMMeta,
        InnerMeta extends UsageVMMeta,
      >(
        meta: Meta,
        innerMeta: InnerMeta,
      ): Omit<Meta, "variables"> & {
        variables: Meta["variables"] | InnerMeta["name"];
      };
    }>((model, positionals, subView) => {
      const options = UsageVM.parse(subView);
      if (positionals[0] === "perRound") {
        model.setUsage(positionals[1], { ...options, perRound: true });
      } else {
        model.setUsage(positionals[0], { ...options, perRound: false });
      }
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

export type TargetGetter = (ctx: SkillContext<any>) => AnyState[];

export class InitiativeSkillModel extends SkillModel {
  skillType: SkillType | null = null;
  omitEvents = false;
  hidden = false;
  gainEnergy = true;
  alwaysCharged = false;
  alwaysPlunging = false;
  targetGetters: TargetGetter[] = [];
  cost: DiceRequirement = new Map();
  get ownerType(): ExEntityType {
    throw new Error("ownerType must be implemented in subclasses");
  }

  private buildInitiativeSkillConfig(): InitiativeSkillConfig {
    return {
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
    };
  }
  buildSkillDefinition(): InitiativeSkillDefinition {
    return {
      type: "skill",
      id: this.id,
      ownerType: this.ownerType,
      skillType: this.skillType,
      initiativeSkillConfig: this.buildInitiativeSkillConfig(),
      triggerOn: "initiative",
      action: this.buildAction(),
      filter: this.buildFilter(),
      usagePerRoundVariableName: null,
    };
  }
}

class CharacterSkillModel extends InitiativeSkillModel {
  reserved = false;
  passiveSkillEntry: CharacterPassiveSkillEntry | null = null;
  override get ownerType() {
    return "character" as const;
  }

  getEntry():
    | Reserved
    | CharacterInitiativeSkillEntry
    | CharacterPassiveSkillEntry {
    if (this.reserved) {
      return RESERVED;
    } else if (this.passiveSkillEntry) {
      return this.passiveSkillEntry;
    } else {
      return {
        type: "initiativeSkill",
        __definition: "initiativeSkills",
        id: this.id,
        version: this.versionInfo,
        skill: this.buildSkillDefinition(),
      };
    }
  }
}

export interface InitiativeSkillVMMeta extends EntityVMMeta {
  readonly targetTypes: InitiativeSkillTargetKind;
}
// This variable is type-only but may fell into TDZ after bundling.
// Declare it as var.
export var DEFAULT_INITIATIVE_SKILL_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  targetTypes: [],
} as const satisfies InitiativeSkillVMMeta;

export type TargetQueryTypeInfo =
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

type InitiativeSkillVMToBuilderMeta<Meta extends InitiativeSkillVMMeta> = {
  callerType: Meta["type"];
  associatedExtension: Meta["associatedExtension"];
  callerVars: Meta["variables"];
  eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
  gtsSnippets: Meta["snippets"];
};

type InitiativeSkillOperationOfVM<Meta extends InitiativeSkillVMMeta> =
  GtsSkillOperation<InitiativeSkillVMToBuilderMeta<Meta>>;
type InitiativeSkillFilterOfVM<Meta extends InitiativeSkillVMMeta> =
  GtsSkillOperationFilter<InitiativeSkillVMToBuilderMeta<Meta>>;

type NotCharacterPassiveThis<Meta extends InitiativeSkillVMMeta> =
  Meta extends { isInitiativeSkill: false } ? never : AR.This<Meta>;

export const InitiativeSkillViewModel = defineViewModel(
  InitiativeSkillModel,
  (h) => ({
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
    associateExtension: h.attribute<{
      <Meta extends InitiativeSkillVMMeta, NewExtT>(
        this: AR.This<Meta>,
        ext: ExtensionHandle<NewExtT>,
      ): AR.DoneRewriteMeta<
        Computed<
          Omit<Meta, "associatedExtension"> & {
            associatedExtension: ExtensionHandle<NewExtT>;
          }
        >
      >;
      uniqueKey(): "associatedExtension";
    }>((model, [extId]) => {
      model.associatedExtensionId = extId;
    }),

    prepared: h.attribute<{
      <Meta extends InitiativeSkillVMMeta>(
        this: NotCharacterPassiveThis<Meta>,
      ): AR.Done;
      uniqueKey(): "prepared";
    }>((model) => {
      model.omitEvents = true;
      model.gainEnergy = false;
      model.hidden = true;
    }),
    hidden: h.attribute<{
      <Meta extends InitiativeSkillVMMeta>(
        this: NotCharacterPassiveThis<Meta>,
      ): AR.Done;
      uniqueKey(): "hidden";
    }>((model) => {
      model.hidden = true;
    }),
    noEnergy: h.attribute<{
      <Meta extends InitiativeSkillVMMeta>(
        this: NotCharacterPassiveThis<Meta>,
      ): AR.Done;
      uniqueKey(): "noEnergy";
    }>((model) => {
      model.gainEnergy = false;
    }),
    cost: h.attribute<{
      <Meta extends InitiativeSkillVMMeta>(
        this: NotCharacterPassiveThis<Meta>,
        type: DiceType,
        amount: number,
      ): AR.Done;
    }>((model, [type, amount]) => {
      model.cost.set(type, amount);
    }),

    addTarget: h.attribute<{
      <Meta extends InitiativeSkillVMMeta, Q extends IQuery>(
        this: NotCharacterPassiveThis<Meta>,
        query: InferResult<Q> extends TargetQueryTypeInfo ? Q : never,
      ): AR.DoneRewriteMeta<
        Omit<Meta, "targetTypes"> & {
          targetTypes: [
            ...Meta["targetTypes"],
            InferResult<Q> extends { type: infer T } ? T : never,
          ];
        }
      >;

      <Meta extends InitiativeSkillVMMeta, Ret extends AnyState[]>(
        this: NotCharacterPassiveThis<Meta>,
        queryFn: (
          context: TypedSkillContext<
            ReadonlyMetaOf<InitiativeSkillVMToBuilderMeta<Meta>>
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
    }>((model, [query]: any) => {
      if (toExpression in query) {
        const queryObj = query;
        query = (c: SkillContext<any>) =>
          c.queryAll(queryObj as typeof $.any).map((s) => s.latest());
      }
      model.targetGetters.push((ctx) => {
        return query(ctx);
      });
    }),

    filter: h.attribute<{
      <Meta extends InitiativeSkillVMMeta>(
        this: NotCharacterPassiveThis<Meta>,
        filter: InitiativeSkillFilterOfVM<Meta>,
      ): AR.Done;
    }>((model, [filter]) => {
      model.userFilters.push(filter);
    }),

    "~action": h.attribute<{
      <Meta extends InitiativeSkillVMMeta>(
        this: NotCharacterPassiveThis<Meta>,
        operation: InitiativeSkillOperationOfVM<Meta>,
      ): AR.Done;
      uniqueKey(): "~action";
    }>((model, [operation]) => {
      model.action = operation;
    }),
  }),
  DEFAULT_INITIATIVE_SKILL_VM_META,
);

export interface CharacterSkillVMMeta extends InitiativeSkillVMMeta {
  readonly isInitiativeSkill: boolean;
}
export const DEFAULT_CHARACTER_SKILL_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  type: "character",
  targetTypes: [],
  isInitiativeSkill: true as boolean,
} as const satisfies CharacterSkillVMMeta;

export const CharacterSkillViewModel = InitiativeSkillViewModel
  //
  .extend(CharacterSkillModel, (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      required(): true;
      uniqueKey(): "id";
      as<Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
      ): Meta extends { isInitiativeSkill: true }
        ? SkillHandle
        : PassiveSkillHandle;
      as(this: AR.This<ReservedMeta>): undefined;
    }>(
      (model, [id]) => {
        model.id = id;
      },
      (_, [id]) => id as any,
    ),
    reserved: h.attribute<{
      (): AR.DoneRewriteMeta<ReservedMeta>;
    }>((model, []) => {
      model.reserved = true;
    }),
    skillType: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
        type: "normal" | "elemental" | "burst",
      ): AR.DoneRewriteMeta<
        Omit<Meta, "isInitiativeSkill"> & { isInitiativeSkill: true }
      >;
      <Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta>,
        type: "passive",
      ): AR.WithRewriteMeta<
        Omit<Meta, "isInitiativeSkill"> & { isInitiativeSkill: false },
        typeof EntityViewModel,
        DefaultEntityVMMeta<"character">
      >;
      required(): true;
      uniqueKey(): "type";
    }>((model, [type], subView) => {
      if (type === "passive") {
        const passiveSkillModel = EntityViewModel.parse(subView, "character");
        passiveSkillModel.id = model.id;
        model.passiveSkillEntry =
          passiveSkillModel.getEntry() as CharacterPassiveSkillEntry;
      } else {
        model.skillType = type;
      }
    }),
  }))
  .bind<typeof DEFAULT_CHARACTER_SKILL_VM_META>();
