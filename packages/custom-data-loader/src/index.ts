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
import { transpile } from "@gi-tcg/gts-transpiler";

import getOfficialData, { registry as baseRegistry } from "@gi-tcg/data";
import { beginCustomDataRegistration } from "./gts/context";
import customDataViewModel from "./gts/vm";
import * as gtsRuntime from "./gts/runtime";

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

function compileGts(source: string) {
  if (/\b(import|export)\b/m.test(source)) {
    throw new Error("Custom GTS modules cannot use import or export statements");
  }
  const { code } = transpile(source, "custom-data.gts", {
    providerImportSource: "@gi-tcg/custom-data-loader/gts/vm",
    runtimeImportSource: "@gi-tcg/custom-data-loader/gts/runtime",
  });
  const executable = code
    .replace(
      /^import\s+\{\s*createDefine as __gts_createDefine,\s*createBinding as __gts_createBinding\s*\}\s+from\s+[^;]+;\s*/m,
      "",
    )
    .replace(/^import\s+__gts_rootVm\s+from\s+[^;]+;\s*/m, "")
    // GTS emits public bindings as ESM exports. The loader evaluates a single
    // self-contained document, so they are ordinary local bindings instead.
    .replace(/^export const /gm, "const ");

  if (/\b(?:import|export)\b/.test(executable)) {
    throw new Error("Custom GTS modules cannot use import or export statements");
  }
  return executable;
}

function executeGts(source: string) {
  const code = compileGts(source);
  const fn = new Function(
    "__gts_runtime",
    "__gts_rootVm",
    `
      const {
        createDefine: __gts_createDefine,
        createBinding: __gts_createBinding,
      } = __gts_runtime;
      with (__gts_runtime) {
        ${code}
      }
    `,
  );
  fn(gtsRuntime, customDataViewModel);
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
      const scope = this.registry.begin();
      const definitionIds = new WeakMap<object, number>();
      const endRegistration = beginCustomDataRegistration({
        allocateId: (node) => {
          let id = definitionIds.get(node);
          if (id === undefined) {
            id = this.nextId++;
            definitionIds.set(node, id);
          }
          return id;
        },
        registerMetadata: ({ id, name, description, image }) => {
          this.names.set(id, name);
          this.descriptions.set(id, description);
          this.images.set(id, image);
        },
      });
      try {
        executeGts(src);
      } finally {
        endRegistration();
        scope.end();
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
      attachments: [],
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
    for (const [id, attachment] of gameData.attachments) {
      if (attachment.version.from !== "customData") {
        continue;
      }
      const name = this.names.get(id) ?? "";
      customData.attachments!.push({
        id,
        name,
        rawDescription: this.descriptions.get(id) ?? "",
        iconUrl: this.images.get(id) ?? placeholderImageUrl(name),
        tags: [...attachment.tags],
        skills: attachment.skills.map(parseSkill),
      });
    }
    return [gameData, customData];
  }
}
