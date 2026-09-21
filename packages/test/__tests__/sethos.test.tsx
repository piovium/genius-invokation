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

import { $, Character, DeclaredEnd, ref, setup, State, Status } from "#test";
import {
  Frostgnaw,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  AncientRiteTheThunderingSands,
  Sethos,
  ThunderConvergence,
} from "@gi-tcg/data/internal/characters/electro/sethos.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("sethos: thunder convergence triggers on a reaction caused by applying aura", async () => {
  // 规则集：轰雷凝集注①生成附着引发的反应也能发动，如消去对方元素
  //（即使是 先消去附着，再附属 轰雷凝集，也能发动（检测整个行动））
  const sethos = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Cryo} />
      <Character my active def={Sethos} ref={sethos} energy={0} />
    </State>,
  );
  // 古仪·鸣砂掣雷先附着雷元素（与冰超导、消去对方附着），最后才附属轰雷凝集
  await c.me.skill(AncientRiteTheThunderingSands);
  // 使用技能获得 1 点充能，轰雷凝集再给 1 点
  c.expect(sethos).toHaveVariable({ energy: 2 });
  // 可用次数 1，触发后移除
  c.expect($.my.typeStatus.def(ThunderConvergence)).toNotExist();
});

test("sethos: thunder convergence triggers on any of my characters' skills", async () => {
  // 规则集：轰雷凝集 我方角色使用技能后：若期间我方效果引发了元素反应，角色获得1点充能
  const sethos = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Electro} />
      <Character my active def={Kaeya} />
      <Character my def={Sethos} ref={sethos} energy={0}>
        <Status def={ThunderConvergence} />
      </Character>
    </State>,
  );
  // 凯亚霜袭引发超导，所附属角色赛索斯并非使用技能者
  await c.me.skill(Frostgnaw);
  c.expect(sethos).toHaveVariable({ energy: 1 });
  c.expect($.my.typeStatus.def(ThunderConvergence)).toNotExist();
});

test("sethos: thunder convergence only counts reactions of the current action", async () => {
  // 规则集：轰雷凝集 注②「期间」指的是使用技能从支付消耗到此能力触发期间
  // 上一次行动中引发的反应不在此期间内，不能发动
  const sethos = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Electro} />
      <Character my active def={Kaeya} />
      <Character my def={Sethos} ref={sethos} energy={0} />
      <DeclaredEnd opp />
    </State>,
  );
  // 上一次行动：霜袭引发超导（3+1 点伤害），对方附着被消去
  await c.me.skill(Frostgnaw);
  c.expect($.opp.active).toHaveVariable({ health: 6, aura: Aura.None });
  await c.me.switch(sethos);
  // 本次技能只对无附着的对方出战角色附着雷元素，期间未引发反应
  await c.me.skill(AncientRiteTheThunderingSands);
  // 只有使用技能带来的 1 点充能，轰雷凝集可用次数未被消耗
  c.expect(sethos).toHaveVariable({ energy: 1 });
  c.expect($.my.typeStatus.def(ThunderConvergence)).toHaveVariable({
    usage: 1,
  });
});
