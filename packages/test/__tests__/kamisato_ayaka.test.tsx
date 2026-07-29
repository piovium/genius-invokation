
// Copyright (C) 2025 Guyutongxue
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

import { ref, setup, Character, State, Equipment, CombatStatus, Card, DeclaredEnd } from "#test";
import { KamisatoArtKabuki, KamisatoArtSenhoStatus, KamisatoAyaka, KantenSenmyouBlessing } from "@gi-tcg/data/internal/characters/cryo/kamisato_ayaka.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { expect, test } from "vitest";

test("a talent dup-equip test", async () => {
  const ayaka = ref();
  const c = setup(
    <State>
      <Character my active def={KamisatoAyaka} ref={ayaka} />
      <Card my def={KantenSenmyouBlessing} />
      <Card my def={KantenSenmyouBlessing} />
    </State>,
  );
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
  await c.me.card(KantenSenmyouBlessing, ayaka);
  await c.me.card(KantenSenmyouBlessing, ayaka);
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
});

test("KamisatoArtSenho02: usage not consumed when status still attached", async () => {
  const ayaka = ref();
  const kaeya = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character my active def={Kaeya} ref={kaeya} />
      <Character my def={KamisatoAyaka} ref={ayaka} />
    </State>,
  );
  const hasStatus = () =>
    c.state.players[0].characters
      .flatMap((ch) => ch.entities)
      .some((e) => e.definition.id === KamisatoArtSenhoStatus);
  const usage = () =>
    c.state.players[0].characters.find(
      (ch) => ch.definition.id === KamisatoAyaka,
    )!.variables.usagePerRound1;

  // 第一次切出：附属状态并消耗可用次数（2 -> 1）
  await c.me.switch(ayaka);
  expect(hasStatus()).toBe(true);
  expect(usage()).toBe(1);

  // 不普攻，切走再切回来：状态仍在，不重复触发，剩余次数仍为 1
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  expect(hasStatus()).toBe(true);
  expect(usage()).toBe(1);

  // 普攻用掉状态
  await c.me.skill(KamisatoArtKabuki);
  expect(hasStatus()).toBe(false);
  expect(usage()).toBe(1);

  // 再切走再切回来：重新附属并消耗可用次数（1 -> 0）
  await c.me.switch(kaeya);
  await c.me.switch(ayaka);
  expect(hasStatus()).toBe(true);
  expect(usage()).toBe(0);
});
