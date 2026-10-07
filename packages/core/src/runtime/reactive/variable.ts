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

import type { TypingInfoBase } from "../../utils";
import type { ReactiveStateBase } from "./base";
import type { CoreCharacterVariables } from "../../base/character";

export type ReadonlyReactiveVariables<Ty extends TypingInfoBase> = Readonly<
  ReactiveVariables<Ty>
>;

// https://github.com/microsoft/TypeScript/issues/46969
interface ExtraVariables {
  [name: string]: number | undefined;
}

// Query information guarantees presence; character metadata also constrains values.
export type ReactiveVariables<Ty extends TypingInfoBase> = {
  [name in Ty["variables"]]: number;
} & ExtraVariables &
  (Ty["type"] extends "character"
    ? {
        -readonly [
          K in keyof CoreCharacterVariables
        ]: CoreCharacterVariables[K];
      }
    : {});

export function createReactiveVariables<Ty extends TypingInfoBase>(
  state: ReactiveStateBase<Ty>,
): ReactiveVariables<Ty> {
  const result = new Proxy(
    {},
    {
      get(_, prop) {
        if (typeof prop === "string") {
          return state.getVariable(prop);
        }
        return undefined;
      },
      set(_, prop, value) {
        if (typeof prop === "string") {
          state.setVariable(prop, value);
          return true;
        }
        return false;
      },
    },
  ) as ReactiveVariables<Ty>;
  return result;
}
