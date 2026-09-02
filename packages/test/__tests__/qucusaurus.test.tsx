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

import {
  ref,
  setup,
  Character,
  State,
  Status,
  $,
  Equipment,
  Card,
  Support,
  Summon,
  CombatStatus,
  DiceCount,
} from "#test";
import {
  Qucusaurus,
  Target,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import { Katheryne } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  Chasca,
  ShadowhuntShell,
} from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import {
  MirrorMaiden,
  Refraction,
} from "@gi-tcg/data/internal/characters/hydro/mirror_maiden.gts";
import {
  Baizhu,
  SeamlessShield,
} from "@gi-tcg/data/internal/characters/dendro/baizhu.gts";
import { OdeOfResurrection } from "@gi-tcg/data/internal/cards/event/other.gts";
import { test, expect, vi } from "vitest";
import { GiTcgCoreConflictError } from "@gi-tcg/core";

test("qucusaurus delayed one fast action to next switch", async () => {
  const switch1Target = ref();
  const mona = ref();
  const c = setup(
    <State dataVersion="v6.5.0">
      <Character opp active health={10}>
        <Status def={Target} />
      </Character>
      <Support my def={Katheryne} />
      <Character my active ref={mona} def={Mona} />
      <Character my ref={switch1Target} def={Chasca}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Card my def={ShadowhuntShell} />
    </State>,
  );
  // 第一次快速行动（绒翼龙减费，莫娜设置快速，绒翼龙快速存到下一次）
  await c.me.switch(switch1Target);
  c.expect(mona).toHaveVariable({ usagePerRound1: 0 });
  c.expect($.my.hand).toNotExist();
  // 弹头1伤
  c.expect($.opp.active).toHaveVariable({ health: 9 });
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  // 依然是快速行动（绒翼龙）
  await c.me.switch(mona);
  await c.me.end();
});

test("qucusaurus: defeated switch during precalculation does not block action modifiers", async () => {
  const oppNext = ref();
  const switchTarget = ref();
  const c = setup(
    <State dataVersion="v6.0.0">
      <Character opp active health={1}>
        <Status def={Target} />
      </Character>
      <Character opp ref={oppNext} />
      <Character my active />
      <Character my ref={switchTarget}>
        <Equipment def={Qucusaurus} />
      </Character>
      <Card my def={ShadowhuntShell} />
      <DiceCount my count={1} />
    </State>,
  );

  await c.me.switch(switchTarget);
  await c.opp.chooseActive(oppNext);

  expect(c.state.players[0].dice).toHaveLength(1);
  await c.me.end();
});

test.each(["throw", "skipConsume", "skipAction", void 0] as const)(
  "qucusaurus: insufficient dice behavior",
  async (unexpectedInsufficientDice) => {
    const myActive = ref();
    const myNext = ref();
    const c = setup(
      <State dataVersion="v6.5.0" config={{ unexpectedInsufficientDice }}>
        <Character opp active def={Baizhu}>
          <Status def={Target} />
        </Character>
        <Character opp def={MirrorMaiden} />
        <CombatStatus opp def={SeamlessShield} />
        <DiceCount my count={1} />
        <Character my active ref={myActive} health={1}>
          <Status def={Refraction} />
          <Status def={OdeOfResurrection} />
        </Character>
        <Character my ref={myNext} def={Chasca}>
          <Equipment def={Qucusaurus} />
        </Character>
        <Card my def={ShadowhuntShell} />
      </State>,
    );
    if (unexpectedInsufficientDice === "throw") {
      await expect(c.me.switch(myNext)).rejects.toThrow(GiTcgCoreConflictError);
      return;
    }
    using warn = vi.spyOn(console!, "warn").mockImplementation(() => {});
    await c.me.switch(myNext);
    if (
      !unexpectedInsufficientDice ||
      unexpectedInsufficientDice === "skipConsume"
    ) {
      expect(c.state.players[0].activeCharacterId).toBe(myNext.id);
      expect(c.state.players[0].dice).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("unexpectedInsufficientDice: skipConsume"),
      );
    } else if (unexpectedInsufficientDice === "skipAction") {
      expect(c.state.players[0].activeCharacterId).toBe(myActive.id);
      expect(c.state.players[0].dice).toHaveLength(0);

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("unexpectedInsufficientDice: skipAction"),
      );
    }
  },
);
