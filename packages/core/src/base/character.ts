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

import { Aura } from "@gi-tcg/typings";
import type { SkillDefinition } from "./skill";
import type { EntityDefinition, VariableConfig } from "./entity";
import type { WithVersionInfo } from "./version";

export type ElementTag =
  | "cryo"
  | "hydro"
  | "pyro"
  | "electro"
  | "anemo"
  | "geo"
  | "dendro";

export const WEAPON_TAGS = [
  "sword",
  "claymore",
  "pole",
  "catalyst",
  "bow",
  "otherWeapon",
] as const;

export type WeaponTag = (typeof WEAPON_TAGS)[number];

export const NATION_TAGS = [
  "mondstadt",
  "liyue",
  "inazuma",
  "sumeru",
  "fontaine",
  "natlan",
  "fatui",
  "eremite",
  "monster",
  "hilichurl",
  "sacread",
  "calamity",
] as const;

export type NationTag = (typeof NATION_TAGS)[number];

// 虽然荒的英文是 Ousia，但是在代码里使用 pneuma 表示荒
export type ArkheTag =
  | "pneuma" // 荒
  | "ousia"; // 芒

export type CharacterTag =
  | ElementTag
  | WeaponTag
  | NationTag
  | ArkheTag;

export interface CharacterDefinition extends WithVersionInfo {
  readonly __definition: "characters";
  readonly type: "character";
  readonly id: number;
  readonly tags: readonly CharacterTag[];
  readonly varConfigs: CharacterVariableConfigs;
  readonly skills: readonly SkillDefinition[];
  readonly associatedNightsoulsBlessing: EntityDefinition | null;
  readonly specialEnergy: SpecialEnergyConfig | null;
}

export interface SpecialEnergyConfig {
  readonly variableName: string;
  readonly slotSize: number;
}

export interface CharacterVariableConfigs {
  readonly health: VariableConfig;
  readonly energy: VariableConfig;
  readonly maxHealth: VariableConfig;
  readonly maxEnergy: VariableConfig;
  readonly aura: VariableConfig<Aura>;
  readonly alive: VariableConfig<0 | 1>;
  readonly [x: string]: VariableConfig;
}
