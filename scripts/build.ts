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
 * This file run all build scripts for building standalone target.
 */

import { $, Glob } from "bun";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { PackageJson } from "type-fest";
import { DepGraph } from "dependency-graph";

const {
  values: { noTyping = false },
  positionals: targets,
} = parseArgs({
  args: process.argv.slice(2),
  options: {
    noTyping: {
      type: "boolean",
      short: "n",
    },
  },
  allowPositionals: true,
});

if (targets.length === 0) {
  targets.push("ALL");
}

interface Package {
  name: string;
  cwd: string;
  targetName: string; // no @gi-tcg/ prefix
  buildCommand?: string;
  buildNoTypingCommand?: string;
}

const depGraph = new DepGraph<Package>();

const depGraphEdges: [string, string][] = [];

for await (const pkgPath of new Glob("packages/*").scan({ onlyFiles: false })) {
  const packageJsonPath = path.join(pkgPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    continue;
  }
  const packageJson = await Bun.file(packageJsonPath).json();
  const {
    name,
    scripts,
    dependencies,
    peerDependencies,
    devDependencies,
  }: PackageJson = packageJson;
  if (!name?.startsWith("@gi-tcg/")) {
    continue;
  }
  const targetName = name.slice("@gi-tcg/".length);
  let buildCommand: string | undefined = void 0;
  let buildNoTypingCommand: string | undefined = void 0;
  if (scripts?.build) {
    buildCommand = buildNoTypingCommand = `bun run build`;
  }
  if (scripts?.["build:noTyping"]) {
    buildNoTypingCommand = `bun run build:noTyping`;
  }
  const deps = { ...dependencies, ...peerDependencies, ...devDependencies };
  for (const [depName, depVersion] of Object.entries(deps)) {
    if (depVersion?.startsWith("workspace:*")) {
      depGraphEdges.push([name, depName]);
    }
  }
  depGraph.addNode(name, {
    cwd: pkgPath,
    name,
    targetName,
    buildCommand,
    buildNoTypingCommand,
  });
}

for (const [from, to] of depGraphEdges) {
  depGraph.addDependency(from, to);
}

const allPackages: readonly Package[] = depGraph
  .overallOrder()
  .map((name) => depGraph.getNodeData(name));

const packagesToBuilt: Package[] = [];

if (targets.includes("ALL")) {
  packagesToBuilt.push(...allPackages);
} else {
  const needs = new Set<Package>();
  for (const target of targets) {
    const pkg = allPackages.find((p) => p.targetName === target);
    if (pkg) {
      needs.add(pkg);
      for (const dep of depGraph.dependenciesOf(pkg.name)) {
        needs.add(depGraph.getNodeData(dep));
      }
    } else {
      throw new Error(`Target ${target} not found`);
    }
  }
  for (const pkg of allPackages) {
    if (needs.has(pkg)) {
      packagesToBuilt.push(pkg);
    }
  }
}

for (const pkg of packagesToBuilt) {
  process.stdout.write(`\x1b[1mBuilding \x1b[32m${pkg.name}\u001b[0m...\n`);
  if (noTyping) {
    if (pkg.buildNoTypingCommand) {
      await $`${{ raw: pkg.buildNoTypingCommand }}`
        .env({ ...process.env, NO_TYPING: "1" })
        .cwd(pkg.cwd)
        .catch((e) => {
          console.error(`Failed to build ${pkg.name}: ${e.message}`);
          process.exit(1);
        });
    }
  } else {
    if (pkg.buildCommand) {
      await $`${{ raw: pkg.buildCommand }}`.cwd(pkg.cwd).catch((e) => {
        console.error(`Failed to build ${pkg.name}: ${e.message}`);
        process.exit(1);
      });
    }
  }
}
