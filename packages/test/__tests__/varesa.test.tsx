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

import {
  ref,
  setup,
  Character,
  State,
  Status,
  Summon,
  Equipment,
  DiceCount,
  DeclaredEnd,
  $,
} from "#test";
import {
  GuardianVentVolcanoKablamStatus,
  RidingTheNightrainbow,
  Varesa,
} from "@gi-tcg/data/internal/characters/electro/varesa.gts";
import {
  Albedo,
  DescentOfDivinity,
  SolarIsotoma,
} from "@gi-tcg/data/internal/characters/geo/albedo.gts";
import { ManifestFlame } from "@gi-tcg/data/internal/characters/electro/flins.gts";
import { ScarletSeal } from "@gi-tcg/data/internal/characters/pyro/yanfei.gts";
import { expect, test } from "vitest";

test("varesa: switches to the next character after Riding the Nightrainbow", async () => {
  // 规则集：夜虹逐跃② 被动技能 角色使用【夜虹逐跃】后：切换到下一个角色
  // 断言：技能结算后出战角色变成瓦雷莎的下一个角色（此时尚未轮到我方行动，突驰烈进还未把她换回来）。
  const varesa = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Varesa} ref={varesa} />
      <Character my ref={next} />
      <Character my />
    </State>,
  );
  await c.me.skill(RidingTheNightrainbow);
  c.expect($.my.active).toBe(next);
});

test("varesa: the prepared Volcano Kablam counts as a plunging attack", async () => {
  // 规则集：闪烈降临·大火山崩落 视为下落攻击
  // 断言：阿贝多天赋「阳华在场时我方下落攻击伤害+1」生效，3 点雷伤变 4 点。
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} />
      <Character my active def={Varesa}>
        <Status def={GuardianVentVolcanoKablamStatus} />
      </Character>
      <Character my def={Albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect(target).toHaveVariable({ health: 6 });
});

test("varesa: the prepared Volcano Kablam is neither a normal nor a charged attack", async () => {
  // 规则集：闪烈降临·大火山崩落 不是普通攻击，不能触发重攻击
  // 断言：幽焰显迹（普通攻击伤害+1）与丹火印（重击伤害+2）都不生效，只有 3 点雷伤。
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} />
      <Character my active def={Varesa}>
        <Status def={GuardianVentVolcanoKablamStatus} />
        <Status def={ManifestFlame} />
        <Status def={ScarletSeal} />
      </Character>
      <DiceCount my count={8} />
    </State>,
  );
  await c.stepToNextAction();
  // 骰子数为偶数，本次行动前已进入「可重击」状态
  expect(c.state.players[0].canCharged).toBe(true);
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(ScarletSeal)).toBeExist();
});
