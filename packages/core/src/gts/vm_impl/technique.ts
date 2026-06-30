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

import type { AR } from "@gi-tcg/gts-runtime";
import { ListenTo, type ReadonlyMetaOf } from "../../builder/skill";
import {
  EntityModel,
  EntityViewModel,
  type DefaultEntityVMMeta,
  type GtsUsageOrUsagePerRoundOptions,
} from "./entity";
import {
  DEFAULT_INITIATIVE_SKILL_VM_META,
  InitiativeSkillModel,
  InitiativeSkillViewModel,
  TriggeredSkillModel,
  type InitiativeSkillVMMeta,
  type TargetGetter,
} from "./skill";
import { $, toExpression, type InferResult, type IQuery } from "../../query";
import type { AnyState, InitiativeSkillDefinition } from "../../base/state";
import type {
  SkillContext,
  TypedSkillContext,
} from "../../builder/context/skill";
import type { SkillHandle } from "../../builder";
import { UsageVM, type UsageVMMeta } from "./variables";
import type { UsagePerRoundVariableNames } from "../../base/entity";
import { GiTcgDataError } from "../..";
import { TechniqueNightsoulVM } from "./entity_auxilary";
import type { DisposeEventArg } from "../../base/skill";

export class TechniqueModel extends EntityModel {
  targetGetter: TargetGetter = function (ctx) {
    return ctx.queryAll($.my.character).map((s) => s.latest());
  };
}

export type TechniqueVMMeta = DefaultEntityVMMeta<"equipment">;

type TechniqueVMToBuilderMeta<Meta extends TechniqueVMMeta> = {
  callerType: Meta["type"];
  callerVars: Meta["variables"];
  associatedExtension: Meta["associatedExtension"];
  eventArgType: never;
  gtsSnippets: {};
};

type CharacterQueryResult = {
  type: "character";
};

export const TechniqueViewModel = EntityViewModel
  //
  .extend(TechniqueModel, (h) => ({
    target: h.attribute<{
      <Q extends IQuery>(
        query: InferResult<Q> extends CharacterQueryResult ? Q : never,
      ): AR.Done;
      <Meta extends TechniqueVMMeta, Ret extends AnyState[]>(
        this: AR.This<Meta>,
        queryFn: (
          context: TypedSkillContext<
            ReadonlyMetaOf<TechniqueVMToBuilderMeta<Meta>>
          >,
        ) => Ret[number] extends { type: "character" } ? Ret : never,
      ): AR.Done;
      uniqueKey(): "target";
    }>((model, [query]: any) => {
      if (toExpression in query) {
        const queryObj = query;
        query = (c: SkillContext<any>) =>
          c.queryAll(queryObj as typeof $.any).map((s) => s.latest());
      }
      model.targetGetter = function (ctx) {
        return query(ctx);
      };
    }),
    nightsoul: h.attribute<{
      (): AR.With<typeof TechniqueNightsoulVM>;
    }>((model, [], subView) => {
      const { alsoDisposeNightsoulsBlessing = true } =
        TechniqueNightsoulVM.parse(subView);
      model.obtainable = false;
      const disposeByNightsoulSkill = new TriggeredSkillModel(
        model,
        "beforeAction",
      );
      disposeByNightsoulSkill.id = model.getSubId();
      disposeByNightsoulSkill.listenTo = ListenTo.All;
      disposeByNightsoulSkill.action = function (c) {
        const master = c.self.cast<"equipment">().master;
        const nightsoulBlessing = c.query(
          $.typeStatus.tag("nightsoulsBlessing").at($.id(master.id)),
        );
        if (
          nightsoulBlessing &&
          nightsoulBlessing.getVariable("nightsoul") <= 0
        ) {
          c.dispose();
        }
      };
      model.skillList.push(disposeByNightsoulSkill.buildSkillDefinition());
      if (alsoDisposeNightsoulsBlessing) {
        const disposeNightsoulSkill = new TriggeredSkillModel(
          model,
          "selfDispose",
        );
        disposeNightsoulSkill.id = model.getSubId();
        disposeNightsoulSkill.action = function (c) {
          const disposingArea = (c.eventArg as DisposeEventArg).area;
          if (disposingArea.type !== "characters") {
            return;
          }
          c
            .query(
              $.typeStatus
                .tag("nightsoulsBlessing")
                .at($.id(disposingArea.characterId)),
            )
            ?.dispose();
        };
        model.skillList.push(disposeNightsoulSkill.buildSkillDefinition());
      }
    }),

    skill: h.attribute<{
      (): AR.With<typeof TechniqueSkillViewModel>;
      required(): true;
    }>((model, [], subView) => {
      const skillModel = TechniqueSkillViewModel.parse(subView, model);
      const skillDef = skillModel.buildSkillDefinition();
      model.skillList.push(skillDef);
    }),
  }))
  .bind<TechniqueVMMeta>("equipment");

class TechniqueSkillModel extends InitiativeSkillModel {
  private caller: TechniqueModel;
  override get ownerType() {
    return "equipment" as const;
  }

  usageOpt: { name: string; autoDecrease: boolean } | null = null;
  usagePerRoundOpt: {
    name: UsagePerRoundVariableNames;
    autoDecrease: boolean;
  } | null = null;

  constructor(caller: TechniqueModel) {
    super();
    this.caller = caller;
    this.skillType = "technique";
  }

  setUsage(count: number, option: GtsUsageOrUsagePerRoundOptions) {
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
}

interface TechniqueSkillVMMeta extends InitiativeSkillVMMeta {
  variables: string;
}
const DEFAULT_TECHNIQUE_SKILL_VM_META = {
  ...DEFAULT_INITIATIVE_SKILL_VM_META,
  type: "equipment",
  variables: null as never,
} as const satisfies TechniqueSkillVMMeta;

export const TechniqueSkillViewModel = InitiativeSkillViewModel
  //
  .extend(TechniqueSkillModel, (h) => ({
    id: h.attribute<{
      (id: number): AR.Done;
      required(): true;
      uniqueKey(): "id";
      as(): SkillHandle;
    }>(
      (model, [id]) => {
        model.id = id;
      },
      (_, [id]) => id as any,
    ),
    usage: h.attribute<{
      <Meta extends TechniqueSkillVMMeta>(
        this: AR.This<Meta>,
        count: number,
      ): AR.With<typeof UsageVM>;
      <Meta extends TechniqueSkillVMMeta>(
        this: AR.This<Meta>,
        perRound: "perRound",
        count: number,
      ): AR.With<typeof UsageVM, { name: "usagePerRound" }>;
      mergeMeta<
        Meta extends TechniqueSkillVMMeta,
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
  }))
  .bind<typeof DEFAULT_TECHNIQUE_SKILL_VM_META>();
