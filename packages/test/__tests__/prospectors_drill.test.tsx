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

import { Card, Character, Equipment, ref, setup, State, Status } from "#test";
import { UnmovableMountain } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { ProspectorsDrill } from "@gi-tcg/data/internal/cards/equipment/weapon/pole.gts";
import { Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { LiyueHarborWharf } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Diluc,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import {
  DoughFu,
  Xiangling,
} from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { expect, test } from "vitest";

test("prospector's drill: negates 1 damage, discards the most expensive hand card and stacks solidarity", async () => {
  // 规则集：②受到伤害时：若有手牌且伤害值大于0->抵消1点伤害，随机舍弃当前元素骰费用最高的手牌，叠加1点【团结】
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active ref={me} def={Xiangling}>
        <Equipment ref={weapon} def={ProspectorsDrill} />
      </Character>
      <Card my def={LiyueHarborWharf} />
      <Card my def={Strategize} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  // 淬炼之剑 2 点物理伤害，抵消 1 点后只受到 1 点
  c.expect(me).toHaveVariable({ health: 9 });
  c.expect(weapon).toHaveVariable({ solidarity: 1 });
  // 费用最高的璃月港口（2）被舍弃，运筹帷幄（1）留在手牌
  expect(c.state.players[0].hands).toBeArrayOfSize(1);
  expect(c.state.players[0].hands[0].definition.id).toBe(Strategize);
});

test("prospector's drill: negation is once per round", async () => {
  // 规则集：②……每回合限1次
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active ref={me} def={Xiangling}>
        <Equipment ref={weapon} def={ProspectorsDrill} />
      </Character>
      <Card my def={LiyueHarborWharf} />
      <Card my def={Strategize} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  await c.me.end();
  await c.opp.skill(TemperedSword);
  // 第二次受伤本回合不再抵消：10 - 1 - 2 = 7
  c.expect(me).toHaveVariable({ health: 7 });
  c.expect(weapon).toHaveVariable({ solidarity: 1 });
  expect(c.state.players[0].hands).toBeArrayOfSize(1);
});

test("prospector's drill: does not trigger without hand cards", async () => {
  // 规则集：②受到伤害时：若有手牌……
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active ref={me} def={Xiangling}>
        <Equipment ref={weapon} def={ProspectorsDrill} />
      </Character>
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  c.expect(me).toHaveVariable({ health: 8 });
  c.expect(weapon).toHaveVariable({ solidarity: 0 });
});

test("prospector's drill: consumes all solidarity for +1 damage and draws that many cards", async () => {
  // 规则集：①造成伤害时：若有团结，造成伤害+1，消耗所有【团结】，抓等量牌
  const weapon = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling}>
        <Equipment ref={weapon} def={ProspectorsDrill} v={{ solidarity: 2 }} />
      </Character>
      <Character opp active ref={target} def={Diluc} />
      <Card my pile def={Strategize} />
      <Card my pile def={Strategize} />
      <Card my pile def={Strategize} />
    </State>,
  );
  await c.me.skill(DoughFu);
  // 白案功夫 2 点物理伤害，+1 后 3 点
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(weapon).toHaveVariable({ solidarity: 0 });
  // 消耗 2 点【团结】，抓 2 张牌
  expect(c.state.players[0].hands).toBeArrayOfSize(2);
});

test("prospector's drill: does not trigger when the damage is already reduced to 0", async () => {
  // 规则集：②受到伤害时：若有手牌且伤害值大于0->抵消1点伤害，随机舍弃……，叠加1点【团结】
  // 护盾先于所附属武器结算，伤害被吸收至 0 后武器不再触发
  const weapon = ref();
  const me = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active ref={me} def={Xiangling}>
        <Status def={UnmovableMountain} />
        <Equipment ref={weapon} def={ProspectorsDrill} />
      </Character>
      <Card my def={LiyueHarborWharf} />
      <Character opp active def={Diluc} />
    </State>,
  );
  await c.opp.skill(TemperedSword);
  // 重嶂不移 2 点护盾吃满淬炼之剑的 2 点物理伤害
  c.expect(me).toHaveVariable({ health: 10 });
  c.expect(weapon).toHaveVariable({ solidarity: 0 });
  expect(c.state.players[0].hands).toBeArrayOfSize(1);
});

test("prospector's drill: without solidarity the damage is not increased and no card is drawn", async () => {
  // 规则集：①造成伤害时：若有团结，造成伤害+1，消耗所有【团结】，抓等量牌
  // 反向验证：没有【团结】时既不加伤也不抓牌
  const target = ref();
  const c = setup(
    <State>
      <Character my active def={Xiangling}>
        <Equipment def={ProspectorsDrill} />
      </Character>
      <Character opp active ref={target} def={Diluc} />
      <Card my pile def={Strategize} />
    </State>,
  );
  await c.me.skill(DoughFu);
  // 白案功夫 2 点物理伤害
  c.expect(target).toHaveVariable({ health: 8 });
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
});
