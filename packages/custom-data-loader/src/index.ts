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
  type GameData,
  createOfficialVersionResolver,
  type SkillDefinition,
  type Version,
  playSkillOfCard,
} from "@gi-tcg/core";
import type { CustomData, CustomSkill } from "@gi-tcg/assets-manager";
import { transpile } from "@gi-tcg/gts-transpiler";

import getOfficialData, { registry as baseRegistry } from "@gi-tcg/data";
import { beginCustomDataRegistration } from "./gts/context";
import { GTS_RUNTIME_MODULE } from "./module_evaluators/share";
import {
  NodeVmModuleEvaluator,
  type NodeVmModuleEvaluatorOptions,
} from "./module_evaluators/node_vm";
import {
  EsbuildWasmModuleEvaluator,
  type EsbuildWasmModuleEvaluatorOptions,
} from "./module_evaluators/esbuild_wasm";
import {
  defaultModuleEvaluatorBackend,
  type ModuleEvaluator,
} from "./module_evaluators";

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
  const { code } = transpile(source, "custom-data.gts", {
    providerImportSource: "@gi-tcg/custom-data-loader/gts/vm",
    runtimeImportSource: GTS_RUNTIME_MODULE,
  });
  return code;
}

export type CustomDataLoaderOptions =
  | {
      backend?: "node-vm";
      backendOptions?: NodeVmModuleEvaluatorOptions;
    }
  | {
      backend: "esbuild-wasm";
      backendOptions?: EsbuildWasmModuleEvaluatorOptions;
    };

function createModuleEvaluator(
  options: CustomDataLoaderOptions,
): ModuleEvaluator {
  const backend = options.backend ?? defaultModuleEvaluatorBackend();
  switch (backend) {
    case "node-vm":
      return new NodeVmModuleEvaluator(options.backendOptions);
    case "esbuild-wasm":
      return new EsbuildWasmModuleEvaluator(options.backendOptions);
  }
}

export class CustomDataLoader {
  private version?: Version;
  private registry = baseRegistry.clone();
  private nextId = 10_000_000;

  private names = new Map<number, string>();
  private descriptions = new Map<number, string>();
  private images = new Map<number, string>();
  private readonly moduleEvaluator: ModuleEvaluator;

  constructor(options: CustomDataLoaderOptions = {}) {
    this.moduleEvaluator = createModuleEvaluator(options);
  }

  setVersion(version: Version): this {
    this.version = version;
    return this;
  }

  async loadMod(...sources: string[]): Promise<this> {
    for (const src of sources) {
      const scope = this.registry.begin();
      const definitionIds = new WeakMap<object, number>();
      const endRegistration = beginCustomDataRegistration({
        allocateId: (node) => {
          let id = definitionIds.get(node);
          if (typeof id === "undefined") {
            id = this.nextId++;
            definitionIds.set(node, id);
          }
          return id;
        },
        registerMetadata: (md) => {
          const id = md.id;
          const name = md.customName ?? "";
          this.names.set(id, name);
          this.descriptions.set(id, md.customDescription ?? "");
          this.images.set(id, md.customImage ?? placeholderImageUrl(name));
        },
      });
      try {
        await this.moduleEvaluator.evaluate(compileGts(src));
      } finally {
        endRegistration();
        scope.end();
      }
    }
    return this;
  }

  done(): [GameData, CustomData] {
    const gameData = this.registry.resolve(
      (items) => {
        const customDataItems = items.filter(
          (item) => item.version.from === "customData",
        );
        if (customDataItems.length > 1) {
          throw new Error(
            `Multiple custom data versions found for id ${customDataItems[0]!.id}`,
          );
        }
        return customDataItems[0] ?? null;
      },
      createOfficialVersionResolver(this.version),
    );
    const standaloneSkills: CustomSkill[] = [];
    const customData: CustomData = {
      actionCards: [],
      characters: [],
      entities: [],
      skills: standaloneSkills,
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
    const customSkills = new Map<number, CustomSkill>();
    const collectCustomSkills = (skills: readonly SkillDefinition[]) => {
      for (const skill of skills) {
        if (this.names.has(skill.id)) {
          customSkills.set(skill.id, parseSkill(skill));
        }
      }
    };
    for (const [id, ch] of gameData.characters) {
      collectCustomSkills(ch.skills);
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
      collectCustomSkills(et.skills);
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
      collectCustomSkills(attachment.skills);
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
    standaloneSkills.push(...customSkills.values());
    return [gameData, customData];
  }
}
