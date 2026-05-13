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
import { mkdir, copyFile, rm, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { $ } from "execa";

const BASE_DIR = path.resolve(`${import.meta.dirname}/..`);

const FILES = ["dist/extension.js", "README.md", "CHANGELOG.md"];

const PUBLISH_DIR = path.resolve(BASE_DIR, "temp");

async function prepare() {
  await rm(PUBLISH_DIR, { recursive: true, force: true });
  for (const file of FILES) {
    const source = path.resolve(BASE_DIR, file);
    const target = path.resolve(PUBLISH_DIR, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  const { default: packageJson } = await import(
    path.resolve(BASE_DIR, "package.json"),
    {
      with: { type: "json" },
    }
  );
  delete packageJson.scripts;
  delete packageJson.dependencies;
  delete packageJson.devDependencies;
  packageJson.name = packageJson.name.replace("@", "").replace("/", "-");
  await writeFile(
    path.resolve(PUBLISH_DIR, "package.json"),
    JSON.stringify(packageJson, null, 2),
  );
}

async function createPackage() {
  await prepare();
  await $({ cwd: PUBLISH_DIR })`pnpx '@vscode/vsce' package --no-dependencies`;
}
async function publish() {
  await prepare();
  await $({ cwd: PUBLISH_DIR })`pnpx '@vscode/vsce' publish --no-dependencies`;
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    publish: { type: "boolean" },
  },
});

if (values.publish) {
  await publish();
} else {
  await createPackage();
}
