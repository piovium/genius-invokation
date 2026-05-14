#!/usr/bin/env node
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

import { spawn } from "node:child_process";

const args = [
  // https://github.com/privatenumber/tsx/issues/791
  "--disable-warning=DEP0205",
  // `--conditions=${process.env.NODE_ENV ?? "development"}`,
  // To prevent unnecessary transpilation, only enable cross-package TypeScript transpiling 
  // (via `development` conditions) when `NODE_ENV` is explicit set to `development`.
  ...(process.env.NODE_ENV ? [`--conditions=${process.env.NODE_ENV}`] : []),
  "--import",
  import.meta.resolve("@gi-tcg/config/preload"),
  ...process.argv.slice(2),
];

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
