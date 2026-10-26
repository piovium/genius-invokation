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

import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CURRENT_VERSION,
  createOfficialVersionResolver,
  getVersionBehavior,
  mergeGameConfigWithDefault,
  type GameData,
  type Version,
} from "@gi-tcg/core";
import getData from "@gi-tcg/data";
import { analyzeResult } from "@gi-tcg/data-code-analyzer";
import { CustomDataLoader } from "@gi-tcg/custom-data-loader";
import type { OverrideData } from "@gi-tcg/assets-manager";
import type {
  CompiledProfile,
  ModSource,
  Profile,
  ProfileGameConfig,
} from "./types";
import { loadReference, type LoadedReference } from "./reference";
import {
  presetSchema,
  inlinePluginSchema,
  pluginSchema,
  versionMapSchema,
  modSchema,
  overridesSchema,
} from "./schema";
import type { z } from "zod";

const DEFAULT_GAME_CONFIG: ProfileGameConfig = (({
  randomSeed,
  hostWho,
  hostRelatedExecution,
  ...config
}) => config)(mergeGameConfigWithDefault());

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function finishProfile(
  profile: Profile,
  data: GameData,
): CompiledProfile {
  // Hash the same representation served to clients and stored in archives.
  const serialized = JSON.stringify(profile);
  const profileHash = createHash("sha256").update(serialized).digest("hex");
  const { id, name, baseVersion, officialDeckCompatible } = profile;
  return {
    profile: freeze(JSON.parse(serialized)),
    data,
    summary: freeze({
      id,
      name,
      baseVersion,
      officialDeckCompatible,
      profileHash,
    }),
  };
}

export function officialProfile(baseVersion: Version): CompiledProfile {
  return finishProfile(
    {
      id: `official/${baseVersion}`,
      name: `Official ${baseVersion}`,
      baseVersion,
      officialDeckCompatible: true,
      gameConfig: { ...DEFAULT_GAME_CONFIG },
      versionBehavior: getVersionBehavior(baseVersion),
      versionMap: {},
      mods: [],
      assets: {
        version: baseVersion,
        customData: [],
        overrideData: [],
        officialDeckCompatible: true,
      },
    },
    getData(baseVersion),
  );
}

async function loadReferenceOrInline<T>(
  entry: unknown,
  parent: URL,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  inlineSchema = schema,
): Promise<LoadedReference<T>> {
  if (typeof entry === "string") {
    const { value, source } = await loadReference(entry, parent);
    return {
      value: schema.parse(value),
      source,
    };
  } else {
    return {
      value: inlineSchema.parse(entry),
      source: parent,
    };
  }
}

export async function compilePreset(
  input: unknown,
  source: URL,
): Promise<CompiledProfile> {
  const preset = presetSchema.parse(input);
  const baseVersion = preset.version ?? CURRENT_VERSION;
  const gameConfig = { ...DEFAULT_GAME_CONFIG, ...preset.config };
  const { base, ...behavior } = preset.version_behavior ?? {};
  const versionBehavior = {
    ...getVersionBehavior(base ?? baseVersion),
    ...behavior,
  };
  const versionMap: Record<number, Version> = {};
  const mods: ModSource[] = [];
  const explicitOverrides: OverrideData[] = [];
  for (const entry of preset.plugins ?? []) {
    const { value: plugin, source: pluginSource } = await loadReferenceOrInline(
      entry,
      source,
      pluginSchema,
      inlinePluginSchema,
    );
    for (const entry of plugin.version_maps ?? []) {
      const { value } = await loadReferenceOrInline(
        entry,
        pluginSource,
        versionMapSchema,
      );
      for (const [id, selected] of Object.entries(value)) {
        if (versionMap[Number(id)] && versionMap[Number(id)] !== selected) {
          throw new Error(`Conflicting versions for ${id}`);
        }
        versionMap[Number(id)] = selected;
      }
    }
    for (const entry of plugin.mods ?? []) {
      const { value: mod } = await loadReferenceOrInline(
        entry,
        pluginSource,
        modSchema,
      );
      mods.push({
        content: mod.content,
        fileUri:
          mod.fileUri ?? `inmem+profile://${preset.id}/mod-${mods.length}.gts`,
      });
    }
    for (const entry of plugin.static_data_overrides ?? []) {
      const { value } = await loadReferenceOrInline(
        entry,
        pluginSource,
        overridesSchema,
      );
      explicitOverrides.push(...value);
    }
  }
  const resolver = createOfficialVersionResolver(
    baseVersion,
    versionMap,
    analyzeResult,
  );
  const loader = new CustomDataLoader();
  loader.setVersion(resolver);
  for (const mod of mods) {
    try {
      await loader.loadMod(mod.content);
    } catch (cause) {
      throw new Error(`Cannot load Mod ${mod.fileUri}`, { cause });
    }
  }
  const [data, { officialDeckCompatible, customData = [], overrideData = [] }] =
    loader.done();
  if (!officialDeckCompatible) {
    throw new Error(`Profile ${preset.id} is not officialDeckCompatible`);
  }
  const merged = new Map<number, OverrideData>();
  for (const item of [...overrideData, ...explicitOverrides]) {
    merged.set(item.id, { ...merged.get(item.id), ...item });
  }
  return finishProfile(
    {
      id: preset.id,
      name: preset.name ?? preset.id,
      baseVersion,
      officialDeckCompatible: true,
      gameConfig,
      versionBehavior,
      versionMap,
      mods,
      assets: {
        version: {
          ...resolver.versionMap,
          // No available $category here. Waiting future solution
        },
        customData,
        overrideData: [...merged.values()],
        officialDeckCompatible,
      },
    },
    data,
  );
}

const presetExtensions = [
  "json",
  "yaml",
  "yml",
  "jsonc",
  "json5",
  "toml",
  "js",
  "ts",
  "cjs",
  "cts",
  "mjs",
  "mts",
];

/** Load the first supported preset in a directory, or null if none exists. */
export async function loadPreset(
  directory: string | URL,
): Promise<CompiledProfile | null> {
  const path = directory instanceof URL ? fileURLToPath(directory) : directory;
  for (const extension of presetExtensions) {
    const source = pathToFileURL(join(path, `preset.${extension}`));
    try {
      await stat(source);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw cause;
    }
    try {
      const { value } = await loadReference(source.href, source);
      return await compilePreset(value, source);
    } catch (cause) {
      throw new Error(`Cannot compile Preset ${source.href}`, { cause });
    }
  }
  return null;
}

export async function loadPresets(
  directory: string | URL,
  { recursive = false }: { recursive?: boolean } = {},
): Promise<CompiledProfile[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive });
  const profiles: CompiledProfile[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const profile = await loadPreset(join(entry.parentPath, entry.name));
    if (profile) profiles.push(profile);
  }
  return profiles;
}
