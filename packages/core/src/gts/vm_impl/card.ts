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
import { DiceType } from "@gi-tcg/typings";
import type {
  DescriptionDictionary,
  DescriptionDictionaryKey,
  EntityDefinition,
  SupportTag,
  WeaponCardTag,
} from "../../base/entity";
import type { AnyState, EntityTag, SkillDefinition } from "../../base/state";
import {
  DEFAULT_VERSION_INFO,
  type Version,
  type VersionInfo,
} from "../../base/version";
import {
  addDescriptionReplacement,
  DEFAULT_ENTITY_VM_META,
  EntityModel,
  EntityViewModel,
  type EntityDescriptionDictionaryGetter,
  type EntityVMMeta,
  type GtsUsageOrUsagePerRoundOptions,
  type ICaller,
  type ThisWithType,
  type TriggeredSkillVMMetaFromCard,
} from "./entity";
import type { CharacterHandle, HandleT, StatusHandle } from "../../data/type";
import type {
  DetailedEventNames,
  InitiativeSkillTargetKind,
  StrictInitiativeSkillEventArg,
} from "../../runtime/skill";
import { CombatFoodVM, FoodVM } from "./entity_auxilary";
import { $ } from "../../query";
import {
  DisposeSameVM,
  InitiativeSkillModel,
  InitiativeSkillViewModel,
  TriggeredSkillModel,
  TriggeredSkillViewModel,
  type DefaultDisposeSameVMMeta,
  type InitiativeSkillVMMeta,
  type TargetGetter,
  type TriggeredSkillVMMeta,
} from "./skill";
import type { SkillContext } from "../../runtime/skill_context";
import {
  TechniqueViewModel,
  type DefaultTechniqueVMMeta,
  type TechniqueVMMeta,
} from "./technique";
import type { CharacterState, CustomEvent } from "../../data";
import type { Computed, IUnorderedQuery } from "../../query/utils";
import { getSubId } from "./sub_id";
import { RESERVED, type Reserved, type ReservedMeta } from "./reserved";
import type {
  CustomEventEventArg,
  InitiativeSkillEventArg,
} from "../../base/skill";
import type { Writable } from "../../utils";
import type { Character } from "../../runtime/reactive/character";

const SATIATED_ID = 303300 as StatusHandle;

class OffStageTriggeredSkillModel extends TriggeredSkillModel {
  constructor(
    caller: ICaller,
    detailedEventName: DetailedEventNames | CustomEvent,
  ) {
    super(caller, detailedEventName);
    this.enableHandTriggering = true;
    this.enableOnStageTriggering = false;
  }
}

const OffStageTriggeredSkillViewModel = TriggeredSkillViewModel.extend(
  OffStageTriggeredSkillModel,
  (h) => ({
    enablePileTriggering: h.simpleAttribute({
      uniqueKey: "disablePileTriggering",
    })(function () {
      this.enablePileTriggering = true;
    }),
  }),
);

export type TalentRequirement = "action" | "actionSkill" | "active" | "none";

export class CardModel extends InitiativeSkillModel implements ICaller {
  reserved = false;
  accessor cardId!: number;
  skillType = "playCard" as const;
  descriptionDictionary: Writable<DescriptionDictionary> = {};

  type: "support" | "equipment" | "eventCard" = "eventCard";
  override get ownerType() {
    return this.type;
  }
  innerModel: EntityModel | null = null;

  obtainable = true;
  disableTuning = false;
  doSameWhenDisposedSkillModel: TriggeredSkillModel | null = null;
  onlySelfHci = false;
  tags: EntityTag[] = [];
  versionInfo: VersionInfo | null = null;

  getSubId(): number {
    return getSubId(this.cardId);
  }

  skillList: SkillDefinition[] = [];
  satiatedTarget: TargetGetter | null = null;

  setUsage(count: number, options: GtsUsageOrUsagePerRoundOptions): never {
    throw new Error(`Cannot specify usage from off-stage cards`);
  }

  setEquipmentPlayAction(): void {
    const stagedOperations = this.innerModel?.stagedOperations ?? [];
    this.action = function (c) {
      for (const ch of c.eventArg.targets as Character<any>[]) {
        ch.equip(c.self.cast<"equipment">());
      }
      for (const operation of stagedOperations) {
        operation(c);
      }
    };
  }
  setSupportPlayAction(): void {
    const stagedOperations = this.innerModel?.stagedOperations ?? [];
    this.action = function (c) {
      // 支援牌的目标是要弃置的支援区卡牌
      const [target] = c.eventArg.targets;
      if (target && c.query($.id(target.id))) {
        c.dispose(target, {
          reason: "targetOfSupportPlayed",
          direct: true,
        });
      }
      const self = c.self.cast<"support">();
      const newEntity = c.moveEntity(
        self,
        { who: c.self.who, type: "supports" },
        "createSupport",
      );
      if (newEntity) {
        for (const operation of stagedOperations) {
          operation(c);
        }
      } else {
        c.dispose(self, { direct: true, reason: "overflow" });
      }
    };
  }

  setTalentInfo(
    ch: CharacterHandle | CharacterHandle[],
    requires: TalentRequirement,
  ) {
    this.tags.push("talent");
    let extraCond: IUnorderedQuery = $.any;
    if (requires === "action" || requires === "actionSkill") {
      this.tags.push("action");
    }
    if (requires === "actionSkill") {
      // 出战行动的天赋牌，要求目标未被控制
      extraCond = $.not.has($.typeStatus.tag("disableSkill"));
    }
    let chs: CharacterHandle[];
    if (Array.isArray(ch)) {
      chs = ch;
    } else {
      chs = [ch];
    }
    if (requires !== "none") {
      // 出战角色须为天赋角色
      this.userFilters.push((c) =>
        chs.includes(c.query($.my.active)!.definition.id as CharacterHandle),
      );
    }
    const query = $.union(
      ...chs.map((c) => $.my.character.def(c).intersection(extraCond)),
    );
    this.targetGetters = [
      function (ctx) {
        return ctx.queryAll(query).map((s) => s.latest());
      },
    ];
  }

  override shouldFast() {
    return !this.tags.includes("action");
  }

  getEntry(): Reserved | EntityDefinition {
    if (this.reserved) {
      return RESERVED;
    }
    const satiatedTarget = this.satiatedTarget;
    if (satiatedTarget) {
      this.postOperations.push((c) => {
        const targets = satiatedTarget(c as SkillContext<any>);
        for (const t of targets) {
          c.characterStatus(SATIATED_ID, t as CharacterState);
        }
      });
    }
    if (!this.onlySelfHci) {
      this.preOperations.push(function (c) {
        const self = c.self.cast<"support" | "equipment" | "eventCard">();
        if (self.definition.type === "eventCard") {
          c.dispose(self, {
            reason: "eventCardPlayed",
            direct: true,
          });
        } else {
          // 打出时移除附属效果
          for (const att of self.attachments) {
            c.mutate({
              type: "removeEntity",
              from: c.self.area,
              oldState: att,
              reason: "other", // TODO: maybe better reason?
            });
          }
        }
      });
    }
    if (this.doSameWhenDisposedSkillModel) {
      this.doSameWhenDisposedSkillModel.action = this.action;
      const disposeSkill =
        this.doSameWhenDisposedSkillModel.buildSkillDefinition();
      this.skillList.push(disposeSkill);
    }
    const playSkill = this.buildSkillDefinition();
    return {
      __definition: "entities",
      type: this.type,
      id: this.cardId,
      tags: [...this.tags, ...(this.innerModel?.tags ?? [])] as EntityTag[],
      obtainable: this.obtainable && (this.innerModel?.obtainable ?? true),
      disableTuning: this.disableTuning,
      hintText: this.innerModel?.hintText ?? null,
      descriptionDictionary: {
        ...this.descriptionDictionary,
        ...this.innerModel?.descriptionDictionary,
      },
      version:
        this.innerModel?.versionInfo ??
        this.versionInfo ??
        DEFAULT_VERSION_INFO,
      visibleVarName: this.innerModel?.visibleVarName ?? null,
      varConfigs: this.innerModel
        ? Object.fromEntries(this.innerModel.varConfigs)
        : {},
      disposeWhenUsageIsZero: this.innerModel?.disposeWhenUsageIsZero ?? false,
      disposeOnMasterDefeated:
        this.innerModel?.disposeOnMasterDefeated ?? false,
      skills: [
        ...this.skillList,
        playSkill,
        ...(this.innerModel?.getSkills() ?? []),
      ],
    };
  }
}

interface CardVMMeta extends EntityVMMeta, InitiativeSkillVMMeta {
  readonly type: "support" | "equipment" | "eventCard";
  readonly isInitiativeSkill: boolean;
  readonly callingArea: "offStage";
  readonly targetTypes: InitiativeSkillTargetKind;
  readonly stagedEventArgType: never;
}

interface EntityVMMetaFromCard<
  Meta extends CardVMMeta,
  Type extends "support" | "equipment",
> {
  type: Type;
  variables: never;
  stagedEventArgType: StrictInitiativeSkillEventArg<
    [Type] extends ["equipment"] ? readonly ["character"] : readonly []
  >;
  associatedExtension: Meta["associatedExtension"];
  snippets: {};
}

const DEFAULT_CARD_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  type: "eventCard",
  isInitiativeSkill: true,
  callingArea: "offStage",
  targetTypes: [],
} as const satisfies CardVMMeta;

type NoTargetSpecifiedThis<Meta extends CardVMMeta> = [
  Meta["targetTypes"],
] extends [readonly []]
  ? AR.This<Meta>
  : never;

export class CardViewModel extends InitiativeSkillViewModel
  //
  .extend(CardModel, (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      required(): true;
      uniqueKey(): "id";
      as<Meta extends EntityVMMeta>(this: AR.This<Meta>): HandleT<Meta["type"]>;
      as(this: AR.This<ReservedMeta>): undefined;
    }>(
      (model, [id]) => {
        model.cardId = id;
        model.id = model.getSubId();
      },
      (_, [id]) => id as any,
    ),
    reserved: h.attribute<{
      (): AR.DoneRewriteMeta<ReservedMeta>;
    }>((model, []) => {
      model.reserved = true;
    }),
    tags: h.simpleAttribute()(function (...tags: EntityTag[]) {
      this.tags.push(...tags);
    }),

    undiscoverable: h.simpleAttribute({
      uniqueKey: "obtainable",
    })(function () {
      this.obtainable = false;
    }),

    event: h.attribute<{
      (): AR.Done;
      uniqueKey(): "type";
    }>((model) => {
      model.type = "eventCard";
    }),
    weapon: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        weaponType: WeaponCardTag,
      ): AR.With<
        typeof EntityViewModel,
        EntityVMMetaFromCard<Meta, "equipment">
      >;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & { targetTypes: ["character"]; isInitiativeSkill: false };
    }>((model, [weaponType], subView) => {
      model.type = "equipment";
      model.innerModel = EntityViewModel.parse(subView, "equipment", model);
      model.targetGetters = [
        function (ctx) {
          return ctx
            .queryAll($.my.character.tag(weaponType))
            .map((s) => s.latest());
        },
      ];
      model.tags.push("weapon", weaponType);
      model.setEquipmentPlayAction();
    }),
    artifact: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
      ): AR.With<
        typeof EntityViewModel,
        EntityVMMetaFromCard<Meta, "equipment">
      >;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & {
        targetTypes: readonly ["character"];
        isInitiativeSkill: false;
      };
    }>((model, [], subView) => {
      model.type = "equipment";
      model.innerModel = EntityViewModel.parse(subView, "equipment", model);
      model.targetGetters = [
        function (ctx) {
          return ctx.queryAll($.my.character).map((s) => s.latest());
        },
      ];
      model.tags.push("artifact");
      model.setEquipmentPlayAction();
    }),
    technique: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
      ): AR.With<
        typeof TechniqueViewModel,
        DefaultTechniqueVMMeta<Meta["associatedExtension"]>
      >;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends TechniqueVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & {
        targetTypes: readonly ["character"];
        isInitiativeSkill: false;
      };
    }>((model, [], subView) => {
      model.type = "equipment";
      const techniqueModel = TechniqueViewModel.parse(subView, model);
      model.innerModel = techniqueModel;
      model.targetGetters = [techniqueModel.targetGetter];
      model.tags.push("technique");
      model.setEquipmentPlayAction();
    }, TechniqueViewModel.bind(null!)),
    talent: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        who: CharacterHandle | CharacterHandle[],
        requires?: TalentRequirement,
      ): AR.With<
        typeof EntityViewModel,
        EntityVMMetaFromCard<Meta, "equipment">
      >;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & {
        targetTypes: readonly ["character"];
        isInitiativeSkill: false;
      };
    }>((model, [who, requires = "actionSkill"], subView) => {
      model.type = "equipment";
      model.obtainable = false;
      model.innerModel = EntityViewModel.parse(subView, "equipment", model);
      model.setTalentInfo(who, requires);
      model.setEquipmentPlayAction();
    }),
    eventTalent: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        who: CharacterHandle | CharacterHandle[],
        requires?: TalentRequirement,
      ): AR.DoneRewriteMeta<
        Computed<
          Omit<Meta, "targetTypes"> & { targetTypes: readonly ["character"] },
          CardVMMeta
        >
      >;
      uniqueKey(): "type";
    }>((model, [who, requires = "action"]) => {
      model.obtainable = false;
      model.setTalentInfo(who, requires);
    }),
    support: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        ...supportTags: SupportTag[]
      ): AR.With<typeof EntityViewModel, EntityVMMetaFromCard<Meta, "support">>;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & { readonly targetTypes: []; isInitiativeSkill: false };
    }>((model, supportTags, subView) => {
      model.type = "support";
      model.innerModel = EntityViewModel.parse(subView, "support", model);
      model.tags.push(...supportTags);
      model.setSupportPlayAction();
      if (model.innerModel.tags.includes("adventureSpot")) {
        // 冒险地点入场时触发一次冒险后
        model.innerModel.stagedOperations.push((c) => {
          c.emitEvent("onAdventure", c.rawState, c.self.latest());
        });
      }
    }),
    legend: h.simpleAttribute({
      uniqueKey: "legend",
    })(function () {
      this.tags.push("legend");
      this.cost.set(DiceType.Legend, 1);
    }),
    disableTuning: h.simpleAttribute({
      uniqueKey: "disableTuning",
    })(function () {
      this.disableTuning = true;
    }),
    food: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
      ): AR.WithRewriteMeta<
        Computed<
          Omit<Meta, "targetTypes"> & { targetTypes: readonly ["character"] },
          CardVMMeta
        >,
        typeof FoodVM
      >;
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        combat: "combat",
      ): AR.With<typeof CombatFoodVM>;
      uniqueKey(): "type";
    }>((model, [combat], subView) => {
      model.tags.push("food");
      if (combat) {
        model.satiatedTarget = function (ctx) {
          return ctx
            .queryAll($.my.character.exclude($.has.typeStatus.def(SATIATED_ID)))
            .map((s) => s.latest());
        };
        const options = CombatFoodVM.parse(subView);
        const satiatedFilter = options.satiatedFilter ?? "existsNot";
        if (satiatedFilter === "allNot") {
          model.userFilters.push(
            (c) => !c.query($.my.character.has($.typeStatus.def(SATIATED_ID))),
          );
        } else if (satiatedFilter === "existsNot") {
          model.userFilters.push((c) =>
            c.query($.my.character.exclude($.has.typeStatus.def(SATIATED_ID))),
          );
        }
      } else {
        const options = FoodVM.parse(subView);
        if (!options.noSatiated) {
          model.satiatedTarget = (c) => [
            (c.eventArg as InitiativeSkillEventArg).targets[0],
          ];
        }
        const injuredOnly = options.injuredOnly ?? false;
        model.targetGetters.push((c) => {
          let query = $.my.character;
          if (injuredOnly && !c.state.versionBehavior.foodOmitInjuredOnly) {
            query = query.var("health", "<", "maxHealth");
          }
          return c
            .queryAll(query.exclude($.has.typeStatus.def(SATIATED_ID)))
            .map((s) => s.latest());
        });
      }
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

    on: h.attribute<{
      (
        eventName: "selfDiscard",
        doSameMark: "=play",
      ): AR.With<typeof DisposeSameVM>;
      <Meta extends CardVMMeta>(
        this: AR.This<Meta>,
        eventName: "selfHandCardInserted",
        onlyMark: "only",
      ): AR.WithRewriteMeta<
        // rewrite meta to disable ~action
        Computed<
          Omit<Meta, "isInitiativeSkill"> & { isInitiativeSkill: false },
          CardVMMeta
        >,
        typeof OffStageTriggeredSkillViewModel,
        TriggeredSkillVMMetaFromCard<Meta, "selfHandCardInserted">
      >;
      <Meta extends CardVMMeta, const Event extends DetailedEventNames>(
        this: ThisWithType<Meta, "eventCard">,
        eventName: Event,
      ): AR.With<
        typeof OffStageTriggeredSkillViewModel,
        TriggeredSkillVMMetaFromCard<Meta, Event>
      >;
      mergeMeta<Meta extends CardVMMeta>(
        meta: Meta,
        innerMeta: DefaultDisposeSameVMMeta,
      ): Meta;
      mergeMeta<
        Meta extends CardVMMeta,
        InnerMeta extends TriggeredSkillVMMeta,
      >(
        meta: Meta,
        innerMeta: InnerMeta,
      ): Computed<
        Omit<Meta, "variables"> & {
          variables: Meta["variables"] | InnerMeta["variables"];
        },
        CardVMMeta
      >;
    }>((model, [eventName, maybeMark], subView) => {
      if (eventName === "selfDiscard" && maybeMark === "=play") {
        const skillModel = DisposeSameVM.parse(subView, model);
        skillModel.id = model.getSubId();
        skillModel.enableHandTriggering = true;
        model.doSameWhenDisposedSkillModel = skillModel;
      } else {
        const onlySelfHci =
          eventName === "selfHandCardInserted" && maybeMark === "only";
        const skillModel = OffStageTriggeredSkillViewModel.parse(
          subView,
          model,
          eventName,
        );
        skillModel.id = model.getSubId();
        skillModel.enableHandTriggering = true;
        if (onlySelfHci) {
          skillModel.postOperations.push((c) => {
            if (c.self.area.type !== "removedEntities") {
              c.dispose(c.self.cast<"eventCard">(), {
                reason: "eventCardDrawn",
                direct: true,
              });
            }
          });
          model.onlySelfHci = true;
        }
        const skillDef = skillModel.buildSkillDefinition();
        model.skillList.push(skillDef);
      }
    }),
  }))
  .narrow(DEFAULT_CARD_VM_META) {}
