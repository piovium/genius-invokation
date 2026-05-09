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

// Because fetch.ts uses AssetsManager that needs data/*.json to be exists, so generate them with a placeholder first.

import path from "node:path";
import { existsSync } from "node:fs";
const neededModules = ["CHS/names","EN/names", "deck", "share_id"];

for (const mod of neededModules) {
  const filepath = path.resolve(
    import.meta.dirname,
    "../src/data",
    `${mod}.json`,
  );
  if (!existsSync(filepath)) {
    await Bun.write(filepath, "null");
  }
}
