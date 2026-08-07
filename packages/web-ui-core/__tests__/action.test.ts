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

import type { AssetsManager } from "@gi-tcg/assets-manager";
import { ActionValidity, DiceType, type Action } from "@gi-tcg/typings";
import { describe, expect, test } from "vitest";
import { createActionState } from "../src/action";
import type { Translator } from "../src/locales";

const assetsManager = {
  prepareForSync() {},
} as AssetsManager;

const t = ((key: string) =>
  key === "action.noDice" ? "Insufficient Elemental Dice" : key) as Translator;

const elementalTuningAction = (validity: ActionValidity): Action => ({
  action: {
    $case: "elementalTuning",
    value: {
      removedCardId: 42,
      targetDice: DiceType.Pyro,
      allowTuningAnyDice: false,
    },
  },
  preview: [],
  requiredCost: [],
  autoSelectedDice: [],
  validity,
  isFast: true,
});

describe("elemental tuning action state", () => {
  test("keeps the drag step and shows an alert when no dice are available", () => {
    const state = createActionState(
      assetsManager,
      [elementalTuningAction(ActionValidity.NO_DICE)],
      t,
    );
    const step = state.availableSteps.find(
      (step) => step.type === "elementalTuning",
    );

    expect(step).toEqual({ type: "elementalTuning", cardId: 42 });
    if (!step) {
      throw new Error("Missing elemental tuning step");
    }

    const result = state.step(step, []);
    expect(result.type).toBe("newState");
    if (result.type !== "newState") {
      throw new Error("Expected a new action state");
    }
    expect(result.newState.alertText).toBe("Insufficient Elemental Dice");
    expect(result.newState.dicePanel).toBe("hidden");
  });

  test("keeps disabled cards out of the tuning area", () => {
    const state = createActionState(
      assetsManager,
      [elementalTuningAction(ActionValidity.DISABLED)],
      t,
    );

    expect(
      state.availableSteps.some((step) => step.type === "elementalTuning"),
    ).toBe(false);
  });
});
