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

import { ref, setup, Character, State, Card, Status, Equipment, DiceCount, DeclaredEnd, $ } from "#test";
import { FlowerOfParadiseLost } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Sucrose, WindSpiritCreation } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Collei, FloralBrush } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import { Diluc, SearingOnslaught } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { ElementalLifeformHydro, HydroTulpa } from "@gi-tcg/data/internal/characters/hydro/hydro_tulpa.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("flower of paradise lost: actionPhase and reaction share the same usage perRound", async () => {
  const myActive = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={HydroTulpa} aura={Aura.Hydro}>
        <Status def={ElementalLifeformHydro} />
      </Character>
      <Character my active def={Sucrose} ref={myActive} />
      <Card my def={FlowerOfParadiseLost} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card opp pile def={Paimon} />
      <Card opp pile def={Paimon} />
    </State>,
  );
  const myPlayer = () => c.state.players[0];
  const findFlower = () =>
    myPlayer()
      .characters.flatMap((ch) => ch.entities)
      .find((e) => e.definition.id === FlowerOfParadiseLost)!;

  // 行动阶段中途装备圣遗物
  await c.me.card(FlowerOfParadiseLost, myActive);
  // 将「花冠水晶」设置为 5 层
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (c.game as any).mutator.mutate({
    type: "modifyEntityVar",
    state: findFlower(),
    varName: "crystal",
    value: 5,
    direction: null,
  });
  expect(findFlower().variables.crystal).toBe(5);

  // 第 1 次元素反应（扩散）：触发“生成骰子并抓牌”效果
  await c.me.skill(WindSpiritCreation);
  expect(myPlayer().dice).toBeArrayOfSize(4); // 8 - 2（装备）- 3（普攻）+ 1（触发）
  expect(myPlayer().hands).toBeArrayOfSize(1);

  // 第 2 次元素反应：仍可触发，每回合 2 次已用完
  await c.me.skill(WindSpiritCreation);
  expect(myPlayer().dice).toBeArrayOfSize(2); // 4 - 3 + 1
  expect(myPlayer().hands).toBeArrayOfSize(2);
  expect(findFlower().variables.usagePerRound1).toBe(0);

  // 进入下一回合
  await c.me.end();
  // 行动阶段开始：usage perRound 重置，行动阶段开始时触发 1 次
  expect(myPlayer().dice).toBeArrayOfSize(9); // 8（投掷）+ 1（触发）
  expect(myPlayer().hands).toBeArrayOfSize(5); // 2 + 2（结束阶段抓牌）+ 1（触发）
  expect(findFlower().variables.usagePerRound1).toBe(1);

  // 对方先宣布结束，轮到己方连续行动
  await c.opp.end();

  // 本回合第 1 次元素反应：与行动阶段开始共用同一个 usage perRound，故这是最后 1 次
  await c.me.skill(WindSpiritCreation);
  expect(myPlayer().dice).toBeArrayOfSize(7); // 9 - 3 + 1
  expect(myPlayer().hands).toBeArrayOfSize(6);
  expect(findFlower().variables.usagePerRound1).toBe(0);

  // 本回合第 2 次元素反应：次数已耗尽，不再触发
  await c.me.skill(WindSpiritCreation);
  expect(myPlayer().dice).toBeArrayOfSize(4); // 7 - 3，不生成骰子
  expect(myPlayer().hands).toBeArrayOfSize(6); // 不抓牌
});

test("flower of paradise lost: crystal accumulates on dendro damage or dendro-related reaction, up to 5", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} aura={Aura.Dendro} />
      <Character my active def={Diluc}>
        <Equipment def={FlowerOfParadiseLost} v={{ crystal: 3 }} />
      </Character>
      <Character my def={Collei} />
      <DiceCount my count={12} />
    </State>,
  );
  // 规则集：①对方受到伤害后：若为草元素伤害或引发了草元素相关反应，累积1层【花冠水晶】（上限5层）
  // 火伤引发燃烧（草相关反应）：3 -> 4
  await c.me.skill(SearingOnslaught);
  c.expect($.my.typeEquipment.def(FlowerOfParadiseLost)).toHaveVariable({ crystal: 4 });
  // 草伤（无反应）：4 -> 5
  await c.me.switch(Collei);
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(FlowerOfParadiseLost)).toHaveVariable({ crystal: 5 });
  // 上限 5；无反应故②不发动，不生成骰子：12 - 3 - 1 - 3 - 3 = 2
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(FlowerOfParadiseLost)).toHaveVariable({ crystal: 5 });
  expect(c.state.players[0].dice).toBeArrayOfSize(2);
});

test("flower of paradise lost: at 4 crystals, reaction check happens before accumulation, so that damage cannot trigger", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} aura={Aura.Pyro} />
      <Character my active def={Collei}>
        <Equipment def={FlowerOfParadiseLost} v={{ crystal: 4 }} />
      </Character>
      <Character my def={Diluc} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <DiceCount my count={12} />
    </State>,
  );
  // 规则集：注：触发元素反应的时机比【受到伤害后】早，即4层花冠造成伤害的场合，先检测是否5层，再累积【花冠水晶】（无法触发②）
  // 草伤引发燃烧：反应时仅 4 层不发动，随后累积到 5；不生成骰子、不抓牌
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(FlowerOfParadiseLost)).toHaveVariable({ crystal: 5 });
  expect(c.state.players[0].dice).toBeArrayOfSize(9);
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
  // 燃烧后无附着；再打一次草伤附着草元素，无反应不发动②
  await c.me.skill(FloralBrush);
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
  // 已 5 层：下一次我方触发元素反应（火伤于草附着引发燃烧）发动②：6 - 1 - 3 + 1 = 3 骰，抓 1 张
  await c.me.switch(Diluc);
  await c.me.skill(SearingOnslaught);
  expect(c.state.players[0].dice).toBeArrayOfSize(3);
  expect(c.state.players[0].hands).toBeArrayOfSize(1);
});
