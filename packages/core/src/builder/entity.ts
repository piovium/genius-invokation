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

import { DamageType } from "@gi-tcg/typings";
import {
  type DescriptionDictionary,
  type DescriptionDictionaryEntry,
  type DescriptionDictionaryKey,
  type EntityArea,
  type EntityTag,
  type EntityType,
  type EntityVariableConfigs,
  USAGE_PER_ROUND_VARIABLE_NAMES,
  type VariableConfig,
} from "../base/entity";
import type { CustomEventEventArg, SkillDefinition } from "../base/skill";
import {
  registerEntity,
  registerPassiveSkill,
  builderWeakRefs,
  registerAttachment,
} from "./registry";
import {
  withShortcut,
  TechniqueBuilder,
  TriggeredSkillBuilder,
  type BuilderWithShortcut,
  type DetailedEventNames,
  type SkillOperation,
  type SkillOperationFilter,
  type CreateSkillBuilderMeta,
  type UsageOptions,
  type DetailedEventArgOf,
} from "./skill";
import type {
  CardHandle,
  CombatStatusHandle,
  ExEntityType,
  ExtensionHandle,
  HandleT,
  PassiveSkillHandle,
  SkillHandle,
  StatusHandle,
} from "./type";
import { GiTcgCoreInternalError, GiTcgDataError } from "../error";
import { createVariable, createVariableCanAppend } from "./utils";
import {
  getEntityArea,
  getEntityById,
  type Writable,
  type CreateEntityOptions,
} from "../utils";
import type { EntityState, GameState } from "../base/state";
import {
  type Version,
  type VersionInfo,
  type VersionMetadata,
  DEFAULT_VERSION_INFO,
} from "../base/version";
import type { TypedSkillContext } from "./context/skill";
import type { CustomEvent } from "../base/custom_event";
import type { AttachmentTag, ModificationGetter } from "../base/attachment";

export interface AppendOptions {
  /** 重复创建时的累积值上限 */
  limit?: number;
  /** 重复创建时累积的值 */
  value?: number;
}

export interface VariableOptions {
  /** 该值在重复创建时是否允许叠加。 */
  append?: AppendOptions | boolean;
  /**
   * 该值在重复创建时将强制重置为默认值（而非默认值和当前值的最大值）。
   * 指定 `append` 时此选项无效。
   */
  forceOverwrite?: boolean;
  /** 该值是否在前端可见，默认为 `true`。仅最后一次添加的变量会显示。 */
  visible?: boolean;
}

export type VariableOptionsWithoutAppend = Omit<VariableOptions, "append">;

// 当 CallerType 是 character 时，正在构建的是被动技能，返回 PassiveSkillHandle
export type EntityBuilderResultT<CallerType extends ExEntityType> =
  CallerType extends "character" ? PassiveSkillHandle : HandleT<CallerType>;

interface GlobalUsageOptions extends VariableOptions {
  /**
   * 是否在 consumeUsage() 且变量到达 0 时时自动弃置实体。
   * 默认为 true
   */
  autoDispose?: boolean;
}

interface NightsoulOptions extends VariableOptions {
  /**
   * 是否在夜魂值为 0 时退出夜魂加持
   * @default false
   */
  autoDispose?: boolean;
}

type EntityStateWithArea = EntityState & { readonly area: EntityArea };

export type EntityDescriptionDictionaryGetter<
  AssociatedExt extends ExtensionHandle,
> = (
  st: GameState,
  self: EntityStateWithArea,
  ext: AssociatedExt["type"],
) => string | number;

export const DEFAULT_SNIPPET_NAME = "default" as const;
export type DefaultCustomEventArg = { readonly _default: unique symbol };

export interface PrepareOption {
  hintCount?: number;
  nextStatus?: StatusHandle;
  nextStatusCreateOpt?: CreateEntityOptions;
}

export class EntityBuilder<
  CallerType extends "character" | EntityType | "attachment",
  CallerVars extends string,
  AssociatedExt extends ExtensionHandle,
  FromCard extends boolean,
  Snippets extends {},
> {
  private _skillNo = 0;
  readonly _skillList: SkillDefinition[] = [];
  _usagePerRoundIndex = 0;
  private readonly _tags: (EntityTag | AttachmentTag)[] = [];
  _varConfigs: Writable<EntityVariableConfigs> = {};
  _obtainable = false;
  private _disposeWhenUsageIsZero = false;
  private _disposeOnMasterDefeated: boolean;
  private _visibleVarName: string | null = null;
  _associatedExtensionId: number | null = null;
  private _hintText: string | null = null;
  private readonly _descriptionDictionary: Writable<DescriptionDictionary> = {};
  private _snippets = new Map<string, SkillOperation<any>>();

  private generateSkillId() {
    const thisSkillNo = ++this._skillNo;
    return this.id + thisSkillNo / 100;
  }

  constructor(
    public readonly _type: CallerType,
    private readonly id: number,
    private readonly chainFromId: number | null = null,
  ) {
    builderWeakRefs.add(new WeakRef(this));
    this._disposeOnMasterDefeated = _type === "status" || _type === "equipment";
    this.createDefaultDisposeSkill();
  }

  private createDefaultDisposeSkill() {
    if (!(this._type === "status" || this._type === "equipment")) {
      return;
    }
    const builder = this.on(
      "defeated",
      (c, e) =>
        c.self.area.type === "characters" &&
        c.self.cast<EntityType>().definition.disposeOnMasterDefeated,
    );
    builder["~isDefaultDefeatedDispose"] = true;
    builder.dispose().endOn();
  }

  noDefaultDispose() {
    if (!(this._type === "status" || this._type === "equipment")) {
      throw new GiTcgDataError(
        `Only status and equipment can specify .noDefaultDispose()`,
      );
    }
    this._disposeOnMasterDefeated = false;
    return this;
  }

  /** @internal */
  public _versionInfo: VersionInfo = DEFAULT_VERSION_INFO;
  setVersionInfo<From extends keyof VersionMetadata>(
    from: From,
    value: VersionMetadata[From],
  ) {
    this._versionInfo = { from, value };
    return this;
  }
  since(version: Version) {
    return this.setVersionInfo("official", { predicate: "since", version });
  }
  until(version: Version) {
    return this.setVersionInfo("official", { predicate: "until", version });
  }

  replaceDescription(
    key: DescriptionDictionaryKey,
    getter: EntityDescriptionDictionaryGetter<AssociatedExt>,
  ): this {
    if (Reflect.has(this._descriptionDictionary, key)) {
      throw new GiTcgDataError(`Description key ${key} already exists`);
    }
    const extId = this._associatedExtensionId;
    const entry: DescriptionDictionaryEntry = function (st, id) {
      const ext = st.extensions.find((ext) => ext.definition.id === extId);
      const self = getEntityById(st, id) as EntityState;
      const area = getEntityArea(st, id);
      return String(getter(st, { ...self, area }, ext?.state));
    };
    this._descriptionDictionary[key] = entry;
    return this;
  }

  associateExtension<NewExtT>(ext: ExtensionHandle<NewExtT>) {
    if (this._associatedExtensionId !== null) {
      throw new GiTcgDataError(
        `This entity has already associated with extension ${this.id}`,
      );
    }
    this._associatedExtensionId = ext;
    return this as unknown as EntityBuilderPublic<
      CallerType,
      CallerVars,
      ExtensionHandle<NewExtT>,
      FromCard,
      Snippets
    >;
  }

  provideSkill(id: number) {
    if (this._type !== "equipment") {
      throw new GiTcgDataError("Only equipment can have technique skill");
    }
    const self = this as unknown as EntityBuilder<
      "equipment",
      CallerVars,
      AssociatedExt,
      FromCard,
      Snippets
    >;
    return withShortcut(
      new TechniqueBuilder<CallerVars, readonly [], AssociatedExt, FromCard>(
        id,
        self,
      ),
    );
  }

  conflictWith(id: number) {
    return this.on("enter", (c) => c.$(`my any with definition id ${id}`))
      .do(function (c) {
        // 将位于相同实体区域的目标实体移除
        for (const entity of c.$$(`my any with definition id ${id}`)) {
          if (
            entity.area.type === "characters" &&
            c.self.area.type === "characters"
          ) {
            if (entity.area.characterId === c.self.area.characterId) {
              entity.dispose();
            }
          } else if (entity.area.type === c.self.area.type) {
            entity.dispose();
          }
        }
      })
      .endOn();
  }
  unique(...otherIds: number[]) {
    if (this._type !== "status") {
      throw new GiTcgDataError("Only character status can be unique");
    }
    const ids = [this.id, ...otherIds];
    const targetQuery = ids
      .map((id) => `(status with definition id ${id})`)
      .join(" or ");
    return this.on("enter").dispose(`(${targetQuery}) and not @self`).endOn();
  }

  on<EventName extends DetailedEventNames>(
    event: EventName,
    filter?: SkillOperationFilter<
      CreateSkillBuilderMeta<
        DetailedEventArgOf<EventName>,
        CallerType,
        CallerVars,
        AssociatedExt
      >
    >,
  ): BuilderWithShortcut<
    TriggeredSkillBuilder<
      DetailedEventArgOf<EventName>,
      CallerType,
      CallerVars,
      AssociatedExt,
      FromCard,
      Snippets
    >
  >;
  on<T = void>(
    customEvent: CustomEvent<T>,
    filter?: SkillOperationFilter<
      CreateSkillBuilderMeta<
        CustomEventEventArg<T>,
        CallerType,
        CallerVars,
        AssociatedExt
      >
    >,
  ): BuilderWithShortcut<
    TriggeredSkillBuilder<
      CustomEventEventArg<T>,
      CallerType,
      CallerVars,
      AssociatedExt,
      FromCard,
      Snippets
    >
  >;
  on(event: any, filter?: any): unknown {
    return withShortcut(
      new TriggeredSkillBuilder(this.generateSkillId(), event, this, filter),
    );
  }

  once<NewEventName extends DetailedEventNames>(
    event: NewEventName,
    filter?: SkillOperationFilter<
      CreateSkillBuilderMeta<
        DetailedEventArgOf<NewEventName>,
        CallerType,
        CallerVars,
        AssociatedExt
      >
    >,
  ): BuilderWithShortcut<
    TriggeredSkillBuilder<
      DetailedEventArgOf<NewEventName>,
      CallerType,
      CallerVars,
      AssociatedExt,
      FromCard,
      Snippets
    >
  >;
  once<T = void>(
    customEvent: CustomEvent<T>,
    filter?: SkillOperationFilter<
      CreateSkillBuilderMeta<
        CustomEventEventArg<T>,
        CallerType,
        CallerVars,
        AssociatedExt
      >
    >,
  ): BuilderWithShortcut<
    TriggeredSkillBuilder<
      CustomEventEventArg<T>,
      CallerType,
      CallerVars,
      AssociatedExt,
      FromCard,
      Snippets
    >
  >;
  once(event: any, filter?: any): unknown {
    return this.on(event, filter).usage(1, {
      visible: false,
    });
  }

  variable<const Name extends string>(
    name: Name,
    value: number,
    opt?: VariableOptions,
  ): EntityBuilderPublic<
    CallerType,
    CallerVars | Name,
    AssociatedExt,
    FromCard,
    Snippets
  > {
    if (Reflect.has(this._varConfigs, name)) {
      throw new GiTcgDataError(`Variable name ${name} already exists`);
    }
    let appendOpt: AppendOptions | false;
    if (opt?.append) {
      if (opt.append === true) {
        appendOpt = {};
      } else {
        appendOpt = opt.append;
      }
    } else {
      appendOpt = false;
    }
    let varConfig: VariableConfig;
    if (appendOpt) {
      varConfig = createVariableCanAppend(
        value,
        appendOpt.limit,
        appendOpt.value,
      );
    } else {
      varConfig = createVariable(value, opt?.forceOverwrite);
    }
    this._varConfigs[name] = varConfig;
    const visible = opt?.visible ?? true;
    if (visible) {
      this._visibleVarName = name;
    }
    return this as any;
  }
  variableCanAppend<const Name extends string>(
    name: Name,
    value: number,
    max?: number,
    opt?: VariableOptionsWithoutAppend,
  ): EntityBuilderPublic<
    CallerType,
    CallerVars | Name,
    AssociatedExt,
    FromCard,
    Snippets
  >;
  variableCanAppend<const Name extends string>(
    name: Name,
    value: number,
    max: number,
    appendValue: number,
    opt?: VariableOptionsWithoutAppend,
  ): EntityBuilderPublic<
    CallerType,
    CallerVars | Name,
    AssociatedExt,
    FromCard,
    Snippets
  >;
  variableCanAppend(
    name: string,
    value: number,
    max: number,
    appendOrOpt?: number | VariableOptionsWithoutAppend,
    opt?: VariableOptionsWithoutAppend,
  ): any {
    if (typeof appendOrOpt === "number") {
      return this.variable(name, value, {
        append: { limit: max, value: appendOrOpt },
        ...opt,
      });
    } else {
      return this.variable(name, value, {
        append: { limit: max },
        ...appendOrOpt,
      });
    }
  }

  /**
   * 当 skill builder 指定 .usage 时，上层 entity builder 的操作
   * @param count
   * @param opt
   * @returns usage 变量名
   */
  _setUsage(count: number, opt?: UsageOptions<string>): string {
    const perRound = opt?.perRound ?? false;
    let name: string;
    if (opt?.name) {
      name = opt.name;
    } else {
      if (this._type === "character") {
        throw new GiTcgDataError(
          `You must explicitly set the name of usage when defining passive skill. Be careful that different passive skill should have distinct usage name.`,
        );
      }
      if (perRound) {
        if (this._usagePerRoundIndex >= USAGE_PER_ROUND_VARIABLE_NAMES.length) {
          throw new GiTcgCoreInternalError(
            `Cannot specify more than ${USAGE_PER_ROUND_VARIABLE_NAMES.length} usagePerRound.`,
          );
        }
        name = USAGE_PER_ROUND_VARIABLE_NAMES[this._usagePerRoundIndex];
        this._usagePerRoundIndex++;
      } else {
        name = "usage";
      }
    }
    if (
      !perRound &&
      name !== "usage" &&
      typeof opt?.autoDispose === "boolean"
    ) {
      console?.warn?.(
        `No need to specify \`autoDispose\` of a non-per-round non-defaulted-name usage, since it cannot be auto-disposed by \`.consumeUsage\` primitive.`,
      );
      console?.trace?.();
    }
    const autoDispose = name === "usage" && opt?.autoDispose !== false;
    this.variable(name, count, opt);
    if (autoDispose) {
      this._disposeWhenUsageIsZero = true;
    }
    return name;
  }

  duration(count: number, opt?: VariableOptions) {
    return this.variable("duration", count, opt);
  }
  oneDuration(opt?: VariableOptions) {
    return this.duration(1, { ...opt, visible: false });
  }

  shield(count: number, max?: number) {
    this.tags("shield");
    return this.variableCanAppend("shield", count, max ?? count)
      .on("decreaseDamaged", (c, e) => {
        if (c.self.definition.type === "combatStatus") {
          // 出战状态护盾只对出战角色生效
          return e.target.isActive();
        } else {
          return true;
        }
      })
      .do(function (c, e) {
        const shield = c.getVariable("shield");
        const currentValue = e.value;
        const decreased = Math.min(shield, currentValue);
        e.decreaseDamage(decreased);
        c.addVariable("shield", -decreased);
        if (shield <= currentValue) {
          c.dispose();
        }
      })
      .endOn();
  }

  nightsoulsBlessing(maxCount: number, opt: NightsoulOptions = {}) {
    const self = this.tags("nightsoulsBlessing").variableCanAppend(
      "nightsoul",
      0,
      maxCount,
      opt,
    );
    if (opt.autoDispose) {
      self
        .on("beforeAction", (c, e) => c.getVariable("nightsoul") <= 0)
        .listenToAll()
        .dispose()
        .endOn();
    }
    return self;
  }

  prepare(skill: SkillHandle | "normal", opt: PrepareOption = {}) {
    if (this._type !== "status") {
      throw new GiTcgDataError("Only status can have prepare skill");
    }
    if (opt.hintCount) {
      this.variable("preparingSkillHintCount", opt.hintCount);
    }
    return (
      this as unknown as EntityBuilderPublic<
        "status",
        CallerVars,
        AssociatedExt,
        FromCard,
        Snippets
      >
    )
      .tags("preparingSkill")
      .on("replaceActionBySkill")
      .do(function (c) {
        c.useSkill(skill, { asPrepared: true });
        if (opt.nextStatus) {
          c.characterStatus(opt.nextStatus, "@master", opt.nextStatusCreateOpt);
        }
      })
      .dispose()
      .on("switchActive", (c, e) => e.switchInfo.from?.id === c.self.master.id)
      .dispose()
      .endOn();
  }

  tags(...tags: (EntityTag | AttachmentTag)[]): this {
    this._tags.push(...tags);
    return this;
  }

  hintText(text: string): this {
    this._hintText = text;
    return this;
  }
  hintIcon(damageType: DamageType | CombatStatusHandle) {
    return this.variable("hintIcon", damageType, { visible: false });
  }
  hint(
    icon: DamageType | CombatStatusHandle,
    text?: string | EntityDescriptionDictionaryGetter<AssociatedExt>,
  ) {
    if (typeof text === "function") {
      const hintReplacement = "[GCG_TOKEN_HINT_TEXT]";
      this.hintText(`\${${hintReplacement}}`).replaceDescription(
        hintReplacement,
        text,
      );
    } else {
      this.hintText(text ?? "");
    }
    return this.hintIcon(icon);
  }

  /**
   * Same as
   * ```
   *   .hintIcon(type)
   *   .hintText(`${value}`)
   *   .on("endPhase")
   *   .damage(type, value[, target])
   * ```
   *
   * Note: use `DamageType.Heal` as equivalent of `.heal`
   * @param type
   * @param value
   * @returns
   */
  endPhaseDamage(
    type: DamageType | "swirledAnemo",
    value: number,
    target?: string,
  ): BuilderWithShortcut<
    TriggeredSkillBuilder<
      DetailedEventArgOf<"endPhase">,
      CallerType,
      CallerVars | "hintIcon",
      AssociatedExt,
      FromCard,
      Snippets
    >
  > {
    if (type === "swirledAnemo") {
      return this.hintIcon(DamageType.Anemo)
        .hintText(`${value}`)
        .on(
          "dealDamage",
          (c, e) =>
            ["character", "summon"].includes(e.source.definition.type) &&
            e.isSwirl() !== null,
        )
        .usage(1, { name: "swirledUsage" as never, visible: false })
        .do((c, e) => {
          const swirledType = e.isSwirl()!;
          c.setVariable("hintIcon", swirledType);
        })
        .on("endPhase")
        .do((c) => {
          c.damage(c.self.variables.hintIcon, value, target);
        });
    } else {
      return this.hintIcon(type)
        .hintText(`${value}`)
        .on("endPhase")
        .damage(type, value, target);
    }
  }

  usage(
    count: number,
    opt: GlobalUsageOptions = {},
  ): EntityBuilderPublic<
    CallerType,
    CallerVars | "usage",
    AssociatedExt,
    FromCard,
    Snippets
  > {
    if (opt.autoDispose !== false) {
      this._disposeWhenUsageIsZero = true;
    }
    return this.variable("usage", count);
  }

  /**
   * 定义一组“小程序”，可在之后的 `on` 块内调用
   */
  defineSnippet<CustomEventArgT = DefaultCustomEventArg>(
    snippet: (
      c: TypedSkillContext<{
        readonly: false;
        callerType: CallerType;
        callerVars: CallerVars;
        associatedExtension: AssociatedExt;
        eventArgType: NoInfer<CustomEventArgT>;
        shortcutReceiver: undefined;
      }>,
      e: CustomEventArgT,
    ) => void,
  ): EntityBuilderPublic<
    CallerType,
    CallerVars,
    AssociatedExt,
    FromCard,
    Snippets & { [DEFAULT_SNIPPET_NAME]: CustomEventArgT }
  >;
  defineSnippet<
    SnippetName extends string,
    CustomEventArgT = DefaultCustomEventArg,
  >(
    name: SnippetName,
    snippet: (
      c: TypedSkillContext<{
        readonly: false;
        callerType: CallerType;
        callerVars: CallerVars;
        associatedExtension: AssociatedExt;
        eventArgType: NoInfer<CustomEventArgT>;
        shortcutReceiver: undefined;
      }>,
      e: CustomEventArgT,
    ) => void,
  ): EntityBuilderPublic<
    CallerType,
    CallerVars,
    AssociatedExt,
    FromCard,
    Snippets & { [S in SnippetName]: CustomEventArgT }
  >;
  defineSnippet(...args: any[]): any {
    let name: string;
    let snippet: any;
    if (args.length <= 1 && typeof args[0] !== "string") {
      name = "default";
      [snippet] = args;
    } else {
      [name, snippet] = args;
    }
    if (this._snippets.has(name)) {
      throw new GiTcgDataError(`Snippet ${name} already exists`);
    }
    this._snippets.set(name, snippet);
    return this;
  }

  _applySnippet(
    name: string,
    projection?: (c: any, e: any) => any,
  ): SkillOperation<any> {
    projection ??= (c, e) => e;
    const snippet = this._snippets.get(name);
    if (!snippet) {
      throw new GiTcgDataError(`Snippet ${name} not found`);
    }
    return function (c, e) {
      const projected = projection(c, e);
      return snippet(c, projected);
    };
  }

  done() {
    type Result = FromCard extends true
      ? readonly [CardHandle, EntityBuilderResultT<CallerType>]
      : EntityBuilderResultT<CallerType>;
    const varConfigs = this._varConfigs;
    // on each round begin clean up
    const usagePerRoundNames = USAGE_PER_ROUND_VARIABLE_NAMES.filter((name) =>
      Reflect.has(varConfigs, name),
    );
    const hasDuration = Reflect.has(varConfigs, "duration");
    if (usagePerRoundNames.length > 0 || hasDuration) {
      this.on("roundEnd")
        .do(function (c, e) {
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
        })
        .endOn();
    }

    const skills = [...this._skillList];
    if (this._type === "character") {
      registerPassiveSkill({
        __definition: "passiveSkills",
        id: this.id,
        type: "passiveSkill",
        version: this._versionInfo,
        varConfigs: this._varConfigs,
        skills,
      });
    } else if (this._type === "attachment") {
      registerAttachment({
        __definition: "attachments",
        id: this.id,
        visibleVarName: this._visibleVarName,
        varConfigs: this._varConfigs,
        version: this._versionInfo,
        skills,
        modifications: this.getAttachmentModifications(),
        tags: this._tags as AttachmentTag[],
        type: this._type,
        descriptionDictionary: this._descriptionDictionary,
      });
    } else {
      registerEntity({
        __definition: "entities",
        id: this.id,
        obtainable: this._obtainable,
        version: this._versionInfo,
        visibleVarName: this._visibleVarName,
        varConfigs: this._varConfigs,
        disposeWhenUsageIsZero: this._disposeWhenUsageIsZero,
        disposeOnMasterDefeated: this._disposeOnMasterDefeated,
        hintText: this._hintText,
        disableTuning: false,
        skills,
        tags: this._tags as EntityTag[],
        type: this._type,
        descriptionDictionary: this._descriptionDictionary,
      });
    }
    if (this.chainFromId === null) {
      return this.id as Result;
    } else {
      return [this.chainFromId, this.id] as unknown as Result;
    }
  }

  protected getAttachmentModifications(): ModificationGetter {
    throw new GiTcgCoreInternalError(
      `Unreachable; AttachmentBuilder should override this`,
    );
  }

  /** 此定义未被使用。 */
  reserve(): void {}
}

export type EntityBuilderPublic<
  CallerType extends EntityType | "character" | "attachment",
  Vars extends string = never,
  AssociatedExt extends ExtensionHandle = never,
  FromCard extends boolean = false,
  Snippets extends {} = {},
> = Omit<
  EntityBuilder<CallerType, Vars, AssociatedExt, FromCard, Snippets>,
  `_${string}`
>;

export function summon(id: number): EntityBuilderPublic<"summon"> {
  return new EntityBuilder("summon", id);
}

export function status(id: number): EntityBuilderPublic<"status"> {
  return new EntityBuilder("status", id);
}

export function combatStatus(id: number): EntityBuilderPublic<"combatStatus"> {
  return new EntityBuilder("combatStatus", id);
}
