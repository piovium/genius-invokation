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

import { setup, Character, State, Equipment, Card } from "#test";
import {
  ArtfulGrapple,
  Yumkasaurus,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import { Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { expect, test } from "vitest";

test("stealHandCard discards the stolen card when my hands are full", async () => {
  const c = setup(
    <State config={{ maxHandsCount: 1 }}>
      <Character opp active />
      <Character my active>
        <Equipment def={Yumkasaurus} />
      </Character>
      <Card my def={Strategize} />
      <Card opp def={Strategize} />
    </State>,
  );
  await c.me.skill(ArtfulGrapple);
  expect(c.state.players[0].hands).toHaveLength(1);
  expect(c.state.players[1].hands).toHaveLength(0);
});
