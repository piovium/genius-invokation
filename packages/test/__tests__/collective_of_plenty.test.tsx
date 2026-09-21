// Copyright (C) 2026 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { $, Character, ref, setup, State, Status, Support } from "#test";
import {
  CollectiveOfPlenty,
  Exercise,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import { test } from "vitest";
import {
  FatuiElectroCicinMage,
  SurgingThunderStatus,
  ThunderingShield,
} from "@gi-tcg/data/internal/characters/electro/fatui_electro_cicin_mage.gts";
import { Aura } from "@gi-tcg/typings";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";

test("collective of plenty: recreating exercise heals when it crosses three layers", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my ref={target} health={8}>
        <Status def={Exercise} v={{ layer: 2 }} />
      </Character>
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  await c.me.switch(target);

  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.def(Exercise)).toHaveVariable({ layer: 4 });
});

test("collective of plenty: does not gain exercise from an interrupted preparation", async () => {
  const mage = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character
        my
        active
        def={FatuiElectroCicinMage}
        ref={mage}
        energy={2}
        aura={Aura.Pyro}
      />
      <Character my ref={next} />
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  await c.me.skill(ThunderingShield);

  c.expect($.my.active).toBe(next);
  c.expect($.def(SurgingThunderStatus)).toNotExist();
  c.expect($.def(Exercise).at($.id(mage.id))).toNotExist();
  c.expect($.def(Exercise).at($.id(next.id))).toHaveVariable({ layer: 2 });
});

test("collective of plenty: preparing a skill grants three exercise layers", async () => {
  // 规则集：②我方角色附属准备后：角色附属3层【锻炼】
  const mage = ref();
  const c = setup(
    <State>
      <Character my active def={FatuiElectroCicinMage} ref={mage} energy={2} />
      <Character opp active />
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  await c.me.skill(ThunderingShield);

  c.expect($.def(SurgingThunderStatus)).toBeExist();
  c.expect($.def(Exercise).at($.id(mage.id))).toHaveVariable({ layer: 3 });
});

test("collective of plenty: exercise stacks up to five layers", async () => {
  // 规则集：锻炼……可叠加，最多5层
  const target = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my ref={target}>
        <Status def={Exercise} v={{ layer: 4 }} />
      </Character>
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  // 切换到出战再获得 2 层，只能叠到 5
  await c.me.switch(target);

  c.expect($.def(Exercise).at($.id(target.id))).toHaveVariable({ layer: 5 });
});

test("collective of plenty: exercise does not heal again once it already reached three layers", async () => {
  // 规则集：①获得锻炼后：若层数不小于3且获得前层数小于3->治疗自身1点
  const target = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my ref={target} health={8}>
        <Status def={Exercise} v={{ layer: 3 }} />
      </Character>
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  await c.me.switch(target);

  // 获得前层数已达 3，不再治疗
  c.expect(target).toHaveVariable({ health: 8 });
  c.expect($.def(Exercise).at($.id(target.id))).toHaveVariable({ layer: 5 });
});

test("collective of plenty: exercise at five layers increases damage by one", async () => {
  // 规则集：②造成伤害时：若层数为5->伤害+1
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Diluc}>
        <Status def={Exercise} v={{ layer: 5 }} />
      </Character>
      <Character opp active ref={oppActive} />
    </State>,
  );

  await c.me.skill(TemperedSword);

  // 逆焰之刃 2 点物理 +1
  c.expect(oppActive).toHaveVariable({ health: 7 });
});

test("collective of plenty: switching to a character attaches two exercise layers", async () => {
  // 规则集：①我方角色切换到出战角色后：角色附属2层【锻炼】
  const target = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my ref={target} health={8} />
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );

  await c.me.switch(target);

  c.expect($.def(Exercise).at($.id(target.id))).toHaveVariable({ layer: 2 });
  // 规则集：①获得锻炼后：若层数不小于3……->治疗自身1点；只有 2 层时不治疗
  c.expect(target).toHaveVariable({ health: 8 });
});

test("collective of plenty: exercise below five layers does not increase damage", async () => {
  // 规则集：②造成伤害时：若层数为5->伤害+1；4 层不增伤
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Diluc}>
        <Status def={Exercise} v={{ layer: 4 }} />
      </Character>
      <Character opp active ref={oppActive} />
    </State>,
  );

  await c.me.skill(TemperedSword);

  // 逆焰之刃 2 点物理，无加成
  c.expect(oppActive).toHaveVariable({ health: 8 });
});
