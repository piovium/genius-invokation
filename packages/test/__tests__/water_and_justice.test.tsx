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

import { setup, Character, State, Equipment, Card } from "#test";
import { DetailLogEntry, DetailLogType } from "@gi-tcg/core";
import { VeteransVisage } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { WaterAndJustice } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Sucrose } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { expect, test } from "vitest";

function flattenLogs(entries: readonly DetailLogEntry[]): DetailLogEntry[] {
  const result: DetailLogEntry[] = [];
  for (const entry of entries) {
    result.push(entry);
    if (entry.children) {
      result.push(...flattenLogs(entry.children));
    }
  }
  return result;
}

test("water and justice: balance part resolves before the group heal part", async () => {
  const c = setup(
    <State>
      <Character my active def={Diluc} health={5}>
        <Equipment def={VeteransVisage} />
      </Character>
      <Character my def={Kaeya} health={12}>
        <Equipment def={VeteransVisage} />
      </Character>
      <Character my def={Sucrose} health={1}>
        <Equipment def={VeteransVisage} />
      </Character>
      <Card my def={WaterAndJustice} />
    </State>,
  );
  const logIndex = c.game.detailLog.length;
  await c.me.card(WaterAndJustice);

  // 血量 5 / 12 / 1，平均后治疗迪卢克 1、穿透伤害凯亚 6、治疗砂糖 5；
  // 这一部分先结算，令三张「老兵的容颜」各自触发第 1 次效果（生成元素骰）。
  // 随后的全体治疗 1 再结算，令三者触发第 2 次效果（抓 1 张牌）。
  const triggers = flattenLogs(c.game.detailLog.slice(logIndex))
    .filter((entry) => entry.type === DetailLogType.Primitive)
    .map((entry) => entry.value)
    .flatMap((value): ("dice" | "draw")[] => {
      if (value.startsWith("Generate ") && value.includes("dice")) {
        return ["dice"];
      }
      if (/^Player 0 draw \d+ cards/.test(value)) {
        return ["draw"];
      }
      return [];
    });

  expect(triggers).toEqual(["dice", "dice", "dice", "draw", "draw", "draw"]);
});
