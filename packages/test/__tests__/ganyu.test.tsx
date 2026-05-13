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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $, DiceCount } from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food";
import { FrostflakeArrow, Ganyu, UndividedHeart } from "@gi-tcg/data/internal/characters/cryo/ganyu";
import { CeremonialBladework, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya";
import { AgileSwitch, EfficientSwitch } from "@gi-tcg/data/internal/commons";
import { test } from "vitest";

test("ganyu: FrostflakeArrow usage clear after defeated", async () => {
  const ganyu = ref();
  const myNext = ref();
  const c = setup(
    <State>
      <Character opp active health={10} def={Kaeya} />
      <Character opp health={10} />
      <Character opp health={10} />
      <Character my active def={Ganyu} ref={ganyu} health={1} />
      <Character my ref={myNext} />
      <CombatStatus my def={AgileSwitch} />
      <CombatStatus my def={EfficientSwitch} />
      <Card my def={TeyvatFriedEgg} />
      <Card my def={UndividedHeart} />
      <DiceCount my count={12} />
    </State>
  );
  await c.me.skill(FrostflakeArrow);
  c.expect($.opp.next).toHaveVariable({ health: 8 });
  await c.opp.skill(CeremonialBladework);
  await c.me.chooseActive(myNext);
  await c.me.card(TeyvatFriedEgg, ganyu);
  await c.me.switch(ganyu);
  await c.me.card(UndividedHeart, ganyu);
  // 不触发天赋，仍然是后台-2
  c.expect($.opp.next).toHaveVariable({ health: 6 });
});
