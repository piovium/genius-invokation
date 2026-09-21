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

import { Character, ref, setup, State } from "#test";
import {
  EremiteScorchingLoremaster,
  SpiritOfOmensAwakeningPyroScorpion,
} from "@gi-tcg/data/internal/characters/pyro/eremite_scorching_loremaster.gts";
import { TemperedSword } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { test } from "vitest";

test("Spirit of Omen's Power: gains 1 energy when health is at most 7 after being damaged", async () => {
  // 规则集：厄灵之能 此角色受到伤害后：如果此角色生命值不多于7且充能未满->获得1点充能（每回合1次）
  // 受伤后恰好 7 点生命（边界）→ 充能 +1
  const loremaster = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={EremiteScorchingLoremaster}
        health={9}
        energy={0}
        ref={loremaster}
      />
      <Character opp active />
    </State>,
  );

  await c.opp.skill(TemperedSword);

  c.expect(loremaster).toHaveVariable({ health: 7, energy: 1 });
});

test("Spirit of Omen's Power: no energy when health stays above 7", async () => {
  // 规则集：厄灵之能 ...如果此角色生命值不多于7...
  // 受伤后生命值为 8（>7）→ 不充能
  const loremaster = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={EremiteScorchingLoremaster}
        health={10}
        energy={0}
        ref={loremaster}
      />
      <Character opp active />
    </State>,
  );

  await c.opp.skill(TemperedSword);

  c.expect(loremaster).toHaveVariable({ health: 8, energy: 0 });
});

test("Spirit of Omen's Power: triggers at most once per round", async () => {
  // 规则集：厄灵之能 ...获得1点充能（每回合1次）
  // 同一回合内第二次受伤不再充能；下一回合重新可用
  const loremaster = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={EremiteScorchingLoremaster}
        health={7}
        energy={0}
        ref={loremaster}
      />
      <Character opp active />
    </State>,
  );

  await c.opp.skill(TemperedSword);
  c.expect(loremaster).toHaveVariable({ health: 5, energy: 1 });

  // 我方宣布结束，让对方在本回合内再行动一次
  await c.me.end();
  await c.opp.skill(TemperedSword);
  c.expect(loremaster).toHaveVariable({ health: 3, energy: 1 });

  // 进入第 2 回合（我方先手）
  await c.opp.end();
  await c.me.end();
  await c.opp.skill(TemperedSword);
  c.expect(loremaster).toHaveVariable({ health: 1, energy: 2 });
});

test("Spirit of Omen's Power: a full-energy hit does not consume the once-per-round chance", async () => {
  // 规则集：厄灵之能 ...如果此角色生命值不多于7且充能未满->获得1点充能（每回合1次）
  // 充能已满时受伤不发动、也不消耗每回合次数；同回合内清空充能后再次受伤仍可充能
  const loremaster = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={EremiteScorchingLoremaster}
        health={7}
        energy={2}
        ref={loremaster}
      />
      <Character opp active />
    </State>,
  );

  await c.opp.skill(TemperedSword);
  c.expect(loremaster).toHaveVariable({ health: 5, energy: 2 });

  await c.me.skill(SpiritOfOmensAwakeningPyroScorpion);
  c.expect(loremaster).toHaveVariable({ energy: 0 });

  await c.opp.skill(TemperedSword);
  c.expect(loremaster).toHaveVariable({ health: 3, energy: 1 });
});
