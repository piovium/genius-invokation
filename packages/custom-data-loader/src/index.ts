// Copyright (C) 2025 Guyutongxue
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

import {
  GameData,
  resolveOfficialVersion,
  SkillDefinition,
  Version,
  playSkillOfCard,
} from "@gi-tcg/core";
import type { CustomData, CustomSkill } from "@gi-tcg/assets-manager";

import getOfficialData, { registry as baseRegistry } from "@gi-tcg/data";
import { BuilderContext } from "./builder_context";

export { getOfficialData };

declare const btoa: (str: string) => string;
function b64EncodeUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    }),
  );
}

function placeholderImageUrl(name: string) {
  return `data:image/svg+xml;base64,${b64EncodeUnicode(`
    <svg xmlns="http://www.w3.org/2000/svg" width="210" height="360">
      <rect width="210" height="360" fill="#ddd" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="32" fill="#333">
        ${name}
      </text>
    </svg>
  `)}`;
}

export class CustomDataLoader {
  private version?: Version;
  private registry = baseRegistry.clone();
  private nextId = 10_000_000;

  private names = new Map<number, string>();
  private descriptions = new Map<number, string>();
  private images = new Map<number, string>();

  constructor() {}

  setVersion(version: Version): this {
    this.version = version;
    return this;
  }

  loadMod(...sources: string[]): this {
    for (const src of sources) {
      const fn = new Function("BuilderContext", `"use strict";` + src);
      const ctx = new BuilderContext(this.registry, {
        stepId: () => this.nextId++,
        registerName: (id, name) => {
          this.names.set(id, name);
        },
        registerDescription: (id, desc) => {
          this.descriptions.set(id, desc);
        },
        registerImage: (id, url) => {
          this.images.set(id, url);
        },
      });
      const param = ctx.beginRegistration();
      try {
        fn(param);
      } finally {
        ctx.endRegistration();
      }
    }
    return this;
  }

  done(): [GameData, CustomData] {
    const gameData = this.registry.resolve(
      (items) => resolveOfficialVersion(items, this.version),
      (items) =>
        items.find((item) => item.version.from === "customData") ?? null,
    );
    const customData: CustomData = {
      actionCards: [],
      characters: [],
      entities: [],
    };
    const parseSkill = (skill: SkillDefinition): CustomSkill => {
      const name = this.names.get(skill.id) ?? "";
      const skillType = skill.skillType ?? "passive";
      return {
        id: skill.id,
        type: skillType === "playCard" ? "passive" : skillType,
        name,
        rawDescription: this.descriptions.get(skill.id) ?? "",
        skillIconUrl: this.images.get(skill.id) ?? "",
        playCost: new Map(skill.initiativeSkillConfig?.requiredCost),
      };
    };
    for (const [id, ch] of gameData.characters) {
      if (ch.version.from !== "customData") {
        continue;
      }
      const name = this.names.get(ch.id) ?? "";
      customData.characters.push({
        id,
        name,
        rawDescription: this.descriptions.get(id) ?? "",
        cardFaceUrl: this.images.get(id) ?? placeholderImageUrl(name),
        obtainable: true,
        hp: ch.varConfigs.maxHealth.initialValue,
        maxEnergy: ch.varConfigs.maxEnergy.initialValue,
        tags: [...ch.tags],
        skills: ch.skills.map(parseSkill),
      });
    }
    for (const [id, et] of gameData.entities) {
      if (et.version.from !== "customData") {
        continue;
      }
      const name = this.names.get(id) ?? "";
      customData.entities.push({
        id,
        type: et.type,
        name,
        rawDescription: this.descriptions.get(et.id) ?? "",
        cardFaceOrBuffIconUrl: this.images.get(id) ?? placeholderImageUrl(name),
        skills: et.skills.map(parseSkill),
      });
      if (["equipment", "support", "eventCard"].includes(et.type)) {
        customData.actionCards.push({
          id,
          name,
          type: et.type,
          rawDescription: this.descriptions.get(id) ?? "",
          cardFaceUrl: this.images.get(id) ?? placeholderImageUrl(name),
          obtainable: et.obtainable,
          tags: [...et.tags],
          playCost: new Map(
            playSkillOfCard(et)?.initiativeSkillConfig.requiredCost,
          ),
        });
      }
    }
    return [gameData, customData];
  }
}
