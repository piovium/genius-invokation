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
  Equipment,
  ref,
  setup,
  State,
  Status,
  Summon,
} from "#test";
import { TheBestestTravelCompanion } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  CrushingThunder,
  ElectroCicin,
  ElectroCicinsGleam,
  FatuiElectroCicinMage,
  MistyCall,
} from "@gi-tcg/data/internal/characters/electro/fatui_electro_cicin_mage.gts";
import { Convalescence } from "@gi-tcg/data/internal/characters/hydro/sigewinne.gts";
import { Frozen } from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

test("electro cicin: creates crushing thunder for the opponent on enter", async () => {
  // 规则集：雷莹①入场时，对方生成【雷压】
  const c = setup(
    <State>
      <Character my active def={FatuiElectroCicinMage} />
    </State>,
  );
  await c.me.skill(MistyCall);
  c.expect($.my.summon.def(ElectroCicin)).toBeExist();
  c.expect($.opp.combatStatus.def(CrushingThunder)).toBeExist();
});

test("electro cicin: removes the opponent's crushing thunder when it leaves", async () => {
  // 规则集：雷莹②离场时，移除对方【雷压】
  const c = setup(
    <State>
      <Character my active def={FatuiElectroCicinMage} />
      <Summon my def={ElectroCicin} usage={1} />
      <CombatStatus opp def={CrushingThunder} />
    </State>,
  );
  // 结束阶段雷莹造成伤害后可用次数耗尽而离场
  await c.me.end();
  await c.opp.end();
  c.expect($.my.summon.def(ElectroCicin)).toNotExist();
  c.expect($.opp.combatStatus.def(CrushingThunder)).toNotExist();
});

test("electro cicin: deals 1 electro damage at end phase", async () => {
  // 规则集：雷莹③结束阶段：造成1点雷元素伤害。可用次数：3
  const cicin = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={FatuiElectroCicinMage} />
      <Summon my def={ElectroCicin} usage={3} ref={cicin} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect(cicin).toHaveVariable({ usage: 2 });
});

test("crushing thunder: 3 played cards give electro cicin one more usage", async () => {
  // 规则集：雷压 己方使用行动牌后：层数+1（至多为3），然后若层数为3且对方【雷莹】可用次数不大于2，
  // 消耗所有层数，对方【雷莹】可用次数+1
  const cicin = ref();
  const pressure = ref();
  const c = setup(
    <State>
      <Character opp active def={FatuiElectroCicinMage} />
      <Summon opp def={ElectroCicin} usage={2} ref={cicin} />
      <CombatStatus
        my
        def={CrushingThunder}
        v={{ playedCard: 2 }}
        ref={pressure}
      />
      <Card my def={TheBestestTravelCompanion} />
    </State>,
  );
  await c.me.card(TheBestestTravelCompanion);
  c.expect(cicin).toHaveVariable({ usage: 3 });
  c.expect(pressure).toHaveVariable({ playedCard: 0 });
});

test.fails("crushing thunder: keeps stacks when cicin already has 3 usages", async () => {
  // 规则集：……然后若层数为3且对方【雷莹】可用次数不大于2，消耗所有层数，对方【雷莹】可用次数+1
  // 雷莹可用次数为 3（大于 2）时不满足条件，层数不被消耗，停留在上限 3 层
  // 当前引擎：雷压只判断层数是否为 3，不判断雷莹可用次数，层数一律清零
  const cicin = ref();
  const pressure = ref();
  const c = setup(
    <State>
      <Character opp active def={FatuiElectroCicinMage} />
      <Summon opp def={ElectroCicin} usage={3} ref={cicin} />
      <CombatStatus
        my
        def={CrushingThunder}
        v={{ playedCard: 2 }}
        ref={pressure}
      />
      <Card my def={TheBestestTravelCompanion} />
    </State>,
  );
  await c.me.card(TheBestestTravelCompanion);
  c.expect(cicin).toHaveVariable({ usage: 3 });
  c.expect(pressure).toHaveVariable({ playedCard: 3 });
});

test("electro cicins gleam: cicin strikes before my action when it has 3 usages", async () => {
  // 规则集：雷莹浮闪①我方选择行动前：如果雷莹的可用次数至少为3，令其造成1点雷元素伤害
  //（消耗可用次数）（每回合1次）
  const cicin = ref();
  const talent = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={FatuiElectroCicinMage}>
        <Equipment def={ElectroCicinsGleam} ref={talent} />
      </Character>
      <Summon my def={ElectroCicin} usage={3} ref={cicin} />
    </State>,
  );
  await c.me.end();
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect(cicin).toHaveVariable({ usage: 2 });
  c.expect(talent).toHaveVariable({ usagePerRound: 0 });
});

test("electro cicins gleam: no strike when cicin has fewer than 3 usages", async () => {
  // 规则集：雷莹浮闪①……如果雷莹的可用次数至少为3……
  const cicin = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={FatuiElectroCicinMage}>
        <Equipment def={ElectroCicinsGleam} />
      </Character>
      <Summon my def={ElectroCicin} usage={2} ref={cicin} />
    </State>,
  );
  await c.me.end();
  c.expect($.opp.active).toHaveVariable({ health: 10 });
  c.expect(cicin).toHaveVariable({ usage: 2 });
});

test("electro cicins gleam: the damage source is the summon", async () => {
  // 规则集：注：赋予雷莹能力的①效果属于角色状态，而造成伤害的来源属于召唤物
  // 「静养」只增加我方「元素战技」或召唤物造成的伤害，据此检验伤害来源
  const convalescence = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={FatuiElectroCicinMage}>
        <Equipment def={ElectroCicinsGleam} />
      </Character>
      <Summon my def={ElectroCicin} usage={3} />
      <CombatStatus my def={Convalescence} usage={2} ref={convalescence} />
    </State>,
  );
  await c.me.end();
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect(convalescence).toHaveVariable({ usage: 1 });
});

test("electro cicins gleam: uses misty call when played", async () => {
  // 规则集：雷莹浮闪②入场时：使用【舞虚之召】
  const mage = ref();
  const c = setup(
    <State>
      <Character my active def={FatuiElectroCicinMage} ref={mage} />
      <Card my def={ElectroCicinsGleam} />
    </State>,
  );
  await c.me.card(ElectroCicinsGleam, mage);
  c.expect($.my.typeEquipment.def(ElectroCicinsGleam)).toBeExist();
  c.expect($.my.summon.def(ElectroCicin)).toBeExist();
  c.expect($.opp.combatStatus.def(CrushingThunder)).toBeExist();
});

test("electro cicins gleam: cannot be played when the mage cannot act", async () => {
  // 规则集：雷莹浮闪 条件：我方出战角色为愚人众·雷莹术士，且其可行动
  const mage = ref();
  const c = setup(
    <State>
      <Character my active def={FatuiElectroCicinMage} ref={mage}>
        <Status def={Frozen} />
      </Character>
      <Card my def={ElectroCicinsGleam} />
    </State>,
  );
  await expect(c.me.card(ElectroCicinsGleam, mage)).rejects.toThrow(
    /cannot play/i,
  );
});
