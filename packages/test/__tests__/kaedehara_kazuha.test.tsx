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
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { DyedTassel } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  Chihayaburu,
  KaedeharaKazuha,
  MidareRanzan,
  MidareRanzanCryo,
  MidareRanzanPyro,
} from "@gi-tcg/data/internal/characters/anemo/kaedehara_kazuha.gts";
import { Frozen } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("kazuha passive: chihayaburu switches to the next character after the skill", async () => {
  // 规则集：千早振（被动技能）我方使用【千早振】后：切换到下一个角色。注：切换角色是使用后的能力而非技能效果。
  // 断言：千早振结算（造成伤害、附属乱岚拨止）之后，被动把出战角色切换到下一个角色
  const kazuha = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={KaedeharaKazuha} ref={kazuha} />
      <Character my ref={next} />
    </State>,
  );

  await c.me.skill(Chihayaburu);

  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect($.my.typeStatus.def(MidareRanzan)).toBeExist();
  c.expect($.my.active).toBe(next);
});

test("midare ranzan: switching to the attached character is a fast action", async () => {
  // 规则集：乱岚拨止①切换到附属角色的行动视为快速行动
  // 断言：切换到附属乱岚拨止的万叶后仍是我方行动轮（万叶被冻结以排除②强制普通攻击的干扰）
  const kazuha = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my def={KaedeharaKazuha} ref={kazuha}>
        <Status def={MidareRanzan} />
        <Status def={Frozen} />
      </Character>
    </State>,
  );

  await c.me.switch(kazuha);

  c.expect($.my.active).toBe(kazuha);
  expect(c.state.currentTurn).toBe(0);
  // 角色不可行动时不执行②
  c.expect($.opp.active).toHaveVariable({ health: 10 });
  c.expect($.my.typeStatus.def(MidareRanzan)).toBeExist();
});

test("midare ranzan: the attached active character uses a normal attack instead of my chosen action", async () => {
  // 规则集：乱岚拨止②我方选择行动前：若角色可行动且为出战角色->使用普通攻击
  // 断言：我方尚未选择行动，引擎已代为使用我流剑术，随后轮次交给对方
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={KaedeharaKazuha}>
        <Status def={MidareRanzan} />
      </Character>
    </State>,
  );

  await c.stepToNextAction();

  c.expect($.opp.active).toHaveVariable({ health: 8, aura: Aura.None });
  expect(c.state.currentTurn).toBe(1);
});

test("midare ranzan cryo: the normal attack deals cryo damage and then the status is removed", async () => {
  // 规则集：乱岚拨止③角色使用普通攻击造成伤害时：弃置此状态->物理伤害变为（记录属性）元素伤害
  // 断言：我流剑术的2点物理伤害变为2点冰元素伤害（挂冰），结算后状态被弃置
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={KaedeharaKazuha}>
        <Status def={MidareRanzanCryo} />
      </Character>
    </State>,
  );

  await c.stepToNextAction();

  c.expect($.opp.active).toHaveVariable({ health: 8, aura: Aura.Cryo });
  c.expect($.my.typeStatus.def(MidareRanzanCryo)).toNotExist();
});

test("midare ranzan: a charged attack triggers the removal, so it cannot force another normal attack", async () => {
  // 规则集：注：使用重攻击会触发③移除状态，无法执行②效果。
  // 断言：骰数为偶数时②强制的普通攻击是重攻击（「被浸染的缨盔」只在重击时加伤，2点火伤变3点即为证），
  //       ③随即移除状态，下一次我方行动前不再被②替换为普通攻击
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={KaedeharaKazuha}>
        <Status def={MidareRanzanPyro} />
        <Equipment def={DyedTassel} />
      </Character>
      <DiceCount my count={8} />
    </State>,
  );

  await c.stepToNextAction();

  expect(c.state.players[0].canCharged).toBe(true);
  c.expect($.opp.active).toHaveVariable({ health: 7, aura: Aura.Pyro });
  c.expect($.my.typeStatus.def(MidareRanzanPyro)).toNotExist();

  await c.opp.end();

  // 状态已被移除：轮到我方行动时没有再被强制使用普通攻击
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  expect(c.state.currentTurn).toBe(0);
});
