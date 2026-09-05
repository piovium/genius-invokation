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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob, readFile, writeFile } from "node:fs/promises";
import type { AnalyzeResult } from "../src/types";
import { TcgDataProject } from "./project";
import { TcgDataSourceFile } from "./source_file";

export const base = fileURLToPath(new URL("../../data", import.meta.url));

const project = new TcgDataProject();
const filepaths: string[] = [];
for await (const filepath of glob(`${base}/src/**/*.gts`)) {
  filepaths.push(filepath);
}

for (const filepath of filepaths.sort()) {
  const source = await readFile(filepath, "utf8");
  project.addFile(new TcgDataSourceFile(base, filepath, source));
}

const result: AnalyzeResult[] = [];
for (const file of project.files.values()) {
  for (const definition of file.definitions) {
    result.push({
      id: definition.id,
      dependencies: [...project.getDependencies(file, definition)].sort(
        (a, b) => a - b,
      ),
      bindingNames: definition.bindingNames,
      code: definition.code,
      location: definition.location,
    });
  }
}

await writeFile(
  path.join(import.meta.dirname, "../src/result.json"),
  JSON.stringify(result, null, 2),
);
