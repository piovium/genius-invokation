// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { resolve } from "node:path";
import { defineConfig } from "vite";
import nodeExternals from "rollup-plugin-node-externals";
import solid from "vite-plugin-solid";
import dts from "unplugin-dts/vite";

export default defineConfig({
  plugins: [
    {
      ...nodeExternals(),
      enforce: "pre",
    },
    solid(),
    !process.env.NO_TYPING && dts({ bundleTypes: true }),
  ],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "style",
    },
  },
});
