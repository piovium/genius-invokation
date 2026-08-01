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

import {
  defineViewModel,
  defineActionViewModel,
  type AR,
} from "@gi-tcg/gts-runtime";
import * as R from "remeda";
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
import type {
  AttachmentDefinition,
  EntityState,
  GameState,
} from "../../base/state";
import type {
  CustomEventEventArg,
  DamageInfo,
  DamageOrHealEventArg,
  EnterEventArg,
  InitiativeSkillEventArg,
  ModifyDamage3EventArg,
  SkillDefinition,
} from "../../base/skill";
import { getEntityArea, getEntityById, type Writable } from "../../utils";
import {
  ListenTo,
  type DetailedEventArgOf,
  type DetailedEventNames,
  type WritableMetaOf,
} from "../../runtime/skill";
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
  SupportHandle,
} from "../../data/type";
import {
  VariablesVM,
  type GtsAppendOptions,
  type GtsUsageOptions,
  type GtsVariableOptions,
} from "./variables";
import {
  createVariable,
  createVariableCanAppend,
  type TypeHint,
} from "../../data/utils";
import {
  SkillWrappingData,
  TriggeredSkillModel,
  TriggeredSkillViewModel,
  type TriggeredSkillVMMeta,
} from "./skill";
import { $, DamageType, DiceType, type CustomEvent } from "../../data";
import { GlobalUsageVM, PrepareVM, NightsoulVM } from "./entity_auxilary";
import type { CharacterPassiveSkillEntry } from "../../data/registry";
import { GiTcgCoreInternalError, GiTcgDataError } from "../../error";
import type { Computed } from "../../query/utils";
import type { AttachmentTag, ModificationGetter } from "../../base/attachment";
import { getSubId } from "./sub_id";
import type {
  CallingAreaType,
  TypedSkillContext,
} from "../../runtime/skill_context";
import { RESERVED, type Reserved, type ReservedMeta } from "./reserved";

/** A GTS definition's lazy description replacement. */
export type EntityDescriptionDictionaryGetter<
  AssociatedExt extends ExtensionHandle,
> = (
  state: GameState,
  self: EntityState & { readonly area: EntityArea },
  extensionState: AssociatedExt["type"],
) => string | number;

interface DeclaredUsageInfo {
  autoDispose: boolean;
  autoDecrease: boolean;
  perRound: boolean;
}

interface SetVariableOptions {
  option: GtsVariableOptions;
  duplicateGuard?: (
    existingConfig: VariableConfig,
    incomingConfig: VariableConfig,
  ) => false | GiTcgDataError | "ignore" | "overwrite";
}

export interface GtsUsageOrUsagePerRoundOptions extends GtsUsageOptions {
  perRound: boolean;
}

export interface IParentModel {
  id: number;
  wrapData: SkillWrappingData;
}

export interface IDescriptionReplaceable {
  descriptionDictionary: Writable<DescriptionDictionary>;
  wrapData: SkillWrappingData;
}

export function addDescriptionReplacement(
  model: IDescriptionReplaceable,
  key: DescriptionDictionaryKey,
  getter: EntityDescriptionDictionaryGetter<any>,
) {
  if (Reflect.has(model.descriptionDictionary, key)) {
    throw new GiTcgDataError(`Description key ${key} already exists`);
  }
  const extId = model.wrapData.associatedExtensionId;
  const entry: DescriptionDictionaryEntry = function (st, id) {
    const ext = st.extensions.find((ext) => ext.definition.id === extId);
    const self = getEntityById(st, id) as EntityState;
    const area = getEntityArea(st, id);
    return String(getter(st, { ...self, area }, ext?.state));
  };
  model.descriptionDictionary[key] = entry;
}

export class EntityModel implements ICaller {
  reserved = false;
  usagePerRoundIndex = 0;

  id!: number;
  type: ExEntityType;
  tags: ((string & {}) | EntityTag)[] = [];
  versionInfo: VersionInfo | null = null;
  obtainable: boolean = true;

  varConfigs = new Map<string, VariableConfig>();
  #declaredUsages = new Map<string, DeclaredUsageInfo>();
  skillList: SkillDefinition[] = [];
  disposeWhenUsageIsZero = false;
  disposeOnMasterDefeated = false;
  visibleVarName: string | null = null;

  hintText: string | null = null;
  descriptionDictionary: Writable<DescriptionDictionary> = {};

  stagedOperations: StagedOperation<any>[] = [];

  #wrapData: SkillWrappingData;
  get wrapData() {
    return this.#wrapData;
  }

  constructor(type: ExEntityType, parent?: IParentModel) {
    if (parent) {
      this.id = parent.id;
      this.#wrapData = parent.wrapData;
    } else {
      this.#wrapData = new SkillWrappingData();
    }
    this.type = type;
  }

  getSubId(): number {
    return getSubId(this.id);
  }

  /** Return all skills including implicit roundEnd */
  getSkills(): SkillDefinition[] {
    if (this.type === "status" || this.type === "equipment") {
      // add default defeated dispose skill
      const skillModel = new TriggeredSkillModel(this, "defeated");
      skillModel.id = this.getSubId();
      skillModel.action = function (c) {
        c.dispose();
      };
      skillModel.isDefaultDefeatedDispose = true;
      this.skillList.unshift(skillModel.buildSkillDefinition());
    }
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
    | Reserved
    | EntityDefinition
    | AttachmentDefinition
    | CharacterPassiveSkillEntry {
    if (this.reserved) {
      return RESERVED;
    } else if (this.type === "character") {
      const skills = this.getSkills();
      return {
        __definition: "passiveSkills",
        type: "passiveSkill",
        id: this.id,
        version: this.versionInfo ?? DEFAULT_VERSION_INFO,
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
        version: this.versionInfo ?? DEFAULT_VERSION_INFO,
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
        version: this.versionInfo ?? DEFAULT_VERSION_INFO,
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

  #setVariableImpl(
    name: string,
    initValue: number,
    { option, duplicateGuard = () => false }: SetVariableOptions,
  ) {
    const varConfig = createVariableConfig(initValue, option);
    const existingVarConfig = this.varConfigs.get(name);
    if (existingVarConfig) {
      const guardResult = duplicateGuard(existingVarConfig, varConfig);
      if (guardResult instanceof GiTcgDataError) {
        throw guardResult;
      }
      switch (guardResult) {
        case false:
          throw new GiTcgDataError(
            `Variable ${name} already exists in entity ${this.id} (${this.type})`,
          );
        case "ignore":
          return;
        case "overwrite":
          break;
      }
    }
    this.varConfigs.set(name, varConfig);
    if (option.visible !== false) {
      this.visibleVarName = name;
    }
  }
  setVariable(name: string, initValue: number, option: GtsVariableOptions) {
    this.#setVariableImpl(name, initValue, { option });
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
    if (autoDispose) {
      if (this.type === "character" || this.type === "attachment") {
        throw new GiTcgDataError(
          `${this.type} cannot be autoDisposed by usage reaching 0.`,
        );
      }
      this.disposeWhenUsageIsZero = true;
    }
    const incomingDeclInfo: DeclaredUsageInfo = {
      perRound,
      autoDispose,
      autoDecrease: option.autoDecrease !== false,
    };
    this.#setVariableImpl(name, count, {
      option,
      duplicateGuard: (existing, incoming) => {
        const existingDeclInfo = this.#declaredUsages.get(name);
        if (
          R.isDeepEqual(existing, incoming) &&
          R.isDeepEqual(existingDeclInfo, incomingDeclInfo)
        ) {
          return "ignore";
        }
        return new GiTcgDataError(
          `Incompatible usage "${name}" specified in entity ${this.id} (${this.type})`,
        );
      },
    });
    this.#declaredUsages.set(name, incomingDeclInfo);
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
  wrapData: SkillWrappingData;
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
  readonly snippets: Record<string, unknown>;
  readonly stagedEventArgType: unknown;
}

// This variable is type-only but may fell into TDZ after bundling.
// Declare it as var.
export var DEFAULT_ENTITY_VM_META = {
  type: "" as ExEntityType,
  variables: null as never,
  stagedEventArgType: null as never,
  associatedExtension: null as never,
  snippets: {},
} as const satisfies EntityVMMeta;

export type DefaultEntityVMMeta<
  T extends ExEntityType,
  AssociatedExtension = never,
> = Computed<
  Omit<typeof DEFAULT_ENTITY_VM_META, "associatedExtension"> & {
    type: T;
    associatedExtension: AssociatedExtension;
  },
  EntityVMMeta
>;

type SnippetOperation<
  Meta extends EntityVMMeta,
  ArgT,
  Area extends CallingAreaType = CallingAreaType,
> = (
  c: TypedSkillContext<
    WritableMetaOf<{
      callerType: Meta["type"];
      callingArea: Area;
      associatedExtension: Meta["associatedExtension"];
      callerVars: Meta["variables"];
      eventArgType: ArgT;
      gtsSnippets: Meta["snippets"];
    }>
  >,
) => void;

type StagedOperation<Meta extends EntityVMMeta> = SnippetOperation<
  Meta,
  Meta["stagedEventArgType"],
  "onStage" | "disposed"
>;

export type ThisWithType<
  Meta extends EntityVMMeta,
  T extends ExEntityType,
> = Meta["type"] extends T ? AR.This<Meta> : never;

type PushVar<Meta extends EntityVMMeta, Name extends string> = Computed<
  Omit<Meta, "variables"> & {
    variables: Meta["variables"] | Name;
  }
>;

class StagedOperationVM extends defineActionViewModel<
  <Meta extends EntityVMMeta>(
    this: AR.This<Meta>,
    operation: StagedOperation<Meta>,
  ) => AR.Done
>() {}

class SnippetOperationVM extends defineActionViewModel<
  <Meta extends EntityVMMeta>(
    this: AR.This<Meta>,
    operation: SnippetOperation<Meta, void>,
  ) => AR.Done
>() {}

interface TriggeredSkillVMMetaFromEntity<
  Meta extends EntityVMMeta,
  EventName extends DetailedEventNames | CustomEvent,
> {
  readonly type: Meta["type"];
  readonly variables: Meta["variables"];
  readonly associatedExtension: Meta["associatedExtension"];
  readonly snippets: Meta["snippets"];
  readonly callingArea: EventName extends "selfDispose" | "selfDiscard"
    ? "disposed"
    : "onStage";
  readonly eventArgType: [EventName] extends [DetailedEventNames]
    ? DetailedEventArgOf<EventName>
    : EventName extends CustomEvent<infer T>
      ? CustomEventEventArg<T>
      : never;
  readonly stagedEventArgType: unknown;
}

export class EntityViewModel extends defineViewModel(
  EntityModel,
  (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
      as(this: AR.This<ReservedMeta>): undefined;
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
    reserved: h.attribute<{
      (): AR.DoneRewriteMeta<ReservedMeta>;
    }>((model, []) => {
      model.reserved = true;
    }),
    associateExtension: h.attribute<{
      <Meta extends EntityVMMeta, NewExtT>(
        this: [Meta["associatedExtension"]] extends [never]
          ? AR.This<Meta>
          : never,
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
      model.wrapData.associatedExtensionId = extId;
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

    defineSnippet: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
      ): AR.WithRewriteMeta<
        Computed<
          Omit<Meta, "snippets"> & {
            snippets: Meta["snippets"] & { default: void };
          }
        >,
        SnippetOperationVM,
        Meta
      >;
      <Meta extends EntityVMMeta, const Name extends string>(
        this: AR.This<Meta>,
        name: Name,
      ): AR.WithRewriteMeta<
        Computed<
          Omit<Meta, "snippets"> & {
            snippets: Meta["snippets"] & { [K in Name]: void };
          }
        >,
        SnippetOperationVM,
        Meta
      >;
      <Meta extends EntityVMMeta, ArgT>(
        this: AR.This<Meta>,
        typeHint: TypeHint<ArgT>,
      ): AR.WithRewriteMeta<
        Computed<
          Omit<Meta, "snippets"> & {
            snippets: Meta["snippets"] & { default: ArgT };
          }
        >,
        SnippetOperationVM,
        Meta
      >;
      <Meta extends EntityVMMeta, const Name extends string, ArgT>(
        this: AR.This<Meta>,
        name: Name,
        typeHint: TypeHint<ArgT>,
      ): AR.WithRewriteMeta<
        Computed<
          Omit<Meta, "snippets"> & {
            snippets: Meta["snippets"] & { [K in Name]: ArgT };
          }
        >,
        SnippetOperationVM,
        Meta
      >;
    }>((model, args, subView) => {
      let name: string;
      if (args.length === 0) {
        name = "default";
      } else if (args.length === 1) {
        if (typeof args[0] === "string") {
          name = args[0];
        } else {
          name = "default";
        }
      } else {
        name = args[0];
      }
      const snippetModel = SnippetOperationVM.parse(subView);
      model.wrapData.snippets.set(name, snippetModel.action);
    }),

    prepare: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "status">,
        skill: SkillHandle | "normal",
      ): AR.With<typeof PrepareVM>;
    }>((model, [skill], subView) => {
      const options = PrepareVM.parse(subView);
      if (typeof options.hintCount === "number") {
        model.setVariable("hintCount", options.hintCount, { visible: false });
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
      model.setVariable(name, initValue, options);
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
      model.setVariable("nightsoul", 0, {
        append: { limit: count },
        ...options,
      });
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
      model.tags.push("shield");
      model.setVariable("shield", count, {
        append: { limit: max },
      });
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
    adventureSpot: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "support">,
      ): AR.DoneRewriteMeta<PushVar<Meta, "exp">>;
    }>((model, []) => {
      model.obtainable = false;
      model.tags.push("adventureSpot");
      model.setVariable("exp", 1, { append: true });
    }),
    elementalBlessing: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "support">,
        type1: DiceType,
        type2: DiceType,
      ): AR.Done;
    }>((model, [type1, type2]) => {
      model.obtainable = false;
      model.tags.push("blessing");
      const autoPlaySkill = new TriggeredSkillModel(model, "actionPhase");
      autoPlaySkill.enableHandTriggering = true;
      autoPlaySkill.enablePileTriggering = true;
      autoPlaySkill.userFilters.push(function (c) {
        if (c.self.area.type === "supports") {
          return false;
        }
        const elements = new Set(
          c.player.characters.flatMap((ch) => ch.element()),
        );
        return (
          elements.size === 2 && elements.has(type1) && elements.has(type2)
        );
      });
      autoPlaySkill.action = function (c) {
        const self = c.self.cast<"support">();
        // 若在牌库里，先抓到手上
        if (c.self.area.type === "pile") {
          c.drawCards(self);
        }
        // 若不在手上（爆牌），就啥也别干了
        if (c.self.area.type !== "hands") {
          return;
        }
        c.disposeCard(self);
        c.createEntity("support", self.definition.id as SupportHandle, {
          who: c.self.area.who,
          type: "supports",
        });
        c.convertDice(type1, 2);
        c.convertDice(type2, 2);
      };
      model.skillList.push(autoPlaySkill.buildSkillDefinition());
    }),

    duration: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
        value: number,
      ): AR.WithRewriteMeta<PushVar<Meta, "duration">, typeof VariablesVM>;
    }>((model, [value], subView) => {
      const options = VariablesVM.parse(subView);
      model.setVariable("duration", value, options);
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
      model.setVariable("duration", 1, {
        ...options,
        visible: false,
      });
    }),

    replaceDescription: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: AR.This<Meta>,
        key: DescriptionDictionaryKey,
        getter: EntityDescriptionDictionaryGetter<Meta["associatedExtension"]>,
      ): AR.Done;
    }>((model, [key, getter]) => {
      addDescriptionReplacement(model, key, getter);
    }),
    hint: h.attribute<{
      /**
       * The hint icon will defaults to Anemo, but changed to a swirled element
       * after my character/summon produced a swirling reaction.
       */
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "summon" | "support">,
        icon: "swirled",
        text?:
          | number
          | string
          | EntityDescriptionDictionaryGetter<Meta["associatedExtension"]>,
      ): AR.DoneRewriteMeta<PushVar<Meta, "hintIcon" | "swirledUsage">>;
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "summon" | "support">,
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
      model.setVariable("hintIcon", icon, { visible: false });
      if (typeof text === "function") {
        const hintReplacement = "[GCG_TOKEN_HINT_TEXT]";
        model.hintText = `\${${hintReplacement}}`;
        addDescriptionReplacement(model, hintReplacement, text);
      } else if (typeof text === "number") {
        model.hintText = String(text);
      } else {
        model.hintText = text ?? null;
      }
    }),

    conflictWith: h.attribute<{
      (id: number, ...otherIds: number[]): AR.Done;
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "status">,
        mark: "crossCharacter",
        ...otherIds: number[]
      ): AR.Done;
    }>((model, args) => {
      // 自身入场时，将位于相同实体区域（默认）或此方所有角色（crossCharacter）上的目标实体移除
      let conflictIds = [model.id];
      let mode: "default" | "crossCharacter" = "default";
      if (args[0] === "crossCharacter") {
        mode = "crossCharacter";
        conflictIds.push(...(args.slice(1) as number[]));
      } else {
        conflictIds.push(...(args as number[]));
      }
      const enterSkill = new TriggeredSkillModel(model, "enter");
      enterSkill.id = model.getSubId();
      enterSkill.action = function (c) {
        const selfArea = c.self.area;
        for (const entity of c.queryAll(
          $.union(...conflictIds.map((id) => $.def(id))),
        )) {
          if (entity.id === c.self.id || c.self.who !== entity.who) {
            continue;
          }
          const enteringArea: EntityArea = entity.area;
          if (
            enteringArea.type === "characters" &&
            selfArea.type === "characters"
          ) {
            if (
              mode === "crossCharacter" ||
              enteringArea.characterId === selfArea.characterId
            ) {
              entity.dispose();
            }
          } else if (enteringArea.type === selfArea.type) {
            entity.dispose();
          }
        }
      };
      model.skillList.push(enterSkill.buildSkillDefinition());
    }),
    noDefaultDispose: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "status" | "equipment">,
      ): AR.Done;
      uniqueKey(): "defaultDispose";
    }>((model, []) => {
      model.disposeOnMasterDefeated = false;
    }),

    on: h.attribute<{
      <Meta extends EntityVMMeta>(
        this: ThisWithType<Meta, "support" | "equipment">,
        eventName: "staged",
      ): AR.With<StagedOperationVM, Meta>;
      <Meta extends EntityVMMeta, const Event extends DetailedEventNames>(
        this: AR.This<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        TriggeredSkillVMMetaFromEntity<Meta, Event>
      >;
      <Meta extends EntityVMMeta, T = void>(
        this: AR.This<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        TriggeredSkillVMMetaFromEntity<Meta, CustomEvent<T>>
      >;
      mergeMeta<
        Meta extends EntityVMMeta,
        InnerMeta extends TriggeredSkillVMMeta,
      >(
        meta: Meta,
        innerMeta: InnerMeta,
      ): Omit<Meta, "variables"> & {
        variables: Meta["variables"] | InnerMeta["variables"];
      };
      mergeMeta<Meta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: unknown,
      ): Meta;
    }>((model, [eventName], subView) => {
      if (eventName === "staged") {
        const stagedAction = StagedOperationVM.parse(subView);
        model.stagedOperations.push(stagedAction.action);
        return;
      }
      if (
        eventName === "enter" &&
        !["status", "combatStatus", "summon"].includes(model.type)
      ) {
        throw new GiTcgDataError(
          "Only status, combatStatus, and summon can have `enter` handling. For support and equipment, use `on staged { ... };` instead.",
        );
      }
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
        TriggeredSkillVMMetaFromEntity<Meta, Event>
      >;
      <Meta extends EntityVMMeta, T = void>(
        this: AR.This<Meta>,
        customEvent: CustomEvent<T>,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        TriggeredSkillVMMetaFromEntity<Meta, CustomEvent<T>>
      >;
      uniqueKey(): "once";
      mergeMeta<
        Meta extends EntityVMMeta,
        InnerMeta extends TriggeredSkillVMMeta,
      >(
        meta: Meta,
        innerMeta: InnerMeta,
      ): Omit<Meta, "variables"> & {
        variables: Meta["variables"] | InnerMeta["variables"];
      };
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
) {}
