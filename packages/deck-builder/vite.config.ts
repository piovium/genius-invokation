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

import { resolve } from "node:path";
import { defaultClientConditions, defineConfig } from "vite";
import unoCss from "unocss/vite";
import solid from "vite-plugin-solid";
import nodeExternals from "rollup-plugin-node-externals";
import dts from "unplugin-dts/vite";

export default defineConfig({
  resolve: {
    conditions: ["bun", ...defaultClientConditions],
  },
  plugins: [
    {
      ...nodeExternals(),
      enforce: "pre",
    },
    unoCss(),
    solid(),
    !process.env.NO_TYPING && dts({ bundleTypes: true }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "style",
    },
  },
});
