// Copyright (C) 2026 Piovium Labs
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

import type { Module } from "node:vm";
import {
  moduleFor,
  type ModuleEvaluator,
} from "./share";

export interface NodeVmModuleEvaluatorOptions {}

/** Evaluates ESM with Node's module-aware vm API. */
export class NodeVmModuleEvaluator implements ModuleEvaluator {
  constructor(_options: NodeVmModuleEvaluatorOptions = {}) {}

  async evaluate(code: string): Promise<void> {
    // Keep the Node-only import out of browser bundles. This branch cannot be
    // reached there because the browser default selects esbuild-wasm.
    const vm = await import(/* @vite-ignore */ "node:vm");
    if (
      typeof vm.SourceTextModule !== "function" ||
      typeof vm.SyntheticModule !== "function"
    ) {
      throw new Error(
        "The node-vm evaluator requires Node.js to be started with --experimental-vm-modules",
      );
    }

    const context = vm.createContext();
    const depModulesCache = new Map<string, Module>();
    const module = new vm.SourceTextModule(code, { context });

    await module.link((specifier) => {
      if (depModulesCache.has(specifier)) {
        return depModulesCache.get(specifier)!;
      }
      const moduleExport = moduleFor(specifier) as Record<string, unknown>;
      const moduleExportNames = Object.keys(moduleExport);
      const module_ = new vm.SyntheticModule(
        moduleExportNames,
        function () {
          for (const name of moduleExportNames) {
            this.setExport(name, moduleExport[name]);
          }
        },
        { context },
      );
      depModulesCache.set(specifier, module_);
      return module_;
    });
    await module.evaluate();
  }
}
