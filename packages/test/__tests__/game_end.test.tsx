// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { Character, CombatStatus, State, setup } from "#test";
import { SpiritOrb } from "@gi-tcg/data/internal/characters/electro/ororon.gts";
import { expect, test } from "vitest";

test("game end during onActionPhase does not request an action", async () => {
  const c = setup(
    <State prevPhase="roll">
      <CombatStatus my def={SpiritOrb} />
      <Character opp active health={1} />
      <Character opp health={0} alive={0} />
      <Character opp health={0} alive={0} />
    </State>,
  );

  await expect(c.stepToNextAction()).rejects.toThrow(
    "Game ended, no more action",
  );
  expect(c.state.phase).toBe("gameEnd");
  expect(c.state.winner).toBe(0);
});
