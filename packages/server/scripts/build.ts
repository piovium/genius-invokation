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

import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { build, type Plugin } from "rolldown";
import { replacePlugin } from "rolldown/plugins";

const frontendDir = path.join(import.meta.dirname, "../../web-client/dist");

const virtualFrontendId = "\0inline-frontend";

const inlineFrontendPlugin: Plugin = {
  name: "inline-frontend",
  resolveId(source) {
    if (source === "@gi-tcg/web-client") {
      return virtualFrontendId;
    }
    return null;
  },
  async load(id) {
    if (id !== virtualFrontendId) return null;
    const contents: Record<string, string> = {};
    for await (const dirent of glob(`${frontendDir}/**/*`, {
      cwd: frontendDir,
      withFileTypes: true,
    })) {
      if (dirent.isFile()) {
        const filepath = path.resolve(dirent.parentPath, dirent.name);
        const relativePath = path.relative(frontendDir, filepath).replaceAll(path.sep, "/");
        contents[relativePath] = (await readFile(filepath)).toString("base64");
      }
    }
    return {
      code: JSON.stringify(contents),
      moduleType: "json",
    };
  },
};

await build({
  input: `${import.meta.dirname}/../src/main.ts`,
  output: {
    dir: `${import.meta.dirname}/../dist`,
    format: "esm",
    sourcemap: true,
    assetFileNames: "[name].[ext]",
  },
  external: [
    "@nestjs/platform-express",
    /^@nestjs\/microservices/,
    /^@nestjs\/websockets/,
    "@fastify/view",
    "@fastify/static",
  ],
  plugins: [
    inlineFrontendPlugin,
    replacePlugin({
      "process.env.NODE_ENV": '"production"',
    }),
  ],
  platform: "node",
  resolve: {
    conditionNames: ["es2015", "module"],
  },
});
