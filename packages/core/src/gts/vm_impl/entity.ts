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
  type DescriptionDictionaryEntry,
  type DescriptionDictionaryKey,
  type EntityArea,
  type EntityDefinition,
  type EntityTag,
  type VariableConfig,
} from "../../base/entity";
import type { AttachmentDefinition, EntityState } from "../../base/state";
import type {
  CustomEventEventArg,
  DamageInfo,
  DamageOrHealEventArg,
  EnterEventArg,
  ModifyDamage3EventArg,
  SkillDefinition,
} from "../../base/skill";
import { getEntityArea, getEntityById, type Writable } from "../../utils";
import {
  ListenTo,
  type DetailedEventArgOf,
  type DetailedEventNames,
  type SkillOperation,
} from "../../builder/skill";
import {
  DEFAULT_VERSION_INFO,
  type Version,
  type VersionInfo,
} from "../../base/version";
import type {
  CombatStatusHandle,
  ExEntityType,
  ExtensionHandle,
  HandleT,
  SkillHandle,
} from "../../builder/type";
import {
  VariablesVM,
  type GtsAppendOptions,
  type GtsUsageOptions,
  type GtsVariableOptions,
} from "./variables";
import { createVariable, createVariableCanAppend } from "../../builder/utils";
import { TriggeredSkillModel, TriggeredSkillViewModel } from "./skill";
import { $, DamageType, type CustomEvent } from "../../builder";
import { GlobalUsageVM, PrepareVM, NightsoulVM } from "./entity_auxilary";
import type { CharacterPassiveSkillEntry } from "../../builder/registry";
import type { EntityDescriptionDictionaryGetter } from "../../builder/entity";
import { GiTcgCoreInternalError, GiTcgDataError } from "../../error";
import type { Computed } from "../../query/utils";
import type { AttachmentTag, ModificationGetter } from "../../base/attachment";
import { getSubId } from "./sub_id";

export interface GtsUsageOrUsagePerRoundOptions extends GtsUsageOptions {
  perRound: boolean;
}

export class EntityModel implements ICaller {
  usagePerRoundIndex = 0;

  id!: number;
  type: ExEntityType;
  tags: string[] = [];
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

  constructor(type: ExEntityType) {
    this.type = type;
    if (this.type === "status" || this.type === "equipment") {
      // add default defeated dispose skill
      const skillModel = new TriggeredSkillModel(this, "defeated");
      skillModel.id = this.getSubId();
      skillModel.action = function (c) {
        c.dispose();
      };
      skillModel.isDefaultDefeatedDispose = true;
      this.skillList.push(skillModel.buildSkillDefinition());
    }
  }

  getSubId(): number {
    return getSubId(this.id);
  }

  addDescriptionReplacement(
    key: DescriptionDictionaryKey,
    getter: EntityDescriptionDictionaryGetter<any>,
  ) {
    if (Reflect.has(this.descriptionDictionary, key)) {
      throw new GiTcgDataError(`Description key ${key} already exists`);
    }
    const extId = this.associatedExtensionId;
    const entry: DescriptionDictionaryEntry = function (st, id) {
      const ext = st.extensions.find((ext) => ext.definition.id === extId);
      const self = getEntityById(st, id) as EntityState;
      const area = getEntityArea(st, id);
      return String(getter(st, { ...self, area }, ext?.state));
    };
    this.descriptionDictionary[key] = entry;
    return this;
  }

  /** Return all skills including implicit roundEnd */
  getSkills(): SkillDefinition[] {
    // add clean-up roundEnd skill
    const usagePerRoundNames = USAGE_PER_ROUND_VARIABLE_NAMES.filter((name) =>
      this.varConfigs.has(name),
    );
    const hasDuration = this.varConfigs.has("duration");
    const skills = [...this.skillList];
    if (usagePerRoundNames.length > 0 || hasDuration) {
      const roundEndSkill = new TriggeredSkillModel(this, "roundEnd");
      roundEndSkill.id = this.getSubId();
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
    return skills;
  }
  protected getAttachmentModifications(): ModificationGetter {
    throw new GiTcgCoreInternalError(
      `Unreachable; AttachmentModel should override this`,
    );
  }

  getEntry():
    | EntityDefinition
    | AttachmentDefinition
    | CharacterPassiveSkillEntry {
    if (this.type === "character") {
      const skills = [...this.skillList];
      return {
        __definition: "passiveSkills",
        type: "passiveSkill",
        id: this.id,
        version: this.versionInfo,
        skills,
        varConfigs: Object.fromEntries(this.varConfigs),
      };
    } else if (this.type === "attachment") {
      const skills = this.getSkills();
      return {
        __definition: "attachments",
        id: this.id,
        visibleVarName: this.visibleVarName,
        varConfigs: Object.fromEntries(this.varConfigs),
        version: this.versionInfo,
        skills,
        modifications: this.getAttachmentModifications(),
        tags: this.tags as AttachmentTag[],
        type: this.type,
        descriptionDictionary: this.descriptionDictionary,
      };
    } else {
      const skills = this.getSkills();
      return {
        __definition: "entities",
        id: this.id,
        obtainable: true,
        disableTuning: false,
        version: this.versionInfo,
        visibleVarName: this.visibleVarName,
        varConfigs: Object.fromEntries(this.varConfigs),
        disposeWhenUsageIsZero: this.disposeWhenUsageIsZero,
        disposeOnMasterDefeated: this.disposeOnMasterDefeated,
        hintText: this.hintText,
        skills,
        tags: this.tags as EntityTag[],
        type: this.type,
        descriptionDictionary: this.descriptionDictionary,
      };
    }
  }

  setUsage(count: number, option: GtsUsageOrUsagePerRoundOptions): string {
    const perRound = option.perRound ?? false;
    let name: string;
    if (option.name) {
      name = option.name;
    } else if (this.type === "character") {
      throw new GiTcgDataError(
        `You must explicitly set the name of usage when defining passive skill. Be careful that different passive skill should have distinct usage name.`,
      );
    } else if (perRound) {
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
      if (this.type === "character" || this.type === "attachment") {
        throw new GiTcgDataError(
          `${this.type} cannot be autoDisposed by usage reaching 0.`,
        );
      }
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
  setUsage(count: number, option: GtsUsageOptions): string;
}

export const createVariableConfig = (
  initialValue: number,
  options: GtsVariableOptions,
): VariableConfig => {
  let appendOpt: GtsAppendOptions | undefined;
  if (typeof options.append === "object") {
    appendOpt = options.append;
  } else if (typeof options.append === "number") {
    appendOpt = { limit: options.append };
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

export type DefaultEntityVMMeta<T extends ExEntityType> =
  typeof DEFAULT_ENTITY_VM_META & {
    type: T;
  };

export type ThisWithType<
  Meta extends EntityVMMeta,
  T extends ExEntityType,
> = Meta["type"] extends T ? AR.This<Meta> : never;

type PushVar<Meta extends EntityVMMeta, Name extends string> = Computed<
  Omit<Meta, "variables"> & {
    variables: Meta["variables"] | Name;
  }
>;

export const EntityViewModel = defineViewModel(
  EntityModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
      required<Meta extends EntityVMMeta>(): Meta extends {
        type: "summon" | "status" | "combatStatus";
      }
        ? true
        : false;
      uniqueKey(): "id";
    }>(
      (model, [id]) => {
        model.id = id;
      },
      (model, [id]) => id as any,
    ),
    associateExtension: h.attribute<{
      <Meta extends EntityVMMeta, NewExtT>(
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
    
    prepare: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "status">,
        skill: SkillHandle | "normal",
      ): AR.With<typeof PrepareVM>;
    }>((model, [skill], subView) => {
      const options = PrepareVM.parse(subView);
      if (typeof options.hintCount === "number") {
        model.varConfigs.set("hintCount", createVariable(options.hintCount));
      }
      model.tags.push("preparingSkill");
      const replaceSkillModel = new TriggeredSkillModel(
        model,
        "replaceActionBySkill",
      );
      replaceSkillModel.id = model.getSubId();
      replaceSkillModel.action = function (c) {
        c.useSkill(skill, { asPrepared: true });
        if (options.nextStatus) {
          c.characterStatus(
            options.nextStatus,
            c.self.cast<"status">().master,
            options.nextStatusCreateOpt,
          );
        }
        c.dispose();
      };
      const switchActiveSkillModel = new TriggeredSkillModel(
        model,
        "switchActive",
      );
      switchActiveSkillModel.id = model.getSubId();
      switchActiveSkillModel.userFilters.push(function (c) {
        return (
          c.eventArg.switchInfo.from?.id === c.self.cast<"status">().master.id
        );
      });
      switchActiveSkillModel.action = function (c) {
        c.dispose();
      };
      model.skillList.push(
        replaceSkillModel.buildSkillDefinition(),
        switchActiveSkillModel.buildSkillDefinition(),
      );
    }),
    variable: h.attribute<{
      <Meta extends EntityVMMeta, const Name extends string>(
        this: AR.This<Meta>,
        name: Name,
        initialValue: number,
      ): AR.WithRewriteMeta<PushVar<Meta, Name>, typeof VariablesVM>;
    }>((model, [name, initValue], subView) => {
      const options = VariablesVM.parse(subView);
      const varConfig = createVariableConfig(initValue, options);
      model.varConfigs.set(name, varConfig);
    }),
    usage: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
        count: number,
      ): AR.WithRewriteMeta<PushVar<Meta, "usage">, typeof GlobalUsageVM>;
    }>((model, [count], subView) => {
      const options = GlobalUsageVM.parse(subView);
      model.setUsage(count, { ...options, perRound: false });
      if (options.autoDispose !== false) {
        model.disposeWhenUsageIsZero = true;
      }
    }),
    nightsoulsBlessing: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "status">,
        count: number,
      ): AR.WithRewriteMeta<PushVar<Meta, "nightsoul">, typeof NightsoulVM>;
    }>((model, [count], subView) => {
      const options = NightsoulVM.parse(subView);
      model.tags.push("nightsoulsBlessing");
      const varConfig = createVariableConfig(count, options);
      model.varConfigs.set("nightsoul", varConfig);
      if (options.autoDispose) {
        const disposeSkillModel = new TriggeredSkillModel(
          model,
          "beforeAction",
        );
        disposeSkillModel.id = model.getSubId();
        disposeSkillModel.userFilters.push(function (c) {
          return c.getVariable("nightsoul") <= 0;
        });
        disposeSkillModel.listenTo = ListenTo.All;
        disposeSkillModel.action = function (c) {
          c.self.dispose();
        };
        model.skillList.push(disposeSkillModel.buildSkillDefinition());
      }
    }),
    shield: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "status" | "combatStatus">,
        count: number,
        max?: number,
      ): AR.DoneRewriteMeta<PushVar<Meta, "shield">>;
    }>((model, [count, max = count]) => {
      const varConfig = createVariableConfig(count, {
        append: { limit: max },
      });
      model.varConfigs.set("shield", varConfig);
      const decreaseDmgSkill = new TriggeredSkillModel(
        model,
        "decreaseDamaged",
      );
      decreaseDmgSkill.id = model.getSubId();
      decreaseDmgSkill.userFilters.push(function (c) {
        if (c.self.definition.type === "combatStatus") {
          // 出战状态护盾只对出战角色生效
          return c.eventArg.target.isActive();
        } else {
          return true;
        }
      });
      decreaseDmgSkill.action = function (c) {
        const shield = c.getVariable("shield");
        const e = c.eventArg as ModifyDamage3EventArg;
        const currentValue = e.value;
        const decreased = Math.min(shield, currentValue);
        e.decreaseDamage(decreased);
        c.addVariable("shield", -decreased);
        if (shield <= currentValue) {
          c.dispose();
        }
      };
      model.skillList.push(decreaseDmgSkill.buildSkillDefinition());
    }),

    duration: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
        value: number,
      ): AR.WithRewriteMeta<PushVar<Meta, "duration">, typeof VariablesVM>;
    }>((model, [value], subView) => {
      const options = VariablesVM.parse(subView);
      const varConfig = createVariableConfig(value, options);
      model.varConfigs.set("duration", varConfig);
    }),
    oneDuration: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
      ): AR.WithRewriteMeta<
        Omit<Meta, "variables"> & {
          variables: Meta["variables"] | "duration";
        },
        typeof VariablesVM
      >;
    }>((model, [], subView) => {
      const options = VariablesVM.parse(subView);
      const varConfig = createVariableConfig(1, {
        ...options,
        visible: false,
      });
      model.varConfigs.set("duration", varConfig);
    }),

    replaceDescription: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
        key: DescriptionDictionaryKey,
        getter: EntityDescriptionDictionaryGetter<Meta["associatedExtension"]>,
      ): AR.Done;
    }>((model, [key, getter]) => {
      model.addDescriptionReplacement(key, getter);
    }),
    hint: h.attribute<{
      /**
       * The hint icon will defaults to Anemo, but changed to a swirled element
       * after my character/summon produced a swirling reaction.
       */
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "summon">,
        icon: "swirled",
        text?:
          | number
          | string
          | EntityDescriptionDictionaryGetter<Meta["associatedExtension"]>,
      ): AR.DoneRewriteMeta<PushVar<Meta, "hintIcon" | "swirledUsage">>;
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "summon">,
        icon: DamageType | CombatStatusHandle,
        text?:
          | number
          | string
          | EntityDescriptionDictionaryGetter<Meta["associatedExtension"]>,
      ): AR.DoneRewriteMeta<PushVar<Meta, "hintIcon">>;
    }>((model, [icon, text]) => {
      if (icon === "swirled") {
        icon = DamageType.Anemo;
        const onDmgSkill = new TriggeredSkillModel(model, "dealDamage");
        onDmgSkill.id = model.getSubId();
        onDmgSkill.userFilters.push(function (c) {
          const e = c.eventArg as DamageOrHealEventArg<DamageInfo>;
          return (
            ["character", "summon"].includes(e.source.definition.type) &&
            e.isSwirl()
          );
        });
        onDmgSkill.setUsage(1, { name: "swirledUsage", perRound: false });
        onDmgSkill.action = function (c) {
          const swirledType = (
            c.eventArg as DamageOrHealEventArg<DamageInfo>
          ).isSwirl()!;
          c.setVariable("hintIcon", swirledType);
        };
        model.skillList.push(onDmgSkill.buildSkillDefinition());
      }
      model.varConfigs.set(
        "hintCount",
        createVariableConfig(icon, { visible: false }),
      );
      if (typeof text === "function") {
        const hintReplacement = "[GCG_TOKEN_HINT_TEXT]";
        model.hintText = `\${${hintReplacement}}`;
        model.addDescriptionReplacement(hintReplacement, text);
      } else if (typeof text === "number") {
        model.hintText = String(text);
      } else {
        model.hintText = text ?? null;
      }
    }),

    conflictWith: h.attribute<{
      (id: number): AR.Done;
    }>((model, [id]) => {
      // 自身入场时，将位于相同实体区域的目标实体移除
      const enterSkill = new TriggeredSkillModel(model, "enter");
      enterSkill.id = model.getSubId();
      enterSkill.userFilters.push(function (c) {
        return c.query($.def(id as HandleT<ExEntityType>));
      });
      enterSkill.action = function (c) {
        const selfArea = c.self.area;
        for (const entity of c.queryAll($.def(id as HandleT<ExEntityType>))) {
          const enteringArea: EntityArea = entity.area;
          if (
            enteringArea.type === "characters" &&
            selfArea.type === "characters"
          ) {
            if (enteringArea.characterId === selfArea.characterId) {
              entity.dispose();
            }
          } else if (enteringArea.type === selfArea.type) {
            entity.dispose();
          }
        }
      };
      model.skillList.push(enterSkill.buildSkillDefinition());
    }),

    on: h.attribute<{
      <Meta extends EntityVMMeta, const Event extends DetailedEventNames>(
        this: AR.This<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        Meta & {
          eventArgType: DetailedEventArgOf<Event>;
        }
      >;
      <Meta extends EntityVMMeta, T = void>(
        this: AR.This<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        Computed<
          Meta & {
            eventArgType: CustomEventEventArg<T>;
          }
        >
      >;
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillViewModel.parse(
        subView,
        model,
        eventName,
      );
      skillModel.id = model.getSubId();
      const skillDef = skillModel.buildSkillDefinition();
      model.skillList.push(skillDef);
    }),
    /** same as `on` but add `usage 1 { visible false };` */
    once: h.attribute<{
      <Meta extends EntityVMMeta, const Event extends DetailedEventNames>(
        this: AR.This<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        Computed<
          Meta & {
            eventArgType: DetailedEventArgOf<Event>;
          }
        >
      >;
      <Meta extends EntityVMMeta, T = void>(
        this: AR.This<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        Computed<
          Meta & {
            eventArgType: CustomEventEventArg<T>;
          }
        >
      >;
      uniqueKey(): "once";
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillViewModel.parse(
        subView,
        model,
        eventName,
      );
      skillModel.id = model.getSubId();
      skillModel.setUsage(1, { visible: false, perRound: false });
      const skillDef = skillModel.buildSkillDefinition();
      model.skillList.push(skillDef);
    }),
  }),
  DEFAULT_ENTITY_VM_META,
);
