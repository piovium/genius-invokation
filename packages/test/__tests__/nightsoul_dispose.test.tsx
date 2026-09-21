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
  Equipment,
  ref,
  setup,
  State,
  Status,
  Summon,
} from "#test";
import { Oz } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import {
  Iansan,
  KineticEnergyScale,
  NightsoulsBlessing as IansanNightsoulsBlessing,
  WeightedSpike,
} from "@gi-tcg/data/internal/characters/electro/iansan.gts";
import {
  BiteTarget,
  BiteyShark,
  Mualani,
  NightsoulsBlessing,
  SharkMissile,
} from "@gi-tcg/data/internal/characters/hydro/mualani.gts";
import { expect, test } from "vitest";

// 规则集：夜魂加持（次数）「双方选择行动前：若夜魂值为0->弃置此牌」
// 伊安珊的夜魂加持属于「次数」型（autoDispose）：动能标示把夜魂值消耗到 0 后，
// 夜魂加持不是立刻消失，而是在下一次「选择行动前」被弃置。
test("nightsoul blessing (count): disposed before action selection once nightsoul is 0", async () => {
  const iansan = ref();
  const c = setup(
    <State>
      <Character my active def={Iansan} ref={iansan}>
        <Status def={IansanNightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
      <CombatStatus my def={KineticEnergyScale} usage={2} />
    </State>,
  );
  c.expect(
    $.typeStatus.def(IansanNightsoulsBlessing).at($.id(iansan.id)),
  ).toHaveVariable({ nightsoul: 1 });
  await c.me.skill(WeightedSpike);
  // 伤害 2 + 2 = 4，证明动能标示确实生效并消耗了伊安珊 1 点夜魂值（1 -> 0）
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.combatStatus.def(KineticEnergyScale)).toHaveVariable({
    usage: 2,
  });
  // 轮到对方选择行动前，夜魂值为 0 的夜魂加持已被弃置
  c.expect($.typeStatus.def(IansanNightsoulsBlessing).at($.id(iansan.id)))
    .toNotExist();
});

// 规则集：咬咬鲨鱼「①双方选择行动前：若角色【夜魂值】为0->弃置此牌」
// 切换到玛拉妮触发 ③ 把夜魂值消耗为 0；此处弃置发生在「对方」选择行动前，
// 对应规则里的「双方」（我方选择行动前弃置的情形见本文件最后一个 test）。
test("bitey shark: disposed before action selection when Mualani's nightsoul is 0", async () => {
  const mualani = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
    </State>,
  );
  c.expect($.my.typeEquipment.def(BiteyShark)).toBeExist();
  await c.me.switch(mualani);
  c.expect($.my.typeEquipment.def(BiteyShark)).toNotExist();
});

// 规则集：咬咬鲨鱼「②被弃置后：角色结束【夜魂加持】」
// 玛拉妮的夜魂加持自身没有「夜魂值为0则弃置」，若无 ② 它会以 0 点夜魂值留在场上。
test("bitey shark: ends the nightsoul blessing when it is disposed", async () => {
  const mualani = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
    </State>,
  );
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toHaveVariable({ nightsoul: 1 });
  await c.me.switch(mualani);
  // 咬咬鲨鱼被弃置 -> 玛拉妮的夜魂加持也随之结束
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toNotExist();
});

// 规则集：咬咬鲨鱼「③双方切换角色后：若玛拉妮为出战角色->减少其1点夜魂值，
// 对方出战角色附属1层【啃咬目标】」
test("bitey shark: switching on either side consumes nightsoul and applies Bite Target", async () => {
  const mualani = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character opp active ref={oppActive} />
      <Character opp ref={oppNext} />
    </State>,
  );
  // 我方切换：玛拉妮成为出战角色 -> 夜魂值 2 -> 1，对方出战角色附属 1 层啃咬目标
  await c.me.switch(mualani);
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toHaveVariable({ nightsoul: 1 });
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id)))
    .toHaveVariable({ count: 1 });
  // 夜魂值未到 0，咬咬鲨鱼仍在
  c.expect($.my.typeEquipment.def(BiteyShark)).toBeExist();
  // 对方切换同样触发（「双方切换角色后」）：新的对方出战角色也附属 1 层啃咬目标
  await c.opp.switch(oppNext);
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppNext.id))).toHaveVariable({
    count: 1,
  });
  c.expect($.typeStatus.def(BiteTarget).at($.id(oppActive.id))).toHaveVariable({
    count: 1,
  });
});

// 规则集：咬咬鲨鱼 注「结束阶段夜魂值变为0的场合，会在下个回合行动阶段弃置」
// 结束阶段对方出战角色被鲨鲨飞弹击倒，对方改选出战角色触发 ③ 使夜魂值变为 0。
// 奥兹随后击倒对方新出战角色，制造出「仍在结束阶段」的观察点：
// 此时夜魂值已为 0 而咬咬鲨鱼仍在场，直到下个回合行动阶段才被弃置。
test("bitey shark: nightsoul reaching 0 in end phase is disposed in the next round's action phase", async () => {
  const mualani = ref();
  const oppActive = ref();
  const oppNext = ref();
  const oppLast = ref();
  const c = setup(
    <State>
      <Character my active def={Mualani} ref={mualani}>
        <Equipment def={BiteyShark} />
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
      <Character opp active ref={oppActive} health={1} />
      <Character opp ref={oppNext} health={1} />
      <Character opp ref={oppLast} />
      <Summon my def={SharkMissile} usage={1} />
      <Summon my def={Oz} usage={1} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.phase).toBe("end");
  await c.opp.chooseActive(oppNext);
  // ③ 在结束阶段触发，夜魂值 1 -> 0
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toHaveVariable({ nightsoul: 0 });
  // 夜魂值为 0，但仍处于结束阶段，咬咬鲨鱼不弃置
  expect(c.state.phase).toBe("end");
  c.expect($.my.typeEquipment.def(BiteyShark)).toBeExist();
  await c.opp.chooseActive(oppLast);
  // 进入下个回合行动阶段才弃置；此处先手方为我方，即「我方选择行动前」弃置
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.phase).toBe("action");
  expect(c.state.currentTurn).toBe(0);
  c.expect($.my.typeEquipment.def(BiteyShark)).toNotExist();
  c.expect($.typeStatus.def(NightsoulsBlessing).at($.id(mualani.id)))
    .toNotExist();
});
