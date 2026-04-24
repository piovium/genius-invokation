// Copyright (C) 2024-2025 Guyutongxue
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

import { ref, setup, Character, State, Status, Card, Equipment, $ } from "#test";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food";
import { test } from "bun:test";
import {
  ThunderManifestation,
  GrievingEcho,
  LightningRod,
  StrifefulLightning,
} from "@gi-tcg/data/internal/characters/electro/thunder_manifestation";

test("thunder manifestation: talent works on 'disposed' status", async () => {
  const target = ref();
  const talent = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character opp health={10} ref={target}>
        <Status def={LightningRod} />
      </Character>
      <Character my def={ThunderManifestation}>
        <Equipment def={GrievingEcho} ref={talent} />
      </Character>
      <Card my pile def={MondstadtHashBrown} />
    </State>,
  );
  c.expect($.my.hand).toBeCount(0);
  await c.me.skill(StrifefulLightning);
  // 雷鸣探知弃置，伤害 +1
  c.expect($.typeStatus.def(LightningRod)).toNotExist();
  c.expect(target).toHaveVariable({ health: 6 });
  // 我方抽牌
  c.expect($.my.hand).toBeCount(1);
  // 我方天赋每回合使用次数归零
  c.expect(talent).toHaveVariable({ usagePerRound: 0 });
});
