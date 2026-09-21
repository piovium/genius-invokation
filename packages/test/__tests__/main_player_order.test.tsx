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
import {
  AbundantPhlogiston,
  FriendshipEternal,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { YumemiStyleSpecialSnacks } from "@gi-tcg/data/internal/characters/anemo/yumemizuki_mizuki.gts";
import { test } from "vitest";

// 场景说明：双方牌库顶各放 1 张梦见风名物点心（进入手牌时：出战角色生命 >5 则对敌方出战角色造成 1 点风伤，否则治疗自身 2 点）。
// 双方出战角色均为 6 血；先结算的一方造成 1 伤，后结算的一方因此掉到 5 血转为治疗，最终血量可区分先后。
// 「小嵴锋龙！发现宝藏！」会向牌库随机位置放入燃素充盈，无法保证抓到点心，故改用「永远的友谊」让双方各抓 1 张。

test("main player order: host player's HCI resolves first even if guest played the card", async () => {
  // 规则集：对【进入手牌后】进行时机重排的场合，主玩家【进入手牌后】先于副玩家【进入手牌后】
  // 我方（副玩家）打出永远的友谊，仍应先结算主玩家（对方）的点心：对方打我 1 → 我 5 血 → 我方点心治疗 → 7
  const c = setup(
    <State config={{ hostRelatedExecution: true, hostWho: 1 }}>
      <Character my active health={6} />
      <Character opp active health={6} />
      <Card my def={FriendshipEternal} />
      <Card my def={AbundantPhlogiston} />
      <Card my def={AbundantPhlogiston} />
      <Card my def={AbundantPhlogiston} />
      <Card my pile def={YumemiStyleSpecialSnacks} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp pile def={YumemiStyleSpecialSnacks} />
    </State>,
  );
  await c.me.card(FriendshipEternal);
  c.expect($.my.active).toHaveVariable({ health: 7 });
  c.expect($.opp.active).toHaveVariable({ health: 6 });
});

test("main player order: host player's HCI resolves first when guest (opp) played the card", async () => {
  // 规则集：对【进入手牌后】进行时机重排的场合，主玩家【进入手牌后】先于副玩家【进入手牌后】
  // 对方（副玩家）打出永远的友谊，仍应先结算主玩家（我方）的点心：我打对方 1 → 对方 5 血 → 对方点心治疗 → 7
  const c = setup(
    <State currentTurn="opp" config={{ hostRelatedExecution: true, hostWho: 0 }}>
      <Character my active health={6} />
      <Character opp active health={6} />
      <Card my def={AbundantPhlogiston} />
      <Card my def={AbundantPhlogiston} />
      <Card my def={AbundantPhlogiston} />
      <Card my pile def={YumemiStyleSpecialSnacks} />
      <Card opp def={FriendshipEternal} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp pile def={YumemiStyleSpecialSnacks} />
    </State>,
  );
  await c.opp.card(FriendshipEternal);
  c.expect($.my.active).toHaveVariable({ health: 6 });
  c.expect($.opp.active).toHaveVariable({ health: 7 });
});

test("main player order: host player's HCI resolves first when host played the card", async () => {
  // 规则集：对【进入手牌后】进行时机重排的场合，主玩家【进入手牌后】先于副玩家【进入手牌后】
  // 主玩家（我方）自己打出永远的友谊，仍是主玩家先结算：我打对方 1 → 对方 5 血 → 对方点心治疗 → 7
  // 与前两例合看，排除「非打出者先结算」的错误解释
  const c = setup(
    <State config={{ hostRelatedExecution: true, hostWho: 0 }}>
      <Character my active health={6} />
      <Character opp active health={6} />
      <Card my def={FriendshipEternal} />
      <Card my def={AbundantPhlogiston} />
      <Card my def={AbundantPhlogiston} />
      <Card my def={AbundantPhlogiston} />
      <Card my pile def={YumemiStyleSpecialSnacks} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp def={AbundantPhlogiston} />
      <Card opp pile def={YumemiStyleSpecialSnacks} />
    </State>,
  );
  await c.me.card(FriendshipEternal);
  c.expect($.my.active).toHaveVariable({ health: 6 });
  c.expect($.opp.active).toHaveVariable({ health: 7 });
});
