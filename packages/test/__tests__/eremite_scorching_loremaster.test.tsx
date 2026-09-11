// Copyright (C) 2025 Guyutongxue
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

import { setup, Character, State, $ } from "#test";
import {
  EremiteScorchingLoremaster,
  SpiritOfOmensAwakeningPyroScorpion,
} from "@gi-tcg/data/internal/characters/pyro/eremite_scorching_loremaster.gts";
import getData from "@gi-tcg/data";
import { expect, test } from "vitest";

test("passive skill definition honors its until version", () => {
  const { varConfigs } = getData("v4.7.0").characters.get(
    EremiteScorchingLoremaster,
  )!;
  expect(varConfigs).toHaveProperty("damagedEnergySkillUsage");
  expect(varConfigs).not.toHaveProperty("createCardUsage");
});

test("eremite scorching loremaster burst summons the scorpion before v5.1.0", async () => {
  const c = setup(
    <State dataVersion="v4.7.0">
      <Character opp active />
      <Character my active def={EremiteScorchingLoremaster} energy={2} />
    </State>,
  );
  await c.me.skill(SpiritOfOmensAwakeningPyroScorpion);
  c.expect($.my.summon).toBeExist();
});
