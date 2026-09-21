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

import { ref, setup, Character, State, CombatStatus, Support, DeclaredEnd, $ } from "#test";
import { RedFeatherFan, RedFeatherFanStatus } from "@gi-tcg/data/internal/cards/support/item.gts";
import { expect, test } from "vitest";

// 规则集此条描述的是 v6.5.0 及以前的红羽团扇：生成【红羽团扇（生效中）】；
// 官方自 v6.6.0 起改为生成高效切换 + 敏捷切换，故以下测试固定 dataVersion="v6.5.0"。

test("red feather fan: creates in-effect status after switch, once per round", async () => {
  // 规则集：我方切换角色后：生成【红羽团扇（生效中）】（每回合1次）
  const next = ref();
  const third = ref();
  const fan = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={next} />
      <Character my ref={third} />
      <Support my def={RedFeatherFan} ref={fan} />
      <DeclaredEnd opp />
    </State>,
  );

  await c.me.switch(next);
  c.expect($.my.combatStatus.def(RedFeatherFanStatus)).toBeExist();
  c.expect(fan).toHaveVariable({ usagePerRound: 0 });
  // 每回合 1 次：本回合第二次切换消耗掉生效中，且不会再生成新的
  await c.me.switch(third);
  c.expect($.my.combatStatus.def(RedFeatherFanStatus)).toNotExist();
});

test("red feather fan in effect: deducts 1 die on switch, then removed", async () => {
  // 规则集：①确定消耗时：少花费1个元素骰；③若①或②发动过->移除此效果
  const next = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={next} />
      <CombatStatus my def={RedFeatherFanStatus} />
      <DeclaredEnd opp />
    </State>,
  );

  await c.me.switch(next);
  // 切换本需 1 个骰，减费后不消耗
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.my.combatStatus.def(RedFeatherFanStatus)).toNotExist();
});

test("red feather fan in effect: switch is treated as fast action", async () => {
  // 规则集：②确定行动类型时：此行动视为快速行动
  const next = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my ref={next} />
      <CombatStatus my def={RedFeatherFanStatus} />
    </State>,
  );

  await c.me.switch(next);
  // 快速行动：切换后仍由我方行动
  expect(c.state.currentTurn).toBe(0);
});

test("red feather fan in effect: lasts only the current round", async () => {
  // 规则集：红羽团扇（生效中）持续回合：1
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character my active />
      <Character my />
      <CombatStatus my def={RedFeatherFanStatus} />
    </State>,
  );

  await c.me.end();
  await c.opp.end();
  // 结束阶段持续回合-1 后被弃置，下回合不再生效
  c.expect($.my.combatStatus.def(RedFeatherFanStatus)).toNotExist();
});
