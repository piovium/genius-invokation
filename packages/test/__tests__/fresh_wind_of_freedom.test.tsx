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
import { GamblersEarrings } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { FreshWindOfFreedom, FreshWindOfFreedomInEffect } from "@gi-tcg/data/internal/cards/event/legend.gts";
import { CountdownToTheShow2, IdRatherLoseMoneyMyself, LeaveItToMe } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Vanarana } from "@gi-tcg/data/internal/cards/support/place.gts";
import { LargeWindSpirit, Sucrose, WindSpiritCreation } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { CeremonialBladework, Icicle, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { SesshouSakura, SpiritfoxSineater, YaeMiko } from "@gi-tcg/data/internal/characters/electro/yae_miko.gts";
import { Chevreuse, SecondaryExplosiveShells } from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import { Guoba, Xiangling } from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { Shield } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

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

test("FreshWindOfFreedom: combat-action switch defeating opp, extra action right after the switch", async () => {
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp ref={oppNext} />
      <Character my active def={Kaeya} />
      <Character my ref={myNext} def={Sucrose} />
      <CombatStatus my def={Icicle} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  // 规则集：切换角色（战斗行动）击倒对方角色的场合，在切换角色后之后执行一个额外行动
  // 切换（战斗行动）触发冰棱击倒对方出战角色，对方选人
  await c.me.switch(myNext);
  await c.opp.chooseActive(oppNext);
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toNotExist();
  // 切换结束后紧接着仍由我方行动
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(WindSpiritCreation);
  // 额外行动用完后轮到对方
  expect(c.state.currentTurn).toBe(1);
});

test("FreshWindOfFreedom: quick-action switch defeating opp, extra action after my next combat action", async () => {
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp ref={oppNext} />
      <Character my active def={Kaeya} />
      <Character my ref={myNext} def={Sucrose} />
      <CombatStatus my def={Icicle} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
      <Card my def={LeaveItToMe} />
    </State>,
  );
  // 规则集：切换角色（快速行动）击倒对方角色的场合，我方下次战斗行动后，再进行一次行动
  await c.me.card(LeaveItToMe);
  // 快速行动切换，冰棱击倒对方出战角色
  await c.me.switch(myNext);
  await c.opp.chooseActive(oppNext);
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toNotExist();
  expect(c.state.currentTurn).toBe(0);
  // 下次战斗行动后仍由我方再行动一次
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(1);
});

test("FreshWindOfFreedom: not triggered after opp declared end", async () => {
  const myNext = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={1} />
      <Character opp ref={oppNext} />
      <Character my active def={Kaeya} />
      <Character my ref={myNext} def={Sucrose} />
      <CombatStatus my def={Icicle} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  // 规则集：对方或我方宣布结束后：自由的新风（出战状态）不能发动
  // 对方已宣布结束，我方切换触发冰棱击倒对方出战角色
  await c.me.switch(myNext);
  await c.opp.chooseActive(oppNext);
  // 未发动：状态仍在，对方也不会被跳过轮次
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toBeExist();
  expect(c.state.players[1].skipNextTurn).toBe(false);
  // 下回合对方（先宣布结束）正常先手
  await c.me.end();
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.currentTurn).toBe(1);
});

test("FreshWindOfFreedom: not triggered after I declared end", async () => {
  const oppFirst = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppFirst} />
      <Character opp ref={oppNext} health={1} />
      <CombatStatus opp def={SecondaryExplosiveShells} />
      <Character my active def={Sucrose} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  // 规则集：对方或我方宣布结束后：自由的新风（出战状态）不能发动
  await c.me.end();
  // 我方已宣布结束，对方切换角色后二重毁伤弹击倒切入的角色
  await c.opp.switch(oppNext);
  await c.opp.chooseActive(oppFirst);
  // 未发动：状态仍在，对方也不会被跳过轮次
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toBeExist();
  expect(c.state.players[1].skipNextTurn).toBe(false);
  // 下回合我方先手行动一次后即轮到对方，没有额外行动
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(1);
});

test("FreshWindOfFreedom: declared-end flags are cleared when end phase begins", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp ref={oppNext} />
      <Character my active def={Xiangling} />
      <Summon my def={Guoba} />
    </State>,
  );
  // 规则集：结束阶段开始会清除【宣布结束】的状态
  await c.me.end();
  expect(c.state.players[0].declaredEnd).toBe(true);
  await c.opp.end();
  // 锅巴在结束阶段击倒对方出战角色，此时停在选人；双方的宣布结束标记均已清除
  expect(c.state.phase).toBe("end");
  expect(c.state.players[0].declaredEnd).toBe(false);
  expect(c.state.players[1].declaredEnd).toBe(false);
  await c.opp.chooseActive(oppNext);
});

test("FreshWindOfFreedom: not triggered when opp is defeated during opp's own turn in action phase", async () => {
  const oppFirst = ref();
  const oppNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={oppFirst} />
      <Character opp ref={oppNext} health={1} />
      <CombatStatus opp def={SecondaryExplosiveShells} />
      <Character my active def={Sucrose} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  // 规则集：对方角色被击倒后：若我方有行动权且所有玩家都没有宣布结束状态且（当前阶段为玩家行动或选择出战角色）->获得【额外行动】
  // 行动阶段、双方均未宣布结束，但行动权在对方：对方切换后二重毁伤弹击倒切入的角色，不发动
  await c.opp.switch(oppNext);
  await c.opp.chooseActive(oppFirst);
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toBeExist();
  expect(c.state.players[1].skipNextTurn).toBe(false);
  // 对方战斗行动结束后轮到我方，我方行动一次后即轮到对方，没有额外行动
  expect(c.state.currentTurn).toBe(0);
  await c.me.skill(WindSpiritCreation);
  expect(c.state.currentTurn).toBe(1);
});
