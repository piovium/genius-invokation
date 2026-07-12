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

import { defineViewModel } from "@gi-tcg/gts-runtime";
import type { CharacterEntry } from "../../builder/registry";
import {
  DEFAULT_VERSION_INFO,
  type Version,
  type VersionInfo,
} from "../../base/version";
import { Aura, type LunarReaction } from "@gi-tcg/typings";
import type { CharacterTag, SpecialEnergyConfig } from "../../base/character";
import type {
  CharacterHandle,
  PassiveSkillHandle,
  SkillHandle,
  StatusHandle,
} from "../../builder";
import { createVariable } from "../../builder/utils";

class CharacterModel {
  id!: number;
  maxHealth = 10;
  maxEnergy = 3;
  tags: CharacterTag[] = [];
  versionInfo: VersionInfo | null = null;

  skillIds: number[] = [];
  associatedNightsoulsBlessingId: number | null = null;
  enabledLunarReactions: LunarReaction[] = [];
  specialEnergy: SpecialEnergyConfig | null = null;

  getEntry(): CharacterEntry {
    return {
      __definition: "characters",
      type: "character",
      id: this.id,
      version: this.versionInfo ?? DEFAULT_VERSION_INFO,
      tags: this.tags,
      skillIds: this.skillIds,
      varConfigs: {
        health: createVariable(this.maxHealth),
        energy: createVariable(0),
        alive: createVariable(1),
        aura: createVariable(Aura.None),
        maxHealth: createVariable(this.maxHealth),
        maxEnergy: createVariable(this.maxEnergy),
      },
      associatedNightsoulsBlessingId: this.associatedNightsoulsBlessingId,
      enabledLunarReactions: this.enabledLunarReactions,
      specialEnergy: this.specialEnergy,
    };
  }
}

export const CharacterViewModel = defineViewModel(CharacterModel, (h) => ({
  id: h.simpleAttribute({
    required: true,
    uniqueKey: "id",
  })(
    function (id: number) {
      this.id = id;
    },
    (id: number) => id as CharacterHandle,
  ),
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
  tags: h.simpleAttribute()(function (...tags: CharacterTag[]) {
    this.tags.push(...tags);
  }),
  health: h.simpleAttribute()(function (maxHealth: number) {
    this.maxHealth = maxHealth;
  }),
  energy: h.simpleAttribute()(function (maxEnergy: number) {
    this.maxEnergy = maxEnergy;
  }),
  skills: h.simpleAttribute()(function (
    ...skillIds: (SkillHandle | PassiveSkillHandle)[]
  ) {
    this.skillIds.push(...skillIds);
  }),
  associateNightsoul: h.simpleAttribute({
    uniqueKey: "associateNightsoul",
  })(function (blessingId: StatusHandle) {
    this.associatedNightsoulsBlessingId = blessingId;
  }),
  enabledLunarReactions: h.simpleAttribute()(function (
    ...reactions: LunarReaction[]
  ) {
    this.enabledLunarReactions.push(...reactions);
  }),
  specialEnergy: h.simpleAttribute({
    uniqueKey: "specialEnergy",
  })(function (variableName: string, slotSize: number) {
    this.specialEnergy = { variableName, slotSize };
  }),
}));
