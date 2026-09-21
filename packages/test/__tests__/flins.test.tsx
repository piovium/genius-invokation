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

import { setup, Character, State, DeclaredEnd, $ } from "#test";
import {
  AncientRiteArcaneLight,
  Flins,
  ManifestFlame,
  ThunderousSymphonyStatus,
} from "@gi-tcg/data/internal/characters/electro/flins.gts";
import { expect, test } from "vitest";

test("flins: the first Ancient Rite is usable with 0 energy and attaches Manifest Flame", async () => {
  // 规则集：条件：未附属【幽焰显迹】或充能至少为1；
  //         若未附属【幽焰显迹】->造成1点雷属性伤害，附属【幽焰显迹】
  // 断言：未附属【幽焰显迹】时即使 0 充能也能使用，造成 1 点雷伤并附属【幽焰显迹】。
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Flins} energy={0} />
    </State>,
  );
  await c.me.skill(AncientRiteArcaneLight);
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect($.my.typeStatus.def(ManifestFlame)).toBeExist();
  c.expect($.my.active).toHaveVariable({ energy: 1 });
});

test("flins: a repeated Ancient Rite only needs 1 energy and prepares Thunderous Symphony", async () => {
  // 规则集：注：重复使用战技，先获得充能，再消耗2点充能，1充能即可使用
  //         ②角色使用元素战技后：累积1层【焰】，若【焰】层数不小于2->失去2点充能，准备【雷霆交响】
  // 断言：第二次使用时只有 1 点充能也能发动，结算后充能归零，并在下次行动时使用【雷霆交响】（2 点雷伤）。
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Flins} energy={0} />
    </State>,
  );
  await c.me.skill(AncientRiteArcaneLight);
  c.expect($.my.active).toHaveVariable({ energy: 1 });
  await c.me.skill(AncientRiteArcaneLight);
  c.expect($.my.active).toHaveVariable({ energy: 0 });
  c.expect($.opp.active).toHaveVariable({ health: 7 });
});

test("flins: cannot use the skill with Manifest Flame attached and no energy", async () => {
  // 规则集：注：已附属【幽焰显迹】且没有充能的场合，不能使用战技
  // 断言：两次战技后【幽焰显迹】仍在、充能为 0，此时第三次战技不是合法行动。
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Flins} energy={0} />
    </State>,
  );
  await c.me.skill(AncientRiteArcaneLight);
  await c.me.skill(AncientRiteArcaneLight);
  c.expect($.my.typeStatus.def(ManifestFlame)).toBeExist();
  c.expect($.my.active).toHaveVariable({ energy: 0 });
  await expect(c.me.skill(AncientRiteArcaneLight)).rejects.toThrow();
});

test("flins: the Flame layers are reset at the end phase", async () => {
  // 规则集：结束阶段：重置【焰】层数
  // 断言：第 1 回合用过 1 次战技后，第 2 回合的第一次战技仍按「首次使用」结算
  //       （造成 1 点雷伤并附属【幽焰显迹】），不会准备【雷霆交响】。
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Flins} energy={0} />
    </State>,
  );
  await c.me.skill(AncientRiteArcaneLight);
  await c.me.end();
  await c.opp.end();
  await c.me.skill(AncientRiteArcaneLight);
  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.typeStatus.def(ManifestFlame)).toBeExist();
  c.expect($.my.def(ThunderousSymphonyStatus)).toNotExist();
  c.expect($.my.active).toHaveVariable({ energy: 2 });
});
