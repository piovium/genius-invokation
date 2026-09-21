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
import { CalxsArts } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Sucrose } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { expect, test } from "vitest";

test("calx's arts: cannot be played when the active character's energy is full", async () => {
  // 规则集：白垩之术 条件：我方出战角色充能未满，且存在有充能的我方后台角色
  // 断言：后台有充能但出战角色充能已满时不可打出
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} energy={3} />
      <Character my def={Kaeya} energy={1} />
      <Character my def={Sucrose} />
      <Card my def={CalxsArts} />
    </State>,
  );
  await expect(c.me.card(CalxsArts)).rejects.toThrow(/cannot play/i);
});

test("calx's arts: cannot be played when no standby character has energy", async () => {
  // 规则集：白垩之术 条件：我方出战角色充能未满，且存在有充能的我方后台角色
  // 断言：出战角色充能未满但后台角色均无充能时不可打出
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} energy={0} />
      <Character my def={Kaeya} energy={0} />
      <Character my def={Sucrose} energy={0} />
      <Card my def={CalxsArts} />
    </State>,
  );
  await expect(c.me.card(CalxsArts)).rejects.toThrow(/cannot play/i);
});

test("calx's arts: every standby character loses 1 energy and the active gains that much", async () => {
  // 规则集：每名我方后台角色失去1点充能，我方出战角色获得等量充能
  // 断言：两名后台角色各 -1 充能，出战角色 +2 充能
  const kaeya = ref();
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} energy={0} />
      <Character my def={Kaeya} energy={1} ref={kaeya} />
      <Character my def={Sucrose} energy={2} ref={sucrose} />
      <Card my def={CalxsArts} />
    </State>,
  );
  await c.me.card(CalxsArts);
  c.expect($.my.active).toHaveVariable({ energy: 2 });
  c.expect(kaeya).toHaveVariable({ energy: 0 });
  c.expect(sucrose).toHaveVariable({ energy: 1 });
});

test("calx's arts: a standby character without energy transfers nothing", async () => {
  // 规则集：每名我方后台角色失去1点充能，我方出战角色获得等量充能
  // 断言：无充能的后台角色不提供充能，出战角色只获得 1 点
  const kaeya = ref();
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Diluc} energy={0} />
      <Character my def={Kaeya} energy={0} ref={kaeya} />
      <Character my def={Sucrose} energy={1} ref={sucrose} />
      <Card my def={CalxsArts} />
    </State>,
  );
  await c.me.card(CalxsArts);
  c.expect($.my.active).toHaveVariable({ energy: 1 });
  c.expect(kaeya).toHaveVariable({ energy: 0 });
  c.expect(sucrose).toHaveVariable({ energy: 0 });
});
