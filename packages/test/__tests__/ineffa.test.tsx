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

import { ref, setup, Card, Character, State, Summon, $ } from "#test";
import { QuickKnit } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Ineffa } from "@gi-tcg/data/internal/characters/electro/ineffa.gts";
import {
  Conductive,
  NoTuningAllowed,
  Thundercloud,
} from "@gi-tcg/data/internal/commons.gts";
import { test } from "vitest";

test("ineffa: Quick Knit makes Thundercloud grant conductive again", async () => {
  // 规则集：雷暴云 —— 快快缝补术可以触发赋予电击的效果
  // 断言：【快快缝补术】使雷暴云可用次数+1，触发其「可用次数增加时赋予敌方随机1张手牌电击」；
  //       伊涅芙在场时该手牌还会额外附属【不可调和】。
  const oppHand = ref();
  const cloud = ref();
  const c = setup(
    <State>
      <Card opp def={Paimon} ref={oppHand} />
      <Character opp active />
      <Character my active def={Ineffa} />
      <Summon my def={Thundercloud} ref={cloud} />
      <Card my def={QuickKnit} />
    </State>,
  );
  c.expect(cloud).toHaveVariable({ usage: 1 });
  c.expect($.attachment.def(Conductive).on($.id(oppHand.id))).toNotExist();
  await c.me.card(QuickKnit, cloud);
  c.expect(cloud).toHaveVariable({ usage: 2 });
  c.expect($.attachment.def(Conductive).on($.id(oppHand.id))).toBeExist();
  c.expect($.attachment.def(NoTuningAllowed).on($.id(oppHand.id))).toBeExist();
});
