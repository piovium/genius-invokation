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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { ref, setup, Character, State, CombatStatus, DeclaredEnd, Equipment, Card, $ } from "#test";
import { Chevreuse, LineBayonetThrustEx, OverchargedBall, ShortrangeRapidInterdictionFire } from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Diluc, SearingOnslaught } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { PyronadoStatus } from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { Aura } from "@gi-tcg/typings";

import { test } from "vitest";

test("chevreuse overcharged ball", async () => {
  const target = ref();
  const chevreuse = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Chevreuse} ref={chevreuse} health={8} />
      <Card my def={OverchargedBall} />
    </State>
  );
  await c.me.skill(ShortrangeRapidInterdictionFire);
  // e -2, 弹头 -1
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(chevreuse).toHaveVariable({ health: 9 });
  c.expect($.my.hand).toNotExist();
})


test("vertical force coordination: creates an overcharged ball once per round", async () => {
  // 规则集：纵阵武力统筹 对方角色受到超载反应伤害后：生成手牌【超量装药弹头】。每回合一次
  // 借旋火轮提供两次火元素伤害，本回合第二次超载不再生成弹头，下回合恢复
  const c = setup(
    <State>
      <Character opp active aura={Aura.Electro} />
      <Character opp aura={Aura.Electro} />
      <Character opp aura={Aura.Electro} />
      <Character my active def={Chevreuse} />
      <CombatStatus my def={PyronadoStatus} usage={3} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.skill(LineBayonetThrustEx);
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
  // 同一回合的第二次超载不再生成
  await c.me.skill(LineBayonetThrustEx);
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
  // 下一回合重置
  await c.me.end();
  await c.opp.end();
  await c.me.skill(LineBayonetThrustEx);
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(2);
});

test("chevreuse interdiction: no shot when the ball only appears after the skill", async () => {
  // 规则集：注：需要使用技能时有弹头，且使用技能后也有弹头，才能生效
  // 使用技能时手牌中没有弹头，弹头是本次技能引发的超载才生成的，因此不舍弃也不治疗
  const chevreuse = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} aura={Aura.Electro} />
      <Character opp />
      <Character my active def={Chevreuse} ref={chevreuse} health={8} />
    </State>,
  );
  await c.me.skill(ShortrangeRapidInterdictionFire);
  // 2 点火 + 超载 2 点
  c.expect(target).toHaveVariable({ health: 6 });
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
  // 未获得【发射】标记，不舍弃弹头、不治疗
  c.expect(chevreuse).toHaveVariable({ health: 8 });
});

test("chevreuse interdiction: discards exactly one ball and heals the most injured character", async () => {
  // 规则集：拦射（被动技能）我方使用【近迫式急促拦射】后：若有【发射】标记->弃置【发射】标记，
  // 如果我方手牌中含有【超量装药弹头】->舍弃一张，治疗我方受伤最多的角色1点
  const chevreuse = ref();
  const injured = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Chevreuse} ref={chevreuse} health={9} />
      <Character my def={Kaeya} ref={injured} health={3} />
      <Card my def={OverchargedBall} />
      <Card my def={OverchargedBall} />
    </State>,
  );
  await c.me.skill(ShortrangeRapidInterdictionFire);
  // 2 点火 + 被舍弃弹头的 1 点火
  c.expect(target).toHaveVariable({ health: 7 });
  // 只舍弃一张
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
  // 治疗受伤最多的角色（凯亚），而非夏沃蕾自己
  c.expect(injured).toHaveVariable({ health: 4 });
  c.expect(chevreuse).toHaveVariable({ health: 9 });
});

test("vertical force coordination: not triggered when my own character takes overload damage", async () => {
  // 规则集：纵阵武力统筹 对方角色受到超载反应伤害后：生成手牌【超量装药弹头】。每回合一次
  // 「对方角色」：我方角色受到超载反应伤害时不生成弹头
  const chevreuse = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Chevreuse} ref={chevreuse} aura={Aura.Electro} />
      <Character my def={Kaeya} />
    </State>,
  );
  // 逆焰之刃 3 点火 + 超载 2 点，打在我方夏沃蕾身上
  await c.opp.skill(SearingOnslaught);
  c.expect(chevreuse).toHaveVariable({ health: 5 });
  c.expect($.my.hand.def(OverchargedBall)).toNotExist();
});

test("chevreuse interdiction: the shot mark does not carry over to the next use", async () => {
  // 规则集：拦射（被动技能）我方使用【近迫式急促拦射】后：若有【发射】标记->弃置【发射】标记，……
  // 第一次使用时手牌有弹头，获得的【发射】标记在本次结算后即被弃置；
  // 第二次使用时手牌无弹头，即使技能后由超载生成了弹头，也不会沿用上次的标记去舍弃、治疗
  const chevreuse = ref();
  const electro = ref();
  const c = setup(
    <State>
      <Character opp active def={Diluc} />
      <Character opp ref={electro} aura={Aura.Electro} />
      <Character my active def={Chevreuse} ref={chevreuse} health={8} />
      <Card my def={OverchargedBall} />
    </State>,
  );
  await c.me.skill(ShortrangeRapidInterdictionFire);
  // 舍弃弹头并治疗受伤最多的夏沃蕾
  c.expect($.my.hand).toNotExist();
  c.expect(chevreuse).toHaveVariable({ health: 9 });
  await c.opp.switch(electro);
  // 使用技能时手牌无弹头，技能后的超载才生成弹头
  await c.me.skill(ShortrangeRapidInterdictionFire);
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
  c.expect(chevreuse).toHaveVariable({ health: 9 });
});
