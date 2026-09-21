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
  ref,
  setup,
  Character,
  State,
  Status,
  CombatStatus,
  DiceCount,
  DeclaredEnd,
  $,
} from "#test";
import {
  Iansan,
  KineticEnergyScale,
  NightsoulsBlessing,
  ThunderboltRush,
} from "@gi-tcg/data/internal/characters/electro/iansan.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  AsWaterSeeksEquilibrium,
  Neuvillette,
  SourcewaterDroplet,
} from "@gi-tcg/data/internal/characters/hydro/neuvillette.gts";
import { test } from "vitest";

test("iansan: switch count starts only once nightsoul is attached", async () => {
  // 规则集：①我方切换角色后：若自身附属夜魂加持，获得1层【热量】。
  //         注：附属夜魂加持后，才会进行切换次数计数（热量），计数值不可见。
  // 断言：夜魂加持前的 3 次切换不计数，故附属后第 1 次切换（热量=1，奇数）不触发，
  //       第 2 次切换（热量=2，偶数）才触发并获得 1 点夜魂值。
  const iansan = ref();
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Iansan} ref={iansan} />
      <Character my def={Diluc} ref={a} />
      <Character my def={Kaeya} ref={b} />
      <DiceCount my count={16} />
    </State>,
  );
  await c.me.switch(a);
  await c.me.switch(b);
  await c.me.switch(iansan);
  await c.me.skill(ThunderboltRush);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  await c.me.switch(a);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  await c.me.switch(iansan);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 2,
  });
});

test("iansan: a prepare triggers the caloric balancing plan", async () => {
  // 规则集：②我方准备后……：若自身附属夜魂加持->……否则获得1点夜魂值。
  // 断言：那维莱特普攻准备【衡平推裁】时，后台伊安珊的夜魂值 1 -> 2。
  const iansan = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11} />
      <Character my def={Iansan} ref={iansan}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
      <CombatStatus my def={SourcewaterDroplet} usage={1} />
    </State>,
  );
  await c.me.skill(AsWaterSeeksEquilibrium);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 2,
  });
});

test("iansan: heals the most injured character when nightsoul is 2", async () => {
  // 规则集：②……若夜魂值为2，治疗我方受伤最多的角色1点；否则获得1点夜魂值。
  // 断言：热量为偶数时触发，夜魂值已满 2，故改为治疗受伤最多的伊安珊 1 点。
  const iansan = ref();
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Diluc} ref={a} />
      <Character my def={Iansan} ref={iansan} health={1}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my def={Kaeya} ref={b} />
      <DiceCount my count={16} />
    </State>,
  );
  await c.me.switch(b);
  c.expect(iansan).toHaveVariable({ health: 1 });
  await c.me.switch(a);
  c.expect(iansan).toHaveVariable({ health: 2 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 2,
  });
});

test("iansan: the plan triggers at most 3 times per round", async () => {
  // 规则集：②……每回合3次。
  // 断言：一回合内切换 8 次（热量偶数出现 4 次），只治疗 3 次。
  const iansan = ref();
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Diluc} ref={a} />
      <Character my def={Iansan} ref={iansan} health={1}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my def={Kaeya} ref={b} />
      <DiceCount my count={16} />
    </State>,
  );
  for (let i = 0; i < 8; i++) {
    await c.me.switch(i % 2 === 0 ? b : a);
  }
  c.expect(iansan).toHaveVariable({ health: 4 });
});

test("iansan: switch count is kept but frozen while nightsoul is gone", async () => {
  // 规则集：注：结束夜魂后，切换次数计数（热量）会保留，但不再计数。
  // 断言：夜魂结束期间的 1 次切换不计数，重新进入夜魂加持后的下一次切换使热量达到 2 并触发。
  const iansan = ref();
  const a = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Iansan} ref={iansan}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
      <Character my def={Diluc} ref={a} />
      <CombatStatus my def={KineticEnergyScale} usage={2} />
      <DiceCount my count={16} />
    </State>,
  );
  // 热量 1
  await c.me.switch(a);
  // 动能标示消耗伊安珊 1 点夜魂值，夜魂加持结束
  await c.me.skill(TemperedSword);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toNotExist();
  // 无夜魂加持时的切换不计数
  await c.me.switch(iansan);
  await c.me.skill(ThunderboltRush);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  // 热量 2：触发并获得 1 点夜魂值
  await c.me.switch(a);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 2,
  });
});

test("iansan: switch count survives the round and keeps counting after 3 triggers", async () => {
  // 规则集：注：切换计数跨回合不清除，触发3次后可继续计数。
  // 断言：第 1 回合切换 7 次（触发 3 次治疗，热量停在 7），第 2 回合第 1 次切换使热量达到 8 并再次治疗。
  const iansan = ref();
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Diluc} ref={a} />
      <Character my def={Iansan} ref={iansan} health={1}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my def={Kaeya} ref={b} />
      <DiceCount my count={16} />
    </State>,
  );
  for (let i = 0; i < 7; i++) {
    await c.me.switch(i % 2 === 0 ? b : a);
  }
  c.expect(iansan).toHaveVariable({ health: 4 });
  await c.me.end();
  await c.opp.end();
  await c.me.switch(a);
  c.expect(iansan).toHaveVariable({ health: 5 });
});
