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

import { expect, test } from "vitest";
import type { Mutation } from "../src/base/mutation";
import type { GameState } from "../src/base/state";
import { StateMutator } from "../src/mutator";

const stepRandom = (): Mutation => ({ type: "stepRandom", value: 0 });

test("resetState appends to the pending queues instead of overwriting them", async () => {
  const pauses: Mutation[][] = [];
  const mutator = new StateMutator({} as GameState, {
    onNotify: () => {},
    onPause: async (opt) => {
      pauses.push([...opt.stateMutations]);
    },
  });

  // Each resetState simulates the mutator reset after an inline skill:
  // the pause queue may still hold mutations accumulated since the last
  // pause, so they must be appended, not overwritten.
  const accumulated = stepRandom();
  mutator.resetState({} as GameState, {
    stateMutations: [accumulated],
    exposedMutations: [],
  });
  const inlineSkillMutation = stepRandom();
  mutator.resetState({} as GameState, {
    stateMutations: [inlineSkillMutation],
    exposedMutations: [],
  });

  await mutator.notifyAndPause();
  expect(pauses).toEqual([[accumulated, inlineSkillMutation]]);
});
