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

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $, DiceCount, Status } from "#test";
import { RainbowMacaronsInEffect } from "@gi-tcg/data/internal/cards/event/food.gts";
import { FurinaPneuma, SalonMembers, SalonSolitairePneuma } from "@gi-tcg/data/internal/characters/hydro/furina.gts";
import { test } from "vitest";

test("furina: summon endPhase damage contains two skill", async () => {
  const macronsInEffect = ref();
  const furina = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={2}>
        <Status def={RainbowMacaronsInEffect} ref={macronsInEffect} />
      </Character>
      <Character my active def={FurinaPneuma} ref={furina} health={12} />
      <Character my alive={0} health={0} />
      <Character my alive={0} health={0} />
      <Summon my def={SalonMembers} />
    </State>
  );
  await c.me.end();
  // -1 +1 -1 +1
  c.expect($.opp.active).toHaveVariable({ health: 2 });
  c.expect(macronsInEffect).toHaveVariable({ usage: 1 });
  c.expect(furina).toHaveVariable({ health: 11 });
});

test("salon members: consumes usage even when the condition is not met", async () => {
  // 规则集：②结束阶段：如果我方存在生命值至少为6的角色->……可用次数：2（可叠加，最多叠加到4次，不满足条件也消耗次数）
  // 断言：我方无生命值≥6的角色时，②不造成任何伤害，但可用次数仍然 2->1（①的1点水元素伤害照常）
  const furina = ref();
  const salonMembers = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={FurinaPneuma} ref={furina} health={5} />
      <Character my health={5} />
      <Character my health={5} />
      <Summon my def={SalonMembers} ref={salonMembers} />
    </State>,
  );
  await c.me.end();
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  // ②未发动：没有我方角色受到穿透伤害
  c.expect(furina).toHaveVariable({ health: 5 });
  c.expect($.my.character.var("health", "<", 5)).toNotExist();
  c.expect(salonMembers).toHaveVariable({ usage: 1 });
});

test("salon members: stacking is capped at 4 uses", async () => {
  // 规则集：可用次数：2（可叠加，最多叠加到4次，不满足条件也消耗次数）
  // 断言：已有 3 次可用次数时再次召唤，叠加结果为 4 而不是 5
  const salonMembers = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={FurinaPneuma} />
      <Summon my def={SalonMembers} ref={salonMembers} usage={3} />
    </State>,
  );
  await c.me.skill(SalonSolitairePneuma);
  c.expect(salonMembers).toHaveVariable({ usage: 4 });
});
