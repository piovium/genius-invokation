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
import {
  USAGE_PER_ROUND_VARIABLE_NAMES,
  type DescriptionDictionary,
  type EntityDefinition,
  type EntityTag,
  type VariableConfig,
} from "../../base/entity";
import type { CustomEventEventArg, SkillDefinition } from "../../base/skill";
import type { Writable } from "../../utils";
import type {
  DetailedEventArgOf,
  DetailedEventNames,
  SkillOperation,
} from "../../builder/skill";
import {
  GiTcgCoreInternalError,
  type EntityType,
  type Version,
  type VersionInfo,
} from "../..";
import { DEFAULT_VERSION_INFO } from "../../base/version";
import type {
  ExEntityType,
  ExtensionHandle,
  HandleT,
} from "../../builder/type";
import {
  VariablesVM,
  type GtsAppendOptions,
  type GtsOptions,
  type GtsUsageOption,
} from "./variables";
import { createVariable, createVariableCanAppend } from "../../builder/utils";
import { TriggeredSkillModel, TriggeredSkillVM } from "./skill";
import type { CustomEvent } from "../../builder";

class EntityModel implements ICaller {
  skillIndex = 0;
  usagePerRoundIndex = 0;

  id!: number;
  type: EntityType;
  tags: EntityTag[] = [];
  obtainable = true;
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  varConfigs = new Map<string, VariableConfig>();
  skillList: SkillDefinition[] = [];
  disposeWhenUsageIsZero = false;
  disposeOnMasterDefeated = false;
  visibleVarName: string | null = null;
  associatedExtensionId: number | null = null;
  hintText: string | null = null;
  descriptionDictionary: Writable<DescriptionDictionary> = {};
  snippets = new Map<string, SkillOperation<any>>();

  constructor(type: EntityType) {
    this.type = type;
  }

  getEntry(): EntityDefinition {
    // add clean-up roundEnd skill
    const usagePerRoundNames = USAGE_PER_ROUND_VARIABLE_NAMES.filter((name) =>
      this.varConfigs.has(name),
    );
    const hasDuration = this.varConfigs.has("duration");
    const skills = [...this.skillList];
    if (usagePerRoundNames.length > 0 || hasDuration) {
      const roundEndSkill = new TriggeredSkillModel(this, "roundEnd");
      roundEndSkill.action = function (c) {
        const self = c.self;
        // 恢复每回合使用次数
        for (const prop of usagePerRoundNames) {
          const config = self.definition.varConfigs[prop];
          if (config) {
            self.setVariable(prop, config.initialValue);
          }
        }
        // 扣除持续回合数
        if (hasDuration) {
          self.addVariable("duration", -1);
          if (self.getVariable("duration") <= 0) {
            self.dispose();
          }
        }
      };
      skills.push(roundEndSkill.buildSkillDefinition());
    }

    return {
      __definition: "entities",
      id: this.id,
      obtainable: this.obtainable,
      version: this.versionInfo,
      visibleVarName: this.visibleVarName,
      varConfigs: Object.fromEntries(this.varConfigs.entries()),
      disposeWhenUsageIsZero: this.disposeWhenUsageIsZero,
      disposeOnMasterDefeated: this.disposeOnMasterDefeated,
      hintText: this.hintText,
      disableTuning: false,
      skills,
      tags: this.tags as EntityTag[],
      type: this.type,
      descriptionDictionary: this.descriptionDictionary,
    };
  }

  setUsage(count: number, option: GtsUsageOption): string {
    const perRound = option.perRound ?? false;
    let name: string;
    if (option.name) {
      name = option.name;
    } else {
      if (perRound) {
        if (this.usagePerRoundIndex >= USAGE_PER_ROUND_VARIABLE_NAMES.length) {
          throw new GiTcgCoreInternalError(
            `Cannot specify more than ${USAGE_PER_ROUND_VARIABLE_NAMES.length} usagePerRound.`,
          );
        }
        name = USAGE_PER_ROUND_VARIABLE_NAMES[this.usagePerRoundIndex];
        this.usagePerRoundIndex++;
      } else {
        name = "usage";
      }
    }
    if (
      !perRound &&
      name !== "usage" &&
      typeof option.autoDispose === "boolean"
    ) {
      console?.warn?.(
        `No need to specify \`autoDispose\` of a non-per-round non-defaulted-name usage, since it cannot be auto-disposed by \`.consumeUsage\` primitive.`,
      );
      console?.trace?.();
    }
    const autoDispose = name === "usage" && option.autoDispose !== false;
    this.varConfigs.set(name, createVariableConfig(count, option));
    if (autoDispose) {
      this.disposeWhenUsageIsZero = true;
    }
    return name;
  }
}

export interface ICaller {
  type: ExEntityType;
  /**
   * Add a usage-related varConfig to the caller
   * @param count initial value for the variable
   * @param option
   * @returns the name of the variable that was added
   */
  setUsage(count: number, option: GtsUsageOption): string;
}

export const createVariableConfig = (
  initialValue: number,
  options: GtsOptions,
): VariableConfig => {
  let appendOpt: GtsAppendOptions | undefined;
  if (typeof options.append === "object") {
    appendOpt = options.append;
  } else if (typeof options.append === "number") {
    appendOpt = { value: options.append };
  } else if (options.append === true) {
    appendOpt = {};
  }
  if (appendOpt) {
    return createVariableCanAppend(
      initialValue,
      appendOpt.limit,
      appendOpt.value,
    );
  } else {
    return createVariable(initialValue, options.forceOverwrite);
  }
};

export interface EntityVMMeta {
  readonly type: ExEntityType;
  readonly variables: string;
  readonly associatedExtension: ExtensionHandle;
}

export const DEFAULT_ENTITY_VM_META = {
  type: "" as ExEntityType,
  variables: null as never,
  associatedExtension: null as never,
} as const satisfies EntityVMMeta;

export const EntityViewModel = defineViewModel(
  EntityModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
      required(): true;
      uniqueKey(): "id";
    }>(
      (model, [id]) => {
        model.id = id;
      },
      (model, [id]) => id as any,
    ),
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
    tags: h.simpleAttribute()(function (...tags: EntityTag[]) {
      this.tags.push(...tags);
    }),
    // TODO
    variable: h.attribute<{
      <Meta extends EntityVMMeta, const Name extends string>(
        this: AR.This<Meta>,
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
      const varConfig = createVariableConfig(initValue, options);
      model.varConfigs.set(name, varConfig);
    }),
    on: h.attribute<{
      <Meta extends EntityVMMeta, const Event extends DetailedEventNames>(
        this: AR.This<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillVM,
        Omit<Meta, "targetTypes"> & {
          eventArgType: DetailedEventArgOf<Event>;
        }
      >;
      <Meta extends EntityVMMeta, T = void>(
        this: AR.This<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillVM,
        Omit<Meta, "targetTypes"> & {
          eventArgType: CustomEventEventArg<T>;
        }
      >;
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillVM.parse(subView, model, eventName);
      const skillDef = skillModel.buildSkillDefinition();
      model.skillList.push(skillDef);
    }),
    /** same as `on` but add `usage 1 { visible false };` */
    once: h.attribute<{
      <Meta extends EntityVMMeta, const Event extends DetailedEventNames>(
        this: AR.This<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillVM,
        Omit<Meta, "targetTypes"> & {
          eventArgType: DetailedEventArgOf<Event>;
        }
      >;
      <Meta extends EntityVMMeta, T = void>(
        this: AR.This<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillVM,
        Omit<Meta, "targetTypes"> & {
          eventArgType: CustomEventEventArg<T>;
        }
      >;
      uniqueKey(): "once";
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillVM.parse(subView, model, eventName);
      skillModel.setUsage(1, { visible: false });
      const skillDef = skillModel.buildSkillDefinition();
      model.skillList.push(skillDef);
    }),
  }),
  DEFAULT_ENTITY_VM_META,
);

class CardModel {
  type: "support" | "equipment" | "eventCard" = "eventCard";
  obtainable = true;
  tags: EntityTag[] = [];
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  varConfigs = new Map<string, VariableConfig>();
  skillList: SkillDefinition[] = [];
  disableTuning = false;
  // TODO satiatedTarget

  getEntry(): EntityDefinition {
    // TODO
    throw new Error("Method not implemented.");
  }
}

export const CardViewModel = defineViewModel(
  CardModel,
  (h) => ({
    // TODO
  }),
  {
    ...DEFAULT_ENTITY_VM_META,
    type: "eventCard" as "eventCard" | "equipment" | "support",
  },
);
