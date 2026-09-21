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

import { $, Character, Equipment, ref, setup, State, Summon } from "#test";
import {
  BoltsOfDownfall,
  Fischl,
  MidnightPhantasmagoria,
  Nightrider,
  Oz,
  Oz01,
  StellarPredator,
} from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("nightrider: without talent summons oz", async () => {
  // 规则集：夜巡影翼 若未装备天赋，召唤奥兹
  const c = setup(
    <State>
      <Character my active def={Fischl} />
    </State>,
  );
  await c.me.skill(Nightrider);
  c.expect($.my.summon.def(Oz)).toHaveVariable({ usage: 2 });
  c.expect($.my.summon.def(Oz01)).toNotExist();
});

test("nightrider: with talent destroys oz and summons oz2", async () => {
  // 规则集：夜巡影翼 否则消灭奥兹，召唤奥兹2
  // 装备天赋时，场上原有的奥兹被消灭，改为召唤奥兹2（可用次数 2）
  const c = setup(
    <State>
      <Character my active def={Fischl}>
        <Equipment def={StellarPredator} />
      </Character>
      <Summon my def={Oz} usage={1} />
    </State>,
  );
  await c.me.skill(Nightrider);
  c.expect($.my.summon.def(Oz)).toNotExist();
  c.expect($.my.summon.def(Oz01)).toHaveVariable({ usage: 2 });
});

test("oz2: deals 1 electro damage at end phase", async () => {
  // 规则集：奥兹2 ①结束阶段，造成1点雷元素伤害
  const target = ref();
  const oz = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Fischl} />
      <Summon my def={Oz01} usage={2} ref={oz} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect(target).toHaveVariable({ health: 9, aura: Aura.Electro });
  c.expect(oz).toHaveVariable({ usage: 1 });
});

test("oz2: after fischl's normal attack deals 2 electro damage, consuming usage", async () => {
  // 规则集：奥兹2 ②我方菲谢尔普通攻击后，造成2点雷元素伤害；可用次数：2
  // 普攻 2 物理 + 奥兹2 的 2 雷伤，消耗 1 次可用次数；结束阶段再用掉最后 1 次后离场
  const target = ref();
  const oz = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Fischl} />
      <Summon my def={Oz01} usage={2} ref={oz} />
    </State>,
  );
  await c.me.skill(BoltsOfDownfall);
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.Electro });
  c.expect(oz).toHaveVariable({ usage: 1 });

  await c.opp.end();
  await c.me.end();
  c.expect(target).toHaveVariable({ health: 5 });
  c.expect($.my.summon.def(Oz01)).toNotExist();
});

test("oz2: not triggered by other characters' normal attack", async () => {
  // 规则集：奥兹2 ②我方菲谢尔普通攻击后，造成2点雷元素伤害
  // 非菲谢尔的普通攻击不会触发奥兹2
  const target = ref();
  const oz = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Kaeya} />
      <Character my def={Fischl} />
      <Summon my def={Oz01} usage={2} ref={oz} />
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  c.expect(target).toHaveVariable({ health: 8, aura: Aura.None });
  c.expect(oz).toHaveVariable({ usage: 2 });
});

test("oz2: not triggered by fischl's non-normal skill", async () => {
  // 规则集：奥兹2 ②我方菲谢尔普通攻击后，造成2点雷元素伤害
  // 菲谢尔使用元素爆发（非普通攻击）不触发奥兹2
  const target = ref();
  const oz = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Fischl} energy={3} />
      <Summon my def={Oz01} usage={2} ref={oz} />
    </State>,
  );
  await c.me.skill(MidnightPhantasmagoria);
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.Electro });
  c.expect(oz).toHaveVariable({ usage: 2 });
});
