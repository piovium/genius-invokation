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
  $,
  Card,
  Character,
  CombatStatus,
  DeclaredEnd,
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
  Summon,
} from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";
import { Starsigns } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  FrostflakeArrow,
  Ganyu,
} from "@gi-tcg/data/internal/characters/cryo/ganyu.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  AdeptusArtPreserverOfFortune,
  AncientSwordArt,
  FortunepreservingTalisman,
  HeraldOfFrost,
  Qiqi,
  RiteOfResurrection,
} from "@gi-tcg/data/internal/characters/cryo/qiqi.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("herald of frost: end phase deals 1 cryo damage", async () => {
  // 规则：寒病鬼差①结束阶段：造成1点冰元素伤害。可用次数：3
  const summon = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Qiqi} />
      <Summon my def={HeraldOfFrost} ref={summon} />
    </State>,
  );
  await c.me.end();
  // 附着冰元素说明这 1 点是冰元素伤害而非物理伤害；可用次数由 3 减为 2
  c.expect($.opp.active).toHaveVariable({ health: 9, aura: Aura.Cryo });
  c.expect(summon).toHaveVariable({ usage: 2 });
});

test("herald of frost: normal attack heals the most injured character", async () => {
  // 规则：寒病鬼差②七七使用普通攻击后：治疗受伤最多的己方角色1点。
  const mostInjured = ref();
  const lessInjured = ref();
  const c = setup(
    <State>
      <Character opp active def={Kaeya} health={10} />
      <Character my active def={Qiqi} health={10} />
      <Character my ref={mostInjured} health={3} />
      <Character my ref={lessInjured} health={8} />
      <Summon my def={HeraldOfFrost} />
    </State>,
  );
  await c.me.skill(AncientSwordArt);
  // 只治疗受伤最多者，其余角色不受影响
  c.expect(mostInjured).toHaveVariable({ health: 4 });
  c.expect(lessInjured).toHaveVariable({ health: 8 });
});

test("herald of frost: only qiqi's normal attack triggers the healings", async () => {
  // 规则：寒病鬼差②七七使用普通攻击后：治疗受伤最多的己方角色1点。
  // 规则：寒病鬼差③七七使用普通攻击后：若有已受伤的我方角色->治疗出战角色1点。每回合1次。
  const kaeya = ref();
  const qiqi = ref();
  const summon = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Kaeya} ref={kaeya} health={6} />
      <Character my def={Qiqi} ref={qiqi} health={3} />
      <Summon my def={HeraldOfFrost} ref={summon} />
    </State>,
  );
  // 由凯亚而非七七使用普通攻击：②③都不发动，③的每回合次数也不被消耗
  await c.me.skill(CeremonialBladework);
  c.expect(qiqi).toHaveVariable({ health: 3 });
  c.expect(kaeya).toHaveVariable({ health: 6 });
  c.expect(summon).toHaveVariable({ usagePerRound: 1 });
});

test("herald of frost: third effect fires even when active is not injured", async () => {
  // 规则：注：即时出战角色未受伤，有后台受伤角色，也会发动③（每回合1次）
  const qiqi = ref();
  const standby = ref();
  const summon = ref();
  const c = setup(
    <State>
      <Character opp active def={Kaeya} health={10} />
      <Character my active def={Qiqi} ref={qiqi} health={10} maxHealth={10} />
      <Character my ref={standby} health={5} />
      <Summon my def={HeraldOfFrost} ref={summon} />
    </State>,
  );
  // 出战七七满血、后台受伤：③仍然发动（治疗量溢出），本回合 1 次已消耗
  await c.me.skill(AncientSwordArt);
  c.expect(standby).toHaveVariable({ health: 6 });
  c.expect(summon).toHaveVariable({ usagePerRound: 0 });
  await c.opp.skill(CeremonialBladework);
  c.expect(qiqi).toHaveVariable({ health: 8 });
  // 同回合第二次普攻：②仍治疗后台，③已用完不再治疗出战角色
  await c.me.skill(AncientSwordArt);
  c.expect(standby).toHaveVariable({ health: 7 });
  c.expect(qiqi).toHaveVariable({ health: 8 });
});

test.fails("herald of frost: third effect requires an injured character", async () => {
  // 规则集：③七七使用普通攻击后：若有已受伤的我方角色->治疗出战角色1点。每回合1次。
  // 当前引擎：③没有「若有已受伤的我方角色」这一条件，我方全员满血时也照常发动并消耗本回合的1次机会，
  // 导致之后真正需要治疗时不再生效（下面第二次普攻后七七只被②治疗到 9 点）。
  const qiqi = ref();
  const summon = ref();
  const c = setup(
    <State>
      <Character opp active def={Kaeya} health={10} />
      <Character my active def={Qiqi} ref={qiqi} health={10} />
      <Summon my def={HeraldOfFrost} ref={summon} />
    </State>,
  );
  // 我方全部满血：③不满足「若有已受伤的我方角色」，不应发动，也不应消耗本回合的1次机会
  await c.me.skill(AncientSwordArt);
  c.expect(summon).toHaveVariable({ usagePerRound: 1 });
  await c.opp.skill(CeremonialBladework);
  c.expect(qiqi).toHaveVariable({ health: 8 });
  // 此时七七已受伤：②治疗受伤最多者（七七）1点，③再治疗出战角色1点
  await c.me.skill(AncientSwordArt);
  c.expect(qiqi).toHaveVariable({ health: 10 });
});

test("rite of resurrection: revives all defeated characters to 2 health", async () => {
  // 规则：若装备天赋，累积1层【苏】，若【苏】层数不大于2->复苏我方所有倒下的角色，治疗至2点
  const defeated1 = ref();
  const defeated2 = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Qiqi} energy={3}>
        <Equipment def={RiteOfResurrection} />
      </Character>
      <Character my ref={defeated1} health={0} alive={0} />
      <Character my ref={defeated2} health={0} alive={0} />
    </State>,
  );
  await c.me.skill(AdeptusArtPreserverOfFortune);
  c.expect($.opp.active).toHaveVariable({ health: 7, aura: Aura.Cryo });
  c.expect(defeated1).toHaveVariable({ health: 2, alive: 1 });
  c.expect(defeated2).toHaveVariable({ health: 2, alive: 1 });
  c.expect($.my.combatStatus.def(FortunepreservingTalisman)).toHaveVariable({
    usage: 3,
  });
});

test("fortunepreserving talisman: heals the skill user by 2", async () => {
  // 规则：度厄真符 我方角色使用【仙法·救苦度厄】以外的技能后：如果该角色生命值未满->治疗该角色2点。可用次数：3
  const kaeya = ref();
  const talisman = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Kaeya} ref={kaeya} health={5} />
      <Character my def={Qiqi} />
      <CombatStatus my def={FortunepreservingTalisman} ref={talisman} />
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  c.expect(kaeya).toHaveVariable({ health: 7 });
  c.expect(talisman).toHaveVariable({ usage: 2 });
});

test("fortunepreserving talisman: not triggered by the burst itself", async () => {
  // 规则：度厄真符 我方角色使用【仙法·救苦度厄】以外的技能后……
  const qiqi = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Qiqi} ref={qiqi} health={5} energy={3} />
      <CombatStatus my def={FortunepreservingTalisman} />
    </State>,
  );
  await c.me.skill(AdeptusArtPreserverOfFortune);
  // 使用仙法·救苦度厄不触发度厄真符，七七仍为 5 点生命
  c.expect(qiqi).toHaveVariable({ health: 5 });
});

test("fortunepreserving talisman: full health character does not consume usage", async () => {
  // 规则：度厄真符……如果该角色生命值未满->治疗该角色2点。可用次数：3
  const talisman = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Qiqi} health={10} maxHealth={10} />
      <CombatStatus my def={FortunepreservingTalisman} ref={talisman} />
    </State>,
  );
  await c.me.skill(AncientSwordArt);
  c.expect(talisman).toHaveVariable({ usage: 3 });
});

test("rite of resurrection: layers accumulate even when nobody is revived", async () => {
  // 规则：若装备天赋，累积1层【苏】，若【苏】层数不大于2->复苏我方所有倒下的角色，治疗至2点
  // 规则：注：没复活角色也会消耗次数
  const qiqi = ref();
  const ally = ref();
  const dying = ref();
  const oppGanyu = ref();
  const oppOther = ref();
  const c = setup(
    <State>
      <Character opp active def={Ganyu} ref={oppGanyu} health={12} />
      <Character opp ref={oppOther} health={10} />
      <Character opp health={10} />
      <Character my active def={Qiqi} ref={qiqi} health={10} energy={3}>
        <Equipment def={RiteOfResurrection} />
      </Character>
      <Character my def={Kaeya} ref={ally} health={10} />
      <Character my ref={dying} health={1} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <DiceCount my count={40} />
      <DiceCount opp count={20} />
    </State>,
  );
  // 第 1 次：我方无人倒下，仍然累积 1 层【苏】
  await c.me.skill(AdeptusArtPreserverOfFortune);
  await c.opp.switch(oppOther);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  // 第 2 次：我方仍无人倒下，累积至 2 层
  await c.me.skill(AdeptusArtPreserverOfFortune);
  await c.opp.switch(oppGanyu);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.switch(ally);
  // 甘雨霜华矢对我方后台造成 2 点穿透伤害，击倒 1 点生命的后台角色
  await c.opp.skill(FrostflakeArrow);
  c.expect(dying).toHaveVariable({ health: 0, alive: 0 });
  await c.me.switch(qiqi);
  await c.opp.end();
  // 第 3 次：【苏】层数再累积就大于 2，不再复苏倒下角色
  await c.me.skill(AdeptusArtPreserverOfFortune);
  c.expect(dying).toHaveVariable({ health: 0, alive: 0 });
});

test("rite of resurrection: being defeated clears the accumulated layers", async () => {
  // 规则：注：被击倒清空【苏】层数，复活能再使用
  const qiqi = ref();
  const ally = ref();
  const dying = ref();
  const oppGanyu = ref();
  const oppOther = ref();
  const c = setup(
    <State>
      <Character opp active def={Ganyu} ref={oppGanyu} health={12} />
      <Character opp ref={oppOther} health={10} />
      <Character opp health={10} />
      <Character my active def={Qiqi} ref={qiqi} health={2} energy={3}>
        <Equipment def={RiteOfResurrection} />
      </Character>
      <Character my def={Kaeya} ref={ally} health={10} />
      <Character my ref={dying} health={1} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={Starsigns} />
      <Card my def={TeyvatFriedEgg} />
      <Card my def={RiteOfResurrection} />
      <DiceCount my count={40} />
      <DiceCount opp count={20} />
    </State>,
  );
  // 两次仙法·救苦度厄，累积满 2 层【苏】
  await c.me.skill(AdeptusArtPreserverOfFortune);
  await c.opp.switch(oppOther);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.skill(AdeptusArtPreserverOfFortune);
  await c.opp.switch(oppGanyu);
  await c.me.switch(ally);
  // 霜华矢的穿透伤害同时击倒后台的七七与 1 点生命的角色
  await c.opp.skill(FrostflakeArrow);
  c.expect(qiqi).toHaveVariable({ health: 0, alive: 0 });
  c.expect(dying).toHaveVariable({ health: 0, alive: 0 });
  // 复苏七七并重新装备天赋
  await c.me.card(TeyvatFriedEgg, qiqi);
  await c.me.switch(qiqi);
  await c.opp.end();
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.card(Starsigns);
  await c.me.card(RiteOfResurrection, qiqi);
  // 被击倒已清空【苏】层数，此次仍能复苏倒下角色并治疗至 2 点
  c.expect(dying).toHaveVariable({ health: 2, alive: 1 });
});
