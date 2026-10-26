import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CURRENT_VERSION,
  createOfficialVersionResolver,
  getVersionBehavior,
  mergeGameConfigWithDefault,
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
import { loadReference } from "./reference";
import {
  presetSchema,
  pluginSchema,
  externalPluginSchema,
  versionMapSchema,
  modSchema,
  overridesSchema,
} from "./schema";

function defaults(): ProfileGameConfig {
  const { randomSeed, hostWho, hostRelatedExecution, ...config } =
    mergeGameConfigWithDefault();
  return config;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function finishProfile(
  profile: Profile,
  data: CompiledProfile["data"],
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

export function officialProfile(
  baseVersion: Version,
  id = `official/${baseVersion}`,
): CompiledProfile {
  return finishProfile(
    {
      id,
      name: id === "official/latest" ? "Official (latest)" : baseVersion,
      baseVersion,
      officialDeckCompatible: true,
      gameConfig: defaults(),
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

export async function compilePreset(
  input: unknown,
  source: URL,
): Promise<CompiledProfile> {
  const preset = presetSchema.parse(input);
  const baseVersion = preset.version ?? CURRENT_VERSION;
  const gameConfig = { ...defaults(), ...preset.config };
  const { base, ...behavior } = preset.version_behavior ?? {};
  const versionBehavior = {
    ...getVersionBehavior(base ?? baseVersion),
    ...behavior,
  };
  const versionMap: Record<number, Version> = {};
  const mods: ModSource[] = [];
  const overrides: OverrideData[] = [];
  for (const entry of preset.plugins ?? []) {
    const loaded =
      typeof entry === "string"
        ? await loadReference(entry, source)
        : { value: entry, source };
    const plugin = (
      typeof entry === "string" ? externalPluginSchema : pluginSchema
    ).parse(loaded.value);
    for (const entry of plugin.version_maps ?? []) {
      const value =
        typeof entry === "string"
          ? (await loadReference(entry, loaded.source)).value
          : entry;
      for (const [id, selected] of Object.entries(
        versionMapSchema.parse(value),
      )) {
        if (versionMap[Number(id)] && versionMap[Number(id)] !== selected)
          throw new Error(`Conflicting versions for ${id}`);
        versionMap[Number(id)] = selected;
      }
    }
    for (const entry of plugin.mods ?? []) {
      const value =
        typeof entry === "string"
          ? (await loadReference(entry, loaded.source, true)).value
          : entry;
      const mod = modSchema.parse(value);
      mods.push({
        content: mod.content,
        fileUri: mod.fileUri ?? `profile://${preset.id}/mod-${mods.length}.gts`,
      });
    }
    for (const entry of plugin.static_data_overrides ?? []) {
      const value =
        typeof entry === "string"
          ? (await loadReference(entry, loaded.source)).value
          : entry;
      overrides.push(...(overridesSchema.parse(value) as OverrideData[]));
    }
  }
  const resolver = createOfficialVersionResolver(
    baseVersion,
    versionMap,
    analyzeResult,
  );
  const loader = new CustomDataLoader().setVersion(resolver);
  for (const mod of mods) {
    try {
      await loader.loadMod(mod.content);
    } catch (cause) {
      throw new Error(`Cannot load Mod ${mod.fileUri}`, { cause });
    }
  }
  const [data, assets] = loader.done();
  if (!assets.officialDeckCompatible)
    throw new Error(`Profile ${preset.id} is not officialDeckCompatible`);
  const merged = new Map<number, OverrideData>();
  for (const item of [...(assets.overrideData ?? []), ...overrides])
    merged.set(item.id, { ...merged.get(item.id), ...item });
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
        version: { ...resolver.versionMap },
        customData: assets.customData ?? [],
        overrideData: [...merged.values()],
        officialDeckCompatible: true,
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

/** Mod registration is process-global, so presets are compiled sequentially. */
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
