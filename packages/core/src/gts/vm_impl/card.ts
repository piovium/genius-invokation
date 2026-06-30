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
  EntityDefinition,
  SupportTag,
  VariableConfig,
  WeaponCardTag,
} from "../../base/entity";
import type { AnyState, EntityTag, SkillDefinition } from "../../base/state";
import {
  DEFAULT_VERSION_INFO,
  type Version,
  type VersionInfo,
} from "../../base/version";
import {
  DEFAULT_ENTITY_VM_META,
  EntityModel,
  EntityViewModel,
  type DefaultEntityVMMeta,
  type EntityVMMeta,
  type GtsUsageOrUsagePerRoundOptions,
  type ICaller,
} from "./entity";
import type {
  CharacterHandle,
  HandleT,
  StatusHandle,
} from "../../builder/type";
import type { TalentRequirement } from "../../builder/card";
import type {
  DetailedEventArgOf,
  DetailedEventNames,
  InitiativeSkillTargetKind,
  ReadonlyMetaOf,
  StrictInitiativeSkillEventArg,
} from "../../builder/skill";
import { CombatFoodVM, FoodVM } from "./entity_auxilary";
import { $, toExpression, type InferResult, type IQuery } from "../../query";
import {
  InitiativeSkillModel,
  InitiativeSkillViewModel,
  TriggeredSkillViewModel,
  type TargetGetter,
  type TargetQueryTypeInfo,
} from "./skill";
import type {
  SkillContext,
  TypedSkillContext,
} from "../../builder/context/skill";
import type { DiceRequirement, DiceType } from "@gi-tcg/typings";
import { TechniqueViewModel, type TechniqueVMMeta } from "./technique";
import type { CharacterState, EntityState } from "../../builder";
import type { IUnorderedQuery } from "../../query/utils";
import { getSubId } from "./sub_id";
import { RESERVED, type Reserved, type ReservedMeta } from "./reserved";

const SATIATED_ID = 303300 as StatusHandle;

class CardModel extends InitiativeSkillModel implements ICaller {
  reserved = false;
  cardId!: number;
  skillType = "playCard" as const;

  public get snippets() {
    return super.snippets;
  }

  type: "support" | "equipment" | "eventCard" = "eventCard";
  override get ownerType() {
    return this.type;
  }
  innerModel: EntityModel | null = null;

  obtainable = true;
  disableTuning = false;
  tags: EntityTag[] = [];
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  getSubId(): number {
    return getSubId(this.cardId);
  }

  skillList: SkillDefinition[] = [];
  satiatedTarget: TargetGetter | null = null;

  setUsage(count: number, options: GtsUsageOrUsagePerRoundOptions): never {
    throw new Error(`Cannot specify usage from off-stage cards`);
  }

  setEquipmentPlayAction(): void {
    this.action = function (c) {
      for (const ch of c.eventArg.targets) {
        ch.equip(c.self);
      }
    };
  }
  setSupportPlayAction(): void {
    this.action = function (c) {
      // 支援牌的目标是要弃置的支援区卡牌
      const [target] = c.eventArg.targets as readonly EntityState[];
      if (target && c.query($.id(target.id))) {
        c.dispose(target, {
          reason: "targetOfSupportPlayed",
          direct: true,
        });
      }
      c.moveEntity(
        c.self.cast<"support">(),
        { who: c.self.who, type: "supports" },
        "createSupport",
      );
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
    const playSkill = this.buildSkillDefinition();
    return {
      __definition: "entities",
      type: this.type,
      id: this.cardId,
      tags: [...this.tags, ...(this.innerModel?.tags ?? [])] as EntityTag[],
      obtainable: this.obtainable && (this.innerModel?.obtainable ?? true),
      disableTuning: this.disableTuning,
      hintText: this.innerModel?.hintText ?? null,
      descriptionDictionary: this.innerModel?.descriptionDictionary ?? {},
      version: this.innerModel?.versionInfo ?? this.versionInfo,
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

interface CardVMMeta extends EntityVMMeta {
  readonly type: "support" | "equipment" | "eventCard";
  readonly isInitiativeSkill: boolean;
  readonly targetTypes: InitiativeSkillTargetKind;
}

const DEFAULT_CARD_VM_META = {
  ...DEFAULT_ENTITY_VM_META,
  type: "eventCard",
  isInitiativeSkill: true,
  targetTypes: [],
} as const satisfies CardVMMeta;

type NoTargetSpecifiedThis<Meta extends CardVMMeta> = [
  Meta["targetTypes"],
] extends [readonly []]
  ? AR.This<Meta>
  : never;

export const CardViewModel = InitiativeSkillViewModel
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
      ): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"equipment">>;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & { targetTypes: ["character"]; isInitiativeSkill: false };
    }>((model, [weaponType], subView) => {
      model.innerModel = EntityViewModel.parse(subView, "equipment");
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
      ): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"equipment">>;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & {
        targetTypes: readonly ["character"];
        isInitiativeSkill: false;
      };
    }>((model, [], subView) => {
      model.innerModel = EntityViewModel.parse(subView, "equipment");
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
      ): AR.With<typeof TechniqueViewModel>;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends TechniqueVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & {
        targetTypes: readonly ["character"];
        isInitiativeSkill: false;
      };
    }>((model, [], subView) => {
      const techniqueModel = TechniqueViewModel.parse(subView);
      model.innerModel = techniqueModel;
      model.targetGetters = [techniqueModel.targetGetter];
      model.tags.push("technique");
      model.setEquipmentPlayAction();
    }),
    talent: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        who: CharacterHandle | CharacterHandle[],
        requires?: TalentRequirement,
      ): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"equipment">>;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & {
        targetTypes: readonly ["character"];
        isInitiativeSkill: false;
      };
    }>((model, [who, requires = "actionSkill"], subView) => {
      model.obtainable = false;
      model.innerModel = EntityViewModel.parse(subView, "equipment");
      model.setTalentInfo(who, requires);
      model.setEquipmentPlayAction();
    }),
    eventTalent: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
        who: CharacterHandle | CharacterHandle[],
        requires?: TalentRequirement,
      ): AR.DoneRewriteMeta<
        Omit<Meta, "targetTypes"> & { targetTypes: readonly ["character"] }
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
      ): AR.With<typeof EntityViewModel, DefaultEntityVMMeta<"support">>;
      uniqueKey(): "type";
      mergeMeta<Meta extends CardVMMeta, InnerMeta extends EntityVMMeta>(
        meta: Meta,
        innerMeta: InnerMeta,
      ): InnerMeta & { readonly targetTypes: []; isInitiativeSkill: false };
    }>((model, supportTags, subView) => {
      model.innerModel = EntityViewModel.parse(subView, "support");
      model.tags.push(...supportTags);
      model.setSupportPlayAction();
    }),
    food: h.attribute<{
      <Meta extends CardVMMeta>(
        this: NoTargetSpecifiedThis<Meta>,
      ): AR.WithRewriteMeta<
        Omit<Meta, "targetTypes"> & { targetTypes: readonly ["character"] },
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
          model.satiatedTarget = (c) => c.eventArg.targets[0];
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

    on: h.attribute<{
      <Meta extends EntityVMMeta, const Event extends DetailedEventNames>(
        this: AR.This<Meta>,
        eventName: Event,
      ): AR.With<
        typeof TriggeredSkillViewModel,
        Omit<Meta, "targetTypes"> & {
          eventArgType: DetailedEventArgOf<Event>;
        }
      >;
    }>((model, [eventName], subView) => {
      const skillModel = TriggeredSkillViewModel.parse(
        subView,
        model,
        eventName,
      );
      skillModel.id = model.getSubId();
      skillModel.enableHandTriggering = true;
      skillModel.enablePileTriggering = true;
      const skillDef = skillModel.buildSkillDefinition();
      model.skillList.push(skillDef);
    }),
  }))
  .bind<typeof DEFAULT_CARD_VM_META>();
