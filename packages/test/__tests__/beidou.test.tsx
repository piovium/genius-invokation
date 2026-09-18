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

import { $, Card, Character, ref, setup, State } from "#test";
import {
  Beidou,
  LightningStorm,
  Oceanborne,
  TidecallerSurfEmbrace,
} from "@gi-tcg/data/internal/characters/electro/beidou.gts";
import {
  Amber,
  Sharpshooter,
} from "@gi-tcg/data/internal/characters/pyro/amber.gts";
import {
  Barbara,
  WhisperOfWater,
} from "@gi-tcg/data/internal/characters/hydro/barbara.gts";
import { expect, test } from "vitest";

test.each([
  { damage: 2, opponent: Amber, skill: Sharpshooter, cost: 2 },
  { damage: 1, opponent: Barbara, skill: WhisperOfWater, cost: 2 },
  { damage: 0, opponent: Amber, skill: null, cost: 3 },
])(
  "beidou v4.1 talent: $damage damage during preparation makes the next normal attack cost $cost dice",
  async ({ skill, opponent, cost }) => {
    const beidou = ref();
    const c = setup(
      <State dataVersion="v4.1.0">
        <Character my active def={Beidou} ref={beidou} />
        <Character opp active def={opponent} />
        <Card my def={LightningStorm} />
      </State>,
    );

    await c.me.card(LightningStorm, beidou);
    c.expect($.my.def(TidecallerSurfEmbrace)).toHaveVariable({
      shield: 2,
    });

    if (skill !== null) {
      await c.opp.skill(skill);
      // 踏潮自动打出后，轮到对方行动
      await c.opp.end();
    } else {
      await c.opp.end();
    }

    // 伤害被护盾完全抵消
    c.expect($.my.active).toHaveVariable({ health: 10 });
    // 护盾被准备技能完成弃置
    c.expect($.my.def(TidecallerSurfEmbrace)).toNotExist();
    c.expect($.opp.active).toHaveVariable({ health: 7 });
    // 有伤害时触发天赋
    const diceBefore = c.state.players[0].dice.length;
    await c.me.skill(Oceanborne);
    expect(c.state.players[0].dice).toBeArrayOfSize(diceBefore - cost);
  },
);
