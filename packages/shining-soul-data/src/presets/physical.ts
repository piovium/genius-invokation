import staticDataOverrides from "../static_data";
import { readFile } from "node:fs/promises";
import {
  cardVersions,
  dependencyVersions,
} from "../version_maps/physical_version";

export default async function physicalPreset() {
  return {
    $schema_version: 1 as const,
    id: "shining-soul/physical",
    name: "实体牌",
    version: "v7.2.0" as const,
    deck: { whitelist: Object.keys(cardVersions).map(Number) },
    plugins: [
      {
        name: "shining-soul",
        version_maps: [{ ...cardVersions, ...dependencyVersions }],
        mods: [
          {
            fileUri:
              "inmem+profile://shining-soul/physical_version/physical.gts",
            content: await readFile(
              new URL("../../mods/physical.gts", import.meta.url),
              "utf8",
            ),
          },
        ],
        static_data_overrides: staticDataOverrides,
      },
    ],
  };
}
