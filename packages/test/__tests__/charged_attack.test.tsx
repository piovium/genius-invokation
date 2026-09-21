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
  Support,
} from "#test";
import { FlowingPurity } from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst.gts";
import { ChinjuForest } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Diluc,
  SearingOnslaught,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Kaboom, Klee } from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import { ScarletSeal } from "@gi-tcg/data/internal/characters/pyro/yanfei.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 迪卢克普通攻击「淬炼之剑」2 点物理伤害，费用 1 火 + 2 无色；
// 丹火印「角色进行重击时：造成的伤害+2」只改伤害不改费用，用来观测本次攻击是否为重击。

test("charged attack: even dice count generates the charged state", async () => {
  // 规则集：我方选择行动前2：若骰子数量为【偶数】->生成【重击中】
  // 断言：行动前骰子数为偶数时，普通攻击被判定为重击，丹火印伤害 +2 生效
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc}>
        <Status def={ScarletSeal} />
      </Character>
      <DiceCount my count={4} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].dice).toBeArrayOfSize(4);
  expect(c.state.players[0].canCharged).toBe(true);
  await c.me.skill(TemperedSword);
  // 重击：淬炼之剑 2 + 丹火印 2 = 4
  c.expect($.opp.active).toHaveVariable({ health: 6 });
});

test("charged attack: odd dice count discards the charged state", async () => {
  // 规则集：我方选择行动前2：若骰子数量为【偶数】->生成【重击中】；否则弃置【重击中】
  // 断言：行动前骰子数为奇数时不是重击，丹火印不触发、可用次数不消耗
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc}>
        <Status def={ScarletSeal} />
      </Character>
      <DiceCount my count={3} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  expect(c.state.players[0].canCharged).toBe(false);
  await c.me.skill(TemperedSword);
  // 非重击：只有淬炼之剑的 2 点物理伤害
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.typeStatus.def(ScarletSeal)).toHaveVariable({ usage: 1 });
});

test("charged attack: judged before the action, then judged again next action", async () => {
  // 规则集：我方选择行动前2：若骰子数量为【偶数】->生成【重击中】；否则弃置【重击中】
  // 断言：判定只在选择行动前进行，本次行动支付骰子不影响本次判定；
  //       下一次轮到我方行动时按新的骰子数重新判定（奇数 -> 弃置【重击中】）
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc}>
        <Status def={ScarletSeal} usage={2} />
      </Character>
      <DiceCount my count={6} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].canCharged).toBe(true);
  await c.me.skill(TemperedSword);
  // 支付 3 骰后剩 3 骰（奇数），但本次行动仍按行动前的 6 骰判定为重击
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.typeStatus.def(ScarletSeal)).toHaveVariable({ usage: 1 });

  await c.opp.end();
  // 再次轮到我方行动，按 3 骰（奇数）重新判定：不是重击
  expect(c.state.players[0].canCharged).toBe(false);
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 4 });
  c.expect($.my.typeStatus.def(ScarletSeal)).toHaveVariable({ usage: 1 });
});

test("charged attack: each player is judged by their own dice count", async () => {
  // 规则集：我方选择行动前2：若骰子数量为【偶数】->生成【重击中】；否则弃置【重击中】
  // 断言：「我方」指当前行动方自己：我方 4 骰（偶）为重击，对方 3 骰（奇）不是重击
  const oppActive = ref();
  const myActive = ref();
  const c = setup(
    <State>
      <Character opp active def={Diluc} ref={oppActive}>
        <Status def={ScarletSeal} />
      </Character>
      <Character my active def={Diluc} ref={myActive}>
        <Status def={ScarletSeal} />
      </Character>
      <DiceCount my count={4} type={DiceType.Pyro} />
      <DiceCount opp count={3} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].canCharged).toBe(true);
  await c.me.skill(TemperedSword);
  // 我方重击：淬炼之剑 2 + 丹火印 2
  c.expect(oppActive).toHaveVariable({ health: 6 });
  // 轮到对方：按对方自己的 3 骰（奇数）判定，不是重击
  expect(c.state.players[1].canCharged).toBe(false);
  await c.opp.skill(TemperedSword);
  c.expect(myActive).toHaveVariable({ health: 8 });
  c.expect($.opp.typeStatus.def(ScarletSeal)).toHaveVariable({ usage: 1 });
});

test("chinju forest: charged attack costs 1 less void die", async () => {
  // 规则集：镇守之森 我方重击少花费1个无色元素 可用次数：4
  // 断言：减免的是无色部分（火骰仍照付），可用次数 4 -> 3
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} />
      <Support my def={ChinjuForest} />
      <DiceCount
        my
        dice={[
          DiceType.Pyro,
          DiceType.Dendro,
          DiceType.Dendro,
          DiceType.Dendro,
        ]}
      />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 4 });
  expect(c.state.players[0].canCharged).toBe(true);
  await c.me.skill(TemperedSword);
  // 原本 1 火 + 2 无色，减 1 无色后为 1 火 + 1 无色
  expect(c.state.players[0].dice).toEqual([DiceType.Dendro, DiceType.Dendro]);
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 3 });
});

test("chinju forest: no deduction for a non-charged normal attack", async () => {
  // 规则集：镇守之森 我方重击少花费1个无色元素
  // 断言：骰子数为奇数时普通攻击不是重击，不减费也不消耗可用次数
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} />
      <Support my def={ChinjuForest} />
      <DiceCount my count={3} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].canCharged).toBe(false);
  await c.me.skill(TemperedSword);
  expect(c.state.players[0].dice).toBeArrayOfSize(0);
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 4 });
});

test("chinju forest: is disposed when its usages run out", async () => {
  // 规则集：镇守之森 ... 可用次数：4
  // 断言：每次减费消耗 1 次可用次数，用尽后弃置
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} />
      <Support my def={ChinjuForest} usage={1} />
      <DiceCount my count={4} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  await c.me.skill(TemperedSword);
  expect(c.state.players[0].dice).toBeArrayOfSize(2);
  c.expect($.my.support.def(ChinjuForest)).toNotExist();
});

test("chinju forest: usage is not consumed by a non-charged-attack action", async () => {
  // 规则集：注：并非选择行动前能力，是常规的减费能力
  // 断言：即使选择行动前骰子数为偶数，只要本次行动不是重击就不消耗可用次数
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} />
      <Support my def={ChinjuForest} />
      <DiceCount my count={4} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].canCharged).toBe(true);
  await c.me.skill(SearingOnslaught);
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 4 });
});

test("chinju forest: the attack is still charged after the deduction", async () => {
  // 规则集：我方选择行动前2：……生成【重击中】；镇守之森「注：并非选择行动前能力，是常规的减费能力」
  // 断言：减费只改变本次花费，不会回头影响选择行动前已做出的重击判定（丹火印伤害 +2 生效）
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc}>
        <Status def={ScarletSeal} />
      </Character>
      <Support my def={ChinjuForest} />
      <DiceCount my count={4} type={DiceType.Pyro} />
    </State>,
  );
  await c.stepToNextAction();
  await c.me.skill(TemperedSword);
  // 减费：只花费 2 个骰子
  expect(c.state.players[0].dice).toBeArrayOfSize(2);
  // 仍是重击：淬炼之剑 2 + 丹火印 2 = 4
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 3 });
  c.expect($.my.typeStatus.def(ScarletSeal)).toNotExist();
});

test("chinju forest: deduction follows the charged judgement made after before-action effects", async () => {
  // 规则集：镇守之森「注：并非选择行动前能力，是常规的减费能力」；重击判定为「选择行动前2」
  // 断言：纯水流华在「选择行动前」先生成 1 个骰子（7->8），重击判定据此成立，
  //       镇守之森按判定结果减费；它并不自行在「选择行动前」按原本的 7 骰判断奇偶
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Klee}>
        <Equipment def={FlowingPurity} />
      </Character>
      <Support my def={ChinjuForest} />
      <DiceCount my count={7} />
    </State>,
  );
  await c.stepToNextAction();
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  expect(c.state.players[0].canCharged).toBe(true);
  await c.me.skill(Kaboom);
  // 砰砰原本 1 火 + 2 无色，减 1 无色后只花费 2 个骰子
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect($.my.support.def(ChinjuForest)).toHaveVariable({ usage: 3 });
});
