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

import { $, Character, CombatStatus, DeclaredEnd, DiceCount, ref, setup, State, Status } from "#test";
import { FreshWindOfFreedomInEffect } from "@gi-tcg/data/internal/cards/event/legend.gts";
import { WindAndFreedomInEffect } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Declension, FudouStyleMartialArts, HeartstopperStrike, PreexistingGuilt, ShikanoinHeizou } from "@gi-tcg/data/internal/characters/anemo/shikanoin_heizou.gts";
import { Sucrose, WindSpiritCreation } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { AurousBlaze, Yoimiya } from "@gi-tcg/data/internal/characters/pyro/yoimiya.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("heizou: continue next turn", async () => {
  const declension = ref();
  const c = setup(
    <State>
      <Character my active def={ShikanoinHeizou}>
        <Status def={Declension} v={{ henkaku: 5 }} ref={declension} />
      </Character>
      <Character my def={Yoimiya} />
      <CombatStatus my def={AurousBlaze} />
    </State>,
  );
  // 准备后：宵宫打 1 火，继续行动：打 5 风扩散
  await c.me.skill(HeartstopperStrike);
  c.expect($.opp.active).toHaveVariable({ health: 4, aura: Aura.None });
  c.expect($.opp.next).toHaveVariable({ health: 9, aura: Aura.Pyro });
  c.expect($.opp.prev).toHaveVariable({ health: 9, aura: Aura.Pyro });
  // 消耗 2 层变格，扩散 +1 层
  c.expect(declension).toHaveVariable({ henkaku: 4 });
});

test("heizou: ParadoxicalPractice triggered by any of my characters", async () => {
  const heizou = ref();
  const c = setup(
    <State>
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Sucrose} />
      <Character my def={ShikanoinHeizou} ref={heizou} />
    </State>,
  );
  // 规则集：反论稽古 我方触发风元素反应后：自身附属1层【变格】
  // 砂糖普攻扩散，后台的平藏也附属 1 层变格
  await c.me.skill(WindSpiritCreation);
  c.expect($.my.typeStatus.def(Declension)).toHaveVariable({ henkaku: 1 });
  c.expect($.my.character.has($.typeStatus.def(Declension))).toBe(heizou);
});

test("heizou: Declension stacks with no upper limit", async () => {
  const declension = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={ShikanoinHeizou}>
        <Status def={Declension} v={{ henkaku: 5 }} ref={declension} />
      </Character>
      <Character my def={Yoimiya} />
      <CombatStatus my def={AurousBlaze} />
      <DiceCount my count={12} />
    </State>,
  );
  // 规则集：变格（无层数上限）
  // 每次普攻扩散 +1 层（琉金火光在技能后重新挂火），5 层之上继续叠加
  await c.me.skill(FudouStyleMartialArts);
  await c.me.skill(FudouStyleMartialArts);
  await c.me.skill(FudouStyleMartialArts);
  c.expect(declension).toHaveVariable({ henkaku: 8 });
});

test("heizou: Declension does not trigger with less than 2 stacks", async () => {
  const declension = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={ShikanoinHeizou}>
        <Status def={Declension} v={{ henkaku: 1 }} ref={declension} />
      </Character>
    </State>,
  );
  // 规则集：角色使用【戮心拳】后：若此状态层数不小于2->消耗2层变格，附属【蓄力】，获得【额外行动】
  // 只有 1 层：不消耗层数，也不附属蓄力（蓄力伤害仍为 4）
  await c.me.skill(HeartstopperStrike);
  c.expect(declension).toHaveVariable({ henkaku: 1 });
  c.expect($.opp.active).toHaveVariable({ health: 6 });
});

test("heizou: charge bonus is used up by one HeartstopperStrikeCharge", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={ShikanoinHeizou}>
        <Status def={Declension} v={{ henkaku: 2 }} />
      </Character>
    </State>,
  );
  // 规则集：蓄力 戮心拳·蓄力造成伤害时：伤害+1 可用次数：1
  // 第一次蓄力 4+1=5
  await c.me.skill(HeartstopperStrike);
  c.expect($.opp.active).toHaveVariable({ health: 5 });
  // 蓄力已用尽，第二次蓄力只有 4
  await c.me.skill(HeartstopperStrike);
  c.expect($.opp.active).toHaveVariable({ health: 1 });
});

test("heizou: charge bonus is kept when HeartstopperStrikeCharge was not used", async () => {
  const heizou = ref();
  const c = setup(
    <State>
      <Character my active def={ShikanoinHeizou} ref={heizou}>
        <Status def={Declension} v={{ henkaku: 2 }} />
      </Character>
      <CombatStatus my def={WindAndFreedomInEffect} />
    </State>,
  );
  // 规则集：若触发变格后未能使用【戮心拳·蓄力】，下次使用【戮心拳·蓄力】也能+1
  // 风与自由在使用戮心拳后把平藏换下，准备技能被取消
  await c.me.skill(HeartstopperStrike);
  c.expect($.my.typeStatus.def(PreexistingGuilt)).toNotExist();
  c.expect($.my.typeStatus.def(Declension)).toNotExist();
  // 用掉变格给的额外行动，进入下一回合（风与自由失效）
  await c.me.end();
  await c.opp.end();
  await c.me.switch(heizou);
  await c.opp.end();
  // 本次戮心拳没有触发变格，蓄力仍然 4+1=5
  await c.me.skill(HeartstopperStrike);
  c.expect($.opp.active).toHaveVariable({ health: 5 });
});

test("heizou: charge bonus does not stack when Declension triggered twice", async () => {
  const heizou = ref();
  const c = setup(
    <State>
      <Character my active def={ShikanoinHeizou} ref={heizou}>
        <Status def={Declension} v={{ henkaku: 4 }} />
      </Character>
      <CombatStatus my def={WindAndFreedomInEffect} />
    </State>,
  );
  // 规则集：若触发变格后未能使用【戮心拳·蓄力】，下次使用【戮心拳·蓄力】也能+1（不可叠加）
  // 第一次触发变格后被风与自由换下，蓄力未使用
  await c.me.skill(HeartstopperStrike);
  c.expect($.my.typeStatus.def(PreexistingGuilt)).toNotExist();
  await c.me.end();
  await c.opp.end();
  await c.me.switch(heizou);
  await c.opp.end();
  // 第二次触发变格（4 层共消耗 2 次 2 层），蓄力加成不叠加，仍为 4+1=5
  await c.me.skill(HeartstopperStrike);
  c.expect($.my.typeStatus.def(Declension)).toNotExist();
  c.expect($.opp.active).toHaveVariable({ health: 5 });
});

test("heizou: Declension grants an extra action, not a fast action", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp ref={oppNext} />
      <Character my active def={ShikanoinHeizou}>
        <Status def={Declension} v={{ henkaku: 2 }} />
      </Character>
      <Character my def={Yoimiya} />
      <CombatStatus my def={AurousBlaze} />
      <CombatStatus my def={FreshWindOfFreedomInEffect} />
    </State>,
  );
  // 规则集：变格实际是获得额外行动，而非改为快速行动（如，不能跟新风叠加）
  // 琉金火光击倒对方出战角色，新风与变格同时生效
  await c.me.skill(HeartstopperStrike);
  await c.opp.chooseActive(oppNext);
  c.expect($.my.combatStatus.def(FreshWindOfFreedomInEffect)).toNotExist();
  // 两者都只是额外行动：只多出一次行动（准备好的蓄力），之后立刻轮到对方
  c.expect($.opp.active).toHaveVariable({ health: 5 });
  expect(c.state.currentTurn).toBe(1);
});

test("heizou: charge bonus only applies to HeartstopperStrikeCharge", async () => {
  const heizou = ref();
  const c = setup(
    <State>
      <Character my active def={ShikanoinHeizou} ref={heizou}>
        <Status def={Declension} v={{ henkaku: 2 }} />
      </Character>
      <CombatStatus my def={WindAndFreedomInEffect} />
    </State>,
  );
  // 规则集：蓄力 戮心拳·蓄力造成伤害时：伤害+1 可用次数：1
  // 触发变格后被风与自由换下，蓄力未使用
  await c.me.skill(HeartstopperStrike);
  await c.me.end();
  await c.opp.end();
  await c.me.switch(heizou);
  await c.opp.end();
  // 普攻不是戮心拳·蓄力：伤害仍为 1（而非 2），也不消耗蓄力
  await c.me.skill(FudouStyleMartialArts);
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  // 蓄力仍保留给戮心拳·蓄力：4+1=5
  await c.me.skill(HeartstopperStrike);
  c.expect($.opp.active).toHaveVariable({ health: 4 });
});
