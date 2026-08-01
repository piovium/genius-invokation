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

import { NoReactiveSymbol } from "../runtime/reactive/reactive";

class CustomEvent<T = unknown> {
  [NoReactiveSymbol] = true;
  _typeGuard!: T;
  name: string;
  constructor(name?: string) {
    this.name = name ?? "";
  }
}

export { type CustomEvent };

export function createCustomEvent<T = void>(name?: string) {
  return new CustomEvent<T>(name);
}

export function isCustomEvent(value: unknown): value is CustomEvent {
  return value instanceof CustomEvent;
}
