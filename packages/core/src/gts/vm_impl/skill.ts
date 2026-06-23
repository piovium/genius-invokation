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
import type { CustomEvent, ListenTo } from "../../builder";
import {
  buildTargetGetter,
  wrapSkillInfoWithExt,
  type DetailedEventNames,
  type InitiativeSkillTargetKind,
  type SkillOperation,
  type SkillOperationFilter,
  type StrictInitiativeSkillEventArg,
  type WritableMetaOf,
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
  InitiativeSkillDefinition,
  SkillActionFilter,
  SkillDefinition,
  SkillDescription,
  SkillInfo,
} from "../../base/skill";
import type { DiceRequirement, DiceType } from "@gi-tcg/typings";

class SkillModel {
  id!: number;

  isInitiativeSkill = true;
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  // triggered configs
  detailedEventName: DetailedEventNames | CustomEvent | null = null;
  enableHandTriggering = false;
  enablePileTriggering = false;
  usageOpt: { name: string; autoDecrease: boolean } | null = null;
  usagePerRoundOpt: {
    name: UsagePerRoundVariableNames;
    autoDecrease: boolean;
  } | null = null;
  listenTo: ListenTo | null = null;

  associatedExtensionId: number | null = null;

  action: SkillOperation<any> = () => {};
  filters: SkillOperationFilter<any>[] = [];

  protected buildAction(): SkillDescription<any> {
    const extId = this.associatedExtensionId;
    const action = this.action;
    return function (state: GameState, skillInfo: SkillInfo, arg: any) {
      const context = new SkillContext(
        state,
        wrapSkillInfoWithExt(skillInfo, extId),
        arg,
      );
      action(context, context.eventArg);
      return context._terminate();
    };
  }
  protected buildFilter(): SkillActionFilter<any> {
    const extId = this.associatedExtensionId;
    const filters = this.filters;
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
  detailedEventName: DetailedEventNames | CustomEvent;
  constructor(detailedEventName: DetailedEventNames | CustomEvent) {
    super();
    this.detailedEventName = detailedEventName;
  }
  buildSkillDefinition(): SkillDefinition {
    throw new Error("Not implemented");
  }
}

const TriggeredSkillVM = defineViewModel(TriggeredSkillModel, (h) => ({}));

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
            WritableMetaOf<{
              callerType: Meta["type"];
              associatedExtension: Meta["associatedExtension"];
              callerVars: Meta["variables"];
              eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
            }>
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
            WritableMetaOf<{
              callerType: Meta["type"];
              associatedExtension: Meta["associatedExtension"];
              callerVars: Meta["variables"];
              eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
            }>
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
        filter: SkillOperationFilter<{
          callerType: Meta["type"];
          associatedExtension: Meta["associatedExtension"];
          callerVars: Meta["variables"];
          eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
        }>,
      ): AR.Done;
    }>((model, [filter]) => {
      model.filters.push(filter);
    }),

    "~action": h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyInitiativeThis<Meta>,
        operation: SkillOperation<{
          callerType: Meta["type"];
          associatedExtension: Meta["associatedExtension"];
          callerVars: Meta["variables"];
          eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
        }>,
      ): AR.Done;
      uniqueKey(): "~action";
    }>((model, [operation]) => {
      model.action = operation;
    }),

    // --- passive attributes ---
    on: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: OnlyPassiveThis<Meta>,
        eventName: DetailedEventNames | CustomEvent,
      ): AR.With<typeof TriggeredSkillVM>;
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillVM.parse(subView, eventName);
      const skillDef = skillModel.buildSkillDefinition();
      model.passiveSkillDefinitions.push(skillDef);
    }),
  }),
  DEFAULT_CHARACTER_SKILL_VM_META,
);
