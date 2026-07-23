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

import * as gtsRuntime from "./gts/runtime";
import customDataViewModel from "./gts/vm";

export const GTS_RUNTIME_MODULE = "@gi-tcg/custom-data-loader/gts/runtime";
export const GTS_PROVIDER_VM_MODULE = "@gi-tcg/custom-data-loader/gts/vm/vm";

export const DEFAULT_ESBUILD_WASM_URL =
  "https://cdn.jsdelivr.net/npm/esbuild-wasm@latest/esbuild.wasm";

export type ModuleEvaluatorBackend = "node-vm" | "esbuild-wasm";

export interface NodeVmModuleEvaluatorOptions {}

export interface EsbuildWasmModuleEvaluatorOptions {
  /** The URL from which esbuild loads its WebAssembly binary. */
  wasmURL?: string;
}

export interface ModuleEvaluator {
  evaluate(code: string): Promise<void>;
}

function unsupportedModule(specifier: string): never {
  throw new Error(
    `Custom GTS modules may only import ${GTS_RUNTIME_MODULE} and ${GTS_PROVIDER_VM_MODULE}; received ${JSON.stringify(specifier)}`,
  );
}

function moduleFor(specifier: string): object {
  switch (specifier) {
    case GTS_RUNTIME_MODULE:
      return gtsRuntime;
    case GTS_PROVIDER_VM_MODULE:
      return customDataViewModel;
    default:
      return unsupportedModule(specifier);
  }
}

/** Evaluates ESM with Node's module-aware vm API. */
export class NodeVmModuleEvaluator implements ModuleEvaluator {
  constructor(_options: NodeVmModuleEvaluatorOptions = {}) {}

  async evaluate(code: string): Promise<void> {
    // Keep the Node-only import out of browser bundles. This branch cannot be
    // reached there because the browser default selects esbuild-wasm.
    const vm: typeof import("node:vm") = await import(
      /* @vite-ignore */ "node:vm"
    );
    if (
      typeof vm.SourceTextModule !== "function" ||
      typeof vm.SyntheticModule !== "function"
    ) {
      throw new Error(
        "The node-vm evaluator requires Node.js to be started with --experimental-vm-modules",
      );
    }

    const context = vm.createContext();
    const runtimeExports = Object.keys(gtsRuntime);
    const runtimeModule = new vm.SyntheticModule(
      runtimeExports,
      function () {
        for (const name of runtimeExports) {
          this.setExport(name, gtsRuntime[name as keyof typeof gtsRuntime]);
        }
      },
      { context },
    );
    const providerModule = new vm.SyntheticModule(
      ["default"],
      function () {
        this.setExport("default", customDataViewModel);
      },
      { context },
    );
    const module = new vm.SourceTextModule(code, { context });

    await module.link((specifier) => {
      switch (specifier) {
        case GTS_RUNTIME_MODULE:
          return runtimeModule;
        case GTS_PROVIDER_VM_MODULE:
          return providerModule;
        default:
          // Keep module resolution deliberately closed: custom data has no
          // access to Node's module graph.
          return unsupportedModule(specifier);
      }
    });
    await module.evaluate();
  }
}

let esbuildWasm: Promise<typeof import("esbuild-wasm")> | undefined;
let esbuildWasmURL: string | undefined;

async function getEsbuildWasm(wasmURL: string) {
  if (esbuildWasm === undefined) {
    esbuildWasmURL = wasmURL;
    esbuildWasm = import("esbuild-wasm")
      .then(async (esbuild) => {
        await esbuild.initialize({ wasmURL });
        return esbuild;
      })
      .catch((error) => {
        esbuildWasm = undefined;
        esbuildWasmURL = undefined;
        throw error;
      });
  } else if (esbuildWasmURL !== wasmURL) {
    throw new Error(
      `esbuild-wasm is already initialized with ${JSON.stringify(esbuildWasmURL)}, so it cannot use ${JSON.stringify(wasmURL)}`,
    );
  }
  return esbuildWasm;
}

/** Transpiles ESM to CJS with esbuild-wasm, then supplies its only imports. */
export class EsbuildWasmModuleEvaluator implements ModuleEvaluator {
  private readonly wasmURL: string;

  constructor(options: EsbuildWasmModuleEvaluatorOptions = {}) {
    this.wasmURL = options.wasmURL ?? DEFAULT_ESBUILD_WASM_URL;
  }

  async evaluate(code: string): Promise<void> {
    const esbuild = await getEsbuildWasm(this.wasmURL);
    const { code: cjs } = await esbuild.transform(code, {
      format: "cjs",
      target: "es2022",
    });
    const module = { exports: {} };
    new Function("require", "module", "exports", cjs)(
      moduleFor,
      module,
      module.exports,
    );
  }
}

export function defaultModuleEvaluatorBackend(): ModuleEvaluatorBackend {
  return typeof process !== "undefined" && process.versions?.node !== undefined
    ? "node-vm"
    : "esbuild-wasm";
}
