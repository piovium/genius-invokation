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

import type { VariableConfig } from "../base/entity";

export function createVariable<const T extends number>(initialValue: T, forceOverwrite = false): VariableConfig<T> {
  return {
    initialValue,
    recreateBehavior: {
      type: forceOverwrite ? "overwrite" : "default",
    },
  };
}

export function createVariableCanAppend(initialValue: number, appendLimit = Infinity, appendValue?: number): VariableConfig {
  appendValue ??= initialValue;
  return {
    initialValue,
    recreateBehavior: {
      type: "append",
      appendLimit,
      appendValue,
    }
  }
}

export interface TypeHint<T> {
  _type: T;
}
export function typeHint<T>() {
  return {} as TypeHint<T>;
}
