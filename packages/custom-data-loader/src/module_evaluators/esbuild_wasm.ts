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

import { type ModuleEvaluator, moduleFor } from "./share";

export interface EsbuildWasmModuleEvaluatorOptions {
  /** The URL from which esbuild loads its WebAssembly binary. */
  wasmURL?: string;
}

let esbuildWasm: Promise<typeof import("esbuild-wasm")> | undefined;
let esbuildWasmURL: string | undefined;

function esbuildWasmUrl(version: string): string {
  return `https://cdn.jsdelivr.net/npm/esbuild-wasm@${version}/esbuild.wasm`;
}

async function getEsbuildWasm(wasmURL?: string) {
  const host = await import("esbuild-wasm");
  const resolvedWasmURL = wasmURL ?? esbuildWasmUrl(host.version);
  if (esbuildWasm === undefined) {
    esbuildWasmURL = resolvedWasmURL;
    esbuildWasm = Promise.resolve(host)
      .then(async (esbuild) => {
        await esbuild.initialize({ wasmURL: resolvedWasmURL });
        return esbuild;
      })
      .catch((error) => {
        esbuildWasm = undefined;
        esbuildWasmURL = undefined;
        throw error;
      });
  } else if (esbuildWasmURL !== resolvedWasmURL) {
    throw new Error(
      `esbuild-wasm is already initialized with ${JSON.stringify(esbuildWasmURL)}, so it cannot use ${JSON.stringify(resolvedWasmURL)}`,
    );
  }
  return esbuildWasm;
}

/** Transpiles ESM to CJS with esbuild-wasm, then supplies its only imports. */
export class EsbuildWasmModuleEvaluator implements ModuleEvaluator {
  private readonly wasmURL?: string;

  constructor(options: EsbuildWasmModuleEvaluatorOptions = {}) {
    this.wasmURL = options.wasmURL;
  }

  async evaluate(code: string): Promise<void> {
    const esbuild = await getEsbuildWasm(this.wasmURL);
    const { code: cjs } = await esbuild.transform(code, {
      format: "cjs",
      target: "es2022",
    });
    const module = { exports: {} };
    new Function("require", "module", "exports", cjs)(
      (spec: string) => {
        const mod = moduleFor(spec);
        return Object.hasOwn(mod, "default")
          ? { ...mod, __esModule: true }
          : mod;
      },
      module,
      module.exports,
    );
  }
}
