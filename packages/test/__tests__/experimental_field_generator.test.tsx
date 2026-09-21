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
  Character,
  CombatStatus,
  DeclaredEnd,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  Evasion,
  ExperimentalFieldGenerator,
  ForceFieldManipulation,
  GravityApplicationCrush,
  GravityApplicationFieldReduction,
  LowGravityBackground,
  ShockBlast,
} from "@gi-tcg/data/internal/characters/geo/experimental_field_generator.gts";
import { Noelle } from "@gi-tcg/data/internal/characters/geo/noelle.gts";
import { Frostgnaw, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { DamageType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

/** 返回某角色身上的实体定义 id 列表 */
function entitiesOf(c: ReturnType<typeof setup>, who: 0 | 1, id: number) {
  return c.state.players[who].characters
    .find((ch) => ch.id === id)!
    .entities.map((e) => e.definition.id);
}

/** 记录某方视角下指定类型伤害的目标顺序 */
function recordTargets(
  c: ReturnType<typeof setup>,
  who: 0 | 1,
  damageType: DamageType,
) {
  const targets: number[] = [];
  c.game.players[who].io.notify = ({ mutation }) => {
    for (const { mutation: m } of mutation) {
      if (m?.$case === "damage" && m.value.damageType === damageType) {
        targets.push(m.value.targetId);
      }
    }
  };
  return targets;
}

test("gravity application field reduction: 3 geo damage, low gravity background + shock blast, force field manipulation on standby characters", async () => {
  // 规则集：重力应用程式·削减场域 造成3点岩元素伤害。生成【低重力背景】和【振荡冲击】，我方后台角色附属【力场操控】
  const efg = ref();
  const standbyA = ref();
  const standbyB = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={ExperimentalFieldGenerator} ref={efg} energy={2} />
      <Character my def={Noelle} ref={standbyA} />
      <Character my def={Kaeya} ref={standbyB} />
      <Character opp active def={Kaeya} ref={oppActive} health={10} />
    </State>,
  );
  await c.me.skill(GravityApplicationFieldReduction);
  c.expect(oppActive).toHaveVariable({ health: 7 });
  // 持续回合：2
  c.expect($.my.combatStatus.def(LowGravityBackground)).toHaveVariable({
    duration: 2,
  });
  c.expect($.my.combatStatus.def(ShockBlast)).toHaveVariable({ duration: 2 });
  expect(entitiesOf(c, 0, standbyA.id)).toContain(ForceFieldManipulation as number);
  expect(entitiesOf(c, 0, standbyB.id)).toContain(ForceFieldManipulation as number);
  expect(entitiesOf(c, 0, efg.id)).not.toContain(ForceFieldManipulation as number);
});

test("low gravity background: my character attaches evasion and switches to the next one after using a skill", async () => {
  // 规则集：低重力背景 - 双方角色使用不为【重力应用程式·削减场域】的技能后：该角色附属【回避】，切换至下一名角色
  const first = ref();
  const second = ref();
  const c = setup(
    <State>
      <Character my active def={ExperimentalFieldGenerator} ref={first} />
      <Character my def={Noelle} ref={second} />
      <Character my def={Kaeya} />
      <CombatStatus my def={LowGravityBackground} />
      <Character opp active def={Kaeya} />
    </State>,
  );
  await c.me.skill(GravityApplicationCrush);
  expect(entitiesOf(c, 0, first.id)).toContain(Evasion as number);
  // 持续回合：1
  c.expect($.my.typeStatus.def(Evasion)).toHaveVariable({ duration: 1 });
  expect(c.state.players[0].activeCharacterId).toBe(second.id);
});

test("low gravity background: the opponent's character is switched too", async () => {
  // 规则集：低重力背景 - 「双方」角色使用不为【重力应用程式·削减场域】的技能后：该角色附属【回避】，切换至下一名角色
  const oppFirst = ref();
  const oppSecond = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Noelle} />
      <CombatStatus my def={LowGravityBackground} />
      <Character opp active def={Kaeya} ref={oppFirst} />
      <Character opp def={Noelle} ref={oppSecond} />
      <Character opp def={Kaeya} />
    </State>,
  );
  await c.opp.skill(Frostgnaw);
  expect(entitiesOf(c, 1, oppFirst.id)).toContain(Evasion as number);
  expect(c.state.players[1].activeCharacterId).toBe(oppSecond.id);
});

test("low gravity background: the field reduction skill itself does not trigger the switch", async () => {
  // 规则集：低重力背景 - 双方角色使用「不为【重力应用程式·削减场域】」的技能后：该角色附属【回避】，切换至下一名角色
  const efg = ref();
  const c = setup(
    <State>
      <Character my active def={ExperimentalFieldGenerator} ref={efg} energy={2} />
      <Character my def={Noelle} />
      <CombatStatus my def={LowGravityBackground} />
      <Character opp active def={Kaeya} />
    </State>,
  );
  await c.me.skill(GravityApplicationFieldReduction);
  expect(entitiesOf(c, 0, efg.id)).not.toContain(Evasion as number);
  expect(c.state.players[0].activeCharacterId).toBe(efg.id);
});

test("low gravity background: my low gravity background does not switch the opponent using the field reduction skill", async () => {
  // 规则集（注）：我方场上有【低重力背景】，对方使用【重力应用程式·削减场域】也不会触发切换角色
  const oppFirst = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Noelle} health={10} />
      <CombatStatus my def={LowGravityBackground} />
      <Character opp active def={ExperimentalFieldGenerator} ref={oppFirst} energy={2} />
      <Character opp def={Noelle} />
    </State>,
  );
  await c.opp.skill(GravityApplicationFieldReduction);
  expect(entitiesOf(c, 1, oppFirst.id)).not.toContain(Evasion as number);
  expect(c.state.players[1].activeCharacterId).toBe(oppFirst.id);
});

test("shock blast: end phase deals 1 piercing damage to every character not attached with evasion", async () => {
  // 规则集：振荡冲击 结束阶段：对所有未附属回避的角色造成1点穿透伤害
  const evading = ref();
  const myB = ref();
  const oppA = ref();
  const c = setup(
    <State>
      <CombatStatus my def={ShockBlast} />
      <Character my active def={Noelle} ref={evading} health={10}>
        <Status def={Evasion} />
      </Character>
      <Character my def={Kaeya} ref={myB} health={10} />
      <Character opp active def={Kaeya} ref={oppA} health={10} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(evading).toHaveVariable({ health: 10 });
  c.expect(myB).toHaveVariable({ health: 9 });
  c.expect(oppA).toHaveVariable({ health: 9 });
});

test("shock blast: on each side the active character is damaged before the next one", async () => {
  // 规则集（注）：按我方先于对方|出战先于下一个的顺序造成伤害
  // 我方先宣布结束（结束阶段当前回合玩家为我方）：我方出战->下一个->下一个，再到对方出战->下一个->下一个
  const myA = ref();
  const myB = ref();
  const myC = ref();
  const oppA = ref();
  const oppB = ref();
  const oppC = ref();
  const c = setup(
    <State>
      <CombatStatus my def={ShockBlast} />
      <Character my active def={Noelle} ref={myA} health={10} />
      <Character my def={Kaeya} ref={myB} health={10} />
      <Character my def={Noelle} ref={myC} health={10} />
      <Character opp active def={Kaeya} ref={oppA} health={10} />
      <Character opp def={Noelle} ref={oppB} health={10} />
      <Character opp def={Kaeya} ref={oppC} health={10} />
    </State>,
  );
  const piercingTargets = recordTargets(c, 0, DamageType.Piercing);
  await c.me.end();
  await c.opp.end();
  expect(piercingTargets).toEqual([
    myA.id,
    myB.id,
    myC.id,
    oppA.id,
    oppB.id,
    oppC.id,
  ]);
});

test.fails("shock blast: my side is damaged before the opponent even when the opponent declared end first", async () => {
  // 规则集（注）：按我方先于对方|出战先于下一个的顺序造成伤害
  // 当前引擎：多目标伤害按 getAllEntitiesWithArea 的 [state.currentTurn, flip(currentTurn)] 排序，
  // 结束阶段的当前回合玩家是先宣布结束的一方，故对方先宣布结束时对方角色先受到穿透伤害
  const myA = ref();
  const myB = ref();
  const myC = ref();
  const oppA = ref();
  const oppB = ref();
  const oppC = ref();
  const c = setup(
    <State currentTurn="opp">
      <CombatStatus my def={ShockBlast} />
      <Character my active def={Noelle} ref={myA} health={10} />
      <Character my def={Kaeya} ref={myB} health={10} />
      <Character my def={Noelle} ref={myC} health={10} />
      <Character opp active def={Kaeya} ref={oppA} health={10} />
      <Character opp def={Noelle} ref={oppB} health={10} />
      <Character opp def={Kaeya} ref={oppC} health={10} />
    </State>,
  );
  const piercingTargets = recordTargets(c, 0, DamageType.Piercing);
  await c.opp.end();
  await c.me.end();
  expect(piercingTargets).toEqual([
    myA.id,
    myB.id,
    myC.id,
    oppA.id,
    oppB.id,
    oppC.id,
  ]);
});

test("force field manipulation: deducts 1 void die from the next normal attack only once", async () => {
  // 规则集：力场操控 - 普通攻击时：少花费1个无色元素；可用次数：1
  // 重力应用程式·砸击 费用 1 岩 + 2 无色：首次 2 骰，其后恢复 3 骰
  const c = setup(
    <State>
      <Character my active def={ExperimentalFieldGenerator}>
        <Status def={ForceFieldManipulation} />
      </Character>
      <Character opp active def={Kaeya} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.skill(GravityApplicationCrush);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  await c.me.skill(GravityApplicationCrush);
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
});

test("force field manipulation: lasts for one round", async () => {
  // 规则集：力场操控 - 持续回合：1
  const c = setup(
    <State>
      <Character my active def={ExperimentalFieldGenerator}>
        <Status def={ForceFieldManipulation} />
      </Character>
      <Character opp active def={Kaeya} />
      <DeclaredEnd opp />
    </State>,
  );
  c.expect($.my.typeStatus.def(ForceFieldManipulation)).toBeExist();
  await c.me.end();
  c.expect($.my.typeStatus.def(ForceFieldManipulation)).toNotExist();
});
