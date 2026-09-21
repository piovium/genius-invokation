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

import { Card, Character, Equipment, ref, setup, State } from "#test";
import { RightfulReward } from "@gi-tcg/data/internal/cards/equipment/weapon/pole.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import {
  DoughFu,
  Pyronado,
  Xiangling,
} from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { test } from "vitest";

test("rightful reward: burst damage +2", async () => {
  // 规则集：①角色【元素爆发】造成伤害+2
  const target = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling} energy={2}>
        <Equipment def={RightfulReward} />
      </Character>
      <Character opp active ref={target} def={Diluc} />
    </State>,
  );
  await c.me.skill(Pyronado);
  // 旋火轮本体 3 点火伤，加成后 5 点
  c.expect(target).toHaveVariable({ health: 5 });
});

test("rightful reward: gains justice when active character is damaged", async () => {
  // 规则集：②我方出战角色受到伤害或治疗后：获得1点【公义之理】
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active ref={me} def={Xiangling}>
        <Equipment ref={weapon} def={RightfulReward} />
      </Character>
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  c.expect(me).toHaveVariable({ health: 8 });
  c.expect(weapon).toHaveVariable({ justice: 1 });
});

test("rightful reward: gains justice when active character is healed", async () => {
  // 规则集：②我方出战角色受到伤害或治疗后：获得1点【公义之理】
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State>
      <Character my active ref={me} def={Xiangling} health={5}>
        <Equipment ref={weapon} def={RightfulReward} />
      </Character>
      <Card my def={MondstadtHashBrown} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, me);
  c.expect(me).toHaveVariable({ health: 7 });
  c.expect(weapon).toHaveVariable({ justice: 1 });
});

test("rightful reward: 4 justice is consumed for 1 energy", async () => {
  // 规则集：②然后若【公义之理】有4点，消耗4点【公义之理】->角色获得1点充能
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State>
      <Character my active ref={me} def={Xiangling} health={5} energy={0}>
        <Equipment ref={weapon} def={RightfulReward} v={{ justice: 3 }} />
      </Character>
      <Card my def={MondstadtHashBrown} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, me);
  c.expect(weapon).toHaveVariable({ justice: 0 });
  c.expect(me).toHaveVariable({ energy: 1 });
});

test("rightful reward: still consumes justice at full energy", async () => {
  // 规则集：注：没任何隐藏条件，满充能获得4点也会获得充能。
  // 满充能时第 4 点【公义之理】依然被消耗（不存在「充能已满则不累积/不消耗」的隐藏条件）
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State>
      <Character my active ref={me} def={Xiangling} health={5} energy={2}>
        <Equipment ref={weapon} def={RightfulReward} v={{ justice: 3 }} />
      </Character>
      <Card my def={MondstadtHashBrown} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, me);
  c.expect(weapon).toHaveVariable({ justice: 0 });
  c.expect(me).toHaveVariable({ energy: 2 });
});

test("rightful reward: the damage bonus applies to elemental burst only", async () => {
  // 规则集：①角色【元素爆发】造成伤害+2
  // 反向验证：普通攻击不吃这 +2
  const target = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling}>
        <Equipment def={RightfulReward} />
      </Character>
      <Character opp active ref={target} def={Diluc} />
    </State>,
  );
  await c.me.skill(DoughFu);
  // 白案功夫 2 点物理伤害
  c.expect(target).toHaveVariable({ health: 8 });
});

test("rightful reward: active character damaged charges the equipped standby character", async () => {
  // 规则集：②我方出战角色受到伤害或治疗后：获得1点【公义之理】……->角色获得1点充能
  // 触发条件是「我方出战角色」而非所附属角色；充能给的是所附属角色
  const weapon = ref();
  const holder = ref();
  const active = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active ref={active} />
      <Character my ref={holder} def={Xiangling} energy={0}>
        <Equipment ref={weapon} def={RightfulReward} v={{ justice: 3 }} />
      </Character>
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  c.expect(active).toHaveVariable({ health: 8, energy: 0 });
  c.expect(weapon).toHaveVariable({ justice: 0 });
  c.expect(holder).toHaveVariable({ energy: 1 });
});

test("rightful reward: healing a standby character grants no justice", async () => {
  // 规则集：②我方出战角色受到伤害或治疗后：获得1点【公义之理】
  // 反向验证：后台角色（即便是所附属角色）受到治疗不触发
  const weapon = ref();
  const holder = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my ref={holder} def={Xiangling} health={5}>
        <Equipment ref={weapon} def={RightfulReward} />
      </Character>
      <Card my def={MondstadtHashBrown} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, holder);
  c.expect(holder).toHaveVariable({ health: 7 });
  c.expect(weapon).toHaveVariable({ justice: 0 });
});
