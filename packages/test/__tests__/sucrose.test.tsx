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

import { $, Card, Character, ref, setup, State, Summon } from "#test";
import { AutumnWhirlwind } from "@gi-tcg/data/internal/characters/anemo/kaedehara_kazuha.gts";
import {
  ShadowswordGallopingFrost,
  ShadowswordLoneGale,
} from "@gi-tcg/data/internal/characters/anemo/maguu_kenki.gts";
import {
  ChaoticEntropy,
  LargeWindSpirit,
  LargeWindSpirit01,
  Sucrose,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { DamageType } from "@gi-tcg/typings";
import { test } from "vitest";

test("sucrose talent: the old large wind spirit is destroyed, then the new one is summoned", async () => {
  // 规则集：注：装备天赋的场合，先消灭原召唤物，再召唤新的。
  // 断言：旧「大型风灵」被消灭而非被刷新，场上只剩天赋版本，可用次数与元素类型都是全新的
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Sucrose} energy={2} ref={sucrose} />
      <Summon
        my
        def={LargeWindSpirit}
        usage={1}
        v={{ hintIcon: DamageType.Pyro }}
      />
      <Card my def={ChaoticEntropy} />
    </State>,
  );

  await c.me.card(ChaoticEntropy, sucrose);

  c.expect($.my.summon).toBeCount(1);
  c.expect($.my.summon.def(LargeWindSpirit)).toNotExist();
  c.expect($.my.summon.def(LargeWindSpirit01)).toHaveVariable({
    usage: 3,
    hintIcon: DamageType.Anemo,
  });
});

test.fails("sucrose talent: the new summon still enters when the summon zone is full", async () => {
  // 规则集：注：装备天赋的场合，先消灭原召唤物，再召唤新的。
  // 当前引擎：先召唤新的（conflictWith 由新召唤物入场时触发消灭旧的），召唤区已满时新召唤物无法入场，
  //           旧「大型风灵」也就不会被消灭
  // 断言：召唤区已满时，旧「大型风灵」先被消灭腾出位置，新的天赋版本仍能入场
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Sucrose} energy={2} ref={sucrose} />
      <Summon my def={LargeWindSpirit} usage={1} />
      <Summon my def={ShadowswordLoneGale} />
      <Summon my def={ShadowswordGallopingFrost} />
      <Summon my def={AutumnWhirlwind} />
      <Card my def={ChaoticEntropy} />
    </State>,
  );

  await c.me.card(ChaoticEntropy, sucrose);

  c.expect($.my.summon).toBeCount(4);
  c.expect($.my.summon.def(LargeWindSpirit)).toNotExist();
  c.expect($.my.summon.def(LargeWindSpirit01)).toHaveVariable({ usage: 3 });
});
