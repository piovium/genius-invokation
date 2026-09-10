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

import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "rolldown";
import { replacePlugin } from "rolldown/plugins";
import gts from "@gi-tcg/unplugin-gts/rolldown";
import { generateDeckMetadata } from "./deck-metadata";
const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist");
// Validate and capture the local assets snapshot before replacing build output.
const { outputDirectory: metadataDirectory } = await generateDeckMetadata();
// Only this package's generated distribution is replaced.
if (path.dirname(output) !== root || path.basename(output) !== "dist")
  throw new Error("Unexpected build output path");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({
  input: {
    main: path.join(root, "src/main.ts"),
    migrate: path.join(root, "src/db/migrate.ts"),
  },
  output: {
    dir: output,
    format: "esm",
    minify: true,
    sourcemap: true,
    assetFileNames: "[name].[ext]",
  },
  external: ["pg-native", "bufferutil", "utf-8-validate"],
  plugins: [
    replacePlugin({ "process.env.NODE_ENV": '"production"' }),
    !!process.env.FROM_SOURCE && gts(),
  ],
  platform: "node",
  resolve: {
    conditionNames: process.env.FROM_SOURCE
      ? ["node", "development", "es2015", "module"]
      : ["node", "production", "es2015", "module"],
  },
});
// Preserve actual browser assets and migration SQL as files. The
// server never imports a base64 object containing the complete frontend.
await cp(
  path.resolve(root, "../web-client/dist"),
  path.join(output, "frontend"),
  { recursive: true },
);
await cp(path.join(root, "migrations"), path.join(output, "migrations"), {
  recursive: true,
});
await cp(
  path.join(metadataDirectory, "deck-metadata-manifest.json"),
  path.join(output, "deck-metadata-manifest.json"),
);
