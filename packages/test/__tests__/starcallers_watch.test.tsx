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
  $,
  Card,
  Character,
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  StarcallersWatch,
  StarcallersWatchInEffect,
} from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst.gts";
import { LiyueHarborWharf } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { expect, test } from "vitest";

test("starcaller's watch: deducts 1 die and attaches the in-effect status for a card outside the initial deck", async () => {
  // 规则集：我方打出名称不属于初始牌组的牌时：少花费1个元素骰->角色附属【祭星者之望（生效中）】
  const c = setup(
    <State>
      <Character my active def={Sucrose}>
        <Equipment def={StarcallersWatch} />
      </Character>
      <Card my notInitial def={LiyueHarborWharf} />
      <DiceCount my count={8} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(LiyueHarborWharf);
  // 璃月港口原本 2 骰，少花费 1 个后只付 1 个
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect($.my.typeStatus.def(StarcallersWatchInEffect)).toHaveVariable({
    increaseDmg: 1,
  });
});

test("starcaller's watch: does not trigger for a card from the initial deck", async () => {
  // 规则集：我方打出名称不属于初始牌组的牌时……（属于初始牌组则不生效）
  const c = setup(
    <State>
      <Character my active def={Sucrose}>
        <Equipment def={StarcallersWatch} />
      </Character>
      <Card my def={LiyueHarborWharf} />
      <DiceCount my count={8} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(LiyueHarborWharf);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect($.my.typeStatus.def(StarcallersWatchInEffect)).toNotExist();
});

test("starcaller's watch: once per round", async () => {
  // 规则集：……（每回合1次）
  const c = setup(
    <State>
      <Character my active def={Sucrose}>
        <Equipment def={StarcallersWatch} />
      </Character>
      <Card my notInitial def={LiyueHarborWharf} />
      <Card my notInitial def={LiyueHarborWharf} />
      <DiceCount my count={8} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(LiyueHarborWharf);
  await c.me.card(LiyueHarborWharf);
  // 第一张少花 1 骰（付 1），第二张付满 2 骰：8 - 1 - 2 = 5
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
  c.expect($.my.typeStatus.def(StarcallersWatchInEffect)).toHaveVariable({
    increaseDmg: 1,
  });
});

test("starcaller's watch: in-effect stacks are capped at 2", async () => {
  // 规则集：层数：1（上限为2）
  const c = setup(
    <State>
      <Character my active def={Sucrose}>
        <Equipment def={StarcallersWatch} />
        <Status def={StarcallersWatchInEffect} v={{ increaseDmg: 2 }} />
      </Character>
      <Card my notInitial def={LiyueHarborWharf} />
      <DiceCount my count={8} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(LiyueHarborWharf);
  // 少花费 1 个元素骰说明效果确实触发了，但层数被 2 层上限截断
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect($.my.typeStatus.def(StarcallersWatchInEffect)).toHaveVariable({
    increaseDmg: 2,
  });
});

test("starcaller's watch (in effect): adds X damage then is discarded", async () => {
  // 规则集：角色造成伤害时：伤害+X（X为此效果层数），弃置此效果
  const target = ref();
  const c = setup(
    <State>
      <Character my active def={Sucrose}>
        <Status def={StarcallersWatchInEffect} v={{ increaseDmg: 2 }} />
      </Character>
      <Character opp active ref={target} def={Diluc} />
    </State>,
  );
  await c.me.skill(WindSpiritCreation);
  // 简式风灵作成 1 点风伤，+2 后 3 点
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(StarcallersWatchInEffect)).toNotExist();
});

test("starcaller's watch: a card whose name is in the initial deck does not trigger", async () => {
  // 规则集：我方打出名称不属于初始牌组的牌时：少花费1个元素骰->角色附属【祭星者之望（生效中）】
  // 判定依据是「名称」：手牌这张虽不来自初始牌组，但同名牌在初始牌组中，故不生效
  const c = setup(
    <State>
      <Character my active def={Sucrose}>
        <Equipment def={StarcallersWatch} />
      </Character>
      <Card my notInitial def={LiyueHarborWharf} />
      <Card my pile def={LiyueHarborWharf} />
      <DiceCount my count={8} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.me.card(LiyueHarborWharf);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  c.expect($.my.typeStatus.def(StarcallersWatchInEffect)).toNotExist();
});
