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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import path from "node:path";
import { $ } from "execa";

/** Flags this script accepts, mapped to the workspace template each one selects. */
const TEMPLATES = new Map([["--typescript", "buf.typescript.gen.yaml"]]);
const templateArgs = process.argv.slice(2).flatMap((flag) => {
  const template = TEMPLATES.get(flag);
  if (template === undefined)
    throw new Error(`Unknown protocol generation option: ${flag}`);
  return ["--template", template];
});

await $({
  cwd: path.resolve(import.meta.dirname, "../../.."),
})`buf generate ${templateArgs}`;
