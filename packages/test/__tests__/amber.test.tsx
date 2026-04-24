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

import { ref, setup, Character, State, Status, Equipment, Summon, CombatStatus, $ } from "#test";
import { WindAndFreedomInEffect } from "@gi-tcg/data/internal/cards/event/other";
import { Fischl, Oz } from "@gi-tcg/data/internal/characters/electro/fischl";
import { Mualani, NightRealmsGiftCrestsAndTroughs } from "@gi-tcg/data/internal/characters/hydro/mualani";
import { Amber, BaronBunny, BunnyTriggered, Sharpshooter } from "@gi-tcg/data/internal/characters/pyro/amber";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("Amber talent triggered after WindAndFreedom", async () => {
  const opp1 = ref();
  const opp2 = ref();
  const c = setup(
    <State random={0}>
      <Character opp active ref={opp1} aura={Aura.Pyro} />
      <Character opp ref={opp2} />
      <Character my active def={Amber} >
        <Equipment def={BunnyTriggered} />
      </Character>
      <Character my def={Mualani} >
        <Equipment def={NightRealmsGiftCrestsAndTroughs} />
      </Character>
      <Character my def={Fischl} />
      <CombatStatus my def={WindAndFreedomInEffect} />
      <Summon my def={Oz} usage={1} />
      <Summon my def={BaronBunny} />
    </State>,
  );
  // 普攻 -2
  // 触发“风与自由”，切换到玛拉妮
  // 玛拉妮天赋触发奥兹，前台 -3 超载到敌方下个角色
  // 天赋“引爆兔兔伯爵”触发，当前对方前台 -4
  await c.me.skill(Sharpshooter);
  c.expect(opp1).toHaveVariable({ aura: Aura.None, health: 5 });
  c.expect(opp2).toHaveVariable({ aura: Aura.Pyro, health: 6 });
  c.expect($.my.summon).toNotExist();
});
