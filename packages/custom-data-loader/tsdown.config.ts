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

import { defineConfig } from "tsdown";

export default defineConfig([
  {
    platform: "neutral",
    entry: {
      index: "./src/index.ts",
    },
    sourcemap: true,
    dts: !process.env.NO_TYPING,
    minify: true,
  },
  {
    platform: "neutral",
    entry: {
      "gts/vm": "./src/gts/vm.ts",
      "gts/runtime": "./src/gts/runtime.ts",
      "gts/data": "./src/gts/data.ts",
    },
    dts: false,
    minify: true,
  },
  {
    platform: "neutral",
    entry: {
      "gts/vm": "./src/gts/vm.ts",
      "gts/runtime": "./src/gts/runtime.ts",
      "gts/data": "./src/gts/data.ts",
    },
    dts: {
      emitDtsOnly: true,
    },
    outputOptions: {
      chunkFileNames: "gts/_chunks/[name]-[hash].js",
    },
    deps: {
      alwaysBundle: [
        "@gi-tcg/core",
        "@gi-tcg/core/data",
        "@gi-tcg/core/gts/runtime",
        "@gi-tcg/core/gts/vm",
        "@gi-tcg/gts-runtime",
      ],
    },
  },
]);
