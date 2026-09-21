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
  Support,
} from "#test";
import { ConductorsTopHat } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  CountdownToTheShow2,
  CountdownToTheShow3,
  GuardiansOath,
  SunyataFlower,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { TideTurningSacredLord } from "@gi-tcg/data/internal/cards/support/adventure.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { NashaTown } from "@gi-tcg/data/internal/cards/support/place.gts";
import { Icicle, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Guoba } from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import {
  FireworkFlareup,
  NiwabiEnshou,
  Yoimiya,
} from "@gi-tcg/data/internal/characters/pyro/yoimiya.gts";
import { expect, test } from "vitest";

test("usage: each activation consumes 1 usage (status / summon / support)", async () => {
  // 规则集：拥有可用次数的实体，每次发动任意能力后会减少1次
  // 角色状态、出战状态、召唤物、支援物各发动一次能力后，可用次数各 -1
  // 对方出战角色血量调高，避免其被击倒中断流程（须走到下回合行动阶段才能观察派蒙）
  const yoimiya = ref();
  const kaeya = ref();
  const niwabi = ref();
  const icicle = ref();
  const guoba = ref();
  const paimon = ref();
  const c = setup(
    <State>
      <Character opp active health={30} maxHealth={30} />
      <Character my active def={Yoimiya} ref={yoimiya}>
        <Status def={NiwabiEnshou} usage={2} ref={niwabi} />
      </Character>
      <Character my def={Kaeya} ref={kaeya} />
      <CombatStatus my def={Icicle} usage={3} ref={icicle} />
      <Summon my def={Guoba} usage={2} ref={guoba} />
      <Support my def={Paimon} usage={2} ref={paimon} />
    </State>,
  );
  // 普通攻击：庭火焰硝的「普通攻击伤害+1」发动
  await c.me.skill(FireworkFlareup);
  c.expect(niwabi).toHaveVariable({ usage: 1 });
  await c.opp.end();
  // 切换角色：寒冰之棱发动；「每次」发动都各扣 1 次
  await c.me.switch(kaeya);
  c.expect(icicle).toHaveVariable({ usage: 2 });
  await c.me.switch(yoimiya);
  c.expect(icicle).toHaveVariable({ usage: 1 });
  // 结束阶段：锅巴发动；下回合行动阶段开始：派蒙发动
  await c.me.end();
  c.expect(guoba).toHaveVariable({ usage: 1 });
  c.expect(paimon).toHaveVariable({ usage: 1 });
});

test("usage: entity is disposed when usage reaches 0", async () => {
  // 规则集：减少到0的场合，实体会被弃置
  // 可用次数均为 1 的角色状态、出战状态、召唤物、支援物各发动一次后被弃置
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Yoimiya}>
        <Status def={NiwabiEnshou} usage={1} />
      </Character>
      <Character my def={Kaeya} ref={kaeya} />
      <CombatStatus my def={Icicle} usage={1} />
      <Summon my def={Guoba} usage={1} />
      <Support my def={Paimon} usage={1} />
    </State>,
  );
  await c.me.skill(FireworkFlareup);
  c.expect($.my.character.has($.typeStatus.def(NiwabiEnshou))).toNotExist();
  await c.opp.end();
  await c.me.switch(kaeya);
  c.expect($.my.combatStatus.def(Icicle)).toNotExist();
  await c.me.end();
  c.expect($.my.summon.def(Guoba)).toNotExist();
  c.expect($.my.support.def(Paimon)).toNotExist();
});

test("dispose: disposed entity leaves the field and is moved to the graveyard", async () => {
  // 规则集：弃置：将实体移动到墓地的操作
  // 护法之誓消灭回天的圣主：召唤物离开召唤物区，其「被弃置时」能力仍然结算
  // （引擎中 selfDispose 的执行区域即 removedEntities＝墓地），对生命值最多的角色造成3点穿透伤害
  const c = setup(
    <State>
      <Character opp active health={12} maxHealth={12} />
      <Summon my def={TideTurningSacredLord} usage={3} />
      <Card my def={GuardiansOath} />
    </State>,
  );
  await c.me.card(GuardiansOath);
  c.expect($.my.summon).toNotExist();
  c.expect($.opp.active).toHaveVariable({ health: 9 });
});

test("dispose: discard is a kind of dispose", async () => {
  // 规则集：舍弃是弃置的一种方式
  // 指挥的礼帽舍弃手牌「幻戏倒计时：3」：该牌离开手牌，其「被舍弃后」能力仍从墓地结算，
  // 将「幻戏倒计时：2」置于牌库顶——与场上实体被弃置走同一条路径
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Yoimiya} />
      <Character my def={Kaeya} ref={kaeya}>
        <Equipment def={ConductorsTopHat} />
      </Character>
      <Card my def={CountdownToTheShow3} />
    </State>,
  );
  await c.me.switch(kaeya);
  c.expect($.my.hand).toNotExist();
  expect(c.state.players[0].pile[0].definition.id).toBe(CountdownToTheShow2);
});

test("dispose: usage is set to 0 before an on-stage support is destroyed", async () => {
  // 规则集：若一个场上实体具有可用次数，因消灭将其弃置的场合，先将可用次数减为0
  // 那夏镇「被弃置时：如果可用次数为0，造成2点物理伤害」；可用次数仍为 2 时被净觉花弃置，
  // 应先减为 0 而造成 2 点伤害（若不先减为 0，则不会有伤害）
  const nasha = ref();
  const c = setup(
    <State>
      <Support my def={NashaTown} usage={2} ref={nasha} />
      <Card my def={SunyataFlower} />
    </State>,
  );
  await c.me.card(SunyataFlower, nasha);
  c.expect($.my.support.def(NashaTown)).toNotExist();
  c.expect($.opp.active).toHaveVariable({ health: 8 });
});
