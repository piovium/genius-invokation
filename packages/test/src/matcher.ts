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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { Ref } from "#test";
import { AnyState, CharacterVariables, EntityVariables } from "@gi-tcg/core";
import { expect } from "vitest";

expect.extend({
  toBeArrayOfSize(received: unknown, expected: number) {
    const isArray = Array.isArray(received);
    const pass = isArray && received.length === expected;
    return {
      pass,
      message: () =>
        pass
          ? `expected array not to have size ${expected}`
          : isArray
            ? `expected array of size ${expected}, but got ${received.length}`
            : `expected an array, but got ${typeof received}`,
    };
  },
});

declare module "vitest" {
  interface Assertion<T> {
    toBeArrayOfSize(size: number): void;
  }
  interface AsymmetricMatchersContaining {
    toBeArrayOfSize(size: number): void;
  }
}

export class StatesMatcher {
  constructor(public readonly states: readonly AnyState[]) {}

  toBeUnique() {
    expect(this.states.length).toBe(1);
  }

  toBeExist() {
    expect(this.states.length).toBeGreaterThan(0);
  }

  toNotExist() {
    expect(this.states.length).toBe(0);
  }

  toBeCount(count: number) {
    expect(this.states.length).toBe(count);
  }

  toHaveVariable(variables: Partial<CharacterVariables | EntityVariables>) {
    expect(this.states[0].variables).toMatchObject(variables);
  }

  toBeDefinition(definitionId: number) {
    this.toBeUnique();
    expect(this.states[0]).toMatchObject({ definition: { id: definitionId } });
  }

  toBe(ref: Ref) {
    this.toBeUnique();
    expect(this.states[0]).toMatchObject({ id: ref.id });
  }
  
}
