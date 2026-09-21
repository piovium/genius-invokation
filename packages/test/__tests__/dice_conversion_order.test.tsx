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
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  BlazingTrail,
  FlamestriderBlazingTrail,
  Mavuika,
} from "@gi-tcg/data/internal/characters/pyro/mavuika.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import {
  CeremonialBladework,
  ColdbloodedStrike,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Sucrose } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Collei } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import { MaguuKenki } from "@gi-tcg/data/internal/characters/anemo/maguu_kenki.gts";
import { Azhdaha } from "@gi-tcg/data/internal/characters/geo/azhdaha.gts";
import {
  HavocExtinction,
  Skirk01,
} from "@gi-tcg/data/internal/characters/cryo/skirk.gts";
import {
  ConductorsTopHat,
  ConductorsTopHatInEffect,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  ChangingShifts,
  Strategize,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

const { Cryo, Hydro, Pyro, Electro, Anemo, Geo, Dendro, Omni } = DiceType;

// 以下「转化序」用例以涉渡（无费用、固定转化 2 骰）作为转化来源

test("dice conversion order: non-useful dice are converted before useful dice", async () => {
  // 规则集：非有效骰优先于有效骰
  // 冰是有效骰（凯亚存活），水是非有效骰；水虽然更多，仍先被转化
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Kaeya} />
      <Character my def={Sucrose} />
      <DiceCount my dice={[Cryo, Hydro, Hydro, Hydro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Cryo,
    Hydro,
    Omni,
    Omni,
  ]);
});

test("dice conversion order: a die matching any alive character (even standby) is useful", async () => {
  // 规则集：与任意己方存活角色属性相同的骰子称为有效
  // 冰只与后台凯亚同属性，仍为有效骰，数量更少也不会先被转化
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Sucrose} />
      <Character my def={Kaeya} />
      <DiceCount my dice={[Cryo, Cryo, Hydro, Hydro, Hydro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Cryo,
    Cryo,
    Hydro,
    Omni,
    Omni,
  ]);
});

test("dice conversion order: a defeated character's element is no longer useful", async () => {
  // 规则集：与任意己方存活角色属性相同的骰子称为有效
  // 凯亚已倒下，冰变为非有效骰；冰、水都非有效，数量少的冰先被转化
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Sucrose} />
      <Character my def={Kaeya} alive={0} health={0} />
      <DiceCount my dice={[Cryo, Cryo, Hydro, Hydro, Hydro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Hydro,
    Hydro,
    Hydro,
    Omni,
    Omni,
  ]);
});

test("dice conversion order: the color with fewer dice is converted first", async () => {
  // 规则集：同色数量少优先于同色数量多
  // 水、雷都非有效；雷只有 2 个，先于 3 个的水被转化（若按元素顺序则会先转水）
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Kaeya} />
      <Character my def={Sucrose} />
      <DiceCount my dice={[Hydro, Hydro, Hydro, Electro, Electro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Hydro,
    Hydro,
    Hydro,
    Omni,
    Omni,
  ]);
});

test("dice conversion order: ties are broken by Cryo, Hydro before Electro, Geo", async () => {
  // 规则集：冰水火雷岩草风
  // 冰、水、雷、岩各 1 个且都非有效，按冰、水的顺序先被转化
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Sucrose} />
      <Character my def={Collei} />
      <DiceCount my dice={[Cryo, Hydro, Electro, Geo]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Electro,
    Geo,
    Omni,
    Omni,
  ]);
});

test.fails("dice conversion order: ties are broken by Geo, Dendro before Anemo", async () => {
  // 规则集：冰水火雷岩草风；当前引擎：按 DiceType 编号排序（风5 < 岩6 < 草7），即风先于岩、草被转化
  // 见 packages/core/src/utils.ts computeConvertDice 排序键最后一项直接用 DiceType 数值
  // 风、岩、草各 1 个且都非有效，按规则应先转化岩、草并保留风
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Diluc} />
      <Character my def={Kaeya} />
      <DiceCount my dice={[Anemo, Geo, Dendro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([Anemo, Omni, Omni]);
});

test("dice conversion order: Omni dice are never converted to a basic element", async () => {
  // 规则集：万能骰不能转化为基础骰
  // 极恶技·尽转化 2 骰为冰：支付 1 冰后剩水 + 3 万能，只有水被转化，万能骰保持不变
  const c = setup(
    <State>
      <Character my active def={Skirk01} />
      <DiceCount my dice={[Cryo, Hydro, Omni, Omni, Omni]} />
    </State>,
  );
  await c.me.skill(HavocExtinction);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Cryo,
    Omni,
    Omni,
    Omni,
  ]);
});

test("dice conversion order: priority is unrelated to the active character", async () => {
  // 规则集：优先级与出战角色无关
  // 火是使用涉渡时出战角色玛薇卡的元素，冰是转化发生时出战角色凯亚（涉渡已切换过去）的元素，
  // 两者都是有效骰；只按同色数量决定：冰 1 个先于火 2 个被转化，两个出战角色的元素都未被保护
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Kaeya} />
      <Character my def={Sucrose} />
      <DiceCount my dice={[Cryo, Pyro, Pyro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([Pyro, Omni, Omni]);
});

test("dice conversion order: Maguu Kenki and Azhdaha only count their own element", async () => {
  // 规则集：剑鬼若陀并没特殊优化，只看角色属性
  // 魔偶剑鬼（风）的冰系技能、若陀龙王（岩）的元素附着都不使冰成为有效骰；3 个冰仍先于风、岩被转化
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={MaguuKenki} />
      <Character my def={Azhdaha} />
      <DiceCount my dice={[Cryo, Cryo, Cryo, Anemo, Geo]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Cryo,
    Anemo,
    Geo,
    Omni,
    Omni,
  ]);
});

test("conductor's top hat: switching to the holder discards the most expensive hand, converts 2 dice and attaches the status", async () => {
  // 规则集：切换到所属角色后：若我方有手牌->随机舍弃当前元素骰费用最高的1张手牌，将2个元素骰转换为万能元素，所属角色附属[指挥的礼帽]
  // 手牌费用 0/1/3 互不相同，必定舍弃派蒙；切换花费 1 水后剩 4 水，其中 2 个转为万能
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya}>
        <Equipment def={ConductorsTopHat} />
      </Character>
      <Character my def={Sucrose} />
      <Card my def={ChangingShifts} />
      <Card my def={Strategize} />
      <Card my def={Paimon} />
      <DiceCount my dice={[Hydro, Hydro, Hydro, Hydro, Hydro]} />
    </State>,
  );
  await c.me.switch(kaeya);
  c.expect($.my.hand.def(Paimon)).toNotExist();
  c.expect($.my.hand).toBeCount(2);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Hydro,
    Hydro,
    Omni,
    Omni,
  ]);
  c.expect(
    $.my.character.def(Kaeya).has($.typeStatus.def(ConductorsTopHatInEffect)),
  ).toBeExist();
});

test("conductor's top hat: nothing happens when there is no hand", async () => {
  // 规则集：若我方有手牌->……（无手牌时整段效果不发动）
  // 无手牌切换到所属角色：不转化骰子，也不附属礼帽状态
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Diluc} />
      <Character my def={Kaeya} ref={kaeya}>
        <Equipment def={ConductorsTopHat} />
      </Character>
      <Character my def={Sucrose} />
      <DiceCount my dice={[Hydro, Hydro, Hydro, Hydro, Hydro]} />
    </State>,
  );
  await c.me.switch(kaeya);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Hydro,
    Hydro,
    Hydro,
    Hydro,
  ]);
  c.expect($.my.typeStatus.def(ConductorsTopHatInEffect)).toNotExist();
});

test("conductor's top hat: triggers only once per round", async () => {
  // 规则集：（每回合1次）
  // 同一回合第二次切换到所属角色：不再舍弃手牌、不再转化骰子
  const diluc = ref();
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Diluc} ref={diluc} />
      <Character my def={Kaeya} ref={kaeya}>
        <Equipment def={ConductorsTopHat} />
      </Character>
      <Character my def={Sucrose} />
      <Card my def={ChangingShifts} />
      <Card my def={Strategize} />
      <Card my def={Paimon} />
      <DiceCount my dice={[Hydro, Hydro, Hydro, Hydro, Hydro, Hydro]} />
    </State>,
  );
  // 第一次：花费 1 水，舍弃派蒙，2 水转万能 → 3 水 2 万能
  await c.me.switch(kaeya);
  await c.opp.end();
  // 切回迪卢克花费 1 水 → 2 水 2 万能
  await c.me.switch(diluc);
  // 再切到凯亚花费 1 水 → 1 水 2 万能；不再触发
  await c.me.switch(kaeya);
  c.expect($.my.hand).toBeCount(2);
  expect(c.state.players[0].dice).toIncludeSameMembers([Hydro, Omni, Omni]);
});

test("conductor's top hat: the once-per-round use is restored next round", async () => {
  // 规则集：（每回合1次）
  // 下一回合再次切换到所属角色时重新发动：手牌再被舍弃 1 张
  const diluc = ref();
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Diluc} ref={diluc} />
      <Character my def={Kaeya} ref={kaeya}>
        <Equipment def={ConductorsTopHat} />
      </Character>
      <Character my def={Sucrose} />
      <Card my def={ChangingShifts} />
      <Card my def={Strategize} />
      <Card my def={Paimon} />
    </State>,
  );
  // 第 1 回合触发一次
  await c.me.switch(kaeya);
  c.expect($.my.hand).toBeCount(2);
  await c.opp.end();
  await c.me.switch(diluc);
  await c.me.end();
  // 第 2 回合：对方先手（先宣布结束）
  await c.opp.end();
  const handsBefore = c.state.players[0].hands.length;
  await c.me.switch(kaeya);
  expect(c.state.players[0].hands.length).toBe(handsBefore - 1);
});

test("conductor's top hat status: the character's skill costs 1 less die, usable once", async () => {
  // 规则集：对角色打出【天赋】或角色使用技能时：少花费1个元素骰。可用次数：1
  // 仪典剑术 3 骰减为 2 骰，状态随即移除；再次使用恢复 3 骰
  const c = setup(
    <State>
      <Character my active def={Kaeya}>
        <Status def={ConductorsTopHatInEffect} />
      </Character>
    </State>,
  );
  await c.me.skill(CeremonialBladework);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect($.my.typeStatus.def(ConductorsTopHatInEffect)).toNotExist();
  await c.opp.end();
  await c.me.skill(CeremonialBladework);
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
});

test("conductor's top hat status: playing the character's talent costs 1 less die", async () => {
  // 规则集：对角色打出【天赋】或角色使用技能时：少花费1个元素骰。可用次数：1
  // 冷血之剑 3 骰减为 2 骰，状态随即移除
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={kaeya}>
        <Status def={ConductorsTopHatInEffect} />
      </Character>
      <Card my def={ColdbloodedStrike} />
    </State>,
  );
  await c.me.card(ColdbloodedStrike, kaeya);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect($.my.typeStatus.def(ConductorsTopHatInEffect)).toNotExist();
});

test("blazing trail: switches to the next character, converts 2 dice to Omni and grants an extra action", async () => {
  // 规则集：我方切换到下一个角色，将2个元素骰转换为万能，获得【额外行动】
  // 使用后出战角色变为下一个角色凯亚，2 水转为万能，且仍轮到我方行动
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Mavuika}>
        <Equipment def={FlamestriderBlazingTrail} />
      </Character>
      <Character my def={Kaeya} ref={kaeya} />
      <Character my def={Sucrose} />
      <DiceCount my dice={[Hydro, Hydro, Hydro, Hydro]} />
    </State>,
  );
  await c.me.skill(BlazingTrail);
  c.expect($.my.active).toBe(kaeya);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    Hydro,
    Hydro,
    Omni,
    Omni,
  ]);
  expect(c.state.currentTurn).toBe(0);
  // 额外行动：我方可以继续行动
  await c.me.end();
  expect(c.state.currentTurn).toBe(1);
});
