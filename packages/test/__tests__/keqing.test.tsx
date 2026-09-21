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
  CombatStatus,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  ElectroElementalInfusion,
  Keqing,
  LightningStiletto,
  StellarRestoration,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { Icicle, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { InspirationField } from "@gi-tcg/data/internal/characters/pyro/bennett.gts";
import { CatGrassCardamom } from "@gi-tcg/data/internal/characters/dendro/kirara.gts";
import { Frozen } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("stellar restoration: no lightning stiletto in hand, generates one", async () => {
  // 规则集：星斗归位 造成3点伤害。……否则->获得1张【雷楔】
  // 手牌中没有雷楔且非雷楔发动：造成 3 点伤害，获得 1 张雷楔，不附属雷元素附魔
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Keqing} />
    </State>,
  );
  await c.me.skill(StellarRestoration);
  c.expect(target).toHaveVariable({ health: 7, aura: Aura.Electro });
  c.expect($.my.hand.def(LightningStiletto)).toBeCount(1);
  c.expect($.my.typeStatus.def(ElectroElementalInfusion)).toNotExist();
});

test("stellar restoration: lightning stiletto in hand is discarded, infusion attached", async () => {
  // 规则集：若手牌中有【雷楔】，舍弃【雷楔】。若以此法舍弃【雷楔】->附属【雷元素附魔】
  // 舍弃手牌中的雷楔，附属雷元素附魔，且不再生成新的雷楔
  const keqing = ref();
  const c = setup(
    <State>
      <Character my active def={Keqing} ref={keqing} />
      <Card my def={LightningStiletto} />
    </State>,
  );
  await c.me.skill(StellarRestoration);
  c.expect($.my.hand.def(LightningStiletto)).toNotExist();
  c.expect($.my.typeStatus.def(ElectroElementalInfusion)).toBeExist();
  c.expect($.my.character.has($.typeStatus.def(ElectroElementalInfusion))).toBe(
    keqing,
  );
});

test("lightning stiletto: switches keqing in and uses stellar restoration with infusion", async () => {
  // 规则集：雷楔 战斗行动：切换我方刻晴为出战角色。我方刻晴使用【星斗归位】；因【雷楔】使用此技能->附属【雷元素附魔】
  // 后台刻晴被切上场并使用星斗归位：造成 3 点雷伤、附属雷元素附魔、不生成雷楔
  const target = ref();
  const keqing = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Kaeya} />
      <Character my def={Keqing} ref={keqing} />
      <Card my def={LightningStiletto} />
    </State>,
  );
  await c.me.card(LightningStiletto, keqing);
  c.expect($.my.active).toBe(keqing);
  c.expect(target).toHaveVariable({ health: 7, aura: Aura.Electro });
  c.expect($.my.typeStatus.def(ElectroElementalInfusion)).toBeExist();
  c.expect($.my.hand.def(LightningStiletto)).toNotExist();
});

test("lightning stiletto: is a combat action", async () => {
  // 规则集：雷楔 战斗行动：切换我方刻晴为出战角色
  // 打出雷楔属于战斗行动，打出后轮到对方行动
  const keqing = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character my def={Keqing} ref={keqing} />
      <Card my def={LightningStiletto} />
    </State>,
  );
  await c.me.card(LightningStiletto, keqing);
  expect(c.state.currentTurn).toBe(1);
});

test("lightning stiletto: cannot be played when keqing cannot act", async () => {
  // 规则集：雷楔 条件：我方刻晴可行动
  // 刻晴被冻结（无法使用技能）时，雷楔不可打出
  const keqing = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character my def={Keqing} ref={keqing}>
        <Status def={Frozen} />
      </Character>
      <Card my def={LightningStiletto} />
    </State>,
  );
  await expect(c.me.card(LightningStiletto, keqing)).rejects.toThrow(
    /cannot play card/,
  );
});

test("lightning stiletto: switch and after-switch triggers resolve before stellar restoration", async () => {
  // 规则集：① 雷楔是两个效果，先切换角色（触发并执行【切换角色后】），再使用技能。
  // 寒冰之棱（切换角色后 2 冰伤）先于星斗归位结算：
  // 对方出战角色附着水，冰伤先到 → 冻结（2+1=3），随后 3 雷伤附着雷；
  // 若技能先结算则会是感电（4 伤 + 后台 1 穿透）再附着冰
  const oppActive = ref();
  const oppStandby = ref();
  const keqing = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} aura={Aura.Hydro} />
      <Character opp ref={oppStandby} />
      <Character my active def={Kaeya} />
      <Character my def={Keqing} ref={keqing} />
      <CombatStatus my def={Icicle} />
      <Card my def={LightningStiletto} />
    </State>,
  );
  await c.me.card(LightningStiletto, keqing);
  c.expect($.my.active).toBe(keqing);
  c.expect($.my.combatStatus.def(Icicle)).toHaveVariable({ usage: 2 });
  c.expect(oppActive).toHaveVariable({ health: 4, aura: Aura.Electro });
  c.expect($.opp.typeStatus.def(Frozen)).toBeExist();
  c.expect(oppStandby).toHaveVariable({ health: 10 });
});

test("lightning stiletto: timing order switch -> after switch -> skill -> after skill -> after card", async () => {
  // 规则集：②时机触发顺序：切换-切换角色后-使用技能-造成伤害后-使用技能后-使用牌后
  // 切换角色后：寒冰之棱 2 冰伤（对方附着水 → 冻结 3 伤）
  // 使用技能：星斗归位 3 雷伤（附着雷）
  // 使用技能后：鼓舞领域治疗刻晴 2 点（5 → 上限 6）
  // 使用牌后：猫草豆蔻对我方出战角色（刻晴）造成 1 草伤（6 → 5）
  // 若「使用牌后」先于「使用技能后」，刻晴会是 5 → 4 → 6
  const oppActive = ref();
  const oppStandby = ref();
  const keqing = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} aura={Aura.Hydro} />
      <Character opp ref={oppStandby} />
      <Character my active def={Kaeya} />
      <Character my def={Keqing} ref={keqing} health={5} maxHealth={6} />
      <CombatStatus my def={Icicle} />
      <CombatStatus my def={InspirationField} />
      <CombatStatus my def={CatGrassCardamom} v={{ playedCard: 1 }} />
      <Card my def={LightningStiletto} />
    </State>,
  );
  await c.me.card(LightningStiletto, keqing);
  c.expect($.my.active).toBe(keqing);
  // 切换角色后 → 使用技能
  c.expect(oppActive).toHaveVariable({ health: 4, aura: Aura.Electro });
  c.expect($.opp.typeStatus.def(Frozen)).toBeExist();
  c.expect(oppStandby).toHaveVariable({ health: 10 });
  // 使用技能后 → 使用牌后
  c.expect(keqing).toHaveVariable({ health: 5, aura: Aura.Dendro });
  c.expect($.my.combatStatus.def(CatGrassCardamom)).toHaveVariable({
    usage: 1,
    playedCard: 0,
  });
});

test("lightning stiletto: keqing already active does not trigger after-switch effects", async () => {
  // 规则集：雷楔 战斗行动：切换我方刻晴为出战角色……① 先切换角色（触发并执行【切换角色后】），再使用技能
  // 刻晴已是出战角色时无需切换：寒冰之棱（切换角色后）不触发，仅结算星斗归位
  const target = ref();
  const keqing = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Keqing} ref={keqing} />
      <CombatStatus my def={Icicle} />
      <Card my def={LightningStiletto} />
    </State>,
  );
  await c.me.card(LightningStiletto, keqing);
  c.expect($.my.combatStatus.def(Icicle)).toHaveVariable({ usage: 3 });
  c.expect(target).toHaveVariable({ health: 7, aura: Aura.Electro });
  c.expect($.my.typeStatus.def(ElectroElementalInfusion)).toBeExist();
});
