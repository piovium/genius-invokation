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

import { ref, setup, Character, State, Card, Equipment, CombatStatus, $ } from "#test";
import {
  AdeptusTemptation,
  JueyunGuoba,
} from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  Aino,
  Musecatcher,
  TheBurdenOfCreativeGenius,
} from "@gi-tcg/data/internal/characters/hydro/aino.gts";
import {
  AlldevouringNarwhal,
  DeepDevourersDomain,
  StarfallShower,
} from "@gi-tcg/data/internal/characters/hydro/alldevouring_narwhal.gts";
import { Empowerment } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test.each([
  { reaction: "electro-charged", aura: Aura.Electro },
  { reaction: "bloom", aura: Aura.Dendro },
])(
  "burden of creative genius: $reaction damage +2 and empowers the max-cost hand card",
  async ({ aura }) => {
    // 规则集：我方造成感电、月感电、绽放伤害时：伤害+2，赋予我方当前元素骰费用最高的1张手牌赋能
    // 断言：妙思捕手 2 水伤 + 反应 1 + 天赋 2 = 5；费用 2 的仙跳墙被赋能，费用 0 的绝云锅巴未被赋能
    const target = ref();
    const c = setup(
      <State>
        <Character opp active ref={target} health={10} aura={aura} />
        <Character my active def={Aino}>
          <Equipment def={TheBurdenOfCreativeGenius} />
        </Character>
        <Card my def={JueyunGuoba} />
        <Card my def={AdeptusTemptation} />
      </State>,
    );
    await c.me.skill(Musecatcher);
    c.expect(target).toHaveVariable({ health: 5 });
    c.expect($.my.hand.with($.def(Empowerment))).toBeCount(1);
    c.expect($.my.hand.with($.def(Empowerment))).toBeDefinition(AdeptusTemptation);
  },
);

test("modular efficiency protocol: still triggers when the empowered card is discarded right away", async () => {
  // 规则集：赋能牌被送入墓地也能发动。如：鲸鱼战技触发天赋赋能再弃置。
  // 场景：鲸鱼迸落星雨触发感电 -> 爱诺天赋赋能费用最高手牌（仙跳墙）-> 该牌随即被迸落星雨舍弃
  // 断言：手牌已空，但爱诺仍因「卡牌被赋予赋能」获得 1 点充能（场上无冷静一下鸭）
  const aino = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Electro} />
      <Character my active def={AlldevouringNarwhal} />
      <Character my def={Aino} ref={aino} energy={0}>
        <Equipment def={TheBurdenOfCreativeGenius} />
      </Character>
      <CombatStatus my def={DeepDevourersDomain} />
      <Card my def={AdeptusTemptation} />
    </State>,
  );
  await c.me.skill(StarfallShower);
  // 1 水伤 + 感电 1 + 天赋 2
  c.expect(target).toHaveVariable({ health: 6 });
  c.expect($.my.hand).toNotExist();
  c.expect(aino).toHaveVariable({ energy: 1 });
});
