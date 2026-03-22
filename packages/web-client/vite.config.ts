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

import { defineConfig } from "vite";
import unoCss from "unocss/vite";
import solid from "vite-plugin-solid";
import babel from "@rollup/plugin-babel";
import { WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";
import { readdirSync } from "node:fs";

const AVATARS_BASE_PATH = "public/avatars";
const AVATARS = [...readdirSync(AVATARS_BASE_PATH)];

export default defineConfig({
  esbuild: {
    target: "ES2020",
  },
  base: WEB_CLIENT_BASE_PATH,
  plugins: [
    unoCss(),
    solid(),
    babel({
      babelHelpers: "bundled",
    }),
  ],
  define: {
    AVATARS: JSON.stringify(AVATARS),
  },
});
