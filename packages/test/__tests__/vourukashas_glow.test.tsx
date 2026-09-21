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

import { $, Card, Character, Equipment, ref, setup, State, Summon } from "#test";
import { VourukashasGlow } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  LightningRoseSummon,
  Lisa,
  VioletArc,
} from "@gi-tcg/data/internal/characters/electro/lisa.gts";
import {
  GuhuaStyle,
  Xingqiu,
} from "@gi-tcg/data/internal/characters/hydro/xingqiu.gts";
import { Gaming } from "@gi-tcg/data/internal/characters/pyro/gaming.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("vourukasha's glow: active character damaged draws a card and gains nectar", async () => {
  // 规则集：角色受到伤害后：若为出战角色->1张牌，此装备获得【甘露】
  //         甘露 装备状态 结束阶段：治疗角色1点，移除此状态
  const glow = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Xingqiu} />
      <Character my active def={Gaming} health={5}>
        <Equipment def={VourukashasGlow} ref={glow} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  const handsBefore = c.state.players[0].hands.length;
  await c.opp.skill(GuhuaStyle);
  c.expect($.my.active).toHaveVariable({ health: 3 });
  expect(c.state.players[0].hands.length).toBe(handsBefore + 1);
  c.expect(glow).toHaveVariable({ shouldHeal: 1, usagePerRound: 0 });
  await c.me.end();
  await c.opp.end();
  // 结束阶段：治疗角色1点并移除甘露
  c.expect($.my.active).toHaveVariable({ health: 4 });
  c.expect(glow).toHaveVariable({ shouldHeal: 0 });
});

test("vourukasha's glow: does not trigger when a standby character is damaged", async () => {
  // 规则集：角色受到伤害后：**若为出战角色**->1张牌，此装备获得【甘露】
  const glow = ref();
  const standby = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Lisa} />
      <Character my active def={Xingqiu} aura={Aura.Hydro} />
      <Character my def={Gaming} health={5} ref={standby}>
        <Equipment def={VourukashasGlow} ref={glow} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  const handsBefore = c.state.players[0].hands.length;
  await c.opp.skill(VioletArc);
  // 苍雷对我方出战角色造成雷伤 -> 感电，对后台角色造成1点穿透伤害
  c.expect(standby).toHaveVariable({ health: 4 });
  expect(c.state.players[0].hands.length).toBe(handsBefore);
  c.expect(glow).toHaveVariable({ shouldHeal: 0, usagePerRound: 1 });
});

test("vourukasha's glow: damage taken during the end phase heals in the next round", async () => {
  // 规则集注：结束阶段受到伤害的场合，会在下回合（若装备仍在）发动
  const glow = ref();
  const c = setup(
    <State>
      <Character my active def={Gaming} health={5}>
        <Equipment def={VourukashasGlow} ref={glow} />
      </Character>
      <Character opp active def={Lisa} />
      <Summon opp def={LightningRoseSummon} usage={2} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  // 本回合结束阶段甘露尚未获得，受伤后才获得，因此本回合不治疗
  c.expect($.my.active).toHaveVariable({ health: 3 });
  c.expect(glow).toHaveVariable({ shouldHeal: 1 });
  await c.me.end();
  await c.opp.end();
  // 下回合结束阶段发动：先治疗1点（3->4），随后召唤物再造成2点伤害（4->2）并再次获得甘露
  c.expect($.my.active).toHaveVariable({ health: 2 });
  c.expect(glow).toHaveVariable({ shouldHeal: 1 });
});
