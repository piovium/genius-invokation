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
  Character,
  CombatStatus,
  DeclaredEnd,
  DiceCount,
  Equipment,
  ref,
  setup,
  State,
} from "#test";
import { SkillHandle } from "@gi-tcg/core/data";
import { InstructorsCap } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { Blubberbeast } from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import {
  GaleBlade,
  Jean,
} from "@gi-tcg/data/internal/characters/anemo/jean.gts";
import {
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  Beidou,
  Tidecaller,
} from "@gi-tcg/data/internal/characters/electro/beidou.gts";
import {
  GrassRingOfSanctification,
  KukiShinobu,
} from "@gi-tcg/data/internal/characters/electro/kuki_shinobu.gts";
import {
  FatalRainscreen,
  RainbowBladework,
  Xingqiu,
} from "@gi-tcg/data/internal/characters/hydro/xingqiu.gts";
import {
  BestialAscent,
  Gaming,
} from "@gi-tcg/data/internal/characters/pyro/gaming.gts";
import { Aura, DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("instructor's cap: a reaction caused by the skill generates one die of the character's element", async () => {
  // 规则集：角色使用技能后：若行动期间我方效果引发了元素反应，生成1个此角色元素类型的元素骰（每回合限3次）
  const cap = ref();
  const c = setup(
    <State>
      <Character opp active def={KukiShinobu} aura={Aura.Pyro} />
      <Character my active def={Xingqiu}>
        <Equipment def={InstructorsCap} ref={cap} />
      </Character>
    </State>,
  );
  await c.me.skill(FatalRainscreen);
  // 画雨笼山对带火附着的对方出战角色造成水伤 -> 蒸发；行秋为水元素角色
  c.expect($.opp.active).toHaveVariable({ health: 6, aura: Aura.None });
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(
    c.state.players[0].dice.filter((d) => d === DiceType.Hydro),
  ).toBeArrayOfSize(1);
  c.expect(cap).toHaveVariable({ usagePerRound: 2 });
});

test("instructor's cap: a reaction caused by applying an element attachment also triggers it", async () => {
  // 规则集注：生成附着引发的反应也能发动，如雨帘剑
  const cap = ref();
  const c = setup(
    <State>
      <Character opp active def={KukiShinobu} />
      <Character my active def={Xingqiu} aura={Aura.Pyro}>
        <Equipment def={InstructorsCap} ref={cap} />
      </Character>
    </State>,
  );
  await c.me.skill(FatalRainscreen);
  // 对方无附着，伤害本身不引发反应；技能给自身附着水，与自身火附着蒸发（无伤害的反应）
  c.expect($.opp.active).toHaveVariable({ health: 8, aura: Aura.Hydro });
  c.expect($.my.active).toHaveVariable({ aura: Aura.None });
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
  expect(
    c.state.players[0].dice.filter((d) => d === DiceType.Hydro),
  ).toBeArrayOfSize(1);
  c.expect(cap).toHaveVariable({ usagePerRound: 2 });
});

test("instructor's cap: a reaction caused by our own effect (grass ring) triggers it", async () => {
  // 规则集注：己方效果（如 越祓草轮）引发反应也能发动
  const cap = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active def={KukiShinobu} ref={target} />
      <Character my active def={Gaming}>
        <Equipment def={InstructorsCap} ref={cap} />
      </Character>
      <Character my def={Xingqiu} />
      <CombatStatus my def={GrassRingOfSanctification} usage={3} />
    </State>,
  );
  await c.me.skill(BestialAscent);
  // 瑞兽登高楼：1点火伤（对方原本无附着，仅附着火）后我方切人 -> 越祓草轮1点雷伤 -> 超载
  // 反应由我方效果（越祓草轮）引发，且发生在技能结算完成之前，教官的帽子发动
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.None });
  expect(
    c.state.players[0].dice.filter((d) => d === DiceType.Pyro),
  ).toBeArrayOfSize(1);
  c.expect(cap).toHaveVariable({ usagePerRound: 2 });
});

test("instructor's cap: a reaction caused by the opponent's effect does not trigger it", async () => {
  // 规则集注：对方效果（如 越祓草轮）引发的反应不能发动
  const cap = ref();
  const jean = ref();
  const c = setup(
    <State>
      <Character opp active def={KukiShinobu} />
      <CombatStatus opp def={GrassRingOfSanctification} usage={3} />
      <Character my active def={Jean} aura={Aura.Cryo} ref={jean}>
        <Equipment def={InstructorsCap} ref={cap} />
      </Character>
    </State>,
  );
  await c.me.skill(GaleBlade);
  // 风压剑强制对方切人 -> 对方越祓草轮对琴造成1点雷伤 -> 超导（12-1-1=10，冰附着被消耗），
  // 反应确实发生了，但这是对方效果引发的，与上一测试仅「草轮归属」一项不同，不发动
  c.expect(jean).toHaveVariable({ health: 10, aura: Aura.None });
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
  c.expect(cap).toHaveVariable({ usagePerRound: 3 });
});

test("instructor's cap: techniques do not trigger it", async () => {
  // 规则集注：隐藏技能、特技等不能发动（本测试覆盖「特技」部分）
  const cap = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active def={KukiShinobu} aura={Aura.Pyro} ref={target} />
      <Character my active def={Gaming}>
        <Equipment def={InstructorsCap} ref={cap} />
        <Equipment def={Blubberbeast} />
      </Character>
      <Character my def={Xingqiu} />
      <CombatStatus my def={GrassRingOfSanctification} usage={3} />
    </State>,
  );
  await c.me.skill(3130101 as SkillHandle);
  // 膨膨音波（特技）切换到下一个角色 -> 越祓草轮1点雷伤 -> 超载（10-1-2=7）；
  // 反应与上上个测试完全相同（我方越祓草轮），仅「使用的是特技」一项不同，不发动
  c.expect(target).toHaveVariable({ health: 7, aura: Aura.None });
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect(cap).toHaveVariable({ usagePerRound: 3 });
});

test("instructor's cap: hidden (prepared) skills do not trigger it", async () => {
  // 规则集注：隐藏技能、特技等不能发动（本测试覆盖「隐藏技能」部分；
  // 规则集把准备技能状态标为隐藏技能，如「突角龙（生效中）（隐藏技能）」）
  const cap = ref();
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={KukiShinobu} aura={Aura.Pyro} ref={target} />
      <Character my active def={Beidou}>
        <Equipment def={InstructorsCap} ref={cap} />
      </Character>
    </State>,
  );
  await c.me.skill(Tidecaller);
  // 捉浪本身无伤害；对方已宣布结束，我方下一次行动直接使用准备技能【踏潮】：
  // 3点雷伤 + 火附着 -> 超载（10-3-2=5），反应确实发生，但隐藏技能不发动
  c.expect(target).toHaveVariable({ health: 5, aura: Aura.None });
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
  c.expect(cap).toHaveVariable({ usagePerRound: 3 });
});

test("instructor's cap: at most 3 times per round", async () => {
  // 规则集：……生成1个此角色元素类型的元素骰（每回合限3次）
  const cap = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active def={KukiShinobu} aura={Aura.Hydro} />
      <Character my active def={Sucrose}>
        <Equipment def={InstructorsCap} ref={cap} />
      </Character>
      <CombatStatus my def={RainbowBladework} usage={3} />
      <DiceCount my count={16} type={DiceType.Omni} />
    </State>,
  );
  for (let i = 0; i < 4; i++) {
    await c.me.skill(WindSpiritCreation);
  }
  // 每次普通攻击扩散对方水附着引发反应，虹剑势随后补回水附着；第4次反应不再生成元素骰
  // 16 - 4*3（技能费用）+ 3（生成的元素骰）= 7
  expect(c.state.players[0].dice).toBeArrayOfSize(7);
  c.expect(cap).toHaveVariable({ usagePerRound: 0 });
});
