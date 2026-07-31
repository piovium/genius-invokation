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

import { $, Attachment, Card, ref, setup, State, Support } from "#test";
import { CostIncrease, Empowerment } from "@gi-tcg/data/internal/commons.gts";
import {
  LeaveItToMe,
  Strategize,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  KuuvahkiExperimentalDesignBureau,
  NightmareOmen,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import { expect, test } from "vitest";

// 支援区满，含有一张月矩力试验设计局，牌堆从上往下分别为牌1（赋能），牌2（赋能），牌3。
// 打出噩梦的预兆，选择月矩力试验设计局弃置。
// 期望结果为抓牌：牌1（赋能，费用增加），牌2（赋能）。
test("nightmare omen stages before the replaced support is disposed", async () => {
  const bureau = ref();
  const card1 = ref();
  const card2 = ref();
  const card3 = ref();
  const c = setup(
    <State>
      <Support my def={KuuvahkiExperimentalDesignBureau} ref={bureau} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Support my def={Paimon} />
      <Card my pile def={Paimon} ref={card1}>
        <Attachment def={Empowerment} />
      </Card>
      <Card my pile def={Strategize} ref={card2}>
        <Attachment def={Empowerment} />
      </Card>
      <Card my pile def={LeaveItToMe} ref={card3} />
      <Card my def={NightmareOmen} />
    </State>,
  );

  await c.me.card(NightmareOmen, bureau);

  expect(c.state.players[0].hands.map((card) => card.id)).toEqual(
    expect.arrayContaining([card1.id, card2.id]),
  );
  expect(c.state.players[0].hands).toHaveLength(2);
  expect(c.state.players[0].pile.map((card) => card.id)).toEqual([card3.id]);
  c.expect($.my.attachment.def(Empowerment).on($.id(card1.id))).toBeExist();
  c.expect($.my.attachment.def(CostIncrease).on($.id(card1.id))).toBeExist();
  c.expect($.my.attachment.def(Empowerment).on($.id(card2.id))).toBeExist();
  c.expect($.my.attachment.def(CostIncrease).on($.id(card2.id))).toNotExist();
});
