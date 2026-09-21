
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

import { ref, setup, Character, State, Equipment, CombatStatus, Summon, Card, DeclaredEnd, $ } from "#test";
import { BurstScan, Kaveh, ArtisticIngenuity } from "@gi-tcg/data/internal/characters/dendro/kaveh.gts";
import { FlamestriderSoaringAscent } from "@gi-tcg/data/internal/characters/pyro/mavuika.gts";
import { BountifulCore } from "@gi-tcg/data/internal/characters/hydro/nilou.gts";
import { TossUp, Strategize, FlyingSquadAttack } from "@gi-tcg/data/internal/cards/event/other.gts";
import { DendroCore } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("kaveh deal damage after dispose card", async () => {
  const target = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={3} />
      <Character opp ref={target} health={10} aura={Aura.Hydro} />
      <Character my def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan}  usage={1} />
      <Card pile my def={FlamestriderSoaringAscent} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.combatStatus.def(DendroCore)).toNotExist();
  c.expect($.opp.active.onlyDefeated).toBeExist();
  await c.opp.chooseActive(target);
  // 3草伤+1绽放
  c.expect(target).toHaveVariable({ health: 6 });
  c.expect($.my.combatStatus.def(DendroCore)).toBeExist();
});

test("kaveh burst scan with empty pile does nothing", async () => {
  const c = setup(
    <State currentTurn="opp">
      <Character opp active />
      <Character my def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan} usage={1} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.combatStatus.def(DendroCore)).toHaveVariable({ usage: 1 });
  c.expect($.my.combatStatus.def(BurstScan)).toHaveVariable({ usage: 1 });
});

test("burst scan: X=0 still attaches dendro", async () => {
  // 规则集：X为0也能造成伤害和附着
  // 断言：舍弃 0 费牌后对无附着目标造成 0 点草伤，草元素附着；草原核与迸发扫描各消耗一次
  const target = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={10} ref={target} />
      <Character my def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card pile my def={TossUp} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect(target).toHaveVariable({ health: 10, aura: Aura.Dendro });
  c.expect($.my.combatStatus.def(DendroCore)).toNotExist();
  c.expect($.my.combatStatus.def(BurstScan)).toNotExist();
});

test("burst scan: X=0 still counts as damage (bloom with hydro target)", async () => {
  // 规则集：X为0也能造成伤害和附着
  // 断言：0 点草伤对水附着目标引发绽放，+1 伤害并重新生成草原核
  const target = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={10} aura={Aura.Hydro} ref={target} />
      <Character my def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card pile my def={TossUp} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect(target).toHaveVariable({ health: 9, aura: Aura.None });
  c.expect($.my.combatStatus.def(DendroCore)).toHaveVariable({ usage: 1 });
});

test("burst scan: discard and damage are two effects, discard-triggered pyro damage gets burgeon", async () => {
  // 规则集：注：弃牌和造成伤害是两个效果，弃置造成火伤可用触发烈绽放
  // 断言：驰轮车·跃升被舍弃造成的 1 火伤在草原核被消耗前结算 → 烈绽放 +2；随后 ② 消耗草原核并造成 3 草伤（火附着 → 燃烧 +1）
  const target = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={10} ref={target} />
      <Character my def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card pile my def={FlamestriderSoaringAscent} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect(target).toHaveVariable({ health: 3 });
  c.expect($.my.combatStatus.def(DendroCore)).toNotExist();
});

test("burst scan: also triggers with bountiful core and consumes its usage", async () => {
  // 规则集：①如果我方场上存在草原核或丰壤之核->舍弃我方牌库顶的1张牌；②我方草原核和丰壤之核可用次数-1，造成X点伤害
  // 断言：丰穰之核可用次数 -1，造成 1 点草伤（运筹帷幄费用 1）
  const target = ref();
  const core = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={10} ref={target} />
      <Character my def={Kaveh} />
      <Summon my def={BountifulCore} usage={2} ref={core} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card pile my def={Strategize} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect(target).toHaveVariable({ health: 9, aura: Aura.Dendro });
  c.expect(core).toHaveVariable({ usage: 1 });
  c.expect($.my.combatStatus.def(BurstScan)).toNotExist();
});

test("burst scan: usage stacks up to 3", async () => {
  // 规则集：可用次数：1（上限为3）
  // 断言：已有 2 层时再生成一层为 3，继续生成不超过 3
  const c = setup(
    <State>
      <Character opp active health={20} />
      <DeclaredEnd opp />
      <Character my active def={Kaveh} />
      <CombatStatus my def={BurstScan} usage={2} />
    </State>,
  );
  await c.me.skill(ArtisticIngenuity);
  c.expect($.my.combatStatus.def(BurstScan)).toBeUnique();
  c.expect($.my.combatStatus.def(BurstScan)).toHaveVariable({ usage: 3 });
  await c.me.skill(ArtisticIngenuity);
  c.expect($.my.combatStatus.def(BurstScan)).toHaveVariable({ usage: 3 });
});

test("burst scan: ② only triggers for discards caused by ①", async () => {
  // 规则集：②因①舍弃牌后：我方草原核和丰壤之核可用次数-1，造成X点伤害
  // 断言：由其他来源（飞行队出击！）舍弃手牌不触发 ②：草原核不消耗、迸发扫描不消耗、不造成伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target} />
      <Character my active def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card my def={FlyingSquadAttack} />
      <Card my def={Strategize} />
    </State>,
  );
  await c.me.card(FlyingSquadAttack);
  c.expect($.my.hand.def(Strategize)).toNotExist();
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.combatStatus.def(DendroCore)).toHaveVariable({ usage: 1 });
  c.expect($.my.combatStatus.def(BurstScan)).toHaveVariable({ usage: 1 });
});

test("burst scan: ① also triggers before my own action", async () => {
  // 规则集：①双方选择行动前：如果我方场上存在草原核或丰壤之核->舍弃我方牌库顶的1张牌
  // 断言：我方选择行动前同样舍弃牌库顶并造成 1 点草伤（运筹帷幄费用 1）
  const target = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={target} />
      <Character my active def={Kaveh} />
      <CombatStatus my def={DendroCore} usage={1} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card pile my def={Strategize} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.pile).toNotExist();
  c.expect(target).toHaveVariable({ health: 9, aura: Aura.Dendro });
  c.expect($.my.combatStatus.def(DendroCore)).toNotExist();
});

test("burst scan: ① does not discard without dendro core or bountiful core", async () => {
  // 规则集：①双方选择行动前：如果我方场上存在草原核或丰壤之核->舍弃我方牌库顶的1张牌
  // 断言：无草原核 / 丰穰之核时不舍弃牌库顶、不造成伤害，迸发扫描不消耗
  const target = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active health={10} ref={target} />
      <Character my def={Kaveh} />
      <CombatStatus my def={BurstScan} usage={1} />
      <Card pile my def={Strategize} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.pile.def(Strategize)).toBeExist();
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.combatStatus.def(BurstScan)).toHaveVariable({ usage: 1 });
});
