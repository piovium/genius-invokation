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

import { defaultClientConditions, defineConfig } from "vite";
import solid from "vite-plugin-solid";
import babel from "@rollup/plugin-babel";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  esbuild: {
    target: "ES2020",
  },
  plugins: [
    solid(),
    babel({
      babelHelpers: "bundled",
    }),
    viteStaticCopy({
      watch: null,
      silent: true,
      targets: [
        {
          src: "../data-code-analyzer/src/result.json",
          rename: "data-code-analyze-result.json",
          dest: "."
        }
      ]
    })
  ],
});
