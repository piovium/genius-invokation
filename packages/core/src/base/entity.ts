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

import type { GameState } from "./state";
import type { SkillDefinition } from "./skill";
import type { VersionInfo } from "./version";

import type { WeaponTag } from "./character";

export type WeaponCardTag = Exclude<WeaponTag, "otherWeapon">;

export type EquipmentTag =
  | "talent"
  | "artifact"
  | "technique"
  | "weapon"
  | WeaponCardTag;

export type SupportTag =
  | "ally"
  | "place"
  | "item"
  | "blessing"
  | "adventureSpot";

export type CardTag =
  | "legend" // 秘传
  | "action" // 出战行动
  | "food"
  | "resonance" // 元素共鸣
  | "abyss"; // 显示深渊特效

export type CommonEntityTag =
  | "shield" // 护盾 & 显示黄盾特效
  | "barrier" // 紫盾 & 显示蓝盾特效
  | "normalAsPlunging"; // 普通攻击视为下落攻击

export type StatusTag =
  | "bondOfLife" // 显示生命之契特效
  | "disableSkill" // 禁用技能（仅角色状态）
  | "immuneControl" // 免疫冻结石化眩晕，禁用效果切人（仅角色状态）
  | "preparingSkill" // 角色将准备技能（仅角色状态）
  | "nightsoulsBlessing"; // 夜魂加持（仅角色状态）

export type CombatStatusTag = "eventEffectless"; // 禁用事件牌效果（6.3 及之前）

export type EntityTagMap = {
  eventCard: CardTag;
  status: StatusTag;
  combatStatus: CombatStatusTag;
  equipment: EquipmentTag;
  support: SupportTag;
  summon: never;
};

export type EntityTag<Type extends EntityType = EntityType> =
  | CommonEntityTag
  | EntityTagMap[Type];

export type EntityType =
  | "eventCard"
  | "status"
  | "combatStatus"
  | "equipment"
  | "support"
  | "summon";

export interface EntityDefinition {
  readonly __definition: "entities";
  readonly type: EntityType;
  readonly id: number;
  readonly version: VersionInfo;
  readonly obtainable: boolean;
  readonly visibleVarName: string | null;
  readonly tags: readonly EntityTag[];
  readonly hintText: string | null;
  readonly disableTuning: boolean;
  readonly varConfigs: EntityVariableConfigs;
  readonly disposeWhenUsageIsZero: boolean;
  readonly disposeOnMasterDefeated: boolean;
  readonly skills: readonly SkillDefinition[];
  readonly descriptionDictionary: DescriptionDictionary;
}

export type EntityArea =
  | {
      readonly type:
        | "combatStatuses"
        | "supports"
        | "summons"
        | "removedEntities";
      readonly who: 0 | 1;
    }
  | {
      readonly type: "pile" | "hands";
      readonly who: 0 | 1;
      readonly cardId: number;
    }
  | {
      readonly type: "characters";
      readonly who: 0 | 1;
      readonly characterId: number;
    };

export interface VariableConfig<ValueT extends number = number> {
  readonly initialValue: ValueT;
  readonly recreateBehavior: VariableRecreateBehavior<ValueT>;
}

export type VariableRecreateBehavior<ValueT extends number = number> =
  | {
      // 取决于 `versionBehavior.defaultRecreateBehavior` 设置
      readonly type: "default";
    }
  | {
      readonly type: "overwrite";
    }
  | {
      readonly type: "keep";
    }
  | {
      readonly type: "takeMax";
    }
  | {
      readonly type: "append";
      readonly appendValue: ValueT;
      readonly appendLimit: ValueT;
    };

export const USAGE_PER_ROUND_VARIABLE_NAMES = [
  "usagePerRound",
  "usagePerRound1",
  "usagePerRound2",
  "usagePerRound3",
  "usagePerRound4",
  "usagePerRound5",
  "usagePerRound6",
  "usagePerRound7",
  "usagePerRound8",
  "usagePerRound9",
  "usagePerRound10",
  "usagePerRound11",
  "usagePerRound12",
  "usagePerRound13",
  "usagePerRound14",
  "usagePerRound15",
] as const;

export type UsagePerRoundVariableNames =
  (typeof USAGE_PER_ROUND_VARIABLE_NAMES)[number];

export type EntityVariableConfigs = {
  readonly usage?: VariableConfig;
  readonly duration?: VariableConfig;
} & {
  readonly [x in UsagePerRoundVariableNames]?: VariableConfig;
} & {
  readonly [x: string]: VariableConfig;
};

export type VariableOfConfig<C extends Record<string, VariableConfig>> = {
  readonly [K in keyof C]: Required<C>[K] extends VariableConfig<infer T>
    ? T
    : never;
};

export type DescriptionDictionaryKey = `[${string}]`;
export type DescriptionDictionaryEntry = (st: GameState, id: number) => string;
export type DescriptionDictionary = Readonly<
  Record<DescriptionDictionaryKey, DescriptionDictionaryEntry>
>;

export function stringifyEntityArea(area: EntityArea) {
  return `${
    area.type === "characters"
      ? `character (${area.characterId})`
      : area.type + ("cardId" in area && area.cardId ? ` (${area.cardId})` : "")
  } of player ${area.who}`;
}
