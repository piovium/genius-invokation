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

import { Card, Character, ref, setup, State, Status } from "#test";
import { RouletteSpecial } from "@gi-tcg/data/internal/cards/event/food.gts";
import { BattlePlan, SharpenTheBlade } from "@gi-tcg/data/internal/commons.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { expect, test } from "vitest";

type Ctx = ReturnType<typeof setup>;

/** 读取我方某角色身上某状态的可用次数（不存在时为 0） */
function statusUsage(c: Ctx, characterId: number, definitionId: number) {
  const character = c.state.players[0].characters.find(
    (ch) => ch.id === characterId,
  );
  const status = character?.entities.find(
    (e) => e.definition.id === definitionId,
  );
  return status?.variables.usage ?? 0;
}

/** 以固定种子对 1 点生命值的角色打出转盘特调，统计四种效果各执行了几次 */
async function playRouletteSpecial(seed: number) {
  const target = ref();
  const c = setup(
    <State random={seed}>
      <Character opp active />
      <Character my active ref={target} health={1} />
      <Card my def={RouletteSpecial} />
    </State>,
  );
  await c.me.card(RouletteSpecial, target);
  const character = c.state.players[0].characters.find(
    (ch) => ch.id === target.id,
  )!;
  // 获得最大生命值时会附带 1 点同来源治疗，故治疗次数 =（生命变化 - 最大生命值变化）/ 2
  const maxHealth = character.variables.maxHealth - 10;
  const healed = character.variables.health - 1 - maxHealth;
  expect(healed % 2).toBe(0);
  return {
    heal: healed / 2,
    maxHealth,
    battlePlan: statusUsage(c, target.id, BattlePlan),
    sharpen: statusUsage(c, target.id, SharpenTheBlade),
  };
}

// 引擎随机数为 minstd LCG，种子为 0 时永远不变，因此必须使用非 0 种子
test.each([12345, 6789, 998244353, 20260918, 777])(
  "roulette special: performs exactly 4 random effects out of the four listed ones (seed %i)",
  async (seed) => {
    // 规则集：转盘特调 执行4次：随机执行以下效果：治疗目标角色2点 / 目标角色获得1点最大生命值 /
    //         目标角色附属【战斗计划】/ 目标角色附属【打磨利刃】
    // 断言：目标角色身上（治疗次数 + 最大生命值提升次数 + 战斗计划层数 + 打磨利刃层数）恰为 4，
    //       即四种效果之外没有其它效果，且总共执行 4 次（同一效果可重复抽到）
    const r = await playRouletteSpecial(seed);
    expect(r.heal + r.maxHealth + r.battlePlan + r.sharpen).toBe(4);
  },
);

test("roulette special: all four listed effects can be rolled", async () => {
  // 规则集：转盘特调 执行4次：随机执行以下效果：（四条）
  // 断言：随机池恰为规则集列出的四种效果——换用不同种子后四种效果都出现过
  const seen = { heal: false, maxHealth: false, battlePlan: false, sharpen: false };
  for (let seed = 1; seed <= 20; seed++) {
    const r = await playRouletteSpecial(seed);
    seen.heal ||= r.heal > 0;
    seen.maxHealth ||= r.maxHealth > 0;
    seen.battlePlan ||= r.battlePlan > 0;
    seen.sharpen ||= r.sharpen > 0;
  }
  expect(seen).toEqual({
    heal: true,
    maxHealth: true,
    battlePlan: true,
    sharpen: true,
  });
});

test("sharpen the blade: adds 1 damage and consumes exactly 1 stack per damage", async () => {
  // 规则集：打磨利刃 角色造成伤害时：伤害+1；注：打磨利刃每次消耗1层
  // 断言：3 层打磨利刃的角色连续两次普通攻击，每次伤害 2+1=3，每次只消耗 1 层（3 → 2 → 1）
  const enemy = ref();
  const attacker = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={enemy} />
      <Character my active ref={attacker} def={Diluc}>
        <Status def={SharpenTheBlade} usage={3} />
      </Character>
    </State>,
  );
  await c.opp.end();
  await c.me.skill(TemperedSword);
  c.expect(enemy).toHaveVariable({ health: 7 });
  expect(statusUsage(c, attacker.id, SharpenTheBlade)).toBe(2);
  await c.me.skill(TemperedSword);
  c.expect(enemy).toHaveVariable({ health: 4 });
  expect(statusUsage(c, attacker.id, SharpenTheBlade)).toBe(1);
});

test("sharpen the blade: stacks are not capped", async () => {
  // 规则集：打磨利刃 可用次数：1（无上限）
  // 断言：重复附属时层数累加而不是停在 1 层——先找出一个会抽中 2 次以上打磨利刃的种子
  //       （能找到本身就说明同一次结算内重复附属可叠加到 2 层以上），
  //       同一种子下角色原有 1 层时，转盘特调后层数为 1 + 抽中次数
  let seed = 0;
  let rolled = 0;
  // 种子过小时 LCG 首个输出必落在第一个效果上，故从较大的种子开始找
  for (let s = 100000; s < 100060; s++) {
    const r = await playRouletteSpecial(s);
    if (r.sharpen >= 2) {
      seed = s;
      rolled = r.sharpen;
      break;
    }
  }
  expect(rolled).toBeGreaterThanOrEqual(2);
  const target = ref();
  const c = setup(
    <State random={seed}>
      <Character opp active />
      <Character my active ref={target} health={1}>
        <Status def={SharpenTheBlade} usage={1} />
      </Character>
      <Card my def={RouletteSpecial} />
    </State>,
  );
  await c.me.card(RouletteSpecial, target);
  expect(statusUsage(c, target.id, SharpenTheBlade)).toBe(rolled + 1);
});
