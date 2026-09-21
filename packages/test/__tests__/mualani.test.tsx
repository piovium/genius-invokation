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
  DeclaredEnd,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  BiteTarget,
  BiteyShark,
  Mualani,
  NightsoulsBlessing,
} from "@gi-tcg/data/internal/characters/hydro/mualani.gts";
import { test } from "vitest";

// 规则集：咬咬鲨鱼「③双方切换角色后：若玛拉妮为出战角色->减少其1点夜魂值，
// 对方出战角色附属1层【啃咬目标】」
// 我方切换到玛拉妮：夜魂值 2 -> 1，对方出战角色获得 1 层啃咬目标。
test("bitey shark: our own switch to Mualani consumes 1 nightsoul and applies Bite Target", async () => {
  const mualani = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character opp active ref={oppActive} />
    </State>,
  );
  await c.me.switch(mualani);
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toHaveVariable({ nightsoul: 1 });
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id)))
    .toHaveVariable({ count: 1 });
});

// 规则集：咬咬鲨鱼「③双方切换角色后：若玛拉妮为出战角色->……」
// 「双方」：对方切换角色同样触发；且【啃咬目标】附属给切换后的对方出战角色。
test("bitey shark: the opponent's switch also triggers it while Mualani is active", async () => {
  const mualani = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character opp active ref={oppActive} />
      <Character opp ref={oppNext} />
    </State>,
  );
  await c.opp.switch(oppNext);
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toHaveVariable({ nightsoul: 1 });
  // 附属对象是切换后的对方出战角色，原出战角色不附属
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppNext.id))).toHaveVariable({
    count: 1,
  });
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id))).toNotExist();
});

// 规则集：咬咬鲨鱼「③……若玛拉妮为出战角色->……」
// 条件在切换「后」判定：从玛拉妮切走后她不是出战角色，不触发。
test("bitey shark: switching away from Mualani does not trigger it", async () => {
  const mualani = ref();
  const other = ref();
  const c = setup(
    <State>
      <Character my active def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my ref={other} />
      <Character opp active />
    </State>,
  );
  await c.me.switch(other);
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toHaveVariable({ nightsoul: 2 });
  c.expect($.typeStatus.def(BiteTarget)).toNotExist();
});

// 规则集：咬咬鲨鱼「③……对方出战角色附属1层【啃咬目标】」
// 每次触发只附属 1 层，多次触发在同一角色上累加。
test("bitey shark: each trigger applies exactly one layer of Bite Target", async () => {
  const mualani = ref();
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active ref={myActive} />
      <Character my def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character opp active ref={oppActive} />
    </State>,
  );
  await c.me.switch(mualani);
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id)))
    .toHaveVariable({ count: 1 });
  // 切走不触发
  await c.me.switch(myActive);
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id)))
    .toHaveVariable({ count: 1 });
  // 再次切回玛拉妮：第二次触发，层数 1 -> 2
  // （此时夜魂值降为 0，咬咬鲨鱼与夜魂加持随之被弃置，属 ①② 的范围）
  await c.me.switch(mualani);
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id)))
    .toHaveVariable({ count: 2 });
});
