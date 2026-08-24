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
  type OfficialVersionResolver,
  type SkillDefinition,
  type Version,
  playSkillOfCard,
} from "@gi-tcg/core";
import type {
  AssetsManagerOption,
  CustomData,
  CustomPlayCost,
  CustomSkill,
  OverrideData,
} from "@gi-tcg/assets-manager";
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
  private version?: Version | OfficialVersionResolver;
  private registry = baseRegistry.clone();
  private nextId = 10_000_000;

  private names = new Map<number, string>();
  private descriptions = new Map<number, string>();
  private playingDescriptions = new Map<number, string>();
  private dynamicDescriptions = new Map<number, string>();
  private images = new Map<number, string>();
  private dataOverrides = new Map<number, OverrideData>();
  private readonly moduleEvaluator: ModuleEvaluator;

  constructor(options: CustomDataLoaderOptions = {}) {
    this.moduleEvaluator = createModuleEvaluator(options);
  }

  setVersion(version?: Version | OfficialVersionResolver | undefined): this {
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
          this.playingDescriptions.set(id, md.customPlayingDescription ?? "");
          this.dynamicDescriptions.set(id, md.customDynamicDescription ?? "");
          this.images.set(id, md.customImage ?? placeholderImageUrl(name));
          if (md.hasSpecifiedId) {
            this.dataOverrides.set(id, {
              ...this.dataOverrides.get(id),
              id,
              ...(md.customName === null ? {} : { name: md.customName }),
              ...(md.customDescription === null
                ? {}
                : { rawDescription: md.customDescription }),
              ...(md.customPlayingDescription === null
                ? {}
                : { rawPlayingDescription: md.customPlayingDescription }),
              ...(md.customDynamicDescription === null
                ? {}
                : { rawDynamicDescription: md.customDynamicDescription }),
            });
          }
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

  done(): [GameData, Partial<AssetsManagerOption>] {
    const officialVersionResolver =
      typeof this.version === "function"
        ? this.version
        : createOfficialVersionResolver(this.version);
    const gameData = this.registry.resolve((items) => {
      const customDataItems = items.filter(
        (item) => item.version.from === "customData",
      );
      if (customDataItems.length > 1) {
        throw new Error(
          `Multiple custom data versions found for id ${customDataItems[0]!.id}`,
        );
      }
      return customDataItems[0] ?? null;
    }, officialVersionResolver);
    const customData: CustomData = {
      actionCards: [],
      characters: [],
      entities: [],
      skills: [],
      attachments: [],
    };
    const serializePlayCost = (
      playCost: ReadonlyMap<CustomPlayCost["type"], number> | undefined,
    ): CustomPlayCost[] =>
      Array.from(playCost ?? [], ([type, count]) => ({ type, count }));
    const parseSkill = (skill: SkillDefinition): CustomSkill => {
      const name = this.names.get(skill.id) ?? "";
      const skillType = skill.skillType ?? "passive";
      return {
        id: skill.id,
        type: skillType === "playCard" ? "passive" : skillType,
        name,
        rawDescription: this.descriptions.get(skill.id) ?? "",
        skillIconUrl: this.images.get(skill.id) ?? "",
        playCost: serializePlayCost(skill.initiativeSkillConfig?.requiredCost),
      };
    };
    const collectCustomSkills = (skills: readonly SkillDefinition[]) => {
      for (const skill of skills) {
        if (this.names.has(skill.id) && !this.dataOverrides.has(skill.id)) {
          customData.skills.push(parseSkill(skill));
        }
      }
    };
    for (const [id, ch] of gameData.characters) {
      collectCustomSkills(ch.skills);
      if (ch.version.from !== "customData" || this.dataOverrides.has(ch.id)) {
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
      if (et.version.from !== "customData" || this.dataOverrides.has(et.id)) {
        continue;
      }
      const name = this.names.get(id) ?? "";
      customData.entities.push({
        id,
        type: et.type,
        name,
        rawDescription: this.descriptions.get(et.id) ?? "",
        rawPlayingDescription: this.playingDescriptions.get(et.id) || undefined,
        cardFaceOrBuffIconUrl: this.images.get(id) ?? placeholderImageUrl(name),
        skills: et.skills.map(parseSkill),
      });
      if (["equipment", "support", "eventCard"].includes(et.type)) {
        customData.actionCards.push({
          id,
          name,
          type: et.type,
          rawDescription: this.descriptions.get(id) ?? "",
          rawPlayingDescription: this.playingDescriptions.get(id) || undefined,
          rawDynamicDescription: this.dynamicDescriptions.get(id) || undefined,
          cardFaceUrl: this.images.get(id) ?? placeholderImageUrl(name),
          obtainable: et.obtainable,
          tags: [...et.tags],
          playCost: serializePlayCost(
            playSkillOfCard(et)?.initiativeSkillConfig.requiredCost,
          ),
        });
      }
    }
    for (const [id, attachment] of gameData.attachments) {
      collectCustomSkills(attachment.skills);
      if (
        attachment.version.from !== "customData" ||
        this.dataOverrides.has(attachment.id)
      ) {
        continue;
      }
      const name = this.names.get(id) ?? "";
      customData.attachments!.push({
        id,
        name,
        rawDescription: this.descriptions.get(id) ?? "",
        rawPlayingDescription: this.playingDescriptions.get(id) || undefined,
        iconUrl: this.images.get(id) ?? placeholderImageUrl(name),
        tags: [...attachment.tags],
        skills: attachment.skills.map(parseSkill),
      });
    }
    return [
      gameData,
      {
        customData: [customData],
        overrideData: [...this.dataOverrides.values()],
      },
    ];
  }
}
