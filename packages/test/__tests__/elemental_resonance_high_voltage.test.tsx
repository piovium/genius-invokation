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

import { $, Card, Character, setup, State } from "#test";
import { ElementalResonanceHighVoltage } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Sucrose } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { expect, test } from "vitest";

test("high voltage: playable when some character's energy is not full", async () => {
  // 规则集：元素共鸣：强能之雷 条件：我方有充能未满的角色
  // 出战角色迪卢克充能已满，但后台凯亚未满 => 满足条件，可以打出
  const c = setup(
    <State>
      <Character my active def={Diluc} energy={3} />
      <Character my def={Kaeya} energy={0} />
      <Character my def={Sucrose} energy={2} />
      <Card my def={ElementalResonanceHighVoltage} />
    </State>,
  );
  await c.me.card(ElementalResonanceHighVoltage);
  c.expect($.my.hand).toBeCount(0);
});

test("high voltage: not playable when all characters have full energy", async () => {
  // 规则集：元素共鸣：强能之雷 条件：我方有充能未满的角色
  // 迪卢克 3/3、凯亚 2/2、砂糖 2/2 全员充能已满 => 不满足条件，引擎拒绝这一行动，牌留在手里
  const c = setup(
    <State>
      <Character my active def={Diluc} energy={3} />
      <Character my def={Kaeya} energy={2} />
      <Character my def={Sucrose} energy={2} />
      <Card my def={ElementalResonanceHighVoltage} />
    </State>,
  );
  await expect(c.me.card(ElementalResonanceHighVoltage)).rejects.toThrow(
    /You cannot play card/,
  );
  c.expect($.my.hand).toBeCount(1);
});
