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

import { ref, setup, Character, State, Equipment, Card, Summon, CombatStatus, DeclaredEnd, Support, $ } from "#test";
import { GamblersEarrings } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { FreshWindOfFreedom, FreshWindOfFreedomInEffect } from "@gi-tcg/data/internal/cards/event/legend";
import { CountdownToTheShow2, IdRatherLoseMoneyMyself } from "@gi-tcg/data/internal/cards/event/other";
import { Vanarana } from "@gi-tcg/data/internal/cards/support/place";
import { LargeWindSpirit, Sucrose, WindSpiritCreation } from "@gi-tcg/data/internal/characters/anemo/sucrose";
import { CeremonialBladework, Icicle, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya";
import { SesshouSakura, SpiritfoxSineater, YaeMiko } from "@gi-tcg/data/internal/characters/electro/yae_miko";
import { Chevreuse, SecondaryExplosiveShells } from "@gi-tcg/data/internal/characters/pyro/chevreuse";
import { Guoba, Xiangling } from "@gi-tcg/data/internal/characters/pyro/xiangling";
import { Shield } from "@gi-tcg/data/internal/commons";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "bun:test";

test("FreshWindOfFreedom: not triggered at end phase", async () => {
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active def={Xiangling} health={1} />
      <Character opp ref={oppNext} />
      <Summon opp def={Guoba} />
      <Character my active def={Kaeya} health={1} aura={Aura.Electro} />
      <Character my ref={myNext} def={Sucrose} />
      <CombatStatus my def={Icicle} /> 
      <Card my def={FreshWindOfFreedom} />
    </State>,
  );
  await c.me.card(FreshWindOfFreedom);
  await c.me.end();
  await c.opp.end();
  // 节末伤害打到 myActive，自动超载，冰棱打到 oppActive 选人
  await c.opp.chooseActive(oppNext);

  expect(c.state.players[1].skipNextTurn).toBe(false);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(1);
});

test("FreshWindOfFreedom: triggered when I am choosing character at end phase, my turn", async () => {
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active def={Xiangling} health={1} />
      <Character opp ref={oppNext} />
      <Summon opp def={Guoba} />
      <Character my active def={Kaeya} health={1} />
      <Character my ref={myNext} def={Sucrose} />
      <CombatStatus my def={Icicle} />
      <Card my def={FreshWindOfFreedom} />
    </State>,
  );
  await c.me.card(FreshWindOfFreedom);
  await c.me.end();
  await c.opp.end();
  // 节末伤害打到 myActive，我方先选人
  await c.me.chooseActive(myNext);
  // 选人后冰棱打到 oppActive，对方选人
  await c.opp.chooseActive(oppNext);

  // 下一回合对方轮次跳过，我方可再行动一次
  expect(c.state.players[1].skipNextTurn).toBe(true);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(WindSpiritCreation);
});

test("FreshWindOfFreedom: do NOT triggered when I am choosing character at end phase, opp's turn", async () => {
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={Xiangling} health={1} />
      <Character opp ref={oppNext} def={Sucrose} />
      <Summon opp def={Guoba} />
      <Character my active def={Kaeya} health={1} />
      <Character my ref={myNext} def={Sucrose} />
      <CombatStatus my def={Icicle} />
      <Card my def={FreshWindOfFreedom} />
    </State>,
  );
  await c.me.card(FreshWindOfFreedom);
  await c.me.end();
  // 节末伤害打到 myActive，我方先选人
  await c.me.chooseActive(myNext);
  // 选人后冰棱打到 oppActive，对方选人
  await c.opp.chooseActive(oppNext);

  expect(c.state.players[1].skipNextTurn).toBe(false);
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(WindSpiritCreation);
  // 我方不会多一个轮次
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(1);
});

test("FreshWindOfFreedom: triggered when opp is choosing character at end phase, my turn", async () => {
  const oppNext = ref();
  const oppLast = ref();
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp ref={oppNext} health={1} />
      <Character opp ref={oppLast} />
      <CombatStatus opp def={SecondaryExplosiveShells} />
      <Character my active def={Sucrose} />
      <Character my def={Chevreuse} />
      <Summon my def={LargeWindSpirit} />
      <Card my def={FreshWindOfFreedom} />
    </State>,
  );
  await c.me.card(FreshWindOfFreedom);
  await c.me.end();
  await c.opp.end();
  // 节末伤害打到 oppActive，对方选人
  await c.opp.chooseActive(oppNext).manual();
  // 此时“自由的新风（生效中）”还未触发
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toBeExist();
  // 选人后二重毁伤弹打到 oppNext，对方再选人
  await c.opp.chooseActive(oppLast);
  // 此时“自由的新风（生效中）”已触发并弃置
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toNotExist();

  // 下一回合对方轮次跳过，我方可再行动一次
  expect(c.state.players[1].skipNextTurn).toBe(true);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(WindSpiritCreation);
});

test("FreshWindOfFreedom: do NOT triggered by SesshouSakura", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={1} />
      <Character opp ref={oppNext} def={Kaeya} />
      <Character my active def={YaeMiko} />
      <Summon my def={SesshouSakura} usage={4} />
      <Card my def={FreshWindOfFreedom} />
    </State>,
  );
  await c.me.card(FreshWindOfFreedom);
  await c.me.end();
  // 杀生樱触发，但是此时 currentTurn 是对方，所以不触发自新
  await c.opp.chooseActive(oppNext);

  expect(c.state.players[1].skipNextTurn).toBe(false);
  expect(c.state.currentTurn).toBe(1);
  await c.opp.skill(CeremonialBladework);
  // 我方不会多一个轮次
  await c.me.skill(SpiritfoxSineater);
  expect(c.state.currentTurn).toBe(1);
});

// “看到那小子挣钱”的“bug”和新风有紧密联系，也在这里写下单测
test("IdRatherLoseMoneyMyself: on endPhase, trigger generateDice", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <Card opp def={IdRatherLoseMoneyMyself} />
      <Card opp def={CountdownToTheShow2} />
      <Support opp def={Vanarana} />
      <Character opp active def={Kaeya} health={1} />
      <Character opp ref={oppNext} />
      <Character my active def={Xiangling}>
        <Equipment def={GamblersEarrings} />
      </Character>
      <Summon my def={Guoba} />
    </State>
  );
  await c.me.end();
  await c.opp.card(IdRatherLoseMoneyMyself);
  // 把骰子耗光
  await c.opp.skill(CeremonialBladework);
  await c.opp.skill(CeremonialBladework);
  await c.opp.card(CountdownToTheShow2);
  expect(c.state.players[1].dice).toBeArrayOfSize(0);

  await c.opp.end();
  // 锅巴击倒对面出战，选人
  await c.opp.chooseActive(oppNext);

  // 对方赚钱没有触发生成护盾
  c.expect($.opp.combatStatus.def(Shield)).toNotExist();
  expect(c.state.players[1].dice).toBeArrayOfSize(10);
})
