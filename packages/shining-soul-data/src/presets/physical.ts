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
