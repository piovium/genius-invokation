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
import type { CharacterEntry } from "../../builder/registry";
import { DEFAULT_VERSION_INFO, type VersionInfo } from "../../base/version";
import { Aura, type LunarReaction } from "@gi-tcg/typings";
import type { CharacterTag, SpecialEnergyConfig } from "../../base/character";
import type { CharacterHandle } from "../../builder";
import { createVariable } from "../../builder/utils";

class CharacterModel {
  id!: number;
  maxHealth = 10;
  maxEnergy = 3;
  tags: CharacterTag[] = [];
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  skillIds: number[] = [];
  associatedNightsoulsBlessingId: number | null = null;
  enabledLunarReactions: LunarReaction[] = [];
  specialEnergy: SpecialEnergyConfig | null = null;

  getEntry(): CharacterEntry {
    return {
      __definition: "characters",
      type: "character",
      id: this.id,
      version: this.versionInfo,
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
    }
  }
}

export const CharacterViewModel = defineViewModel(CharacterModel, (h) => ({
  id: h.attribute<{
    (id: number): AR.Done;
    required(): true;
    uniqueKey(): "id";
    as(): CharacterHandle;
  }>(
    (model, [id]) => {
      model.id = id;
    },
    (_, [id]) => {
      return id as CharacterHandle;
    },
  ),
  // TODO
}));
