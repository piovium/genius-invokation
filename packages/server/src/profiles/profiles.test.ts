import { afterEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import {
  compilePreset,
  loadPreset,
  loadPresets,
  officialProfile,
} from "./compiler";
import { configBase, loadReference, resolveReference } from "./reference";
import { ProfilesService } from "./profiles.service";

const source = new URL("file:///presets/test/preset.json");
const preset = { $schema_version: 1, id: "test/rules" };
const dirs: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true });
});

describe("Profile compiler", () => {
  test("resolves defaults and latest, hashes only serializable fixed configuration", async () => {
    const first = await compilePreset(preset, source);
    const second = await compilePreset(preset, source);
    expect(first.summary.profileHash).toBe(second.summary.profileHash);
    expect(first.profile.baseVersion).toBe(CURRENT_VERSION);
    expect(first.profile.gameConfig).not.toHaveProperty("randomSeed");
    expect(first.profile.gameConfig).not.toHaveProperty("hostWho");
    expect(JSON.parse(JSON.stringify(first.profile))).toEqual(first.profile);
    expect(Object.isFrozen(first.profile.assets)).toBe(true);
    const changed = await compilePreset(
      { ...preset, config: { maxHandsCount: 20 } },
      source,
    );
    expect(changed.summary.profileHash).not.toBe(first.summary.profileHash);
    expect(changed.profile.gameConfig.maxHandsCount).toBe(20);
  });

  test("propagates version dependencies and merges overrides fieldwise in order", async () => {
    const { profile } = await compilePreset(
      {
        ...preset,
        version_behavior: {
          base: "v3.3.0",
          discardMaxCostHandsAbortPreview: true,
        },
        plugins: [
          {
            version_maps: [{ 1101: "v3.3.0" }],
            static_data_overrides: [
              { id: 1101, name: "first", tags: ["cryo"] },
            ],
          },
          {
            static_data_overrides: [
              [{ id: 1101, name: "last", tags: ["bow"], hp: 12 }],
            ],
          },
        ],
      },
      source,
    );
    expect(profile.assets.version).toMatchObject({
      $base: CURRENT_VERSION,
      1101: "v3.3.0",
      11011: "v3.3.0",
    });
    expect(profile.assets.version).not.toHaveProperty("$category");
    expect(profile.assets.overrideData).toEqual([
      { id: 1101, name: "last", tags: ["bow"], hp: 12 },
    ]);
    expect(profile.versionBehavior.defaultRecreateBehavior).toBe("overwrite");
    expect(profile.versionBehavior.discardMaxCostHandsAbortPreview).toBe(true);
  });

  test.each([
    { $schema_version: 2 },
    { id: "bad" },
    { version: "v0.0.0" },
    { config: { randomSeed: 1 } },
    { config: { maxHandsCount: -1 } },
    { version_behavior: { foodOmitInjuredOnly: "false" } },
    { plugins: [{ version_maps: [{ $base: "latest" }] }] },
    { plugins: [{ version_maps: [{ 1101: "v3.3.0" }, { 1101: "latest" }] }] },
    { plugins: [{ mods: [{ content: 1 }] }] },
    { plugins: [{ static_data_overrides: [{ name: "no id" }] }] },
  ])("rejects malformed / conflicting configuration: %j", async (change) => {
    await expect(
      compilePreset({ ...preset, ...change }, source),
    ).rejects.toThrow();
  });

  test("rejects new deck cards and duplicate custom definitions, allows auxiliary entities", async () => {
    await expect(
      compilePreset(
        {
          ...preset,
          plugins: [
            { mods: [{ content: 'define card { name "New" as New; }' }] },
          ],
        },
        source,
      ),
    ).rejects.toThrow("officialDeckCompatible");
    const mod = { content: "define status { id 100 as Test; usage 1; }" };
    await expect(
      compilePreset({ ...preset, plugins: [{ mods: [mod, mod] }] }, source),
    ).rejects.toThrow("Multiple custom data");
    const result = await compilePreset(
      {
        ...preset,
        plugins: [
          {
            mods: [
              { content: 'define status { name "Aux" as Aux; usage 1; }' },
            ],
          },
        ],
      },
      source,
    );
    expect(result!.profile.officialDeckCompatible).toBe(true);
  });

  test("all official versions and default alias compile", async () => {
    const service = new ProfilesService();
    await service.onModuleInit();
    expect(service.list().profiles.length).toBeGreaterThanOrEqual(
      VERSIONS.length + 1,
    );
    expect(service.get().profile.id).toBe(`official/${CURRENT_VERSION}`);
    expect(service.get().profile.baseVersion).toBe(CURRENT_VERSION);
    expect(() => service.get("missing/id")).toThrow();
    expect(officialProfile("v3.3.0").profile.assets.version).toBe("v3.3.0");
  });

  test("bundled Lianyu rules compile with official deck compatibility", async () => {
    const result = await loadPreset(
      new URL("../../presets/lianyu-s1/", import.meta.url),
    );
    expect(result!.profile.id).toBe("piovium/lianyu-s1");
    expect(result!.profile.mods.length).toBe(1);
    expect(
      result!.profile.versionBehavior.discardMaxCostHandsAbortPreview,
    ).toBe(false);
    expect(
      result!.data.characters.get(1101)?.varConfigs.maxHealth.initialValue,
    ).toBe(12);
  });

  test("bundled Moyu rules preserve the final tournament version table and patches", async () => {
    const { data, profile } = (await loadPreset(
      new URL("../../presets/moyu-s7/", import.meta.url),
    ))!;
    expect(profile.baseVersion).toBe("v5.8.0");
    expect(data.characters.get(1101)?.varConfigs.maxHealth.initialValue).toBe(
      12,
    );
    expect(data.characters.get(1101)?.varConfigs.maxEnergy.initialValue).toBe(
      2,
    );
    const emblem = data.entities.get(312008)!;
    expect(
      emblem.skills
        .find((s) => s.skillType === "playCard")
        ?.initiativeSkillConfig?.requiredCost.get(8),
    ).toBe(2);
    expect(profile.assets.overrideData.find((o) => o.id === 1101)?.hp).toBe(12);
    expect(profile.officialDeckCompatible).toBe(true);
  });
});

describe("Preset references", () => {
  test("nested references use their declaring directory and modules respect exports", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gi-profile-"));
    dirs.push(dir);
    await mkdir(join(dir, "plugins"));
    await mkdir(join(dir, "node_modules", "rules"), { recursive: true });
    await writeFile(
      join(dir, "preset.yaml"),
      "$schema_version: 1\nid: test/local\nplugins:\n  - ./plugins/plugin.yaml\n  - rules",
    );
    await writeFile(
      join(dir, "plugins", "plugin.yaml"),
      "$schema_version: 1\nversion_maps:\n  - ./versions.jsonc",
    );
    await writeFile(
      join(dir, "plugins", "versions.jsonc"),
      '{ /* comment */ "1101": "v3.3.0", }',
    );
    await writeFile(
      join(dir, "node_modules", "rules", "package.json"),
      JSON.stringify({
        exports: { import: "./plugin.json", require: "./wrong.json" },
      }),
    );
    await writeFile(
      join(dir, "node_modules", "rules", "plugin.json"),
      '{"$schema_version":1}',
    );
    const compiled = await loadPreset(dir);
    expect(compiled!.profile.versionMap).toEqual({ 1101: "v3.3.0" });
    await rm(join(dir, "preset.yaml"));
    await writeFile(
      join(dir, "preset.ts"),
      'export default async () => ({ $schema_version: 1, id: "test/dynamic" });',
    );
    expect((await loadPreset(pathToFileURL(dir)))!.profile.id).toBe(
      "test/dynamic",
    );
    await writeFile(join(dir, "plugin.toml"), '"$schema_version" = 1');
    expect(
      (await loadReference("./plugin.toml", configBase(dir))).value,
    ).toEqual({ $schema_version: 1 });
  });

  test("discovers directories, supports recursion and stops on invalid presets", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gi-profile-"));
    dirs.push(dir);
    await mkdir(join(dir, "empty"));
    await mkdir(join(dir, "rules", "nested"), { recursive: true });
    expect(await loadPreset(join(dir, "empty"))).toBeNull();
    expect(await loadPreset(join(dir, "missing"))).toBeNull();
    await writeFile(join(dir, "rules", "preset.json"), JSON.stringify(preset));
    await writeFile(
      join(dir, "rules", "nested", "preset.yml"),
      "$schema_version: 1\nid: test/nested",
    );
    expect((await loadPresets(dir)).map(({ profile }) => profile.id)).toEqual([
      "test/rules",
    ]);
    expect(
      (await loadPresets(pathToFileURL(dir), { recursive: true }))
        .map(({ profile }) => profile.id)
        .sort(),
    ).toEqual(["test/nested", "test/rules"]);
    await writeFile(join(dir, "rules", "preset.json"), "{}");
    // A malformed first candidate must not fall back to another format.
    await writeFile(join(dir, "rules", "preset.yaml"), JSON.stringify(preset));
    await expect(loadPresets(dir)).rejects.toThrow("Cannot compile Preset");
    await expect(loadPresets(join(dir, "missing"))).rejects.toThrow();
  });

  test("remote relatives stay remote and local dependencies are rejected", async () => {
    const parent = new URL("https://example.test/config/preset.yaml");
    expect(resolveReference("./plugin.json", parent).href).toBe(
      "https://example.test/config/plugin.json",
    );
    for (const ref of [
      "file:///local.json",
      "@local/plugin",
      "C:\\local.json",
      "node:fs",
    ]) {
      expect(() => resolveReference(ref, parent)).toThrow();
    }
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      url: parent.href,
      text: async () => "$schema_version: 1\nid: test/remote",
    });
    vi.stubGlobal("fetch", fetch);
    const loaded = await loadReference(parent.href, source);
    expect((await compilePreset(loaded.value, loaded.source)).profile.id).toBe(
      "test/remote",
    );
    await expect(
      loadReference("https://example.test/config.ts", source),
    ).rejects.toThrow("executable");
    expect(
      resolveReference(
        pathToFileURL(join(tmpdir(), "space name.yaml")).href,
        source,
      ).protocol,
    ).toBe("file:");
  });
});
