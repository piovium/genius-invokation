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

import { $, Card, Character, setup, State, Status } from "#test";
import { SingYourHeartOut } from "@gi-tcg/data/internal/cards/event/food.gts";
import { Satiated } from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

test("sing your heart out: playable only when none of my characters is satiated", async () => {
  // 规则集：纵声欢唱 条件：所有己方角色均未饱腹
  // 断言：我方全员未饱腹时可以打出；任意一名我方角色（出战或后台）饱腹时都无法打出
  const noneSatiated = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await noneSatiated.me.card(SingYourHeartOut);
  noneSatiated.expect($.my.character.has($.typeStatus.def(Satiated))).toBeCount(3);

  const activeSatiated = setup(
    <State>
      <Character opp active />
      <Character my active>
        <Status def={Satiated} />
      </Character>
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await expect(activeSatiated.me.card(SingYourHeartOut)).rejects.toThrow(
    /You cannot play card/,
  );

  const standbySatiated = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my>
        <Status def={Satiated} />
      </Character>
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await expect(standbySatiated.me.card(SingYourHeartOut)).rejects.toThrow(
    /You cannot play card/,
  );
});

test("sing your heart out: only my own characters are checked for satiation", async () => {
  // 规则集：纵声欢唱 条件：所有己方角色均未饱腹
  // 断言：条件只看己方，敌方角色全部饱腹不影响我方打出此牌
  const c = setup(
    <State>
      <Character opp active>
        <Status def={Satiated} />
      </Character>
      <Character opp>
        <Status def={Satiated} />
      </Character>
      <Character opp>
        <Status def={Satiated} />
      </Character>
      <Character my active />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await c.me.card(SingYourHeartOut);
  c.expect($.my.character.has($.typeStatus.def(Satiated))).toBeCount(3);
});
