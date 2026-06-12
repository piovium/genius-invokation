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
import type { AnyState, CommonSkillType, DiceRequirement } from "../..";
import type { UsagePerRoundVariableNames } from "../../base/entity";
import type { CustomEvent, ListenTo } from "../../builder";
import type {
  DetailedEventNames,
  InitiativeSkillTargetKind,
  SkillOperation,
  SkillOperationFilter,
  StrictInitiativeSkillEventArg,
} from "../../builder/skill";
import type { SkillContext } from "../../builder/context/skill";
import { DEFAULT_ENTITY_VM_META, type EntityVMMeta } from "./entity";
import type {
  ExEntityType,
  PassiveSkillHandle,
  SkillHandle,
} from "../../builder/type";

class SkillModel {
  id!: number;

  isInitiativeSkill = true;

  // initiative configs
  skillType: CommonSkillType | null = null;
  prepared = false;
  hidden = false;
  alwaysCharged = false;
  alwaysPlunging = false;
  targetGetters: ((c: SkillContext<any>) => AnyState[])[] = [];
  cost: DiceRequirement = new Map();

  // triggered configs
  detailedEventName: DetailedEventNames | CustomEvent | null = null;
  filter: SkillOperationFilter<any> = () => true;
  enableHandTriggering = false;
  enablePileTriggering = false;
  usageOpt: { name: string; autoDecrease: boolean } | null = null;
  usagePerRoundOpt: {
    name: UsagePerRoundVariableNames;
    autoDecrease: boolean;
  } | null = null;
  listenTo: ListenTo | null = null;

  associatedExtensionId: number | null = null;
}

class CharacterSkillModel extends SkillModel {
  getEntry(): CharacterInitiativeSkillEntry | CharacterPassiveSkillEntry {
    // TODO
    throw new Error("Method not implemented.");
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
    type: h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: AR.This<Meta & { isInitiativeSkill: true }>,
        type: "normal" | "elemental" | "burst",
      ): AR.Done;
      <Meta extends CharacterSkillVMMeta>(
        this: Meta,
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

    "~action": h.attribute<{
      <Meta extends CharacterSkillVMMeta>(
        this: Meta extends { isInitiativeSkill: true } ? never : AR.This<Meta>,
        operation: SkillOperation<{
          callerType: Meta["type"];
          associatedExtension: Meta["associatedExtension"];
          callerVars: Meta["variables"];
          eventArgType: StrictInitiativeSkillEventArg<Meta["targetTypes"]>;
        }>,
      ): AR.Done;
      uniqueKey(): "~action";
    }>((model, [operation]) => {}),
  }),
  DEFAULT_CHARACTER_SKILL_VM_META,
);
