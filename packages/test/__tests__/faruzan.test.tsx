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
  setup,
  State,
  Summon,
} from "#test";
import {
  DazzlingPolyhedron01,
  Faruzan,
  TheWindsSecretWays,
  TheWondrousPathOfTruth,
} from "@gi-tcg/data/internal/characters/anemo/faruzan.gts";
import { AutumnWhirlwind } from "@gi-tcg/data/internal/characters/anemo/kaedehara_kazuha.gts";
import { BogglecatBox } from "@gi-tcg/data/internal/characters/anemo/lynette.gts";
import {
  ShadowswordGallopingFrost,
  ShadowswordLoneGale,
} from "@gi-tcg/data/internal/characters/anemo/maguu_kenki.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("faruzan talent: the winds secret ways deals 1 anemo damage, summons and generates 1 anemo die", async () => {
  // 规则集：抟风秘道 造成1点风元素伤害，召唤赫耀多方面体，若装备天赋->生成1个风元素
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Faruzan} energy={2}>
        <Equipment def={TheWondrousPathOfTruth} />
      </Character>
      <DiceCount my count={8} />
    </State>,
  );

  await c.me.skill(TheWindsSecretWays);

  c.expect($.opp.active).toHaveVariable({ health: 9 });
  c.expect($.my.summon.def(DazzlingPolyhedron01)).toBeExist();
  // 8 - 3（技能费用）+ 1（天赋生成的风元素骰）
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(c.state.players[0].dice).toContain(DiceType.Anemo);
});

test("faruzan talent: still gains the anemo die when the summon zone is full", async () => {
  // 规则集：注：召唤区已满，使用天赋也能获得风元素骰
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Faruzan} energy={2}>
        <Equipment def={TheWondrousPathOfTruth} />
      </Character>
      <Summon my def={ShadowswordLoneGale} />
      <Summon my def={ShadowswordGallopingFrost} />
      <Summon my def={AutumnWhirlwind} />
      <Summon my def={BogglecatBox} />
      <DiceCount my count={8} />
    </State>,
  );

  await c.me.skill(TheWindsSecretWays);

  // 召唤区已满，赫耀多方面体无法入场
  c.expect($.my.summon).toBeCount(4);
  c.expect($.my.summon.def(DazzlingPolyhedron01)).toNotExist();
  // 但仍然获得1个风元素骰
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(c.state.players[0].dice).toContain(DiceType.Anemo);
});
