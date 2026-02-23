// Copyright (C) 2024-2025 Guyutongxue
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
import { IS_BETA, BETA_VERSION } from "@gi-tcg/config";
import { existsSync } from "node:fs";
import { VERSIONS } from "@gi-tcg/core";
import { version } from "../../package.json" with { type: "json" };

export const OLD_VERSION = VERSIONS.at(-2)!;
export const NEW_VERSION: string = IS_BETA ? BETA_VERSION : VERSIONS.at(-1)!;
export const SAVE_OLD_CODES = !IS_BETA;

if (SAVE_OLD_CODES && existsSync(path.resolve(import.meta.dirname, `../../src/old_versions/${OLD_VERSION}`))) {
  throw new Error("Old version already exists; you may forgot to update (OLD|NEW)_VERSION at scripts/generators/config.ts .");
}

const giIndex = version.indexOf("gi-");
const packageJsonVersion = "v" + version.substring(giIndex + 3).replace(/-/g, ".");

if (!IS_BETA && packageJsonVersion !== NEW_VERSION) {
  throw new Error(
    `New version in @gi-tcg/data's package.json (${packageJsonVersion}) does not match the latest version defined in @gi-tcg/core (${NEW_VERSION}).`,
  );
}

export const BASE_PATH = path.resolve(
  import.meta.dirname,
  "../../src",
).replace(/\\/g, "/");

export const LICENSE = `// Copyright (C) 2026 Piovium Labs
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

`;
