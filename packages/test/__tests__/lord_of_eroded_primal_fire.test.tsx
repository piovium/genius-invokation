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

import { Card, Character, ref, setup, State } from "#test";
import type { Game } from "@gi-tcg/core";
import {
  LordOfErodedPrimalFire,
  SeveringPrimalFire,
} from "@gi-tcg/data/internal/characters/pyro/lord_of_eroded_primal_fire.gts";
import {
  ChangTheNinth,
  Paimon,
} from "@gi-tcg/data/internal/cards/support/ally.gts";
import { NashaTown } from "@gi-tcg/data/internal/cards/support/place.gts";
import { PbRemoveEntityReason, type RemoveEntityEM } from "@gi-tcg/typings";
import { expect, test } from "vitest";

/**
 * 按发生顺序记录我方客户端收到的「舍弃」通知。
 * 墓地在每次行动结束后会被引擎清空，舍弃顺序只能通过引擎推送的 removeEntity 观察。
 */
function recordDiscards(c: { game: Game }) {
  const discarded: number[] = [];
  const io = c.game.players[0].io;
  const notify = io.notify;
  io.notify = (n) => {
    for (const { mutation } of n.mutation) {
      if (mutation?.$case === "removeEntity") {
        const value = mutation.value as RemoveEntityEM;
        if (value.reason === PbRemoveEntityReason.DISCARDED && value.entity) {
          discarded.push(value.entity.id);
        }
      }
    }
    notify.call(io, n);
  };
  return discarded;
}

test.fails("Severing Primal Fire discards the top three pile cards from the third to the first", async () => {
  // 规则集：斫劫源焰 注：舍弃顺序为先弃置第三张，然后第二张，最后第一张
  // 当前引擎：按牌组顶部第一张 → 第二张 → 第三张的顺序舍弃（skill 中 `for (const card of player.pile.slice(0, 3))`）
  const first = ref();
  const second = ref();
  const third = ref();
  const c = setup(
    <State>
      <Character my active def={LordOfErodedPrimalFire} energy={2} />
      <Character opp active />
      <Card my pile def={Paimon} ref={first} />
      <Card my pile def={ChangTheNinth} ref={second} />
      <Card my pile def={NashaTown} ref={third} />
    </State>,
  );
  // 前置条件：牌库顶为 pile[0]（蚀灭火羽「舍弃牌组顶部1张牌」即 `:discard(:player.pile[0])`）
  expect(c.state.players[0].pile.map((card) => card.id)).toEqual([
    first.id,
    second.id,
    third.id,
  ]);
  const discarded = recordDiscards(c);

  await c.me.skill(SeveringPrimalFire);

  expect(discarded).toEqual([third.id, second.id, first.id]);
});

