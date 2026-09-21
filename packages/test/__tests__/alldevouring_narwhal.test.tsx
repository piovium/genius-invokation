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

import {
  ref,
  setup,
  Character,
  State,
  Equipment,
  Summon,
  DeclaredEnd,
  Card,
  Status,
  CombatStatus,
  $,
} from "#test";
import { Aura, SkillHandle } from "@gi-tcg/core/data";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  AdeptusTemptation,
  JueyunGuoba,
  MondstadtHashBrown,
  SingYourHeartOut,
} from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  Chasca,
  NightsoulsBlessing,
  ShiningShadowhuntShellPyro,
  SoulsniperRitualStaff,
} from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import {
  AlldevouringNarwhal,
  AnomalousAnatomy,
  DarkShadow,
  DeepDevourersDomain,
  RavagingDevourer,
  StarfallShower,
} from "@gi-tcg/data/internal/characters/hydro/alldevouring_narwhal.gts";
import {
  HalfTulpa01,
  HydroTulpa,
} from "@gi-tcg/data/internal/characters/hydro/hydro_tulpa.gts";
import { Oz } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  AstableAnemohypostasisCreation6308,
  Sucrose,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  DoughFu,
  PyronadoStatus,
  Xiangling,
} from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { test } from "vitest";

test("dark shadow: do not barrier on nested damage", async () => {
  const darkShadow = ref();
  const c = setup(
    <State currentTurn="opp">
      <Card opp def={ShiningShadowhuntShellPyro} />
      <Card opp def={Paimon} />
      <Card opp def={Paimon} />
      <Character opp active def={Chasca}>
        <Equipment def={SoulsniperRitualStaff} usage={2} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my active health={10} />
      <Character my def={AlldevouringNarwhal} />
      <Summon my def={DarkShadow} ref={darkShadow} v={{ atk: 3, usage: 12 }} />
    </State>,
  );
  await c.opp.skill(1151121 as SkillHandle);
  c.expect($.my.active).toHaveVariable({ aura: Aura.Pyro, health: 9 });
  c.expect(darkShadow).toHaveVariable({ usage: 10 });
});

test.each([
  { name: "all distinct", cards: [JueyunGuoba, MondstadtHashBrown, AdeptusTemptation], layers: 1 },
  { name: "two equal", cards: [JueyunGuoba, JueyunGuoba, MondstadtHashBrown], layers: 2 },
  { name: "all equal", cards: [JueyunGuoba, JueyunGuoba, JueyunGuoba], layers: 3 },
])(
  "deep devourer's domain: 3 tuned cards ($name costs) give $layers domain layer(s)",
  async ({ cards, layers }) => {
    // 规则集：我方调和后/舍弃卡牌后：【噬】层数+1，记录卡牌当前元素骰费用值。若【噬】层数为3->【域】层数+1，
    //   若记录数值有2个相同，【域】层数再+1，若记录数值均相同，【域】层数再+1；移除所有【噬】，移除所有记录。
    // 断言：调和 3 张后 cardCount 清零，extraMaxHealth（域层数）按费用相同情况为 1/2/3
    const domain = ref();
    const c = setup(
      <State>
        <Character opp active />
        <Character my active def={AlldevouringNarwhal} />
        <CombatStatus my def={DeepDevourersDomain} ref={domain} />
        <Card my def={cards[0]} />
        <Card my def={cards[1]} />
        <Card my def={cards[2]} />
      </State>,
    );
    for (const card of cards) {
      await c.me.tune(card);
    }
    c.expect(domain).toHaveVariable({ cardCount: 0, extraMaxHealth: layers });
  },
);

test("deep devourer's domain: records are cleared after every 3 cards", async () => {
  // 规则集：若【噬】层数为3->【域】层数+1，……；移除所有【噬】，移除所有记录。
  // 场景：先调和 3 张费用 0 的牌（域 +3），再调和费用 1、2、3 的三张牌
  // 断言：第二批只按自身 3 张评估（+1）-> 域 4；若第一批记录未清除，第二批会因存在相同费用而多加层数
  const domain = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={AlldevouringNarwhal} />
      <CombatStatus my def={DeepDevourersDomain} ref={domain} />
      <Card my def={JueyunGuoba} />
      <Card my def={JueyunGuoba} />
      <Card my def={JueyunGuoba} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={AdeptusTemptation} />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  for (const card of [JueyunGuoba, JueyunGuoba, JueyunGuoba]) {
    await c.me.tune(card);
  }
  c.expect(domain).toHaveVariable({ cardCount: 0, extraMaxHealth: 3 });
  for (const card of [MondstadtHashBrown, AdeptusTemptation, SingYourHeartOut]) {
    await c.me.tune(card);
  }
  c.expect(domain).toHaveVariable({ cardCount: 0, extraMaxHealth: 4 });
});

test("deep devourer's domain: cards discarded by starfall shower also count", async () => {
  // 规则集：我方调和后/舍弃卡牌后：【噬】层数+1，记录卡牌当前元素骰费用值
  // 断言：调和 2 张 + 迸落星雨舍弃 1 张（费用 3）= 3 张 -> 域 +1，且最高费用记录为 3（1 张）
  const domain = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={AlldevouringNarwhal} />
      <CombatStatus my def={DeepDevourersDomain} ref={domain} />
      <Card my def={JueyunGuoba} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await c.me.tune(JueyunGuoba);
  await c.me.tune(MondstadtHashBrown);
  c.expect(domain).toHaveVariable({ cardCount: 2 });
  await c.me.skill(StarfallShower);
  c.expect($.my.hand).toNotExist();
  c.expect(domain).toHaveVariable({
    cardCount: 0,
    extraMaxHealth: 1,
    totalMaxCost: 3,
    totalMaxCostCount: 1,
  });
});

test("deep devourer's domain: end phase grants narwhal extra max health and removes domain layers", async () => {
  // 规则集：②结束阶段：己方吞星之鲸获得【域】层数的额外最大生命值，移除【域】
  // 断言：结束阶段后鲸鱼最大生命 6+2，附属奇异之躯 2 层，域层数归零（状态本身保留）
  const narwhal = ref();
  const domain = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={AlldevouringNarwhal} ref={narwhal} />
      <CombatStatus my def={DeepDevourersDomain} ref={domain} v={{ extraMaxHealth: 2 }} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect(narwhal).toHaveVariable({ maxHealth: 8 });
  c.expect($.my.character.has($.typeStatus.def(AnomalousAnatomy))).toBe(narwhal);
  c.expect($.my.typeStatus.def(AnomalousAnatomy)).toHaveVariable({ extraMaxHealth: 2 });
  c.expect(domain).toHaveVariable({ extraMaxHealth: 0 });
});

test("deep devourer's domain: max health is granted during end phase, not at round end", async () => {
  // 规则集：深噬之域②是结束阶段而非回合结束时的效果。
  // 场景：我方先宣布结束，结束阶段我方效果先发动；鲸鱼 1 血，域 2 层，对方奥兹结束阶段造成 1 点伤害
  // 断言：域在结束阶段先结算（最大生命与生命 +2 -> 3），奥兹随后打到 2；若是回合结束时结算，鲸鱼会先被奥兹击倒
  const narwhal = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Summon opp def={Oz} usage={2} />
      <Character my active def={AlldevouringNarwhal} ref={narwhal} health={1} />
      <CombatStatus my def={DeepDevourersDomain} v={{ extraMaxHealth: 2 }} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect(narwhal).toHaveVariable({ alive: 1, maxHealth: 8, health: 2 });
});

test("deep devourer's domain: when narwhal is defeated, end phase only removes the layers", async () => {
  // 规则集：②在吞星之鲸被击倒的场合，只移除【域】，不增加生命值
  // 断言：鲸鱼已倒下时结束阶段域层数归零，鲸鱼最大生命不变、不附属奇异之躯
  const narwhal = ref();
  const domain = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my def={AlldevouringNarwhal} ref={narwhal} health={0} alive={0} />
      <CombatStatus my def={DeepDevourersDomain} ref={domain} v={{ extraMaxHealth: 2 }} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect(domain).toHaveVariable({ extraMaxHealth: 0 });
  c.expect(narwhal).toHaveVariable({ alive: 0, maxHealth: 6 });
  c.expect($.my.typeStatus.def(AnomalousAnatomy)).toNotExist();
});

test("dark shadow: attack is the highest devoured cost and usage is the count of cards with that cost", async () => {
  // 规则集：①入场时：攻击力为X，可用次数为Y（X为本局游戏我方调和/舍弃卡牌中最高元素骰费用值）（Y为...费用为X的卡牌数量）
  // 场景：调和费用 3、1、3 的三张牌后释放横噬鲸吞
  // 断言：黑色幻影攻击力 3、可用次数 2
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={AlldevouringNarwhal} energy={2} />
      <CombatStatus my def={DeepDevourersDomain} />
      <Card my def={SingYourHeartOut} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await c.me.tune(SingYourHeartOut);
  await c.me.tune(MondstadtHashBrown);
  await c.me.tune(SingYourHeartOut);
  await c.me.skill(RavagingDevourer);
  c.expect($.my.summon.def(DarkShadow)).toHaveVariable({ atk: 3, usage: 2 });
});

test("dark shadow: zero attack when devoured cards cost 0; end phase deals 0 damage and consumes 1 usage", async () => {
  // 规则集：①攻击力为X（缺省为0）；②结束阶段：造成0点伤害，可用次数-1
  // 场景：只调和过两张费用 0 的牌 -> X=0，Y=2；对方随后换上无附着的角色再进入结束阶段
  // 断言：黑色幻影攻击力 0、可用次数 2；结束阶段后对方出战角色生命不变但附着雷元素（0 点雷伤确实造成了），可用次数 1
  const target = ref();
  const other = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} />
      <Character opp ref={other} health={10} />
      <Character my active def={AlldevouringNarwhal} energy={2} />
      <CombatStatus my def={DeepDevourersDomain} />
      <Card my def={JueyunGuoba} />
      <Card my def={JueyunGuoba} />
    </State>,
  );
  await c.me.tune(JueyunGuoba);
  await c.me.tune(JueyunGuoba);
  await c.me.skill(RavagingDevourer);
  c.expect($.my.summon.def(DarkShadow)).toHaveVariable({ atk: 0, usage: 2 });
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect(other).toHaveVariable({ health: 9 });
  await c.opp.switch(other);
  await c.me.end();
  await c.opp.end();
  c.expect(other).toHaveVariable({ health: 9, aura: Aura.Electro });
  c.expect($.my.summon.def(DarkShadow)).toHaveVariable({ usage: 1 });
});

test("dark shadow: disposed immediately when nothing was devoured, which triggers hydro tulpa's branching flow", async () => {
  // 规则集：未调和/舍弃卡牌的场合，黑色幻影入场后会立即弃置。（能触发水形幻人）
  // 断言：横噬鲸吞后黑色幻影不存在；水形幻人的【分流】被触发（受到 2 点穿透伤害并召唤半幻人）
  const tulpa = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={AlldevouringNarwhal} energy={2} />
      <Character my def={HydroTulpa} ref={tulpa} health={10} />
      <CombatStatus my def={DeepDevourersDomain} />
    </State>,
  );
  await c.me.skill(RavagingDevourer);
  c.expect($.my.summon.def(DarkShadow)).toNotExist();
  c.expect(tulpa).toHaveVariable({ health: 8 });
  c.expect($.my.summon.def(HalfTulpa01)).toBeExist();
});

test("dark shadow: barrier reduces damage to my active character by 1 and then costs 2 usage", async () => {
  // 规则集：③我方出战角色受到伤害时：伤害值-1，然后此效果不可用；④我方出战角色受到伤害后：若③不可用->令③可用，此牌可用次数-2
  // 断言：凯亚 2 点物理伤害 -> 我方出战角色受到 1 点，黑色幻影可用次数 4 -> 2
  const darkShadow = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Kaeya} />
      <Character my active health={10} />
      <Character my def={AlldevouringNarwhal} />
      <Summon my def={DarkShadow} ref={darkShadow} v={{ atk: 1, usage: 4 }} />
    </State>,
  );
  await c.opp.skill(CeremonialBladework);
  c.expect($.my.active).toHaveVariable({ health: 9 });
  c.expect(darkShadow).toHaveVariable({ usage: 2 });
});

test("dark shadow: standby characters are not protected by the barrier", async () => {
  // 规则集：③我方出战角色受到伤害时：伤害值-1
  // 场景：砂糖 3 点风伤扩散火，出战角色受伤 -1，被扩散的后台角色不减伤
  // 断言：出战角色受到 2 点，后台各受到 1 点；可用次数只因出战角色受伤 -2
  const darkShadow = ref();
  const active = ref();
  const standby1 = ref();
  const standby2 = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Sucrose} />
      <Character my active health={10} aura={Aura.Pyro} ref={active} />
      <Character my health={10} ref={standby1} />
      <Character my def={AlldevouringNarwhal} health={6} ref={standby2} />
      <CombatStatus my def={DeepDevourersDomain} />
      <Summon my def={DarkShadow} ref={darkShadow} v={{ atk: 1, usage: 4 }} />
    </State>,
  );
  await c.opp.skill(AstableAnemohypostasisCreation6308);
  c.expect(active).toHaveVariable({ health: 8 });
  c.expect(standby1).toHaveVariable({ health: 9 });
  c.expect(standby2).toHaveVariable({ health: 5 });
  c.expect(darkShadow).toHaveVariable({ usage: 2 });
});

test("dark shadow: two separate hits in one action are each reduced and each cost 2 usage", async () => {
  // 规则集：④我方出战角色受到伤害后：若③不可用->令③可用，此牌可用次数-2
  // 场景：香菱普攻 2 点物理 + 旋火轮 2 点火伤，两次独立伤害
  // 断言：两次各 -1（共受到 2 点），可用次数 4 -> 0（弃置）
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Xiangling} />
      <CombatStatus opp def={PyronadoStatus} usage={2} />
      <Character my active health={10} />
      <Character my def={AlldevouringNarwhal} />
      <Summon my def={DarkShadow} v={{ atk: 1, usage: 4 }} />
    </State>,
  );
  await c.opp.skill(DoughFu);
  c.expect($.my.active).toHaveVariable({ health: 8 });
  c.expect($.my.summon.def(DarkShadow)).toNotExist();
});
