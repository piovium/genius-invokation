#!/usr/bin/env bun
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

/**
 * This file tries to publish all publish-able packages.
 */

import { $ } from "bun";
import { existsSync } from "node:fs";
import { PackageJson } from "type-fest";
import { IS_BETA } from "@gi-tcg/config";
import rootPackageJson from "../package.json";

if (IS_BETA) {
  throw new Error(`You should not publish packages when IS_BETA is true.`);
}

const packages = [
  "typings",
  "utils",
  "core",
  "data",
  "assets-manager",
  "card-data-viewer",
  "web-ui-core",
  "web-ui",
];
const VERSION = "0.19.1";

const doPublish = !!process.env.PUBLISH;
if (!doPublish) {
  console.warn(`This will be a dry-run. set PUBLISH env variable for publish.`);
}

interface PackageInfo {
  directory: string;
  packageJson: PackageJson;
}

const packageInfos: PackageInfo[] = [];

function transferWorkspaceDeps(deps: Partial<Record<string, string>> = {}) {
  for (const [key, value] of Object.entries(deps)) {
    if (value?.startsWith("workspace:")) {
      const foundDep = packageInfos.find(
        (info) => info.packageJson.name === key,
      );
      if (!foundDep) {
        throw new Error(`Workspace dependency not found: ${key}`);
      }
      deps[key] = foundDep.packageJson.version;
    } else if (value === "catalog:") {
      deps[key] = (rootPackageJson.catalog as Record<string, string>)[key];
    }
  }
}

function removeBunFromExport(
  exports: PackageJson["exports"],
): PackageJson["exports"] {
  if (!exports) {
    return exports;
  }
  if (typeof exports === "string") {
    return exports;
  }
  if (Array.isArray(exports)) {
    return exports.flatMap(removeBunFromExport) as PackageJson["exports"];
  }
  const cond: typeof exports = {};
  for (const key in exports) {
    if (key === "bun" || key.includes("internal")) {
      continue;
    }
    cond[key] = removeBunFromExport(exports[key])!;
  }
  return cond;
}

for (const pkg of packages) {
  console.log(`Building and verifying package: ${pkg}`);
  const directory = `packages/${pkg}`;
  if (!existsSync(directory)) {
    throw new Error(`Package directory not found: ${directory}`);
  }
  const packageJson: PackageJson = await Bun.file(
    `${directory}/package.json`,
  ).json();
  if ("build" in (packageJson.scripts ?? {})) {
    await $`bun run build`.cwd(directory).quiet();
  }
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  transferWorkspaceDeps(packageJson.dependencies);
  transferWorkspaceDeps(packageJson.peerDependencies);
  if (packageJson.devDependencies) {
    delete packageJson.devDependencies;
  }
  packageJson.exports = removeBunFromExport(packageJson.exports);
  packageJson.author = "Piovium Labs";
  packageJson.repository = {
    type: "git",
    url: "git+https://github.com/piovium/genius-invokation.git",
  };
  packageJson.license = "AGPL-3.0-or-later";
  packageInfos.push({ directory, packageJson });
  if (!existsSync(`${directory}/dist`)) {
    throw new Error(`Package dist directory not found: ${directory}`);
  }
  if (!existsSync(`${directory}/README.md`)) {
    throw new Error(`Package README.md not found: ${directory}`);
  }
}

const publishDir = "temp";
const licensePath = "LICENSE";

for (const { packageJson, directory } of packageInfos) {
  const { name, version } = packageJson;
  console.log(`Publishing package: ${name}`);
  if (!version?.startsWith(VERSION)) {
    throw new Error(`Version not starts with ${VERSION}: ${name}`);
  }
  await $`rm -rf ${publishDir}`.quiet();
  await $`mkdir -p ${publishDir}`.quiet();
  await $`cp -r ${directory}/dist ${publishDir}/`.quiet();
  // await $`cp -r ${directory}/src ${publishDir}/`.quiet();
  // await $`cp ${directory}/tsconfig.json ${publishDir}/`.quiet();
  await $`echo ${JSON.stringify(
    packageJson,
    void 0,
    2,
  )} > ${publishDir}/package.json`.quiet();
  await $`cp ${directory}/README.md ${publishDir}/`.quiet();
  await $`cp ${licensePath} ${publishDir}/`.quiet();
  // Bro attw is so strict
  await $`bunx --bun attw --pack ${publishDir}`.nothrow();
  if (doPublish) {
    await $`bunx npm@latest publish --provenance --access public`.cwd(publishDir);
  }
}
