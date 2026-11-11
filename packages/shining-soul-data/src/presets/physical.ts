import staticDataOverrides from "../static_data.ts";
import { readFile } from "node:fs/promises";
import versionMap, { cardVersions } from "../version_map.ts";

const modsPath = [
  "../mods/physical_level1.gts",
  "../mods/physical_level2.gts",
  "../mods/physical_level3.gts",
  "../mods/physical_level4.gts",
];

export default async function physicalPreset() {
  return {
    $schema_version: 1 as const,
    id: "shining-soul/physical",
    name: "闪魂·实体牌",
    version: "v7.2.0" as const,
    deck: { whitelist: Object.keys(cardVersions).map(Number) },
    plugins: [
      {
        name: "shining-soul",
        version_maps: [versionMap],
        mods: await Promise.all(
          modsPath.map(async (path) => ({
            content: await readFile(new URL(path, import.meta.url), "utf-8"),
          })),
        ),
        static_data_overrides: staticDataOverrides,
      },
    ],
  };
}
