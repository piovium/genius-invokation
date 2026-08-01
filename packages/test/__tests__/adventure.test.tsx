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

import {
  ref,
  setup,
  Character,
  State,
  Status,
  Card,
  $,
  DiceCount,
  Support,
  Equipment,
} from "#test";
import { VeteransVisage } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  ChenyuBrew,
  ChenyuBrewInEffect,
} from "@gi-tcg/data/internal/cards/event/food.gts";
import { AnAncientSacrificeOfSacredBrocade } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  ChenyuVale,
  TheChasm,
  Tonatiuh,
} from "@gi-tcg/data/internal/cards/support/adventure.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { AquabreezeBlessingWaterburst } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import { MastersOfTheNightwind } from "@gi-tcg/data/internal/cards/support/place.gts";
import { DiceType } from "@gi-tcg/typings";
import { describe, expect, test } from "vitest";

describe("adventure", () => {
  test("chenyuvale basic", async () => {
    const c = setup(
      <State>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
      </State>,
    );
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(ChenyuVale);
    c.expect($.my.support.def(ChenyuVale)).toHaveVariable({ exp: 1 });
  });

  test("chasm basic", async () => {
    const c = setup(
      <State>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
      </State>,
    );
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(TheChasm);
    c.expect($.my.pile).toBeCount(5);
  });

  test("tonatiuh basic", async () => {
    const c = setup(
      <State>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
        <DiceCount my count={2} type={DiceType.Cryo} />
      </State>,
    );
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(Tonatiuh);
    expect(c.state.players[0].dice).toEqual([DiceType.Omni]);
  });

  test("support area full: selecting an adventure only triggers on select card", async () => {
    const c = setup(
      <State>
        <Character my active health={1}>
          <Status my def={ChenyuBrewInEffect} />
        </Character>
        <Support my def={MastersOfTheNightwind} />
        <Support my def={Paimon} />
        <Support my def={Paimon} />
        <Support my def={Paimon} />
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
        <DiceCount my count={2} type={DiceType.Cryo} />
      </State>,
    );

    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    await c.me.selectCard(Tonatiuh);

    // 冒险地点未能入场，但挑选后触发
    c.expect($.my.support.def(MastersOfTheNightwind)).toHaveVariable({
      intuition: 3,
    });
    c.expect($.my.support.def(Tonatiuh)).toNotExist();
    // 天蛇船的首次冒险（入场）效果不触发
    expect(c.state.players[0].dice).toEqual([DiceType.Cryo]);
    c.expect($.my.active).toHaveVariable({ health: 1 });
  });

  describe("adventure (exp=1), spot 'triggered' before status", () => {
    test("tonatiuh", async () => {
      const c = setup(
        <State>
          <Character opp alive={0} health={0} />
          <Character opp alive={0} health={0} />
          <Character opp active health={1} />
          <Character my active>
          <Status my def={ChenyuBrewInEffect} />
          </Character>
          <Support my def={AquabreezeBlessingWaterburst} />
          <Card my def={AnAncientSacrificeOfSacredBrocade} />
          <DiceCount my count={2} type={DiceType.Cryo} />
        </State>
      );
      // 冒险
      await c.me.card(AnAncientSacrificeOfSacredBrocade);
      await c.me.selectCard(Tonatiuh);
      // 先触发转换
      expect(c.state.players[0].dice).toEqual([DiceType.Omni]);
      // 沉玉茶露治疗，触发水风幻变击倒仅存角色，获得胜利
      expect(c.state.phase).toBe("gameEnd");
      expect(c.state.winner).toBe(0);
    })

    test("chasm", async () => {
      const c = setup(
        <State>
          <Character my active health={1}>
            <Equipment my def={VeteransVisage} v={{ count: 1 }} />
            <Status my def={ChenyuBrewInEffect} />
          </Character>
          <Card my def={AnAncientSacrificeOfSacredBrocade} />
        </State>
      );
      // 冒险
      await c.me.card(AnAncientSacrificeOfSacredBrocade);
      await c.me.selectCard(TheChasm);
      // 先触发生成手牌，然后触发沉玉茶露治疗，再触发老兵抽牌
      c.expect($.my.active).toHaveVariable({ health: 2 });
      c.expect($.def(VeteransVisage)).toHaveVariable({ count: 2 });
      c.expect($.my.hand).toBeCount(1);
      c.expect($.my.pile).toBeCount(4);
    })
  });

  test("adventure (exp>=2), spot triggered after status", async () => {
    const c = setup(
      <State>
        <Support my def={ChenyuVale} v={{ exp: 1 }} />
        <Character my active health={1}>
          <Equipment my def={VeteransVisage} v={{ count: 1 }} />
          <Status my def={ChenyuBrewInEffect} />
        </Character>
        <Card my def={AnAncientSacrificeOfSacredBrocade} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my def={Paimon} />
        <Card my pile def={Paimon} />
      </State>,
    );
    // 冒险
    await c.me.card(AnAncientSacrificeOfSacredBrocade);
    // 先触发沉玉茶露，治疗，再触发老兵抽牌
    c.expect($.my.active).toHaveVariable({ health: 2 });
    c.expect($.def(VeteransVisage)).toHaveVariable({ count: 2 });
    c.expect($.my.hand).toBeCount(10);
    // 再触发沉玉谷生成手牌，此时手牌已满不再生成沉玉茶露
    c.expect($.my.def(ChenyuVale)).toHaveVariable({ exp: 2 });
    c.expect($.my.hand.def(ChenyuBrew)).toNotExist();
  });
});
