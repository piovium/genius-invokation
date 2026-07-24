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

import * as gtsRuntime from "../gts/runtime";
import * as gtsBuilder from "../gts/builder";
import * as gtsProviderVm from "../gts/vm";

export const GTS_RUNTIME_MODULE = "@gi-tcg/custom-data-loader/gts/runtime";
export const GTS_PROVIDER_VM_MODULE = "@gi-tcg/custom-data-loader/gts/vm/vm";
export const GTS_BUILDER_MODULE = "@gi-tcg/core/builder";

export type ModuleEvaluatorBackend = "node-vm" | "esbuild-wasm";

export interface ModuleEvaluator {
  evaluate(code: string): Promise<void>;
}

function unsupportedModule(specifier: string): never {
  throw new Error(
    `Custom GTS modules may only import ${GTS_RUNTIME_MODULE}, ${GTS_PROVIDER_VM_MODULE}, and ${GTS_BUILDER_MODULE}; received ${JSON.stringify(specifier)}`,
  );
}

export function moduleFor(specifier: string): object {
  switch (specifier) {
    case GTS_RUNTIME_MODULE:
      return gtsRuntime;
    case GTS_PROVIDER_VM_MODULE:
      return gtsProviderVm;
    case GTS_BUILDER_MODULE:
      return gtsBuilder;
    default:
      return unsupportedModule(specifier);
  }
}
