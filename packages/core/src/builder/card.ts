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

import type { EntityState, GameState } from "../base/state";
import type {
  CardTag,
  DescriptionDictionary,
  DescriptionDictionaryEntry,
  DescriptionDictionaryKey,
  EntityArea,
  EntityTag,
  EquipmentTag,
  SupportTag,
  VariableConfig,
  WeaponCardTag,
} from "../base/entity";
import {
  DisposeEventArg,
  EMPTY_SKILL_RESULT,
  type HandCardInsertedEventArg,
  type InitiativeSkillDefinition,
  type InitiativeSkillEventArg,
  type SkillActionFilter,
  type SkillDefinition,
  type SkillDescription,
  type TriggeredSkillDefinition,
} from "../base/skill";
import {
  detailedEventDictionary,
  ListenTo,
  SkillBuilderWithCost,
  withShortcut,
  type BuilderWithShortcut,
  type DetailedEventArgOf,
  type DetailedEventNames,
  type InitiativeSkillTargetKind,
  type SkillOperation,
  type SkillOperationFilter,
  type StrictInitiativeSkillEventArg,
} from "./skill";
import type {
  CardHandle,
  CharacterHandle,
  CombatStatusHandle,
  EquipmentHandle,
  ExtensionHandle,
  StatusHandle,
  SupportHandle,
} from "./type";
import {
  EntityBuilder,
  type EntityBuilderPublic,
  type EntityDescriptionDictionaryGetter,
} from "./entity";
import type { GuessedTypeOfQuery } from "../query-legacy/types";
import { GiTcgDataError } from "../error";
import {
  costSize,
  diceCostSize,
  getEntityArea,
  getEntityById,
  normalizeCost,
  type Writable,
} from "../utils";
import {
  type Version,
  type VersionInfo,
  type VersionMetadata,
  DEFAULT_VERSION_INFO,
} from "../base/version";
import type { EntityDefinition } from ".";
import { registerEntity } from "./registry";
import type { DiceType } from "@gi-tcg/typings";

type DisposeCardBuilderMeta<
  CallerVars extends string,
  AssociatedExt extends ExtensionHandle,
> = {
  callerType: "eventCard";
  callerVars: CallerVars;
  eventArgType: DisposeEventArg;
  associatedExtension: AssociatedExt;
};

type HCICardBuilderMeta<
  CallerVars extends string,
  AssociatedExt extends ExtensionHandle,
> = {
  callerType: "eventCard";
  callerVars: CallerVars;
  eventArgType: HandCardInsertedEventArg;
  associatedExtension: AssociatedExt;
};

export type TargetQuery =
  | `${string}character${string}`
  | `${string}summon${string}`
  | `${string}support${string}`;
export type TargetKindOfQuery<Q extends TargetQuery> = GuessedTypeOfQuery<Q>;

const SATIATED_ID = 303300 as StatusHandle;

type TalentRequirement = "action" | "actionSkill" | "active" | "none";

export interface FoodOption {
  /** 只允许对受伤角色打出 */
  injuredOnly?: boolean;
  /** 指定后不附着饱腹状态 */
  noSatiated?: boolean;
}
export interface CombatFoodOption {
  /**
   * - `existsNot`: 存在无饱腹角色时可打出（默认值）
   * - `allNot`: 所有角色都没有饱腹状态时可打出
   */
  satiatedFilter?: "existsNot" | "allNot";
}

export interface NightsoulTechniqueOption {
  /**
   * 若可存在于手牌中，则指定打出目标。
   * 默认为 `my characters`，即 `technique()` 的默认目标。
   */
  target?: string;
  /**
   * 弃置自身时同时弃置夜魂加持状态
   * @default true
   */
  alsoDisposeNightsoulsBlessing?: boolean;
}

export interface DoSameWhenDisposedOption<
  AssociatedExt extends ExtensionHandle,
> {
  filter?: SkillOperationFilter<{
    callerType: "eventCard";
    callerVars: never;
    eventArgType: DisposeEventArg;
    associatedExtension: AssociatedExt;
  }>;
  prependOp?: SkillOperation<{
    callerType: "eventCard";
    callerVars: never;
    eventArgType: DisposeEventArg;
    associatedExtension: AssociatedExt;
  }>;
  appendOp?: SkillOperation<{
    callerType: "eventCard";
    callerVars: never;
    eventArgType: DisposeEventArg;
    associatedExtension: AssociatedExt;
  }>;
}

export interface CardOnArbitraryOption<
  E extends DetailedEventNames,
  CallerVars extends string,
  AssociatedExt extends ExtensionHandle,
> {
  filter?: SkillOperationFilter<{
    callerType: "eventCard";
    callerVars: CallerVars;
    eventArgType: DetailedEventArgOf<E>;
    associatedExtension: AssociatedExt;
  }>;
  listenTo?: ListenTo;
  enableTriggerInPile?: boolean;
  operation: SkillOperation<{
    callerType: "eventCard";
    callerVars: CallerVars;
    eventArgType: DetailedEventArgOf<E>;
    associatedExtension: AssociatedExt;
  }>;
}

export class CardBuilder<
  KindTs extends InitiativeSkillTargetKind,
  CallerVars extends string,
  AssociatedExt extends ExtensionHandle = never,
> extends SkillBuilderWithCost<{
  callerType: "eventCard";
  callerVars: CallerVars;
  eventArgType: StrictInitiativeSkillEventArg<KindTs>;
  associatedExtension: AssociatedExt;
}> {
  private _type: "support" | "equipment" | "eventCard" = "eventCard";
  private _obtainable = true;
  private _tags: EntityTag[] = [];
  private _varConfigs: Record<string, VariableConfig> = {};
  /**
   * 在料理卡牌的行动结尾添加“设置饱腹状态”操作的目标；
   * `null` 表明不添加（不是料理牌或者手动指定）
   */
  private _satiatedTarget: string | null = null;
  private _descriptionOnHCI = false;
  private _doSameWhenDisposed: DoSameWhenDisposedOption<AssociatedExt> | null =
    null;
  private _disposeOperation: SkillOperation<
    DisposeCardBuilderMeta<CallerVars, AssociatedExt>
  > | null = null;
  private _hciOperation: SkillOperation<
    HCICardBuilderMeta<CallerVars, AssociatedExt>
  > | null = null;
  private _descriptionDictionary: Writable<DescriptionDictionary> = {};
  private _arbitraryTriggeredSkills: SkillDefinition[] = [];
  private _disableTuning = false;

  constructor(private readonly cardId: number) {
    super(cardId);
  }

  private _versionInfo: VersionInfo = DEFAULT_VERSION_INFO;
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

  /** 此定义未被使用。 */
  reserve(): void {}

  replaceDescription(
    key: DescriptionDictionaryKey,
    getter: EntityDescriptionDictionaryGetter<AssociatedExt>,
  ): this {
    if (Reflect.has(this._descriptionDictionary, key)) {
      throw new GiTcgDataError(`Description key ${key} already exists`);
    }
    const extId = this.associatedExtensionId;
    const entry: DescriptionDictionaryEntry = function (st, id) {
      const ext = st.extensions.find((ext) => ext.definition.id === extId);
      const self = getEntityById(st, id) as EntityState;
      const area = getEntityArea(st, id);

      return String(getter(st, { ...self, area }, ext?.state));
    };
    this._descriptionDictionary[key] = entry;
    return this;
  }

  associateExtension<NewExtT>(
    ext: ExtensionHandle<NewExtT>,
  ): BuilderWithShortcut<
    CardBuilder<KindTs, CallerVars, ExtensionHandle<NewExtT>>
  > {
    if (this.associatedExtensionId !== null) {
      throw new GiTcgDataError(
        `This card has already associated with extension ${this.id}`,
      );
    }
    this.associatedExtensionId = ext;
    return this as any;
  }

  tags(...tags: (EquipmentTag | SupportTag | CardTag)[]): this {
    this._tags.push(...tags);
    return this;
  }

  undiscoverable(): this {
    this._obtainable = false;
    return this;
  }
  disableTuning(): this {
    this._disableTuning = true;
    return this;
  }

  equipment<Q extends TargetQuery>(
    target: Q,
  ): EntityBuilderPublic<"equipment"> {
    const cardId = this.cardId as EquipmentHandle;
    this.addTarget(target).do((c) => {
      const ch = c.$("character and @targets.0");
      ch?.equip(c.self);
    });
    const skills = this.buildSkills();
    const builder = new EntityBuilder<"equipment", never, never, false, {}>(
      "equipment",
      cardId,
    );
    builder._versionInfo = this._versionInfo;
    builder._skillList.push(...skills);
    builder._obtainable = this._obtainable;
    return builder;
  }
  weapon(type: WeaponCardTag) {
    return this.tags("weapon", type)
      .equipment(`my characters with tag (${type})`)
      .tags("weapon", type);
  }
  artifact() {
    return this.tags("artifact").equipment("my characters").tags("artifact");
  }
  technique(targetQuery = "my characters") {
    return this.tags("technique")
      .equipment(targetQuery as "character")
      .tags("technique");
  }

  /**
   * 带有夜魂性质的特技：
   * 所附属角色「夜魂值」为0时，弃置此牌；此牌被弃置时，所附属角色结束夜魂加持。
   */
  nightsoulTechnique(option: NightsoulTechniqueOption = {}) {
    const { alsoDisposeNightsoulsBlessing = true, target } = option;
    const self = this.undiscoverable()
      .technique(target)
      .on("beforeAction")
      .listenToAll()
      .do((c) => {
        const st = c.$(`status with tags (nightsoulsBlessing) at @master`);
        if (st && st.getVariable("nightsoul") <= 0) {
          c.dispose();
        }
      })
      .endOn();
    if (alsoDisposeNightsoulsBlessing) {
      self
        .on("selfDispose")
        .do((c, e) => {
          if (e.area.type !== "characters") {
            return;
          }
          c
            .$(
              `status with tags (nightsoulsBlessing) at with id ${e.area.characterId}`,
            )
            ?.dispose();
        })
        .endOn();
    }
    return self;
  }

  support(...tags: SupportTag[]): EntityBuilderPublic<"support"> {
    const cardId = this.cardId as SupportHandle;
    this.do((c, e) => {
      // 支援牌的目标是要弃置的支援区卡牌
      const targets = e.targets as readonly EntityState[];
      if (targets.length > 0 && c.$(`my support with id ${targets[0].id}`)) {
        c.dispose(targets[0], {
          reason: "targetOfSupportPlayed",
          direct: true,
        });
      }
      c.moveEntity(
        c.self,
        { who: c.self.who, type: "supports" },
        "createSupport",
      );
    });
    const skills = this.buildSkills();
    const builder = new EntityBuilder<"support", never, never, false, {}>(
      "support",
      cardId,
    );
    builder.tags(...tags);
    builder._versionInfo = this._versionInfo;
    builder._skillList.push(...skills);
    builder._obtainable = this._obtainable;
    return builder;
  }

  adventureSpot(): EntityBuilderPublic<"support", "exp"> {
    return this.undiscoverable()
      .support("place", "adventureSpot")
      .variableCanAppend("exp", 1, Infinity);
  }

  elementalBlessing(
    type1: DiceType,
    type2: DiceType,
  ): EntityBuilderPublic<"support"> {
    return this.undiscoverable()
      .support("blessing")
      .on("actionPhase", (c, e) => {
        if (c.self.area.type === "supports") {
          return false;
        }
        const elements = new Set(
          c.player.characters.flatMap((ch) => ch.element()),
        );
        return (
          elements.size === 2 && elements.has(type1) && elements.has(type2)
        );
      })
      .enableHandTriggering()
      .enablePileTriggering()
      .do((c) => {
        // 若在牌库里，先抓到手上
        if (c.self.area.type === "pile") {
          c.drawCards(c.self);
        }
        // 若不在手上（爆牌），就啥也别干了
        if (c.self.area.type !== "hands") {
          return;
        }
        c.disposeCard(c.self);
        c.createEntity("support", c.self.definition.id as SupportHandle, {
          who: c.self.area.who,
          type: "supports",
        });
        c.convertDice(type1, 2);
        c.convertDice(type2, 2);
      })
      .endOn();
  }

  /**
   * 添加“打出后生成出战状态”的操作。
   *
   * 此调用后，卡牌描述结束；接下来的 builder 将描述出战状态。
   * @param id 出战状态定义 id；默认与卡牌定义 id 相同
   * @returns 出战状态 builder
   */
  toCombatStatus(id: number, where: "my" | "opp" = "my") {
    id ??= this.cardId;
    this.do((c) => {
      c.combatStatus(id as CombatStatusHandle, where);
    }).done();
    const builder = new EntityBuilder<
      "combatStatus",
      never,
      never,
      true,
      never
    >("combatStatus", id, this.id);
    builder._versionInfo = this._versionInfo;
    return builder;
  }
  /**
   * 添加“打出后为某角色附着状态”的操作。
   *
   * 此调用后，卡牌描述结束；接下来的 builder 将描述状态。
   * @param target 要附着的角色（查询）
   * @param id 状态定义 id
   * @returns 状态 builder
   */
  toStatus(id: number, target: string) {
    id ??= this.cardId;
    this.do((c) => {
      c.characterStatus(id as StatusHandle, target);
    }).done();
    const builder = new EntityBuilder<"status", never, never, true, never>(
      "status",
      id,
      this.id,
    );
    builder._versionInfo = this._versionInfo;
    return builder;
  }

  addTarget<Q extends TargetQuery>(
    targetQuery: Q,
  ): BuilderWithShortcut<
    CardBuilder<
      readonly [...KindTs, TargetKindOfQuery<Q>],
      CallerVars,
      AssociatedExt
    >
  > {
    this.addTargetImpl(targetQuery);
    return this as any;
  }

  legend(): this {
    return (
      this.tags("legend")
        // .undiscoverable()
        .filter((c) => !c.player.legendUsed)
    );
  }

  /**
   * 执行通用的天赋牌准备工作。
   * - 设置 talent 标签
   * - 若是出战行动，设置 action 标签
   * - 设置牌组需求
   * - 若要求该角色出战，则设置 filter
   * @returns 打出目标需求
   */
  private prepareTalent(
    ch: CharacterHandle | CharacterHandle[],
    requires: TalentRequirement,
  ): `${string} character ${string}` {
    this.tags("talent");
    let extraCond = "";
    if (requires === "action" || requires === "actionSkill") {
      this.tags("action");
    }
    if (requires === "actionSkill") {
      // 出战行动的天赋牌，要求目标未被控制
      extraCond = "and not has status with tag (disableSkill)";
    }
    let chs: CharacterHandle[];
    if (Array.isArray(ch)) {
      chs = ch;
    } else {
      chs = [ch];
    }
    if (requires !== "none") {
      // 出战角色须为天赋角色
      this.filter((c) =>
        chs.includes(c.$("my active")!.definition.id as CharacterHandle),
      );
    }

    return chs
      .map((c) => `(my characters with definition id ${c} ${extraCond})`)
      .join(" or ") as any;
  }

  talent(
    ch: CharacterHandle | CharacterHandle[],
    requires: TalentRequirement = "actionSkill",
  ) {
    const equipQuery = this.prepareTalent(ch, requires);
    return this.undiscoverable().equipment(equipQuery).tags("talent");
  }

  eventTalent(
    ch: CharacterHandle | CharacterHandle[],
    requires: TalentRequirement = "action",
  ) {
    const targetQuery = this.prepareTalent(ch, requires);
    return this.undiscoverable().addTarget(targetQuery);
  }

  /** 增加 food 标签；设置目标为我方非饱腹角色 */
  food(
    opt: FoodOption = {},
  ): BuilderWithShortcut<
    CardBuilder<readonly [...KindTs, "character"], CallerVars, AssociatedExt>
  > {
    if (!opt.noSatiated) {
      this._satiatedTarget = "@targets.0";
    }
    const injuredOnly = !!opt?.injuredOnly;
    this.tags("food").addTargetImpl((c) => {
      let queryString =
        "(my characters and not has status with definition id 303300)";
      if (injuredOnly && !c.state.versionBehavior.foodOmitInjuredOnly) {
        queryString += " and (characters with health < maxHealth)";
      }
      return c.$$(queryString).map((s) => s.latest());
    });
    return this as any;
  }

  /**
   * 增加 food 标签。通常为剩余没有饱腹的角色附着效果，使用如下 query 获得这些角色：
   * `my characters and not has status with definition id ${Satiated}`
   */
  combatFood(opt: CombatFoodOption = {}) {
    this._satiatedTarget =
      "my characters and not has status with definition id 303300";
    const satiatedFilter = opt.satiatedFilter ?? "existsNot";
    if (satiatedFilter === "allNot") {
      this.filter(
        (c) => !c.$("my characters has status with definition id 303300"),
      );
    } else if (satiatedFilter === "existsNot") {
      this.filter((c) =>
        c.$("my characters and not has status with definition id 303300"),
      );
    }
    return this.tags("food");
  }

  doSameWhenDisposed(opt: DoSameWhenDisposedOption<AssociatedExt> = {}) {
    if (this._disposeOperation || this._descriptionOnHCI) {
      throw new GiTcgDataError(
        `Cannot specify dispose action when using .onDispose() or .descriptionOnDraw().`,
      );
    }
    if (this._targetGetters.length > 0) {
      throw new GiTcgDataError(
        `Cannot specify targets when using .doSameWhenDisposed().`,
      );
    }
    this._doSameWhenDisposed = opt;
    return this;
  }
  /** @deprecated use `descriptionOnHCI` */
  descriptionOnDraw() {
    return this.descriptionOnHCI();
  }
  /**
   * 下述描述适用于当此牌加入手牌时（"handCardInserted"），并随后弃置此牌。
   */
  descriptionOnHCI() {
    if (this._doSameWhenDisposed || this._disposeOperation) {
      throw new GiTcgDataError(
        `Cannot specify descriptionOnHCI when using .doSameWhenDisposed() or .onDispose().`,
      );
    }
    if (this._targetGetters.length > 0) {
      throw new GiTcgDataError(
        `Cannot specify targets when using .descriptionOnHCI().`,
      );
    }
    this._descriptionOnHCI = true;
    return this;
  }
  onDispose(
    op: SkillOperation<DisposeCardBuilderMeta<CallerVars, AssociatedExt>>,
  ) {
    if (this._doSameWhenDisposed || this._descriptionOnHCI) {
      throw new GiTcgDataError(
        `Cannot specify dispose action when using .doSameWhenDisposed() or .descriptionOnDraw().`,
      );
    }
    this._disposeOperation = op;
    return this;
  }
  /**
   * 当此牌加入手牌时（"handCardInserted"）执行的代码
   */
  onHCI(op: SkillOperation<HCICardBuilderMeta<CallerVars, AssociatedExt>>) {
    if (this._descriptionOnHCI) {
      throw new GiTcgDataError(
        `Cannot specify dispose action when using .descriptionOnDraw().`,
      );
    }
    this._hciOperation = op;
    return this;
  }

  onArbitraryEvent<E extends DetailedEventNames>(
    detailedEventName: E,
    option: CardOnArbitraryOption<E, CallerVars, AssociatedExt>,
  ) {
    const {
      filter,
      listenTo = ListenTo.SameArea,
      operation,
      enableTriggerInPile,
    } = option;
    const [eventName, filterDescriptor] =
      detailedEventDictionary[detailedEventName];
    const filters: SkillOperationFilter<any>[] = [];
    filters.push(function (c, e) {
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
    if (!enableTriggerInPile) {
      filters.push(function (c, e) {
        return c.self.area.type !== "pile";
      });
    }
    if (filter) {
      filters.push(filter);
    }
    const filterFn = this.buildFilter<DetailedEventArgOf<E>>(filters);
    const actionFn = this.buildAction<DetailedEventArgOf<E>>([operation]);
    const skillDef: TriggeredSkillDefinition<typeof eventName> = {
      type: "skill",
      id:
        this.cardId +
        0.04 +
        Object.keys(this._descriptionDictionary).length * 0.0001,
      ownerType: this._type,
      skillType: null,
      triggerOn: eventName,
      initiativeSkillConfig: null,
      filter: filterFn as any,
      action: actionFn as any,
      usagePerRoundVariableName: null,
    };
    this._arbitraryTriggeredSkills.push(skillDef);
    return this;
  }

  private buildSkills(): SkillDefinition[] {
    if (this._targetGetters.length > 0 && this._doSameWhenDisposed) {
      throw new GiTcgDataError(
        `Cannot specify targets when using .doSameWhenDisposed().`,
      );
    }
    if (this._satiatedTarget !== null) {
      const target = this._satiatedTarget;
      this.operations.push((c) => c.characterStatus(SATIATED_ID, target));
    }
    const skills: SkillDefinition[] = [...this._arbitraryTriggeredSkills];

    const prependPlayingOp: (typeof this.operations)[number] = function (c) {
      if (c.self.definition.type === "eventCard") {
        c.dispose(c.self, {
          reason: "eventCardPlayed",
          direct: true,
        });
      } else {
        // 打出时移除附属效果
        for (const att of c.self.attachments) {
          c.mutate({
            type: "removeEntity",
            from: c.self.area,
            oldState: att,
            reason: "other", // TODO: maybe better reason?
          });
        }
      }
    };

    const targetGetter = this.buildTargetGetter();
    if (this._doSameWhenDisposed || this._disposeOperation !== null) {
      const disposeOps: SkillOperation<any>[] = this._disposeOperation
        ? [this._disposeOperation]
        : [
            this._doSameWhenDisposed?.prependOp,
            ...this.operations,
            this._doSameWhenDisposed?.appendOp,
          ].filter((op) => !!op);
      const disposeFilter = this.buildFilter<DisposeEventArg>([
        this._doSameWhenDisposed?.filter ?? (() => true),
      ]);
      const disposeAction = this.buildAction<DisposeEventArg>(disposeOps);
      const disposeDef: TriggeredSkillDefinition<"onDispose"> = {
        type: "skill",
        id: this.cardId + 0.02,
        ownerType: this._type,
        skillType: null,
        triggerOn: "onDispose",
        initiativeSkillConfig: null,
        action: disposeAction,
        filter: (st, info, arg) => {
          return (
            info.caller.id === arg.entity.id &&
            arg.isDiscard() &&
            disposeFilter(st, info, arg)
          );
        },
        usagePerRoundVariableName: null,
      };
      skills.push(disposeDef);
    }
    if (this._descriptionOnHCI || this._hciOperation !== null) {
      const hciOp = this._hciOperation;
      let drawAction: SkillDescription<HandCardInsertedEventArg>;
      let filter: SkillActionFilter<InitiativeSkillEventArg>;
      let action: SkillDescription<InitiativeSkillEventArg>;
      if (hciOp) {
        drawAction = this.buildAction<HandCardInsertedEventArg>([hciOp]);
        filter = this.buildFilter();
        this.operations.unshift(prependPlayingOp);
        action = this.buildAction();
      } else {
        this.do((c) => {
          if (c.self.area.type !== "removedEntities") {
            c.dispose(c.self, {
              reason: "eventCardDrawn",
              direct: true,
            });
          }
        });
        drawAction = this.buildAction<HandCardInsertedEventArg>();
        filter = () => false;
        action = (st) => [st, EMPTY_SKILL_RESULT];
      }
      const drawSkillDef: TriggeredSkillDefinition<"onHandCardInserted"> = {
        type: "skill",
        id: this.cardId + 0.03,
        ownerType: this._type,
        skillType: null,
        triggerOn: "onHandCardInserted",
        initiativeSkillConfig: null,
        filter: (st, info, arg) => {
          return (
            getEntityArea(st, info.caller.id).type !== "pile" &&
            info.caller.id === arg.card.id
          );
        },
        action: drawAction,
        usagePerRoundVariableName: null,
      };
      const skillDef: InitiativeSkillDefinition = {
        type: "skill",
        id: this.cardId + 0.01,
        ownerType: this._type,
        skillType: "playCard",
        triggerOn: "initiative",
        initiativeSkillConfig: {
          requiredCost: normalizeCost(this._cost),
          computed$costSize: costSize(this._cost),
          computed$diceCostSize: diceCostSize(this._cost),
          gainEnergy: false,
          shouldFast: !this._tags.includes("action"),
          alwaysCharged: false,
          alwaysPlunging: false,
          hidden: false,
          omitEvents: false,
          getTarget: targetGetter,
        },
        filter,
        action,
        usagePerRoundVariableName: null,
      };
      skills.push(skillDef, drawSkillDef);
    } else {
      this.operations.unshift(prependPlayingOp);
      const action = this.buildAction<InitiativeSkillEventArg>();
      const filter = this.buildFilter<InitiativeSkillEventArg>();
      const skillDef: InitiativeSkillDefinition = {
        type: "skill",
        id: this.cardId + 0.01,
        ownerType: this._type,
        skillType: "playCard",
        triggerOn: "initiative",
        initiativeSkillConfig: {
          requiredCost: normalizeCost(this._cost),
          computed$costSize: costSize(this._cost),
          computed$diceCostSize: diceCostSize(this._cost),
          gainEnergy: false,
          shouldFast: !this._tags.includes("action"),
          alwaysCharged: false,
          alwaysPlunging: false,
          hidden: false,
          omitEvents: false,
          getTarget: targetGetter,
        },
        filter,
        action,
        usagePerRoundVariableName: null,
      };
      skills.push(skillDef);
    }
    return skills;
  }

  done(): CardHandle {
    const skills = this.buildSkills();
    const cardDef: EntityDefinition = {
      __definition: "entities",
      type: this._type,
      id: this.cardId,
      tags: this._tags,
      version: this._versionInfo,
      obtainable: this._obtainable,
      skills,
      varConfigs: this._varConfigs,
      descriptionDictionary: this._descriptionDictionary,
      visibleVarName: null,
      hintText: null,
      disableTuning: this._disableTuning,
      disposeWhenUsageIsZero: false,
    };
    registerEntity(cardDef);
    return this.cardId as CardHandle;
  }
}

export function card(id: number) {
  return withShortcut(new CardBuilder<readonly [], never>(id));
}
