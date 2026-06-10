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
import type { DescriptionDictionary, EntityDefinition, EntityTag, VariableConfig } from "../../base/entity";
import type { SkillDefinition } from "../../base/skill";
import type { Writable } from "../../utils";
import type { SkillOperation } from "../../builder/skill";
import type { EntityType, VersionInfo } from "../..";
import { DEFAULT_VERSION_INFO } from "../../base/version";

class EntityModel {
  skillIndex = 0;
  usagePerRoundIndex = 0;

  id!: number;
  type: EntityType;
  tags: EntityTag[] = [];
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  varConfigs = new Map<string, VariableConfig>();
  skillList: SkillDefinition[] = [];
  disposeWhenUsageIsZero = false;
  disposeOnMasterDefeated = false;
  visibleVarName: string | null = null;
  associatedExtensionId: number | null = null;
  hintText: string | null = null;
  descriptionDictionary: Writable<DescriptionDictionary> = {};
  snippets = new Map<string, SkillOperation<any>>();

  constructor(type: EntityType) {
    this.type = type;
  }

  getEntry(): EntityDefinition {
    // TODO
    throw new Error("Method not implemented.");
  }
}

export const EntityViewModel = defineViewModel(EntityModel, (h) => ({
  // TODO
}));

class CardModel {

  type: "support" | "equipment" | "eventCard" = "eventCard";
  obtainable = true;
  tags: EntityTag[] = [];
  versionInfo: VersionInfo = DEFAULT_VERSION_INFO;

  varConfigs = new Map<string, VariableConfig>();
  skillList: SkillDefinition[] = [];
  disableTuning = false;
  // TODO satiatedTarget
  

  getEntry(): EntityDefinition {
    // TODO
    throw new Error("Method not implemented.");
  }
}

export const CardViewModel = defineViewModel(CardModel, (h) => ({
  // TODO
}));
