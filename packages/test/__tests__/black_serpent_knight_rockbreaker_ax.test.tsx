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
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  AxeAndAegis,
  BlackSerpentKnightRockbreakerAx,
  MightOfStone,
  SupremeStrike,
} from "@gi-tcg/data/internal/characters/geo/black_serpent_knight_rockbreaker_ax.gts";
import { Crystallize } from "@gi-tcg/data/internal/commons.gts";
import { Stonehide } from "@gi-tcg/data/internal/characters/geo/stonehide_lawachurl.gts";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import {
  FavoniusBladeworkMaid,
  Noelle,
} from "@gi-tcg/data/internal/characters/geo/noelle.gts";
import { Frostgnaw, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { expect, test } from "vitest";

/** 返回某角色身上的实体定义 id 列表 */
function entitiesOf(c: ReturnType<typeof setup>, who: 0 | 1, id: number) {
  return c.state.players[who].characters
    .find((ch) => ch.id === id)!
    .entities.map((e) => e.definition.id);
}

test("attacking momentum: opponent combat status with shield grants might of stone", async () => {
  // 规则集：①我方使用技能前：若对方场上存护盾/伤害抵消的角色状态/装备/出战状态->自身附属【攻阵】
  //        ②我方使用技能后：若自身附属【攻阵】->移除【攻阵】，自身附属1层【摧岩伟力】
  // 出战状态（护盾）：结晶
  const bsk = ref();
  const c = setup(
    <State>
      <Character my active def={BlackSerpentKnightRockbreakerAx} ref={bsk} />
      <Character opp active def={Kaeya} />
      <CombatStatus opp def={Crystallize} shield={1} />
    </State>,
  );
  await c.me.skill(SupremeStrike);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
  expect(entitiesOf(c, 0, bsk.id)).toContain(MightOfStone as number);
});

test("attacking momentum: opponent character status with damage barrier grants might of stone", async () => {
  // 规则集：①……若对方场上存护盾/伤害抵消的「角色状态」……->自身附属【攻阵】
  // 角色状态（伤害抵消）：岩盔
  const bsk = ref();
  const c = setup(
    <State>
      <Character my active def={BlackSerpentKnightRockbreakerAx} ref={bsk} />
      <Character opp active def={Kaeya}>
        <Status def={Stonehide} />
      </Character>
    </State>,
  );
  await c.me.skill(SupremeStrike);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
});

test("attacking momentum: barrier on an opponent standby character also counts", async () => {
  // 规则集：①我方使用技能前：若「对方场上」存护盾/伤害抵消的角色状态……
  // 断言：伤害抵消状态在对方后台角色身上时同样满足条件
  const c = setup(
    <State>
      <Character my active def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Kaeya} />
      <Character opp def={Noelle}>
        <Status def={Stonehide} />
      </Character>
    </State>,
  );
  await c.me.skill(SupremeStrike);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
});

test("attacking momentum: opponent equipment with damage barrier grants might of stone", async () => {
  // 规则集：①……若对方场上存护盾/伤害抵消的角色状态/「装备」/出战状态……
  // 装备（伤害抵消）：便携动力锯（双手剑，装备在诺艾尔身上）
  const c = setup(
    <State>
      <Character my active def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Noelle}>
        <Equipment def={PortablePowerSaw} />
      </Character>
    </State>,
  );
  await c.me.skill(SupremeStrike);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
});

test("attacking momentum: no shield on the opponent's field grants nothing, a shield on my own side does not count", async () => {
  // 规则集：①我方使用技能前：若「对方场上」存护盾/伤害抵消的角色状态/装备/出战状态->自身附属【攻阵】
  // 断言：护盾只在我方场上（结晶）时条件不成立
  const c = setup(
    <State>
      <Character my active def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Kaeya} />
      <CombatStatus my def={Crystallize} shield={1} />
    </State>,
  );
  await c.me.skill(SupremeStrike);
  c.expect($.my.typeStatus.def(MightOfStone)).toNotExist();
});

test("attacking momentum: any of my characters' skills triggers it, and the layer goes to the knight itself", async () => {
  // 规则集：①「我方」使用技能前……②我方使用技能后……「自身」附属1层【摧岩伟力】
  // 断言：出战的诺艾尔使用技能，后台的黑蛇骑士自身获得摧岩伟力
  const bsk = ref();
  const noelle = ref();
  const c = setup(
    <State>
      <Character my active def={Noelle} ref={noelle} />
      <Character my def={BlackSerpentKnightRockbreakerAx} ref={bsk} />
      <Character opp active def={Kaeya} />
      <CombatStatus opp def={Crystallize} shield={1} />
    </State>,
  );
  await c.me.skill(FavoniusBladeworkMaid);
  expect(entitiesOf(c, 0, bsk.id)).toContain(MightOfStone as number);
  expect(entitiesOf(c, 0, noelle.id)).not.toContain(MightOfStone as number);
});

test("attacking momentum: opponent's own skill does not trigger it", async () => {
  // 规则集：①「我方」使用技能前……②「我方」使用技能后……
  // 断言：对方使用技能时（对方场上有护盾）不为黑蛇骑士附属摧岩伟力
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Kaeya} />
      <CombatStatus opp def={Crystallize} shield={1} />
    </State>,
  );
  await c.opp.skill(Frostgnaw);
  c.expect($.my.typeStatus.def(MightOfStone)).toNotExist();
});

test("attacking momentum: the condition is checked before the skill, so a shield broken by that skill still counts", async () => {
  // 规则集：①我方使用技能「前」：若对方场上存护盾……->自身附属【攻阵】；②我方使用技能后：若自身附属【攻阵】->……附属1层【摧岩伟力】
  // 断言：斧盾震击 3 点岩伤打碎 1 点结晶护盾，结算后结晶已消失，仍然获得摧岩伟力；本次伤害不受摧岩伟力加成（10-(3-1)=8）
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Kaeya} ref={oppActive} health={10} />
      <CombatStatus opp def={Crystallize} shield={1} />
    </State>,
  );
  await c.me.skill(AxeAndAegis);
  c.expect($.opp.combatStatus.def(Crystallize)).toNotExist();
  c.expect(oppActive).toHaveVariable({ health: 8 });
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
});

test("attacking momentum: each skill use attaches exactly one layer", async () => {
  // 规则集：②我方使用技能后：若自身附属【攻阵】->移除【攻阵】，自身附属「1层」【摧岩伟力】
  // 断言：诺艾尔两次普通攻击（对方岩盔可用次数 3，两次后仍在场）使后台黑蛇骑士叠到 2 层
  const c = setup(
    <State>
      <Character my active def={Noelle} />
      <Character my def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Kaeya}>
        <Status def={Stonehide} />
      </Character>
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.skill(FavoniusBladeworkMaid);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
  await c.me.skill(FavoniusBladeworkMaid);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 2 });
});

test("attacking momentum: the momentum is removed after use, so a later skill without any shield grants nothing", async () => {
  // 规则集：②我方使用技能后：若自身附属【攻阵】->「移除【攻阵】」，自身附属1层【摧岩伟力】
  // 断言：首次普攻打碎 1 点结晶护盾得到 1 层；此后对方场上已无护盾，再次普攻不再叠加
  const c = setup(
    <State>
      <Character my active def={Noelle} />
      <Character my def={BlackSerpentKnightRockbreakerAx} />
      <Character opp active def={Kaeya} health={10} />
      <CombatStatus opp def={Crystallize} shield={1} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.skill(FavoniusBladeworkMaid);
  c.expect($.opp.combatStatus.def(Crystallize)).toNotExist();
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
  await c.me.skill(FavoniusBladeworkMaid);
  c.expect($.my.typeStatus.def(MightOfStone)).toHaveVariable({ usage: 1 });
});
