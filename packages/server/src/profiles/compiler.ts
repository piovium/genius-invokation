import { createHash } from "node:crypto";
import {
  CURRENT_VERSION,
  VERSIONS,
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

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function keys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new Error(`Unknown ${label} field: ${key}`);
}
function array(value: unknown, label: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}
function version(value: unknown, fallback: Version = CURRENT_VERSION): Version {
  if (value === undefined) return fallback;
  if (value === "latest") return CURRENT_VERSION;
  if (!(VERSIONS as readonly unknown[]).includes(value))
    throw new Error(`Invalid version: ${value}`);
  return value as Version;
}
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
  const preset = object(input, "Preset");
  keys(
    preset,
    [
      "$schema_version",
      "id",
      "name",
      "version",
      "version_behavior",
      "config",
      "plugins",
    ],
    "Preset",
  );
  if (preset.$schema_version !== 1)
    throw new Error("Preset requires $schema_version: 1");
  if (typeof preset.id !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(preset.id))
    throw new Error("Profile id must be namespace/name");
  if (preset.name !== undefined && typeof preset.name !== "string")
    throw new Error("Profile name must be a string");
  const baseVersion = version(preset.version);
  const gameConfig = defaults();
  const config = object(preset.config ?? {}, "config");
  keys(config, Object.keys(gameConfig), "config");
  for (const [key, value] of Object.entries(config)) {
    if (key === "unexpectedInsufficientDice") {
      if (!["throw", "skipConsume", "skipAction"].includes(value as string))
        throw new Error(`Invalid config.${key}`);
    } else if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < 0
    ) {
      throw new Error(`config.${key} must be a nonnegative integer`);
    }
  }
  Object.assign(gameConfig, config);
  const behavior = object(preset.version_behavior ?? {}, "version_behavior");
  const versionBehavior = getVersionBehavior(
    version(behavior.base, baseVersion),
  );
  keys(behavior, ["base", ...Object.keys(versionBehavior)], "version_behavior");
  for (const [key, value] of Object.entries(behavior)) {
    if (key === "base") continue;
    if (
      key === "defaultRecreateBehavior"
        ? value !== "overwrite" && value !== "takeMax"
        : typeof value !== "boolean"
    )
      throw new Error(`Invalid version_behavior.${key}`);
    Object.assign(versionBehavior, { [key]: value });
  }
  const versionMap: Record<number, Version> = {};
  const mods: ModSource[] = [];
  const overrides: OverrideData[] = [];
  for (const entry of array(preset.plugins, "plugins")) {
    const loaded =
      typeof entry === "string"
        ? await loadReference(entry, source)
        : { value: entry, source };
    const plugin = object(loaded.value, "Plugin");
    keys(
      plugin,
      [
        "$schema_version",
        "name",
        "version_maps",
        "mods",
        "static_data_overrides",
      ],
      "Plugin",
    );
    if (
      (typeof entry === "string" || plugin.$schema_version !== undefined) &&
      plugin.$schema_version !== 1
    )
      throw new Error("Plugin requires $schema_version: 1");
    if (plugin.name !== undefined && typeof plugin.name !== "string")
      throw new Error("Plugin name must be a string");
    for (const entry of array(plugin.version_maps, "version_maps")) {
      const value =
        typeof entry === "string"
          ? (await loadReference(entry, loaded.source)).value
          : entry;
      for (const [id, rawVersion] of Object.entries(
        object(value, "version map"),
      )) {
        if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
          throw new Error(`Invalid definition ID: ${id}`);
        if (rawVersion === undefined)
          throw new Error(`Missing version for ${id}`);
        const selected = version(rawVersion);
        if (versionMap[Number(id)] && versionMap[Number(id)] !== selected)
          throw new Error(`Conflicting versions for ${id}`);
        versionMap[Number(id)] = selected;
      }
    }
    for (const entry of array(plugin.mods, "mods")) {
      const value =
        typeof entry === "string"
          ? (await loadReference(entry, loaded.source, true)).value
          : entry;
      const mod = object(value, "Mod");
      keys(mod, ["fileUri", "content"], "Mod");
      if (
        typeof mod.content !== "string" ||
        (mod.fileUri !== undefined && typeof mod.fileUri !== "string")
      )
        throw new Error("Invalid Mod source");
      mods.push({
        content: mod.content,
        fileUri:
          (mod.fileUri as string) ??
          `profile://${preset.id}/mod-${mods.length}.gts`,
      });
    }
    for (const entry of array(
      plugin.static_data_overrides,
      "static_data_overrides",
    )) {
      const value =
        typeof entry === "string"
          ? (await loadReference(entry, loaded.source)).value
          : entry;
      for (const item of Array.isArray(value) ? value : [value]) {
        const override = object(item, "OverrideData");
        // Static keyword IDs are negative.
        if (!Number.isSafeInteger(override.id))
          throw new Error("OverrideData requires an integer id");
        // Reject executable / non-JSON data from dynamic presets.
        JSON.stringify(override, (_key, value) => {
          if (
            typeof value === "function" ||
            typeof value === "symbol" ||
            value === undefined ||
            (typeof value === "number" && !Number.isFinite(value))
          )
            throw new Error("OverrideData must be JSON serializable");
          return value;
        });
        overrides.push(override as OverrideData);
      }
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
      name: (preset.name as string) ?? preset.id,
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

export async function loadPreset(reference: string, parent: URL) {
  try {
    const { value, source } = await loadReference(reference, parent);
    return await compilePreset(value, source);
  } catch (cause) {
    throw new Error(`Cannot compile Preset ${reference}`, { cause });
  }
}
