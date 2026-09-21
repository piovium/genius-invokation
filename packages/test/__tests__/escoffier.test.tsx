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
import { Satiated } from "@gi-tcg/data/internal/commons.gts";
import {
  Escoffier,
  VerdantGift,
  VerdantGiftInEffect,
  WaveKissedSands,
  WavekissedSandsInEffect,
} from "@gi-tcg/data/internal/characters/cryo/escoffier.gts";
import { expect, test } from "vitest";

test("wave-kissed sands: playable only when none of my characters is satiated", async () => {
  // 规则集：爱可菲 白浪拂沙 条件：所有我方角色均未饱腹
  // 断言：全员未饱腹时可打出并让所有我方角色饱腹；出战或后台任一角色已饱腹都无法打出
  const noneSatiated = setup(
    <State>
      <Character opp active />
      <Character my active def={Escoffier} />
      <Card my def={WaveKissedSands} />
    </State>,
  );

  await noneSatiated.me.card(WaveKissedSands);

  noneSatiated
    .expect($.my.character.has($.typeStatus.def(Satiated)))
    .toBeCount(3);
  noneSatiated
    .expect($.my.character.has($.typeStatus.def(WavekissedSandsInEffect)))
    .toBeCount(3);

  const activeSatiated = setup(
    <State>
      <Character opp active />
      <Character my active def={Escoffier}>
        <Status def={Satiated} />
      </Character>
      <Card my def={WaveKissedSands} />
    </State>,
  );
  await expect(activeSatiated.me.card(WaveKissedSands)).rejects.toThrow(
    "You cannot play card",
  );

  const standbySatiated = setup(
    <State>
      <Character opp active />
      <Character my active def={Escoffier} />
      <Character my>
        <Status def={Satiated} />
      </Character>
      <Card my def={WaveKissedSands} />
    </State>,
  );
  await expect(standbySatiated.me.card(WaveKissedSands)).rejects.toThrow(
    "You cannot play card",
  );
});

test("verdant gift: playable only when none of my characters is satiated", async () => {
  // 规则集：爱可菲 一捧绿野 条件：所有我方角色均未饱腹
  // 断言：全员未饱腹时可打出并让所有我方角色饱腹；出战或后台任一角色已饱腹都无法打出
  const noneSatiated = setup(
    <State>
      <Character opp active />
      <Character my active def={Escoffier} />
      <Card my def={VerdantGift} />
    </State>,
  );

  await noneSatiated.me.card(VerdantGift);

  noneSatiated
    .expect($.my.character.has($.typeStatus.def(Satiated)))
    .toBeCount(3);
  noneSatiated
    .expect($.my.character.has($.typeStatus.def(VerdantGiftInEffect)))
    .toBeCount(3);

  const activeSatiated = setup(
    <State>
      <Character opp active />
      <Character my active def={Escoffier}>
        <Status def={Satiated} />
      </Character>
      <Card my def={VerdantGift} />
    </State>,
  );
  await expect(activeSatiated.me.card(VerdantGift)).rejects.toThrow(
    "You cannot play card",
  );

  const standbySatiated = setup(
    <State>
      <Character opp active />
      <Character my active def={Escoffier} />
      <Character my>
        <Status def={Satiated} />
      </Character>
      <Card my def={VerdantGift} />
    </State>,
  );
  await expect(standbySatiated.me.card(VerdantGift)).rejects.toThrow(
    "You cannot play card",
  );
});
