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
  DeclaredEnd,
  Equipment,
  ref,
  setup,
  State,
} from "#test";
import { EfficientSwitch } from "@gi-tcg/data/internal/commons.gts";
import {
  AdamahsRedemption,
  BinaryFormConvergenceAndDivision,
  DenialOfDarkness,
  DragonOfDarkDecayInEffect,
  DragonOfWhiteFlameInEffect,
  DurinBlack,
  DurinWhite,
  EssentialTransmutation,
  PrincipleOfDarknessAsTheStarsSmolder,
  PrincipleOfPurityAsTheLightShifts,
  RadiantWingslash,
} from "@gi-tcg/data/internal/characters/pyro/durin.gts";
import {
  CeremonialBladework,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { test } from "vitest";

test("Durin: Binary Form generates Efficient Switch only when Essential Transmutation is already attached", async () => {
  // 规则集：二元式·聚分熔炼 造成3点火元素伤害，若已附属【精质转变】->生成1层【高效切换】；附属【精质转变】
  // 首次使用只附属精质转变；再次使用时因已附属而生成 1 层高效切换，并重新附属精质转变
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={DurinWhite} />
      <Character opp active ref={oppActive} />
      <DeclaredEnd opp />
    </State>,
  );

  await c.me.skill(BinaryFormConvergenceAndDivision);
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(EssentialTransmutation)).toBeCount(1);
  c.expect($.my.combatStatus.def(EfficientSwitch)).toNotExist();

  await c.me.skill(BinaryFormConvergenceAndDivision);
  c.expect(oppActive).toHaveVariable({ health: 4 });
  c.expect($.my.combatStatus.def(EfficientSwitch)).toHaveVariable({ usage: 1 });
  c.expect($.my.typeStatus.def(EssentialTransmutation)).toBeCount(1);
});

test("Adamah's Redemption: using the white burst creates Dragon of White Flame", async () => {
  // 规则集：红土之逆 附属角色使用【白化法·如光流变】后：生成【白焰之龙（生效中）】；白焰之龙可用次数 4
  const durin = ref();
  const c = setup(
    <State>
      <Character my active def={DurinWhite} energy={2} ref={durin} />
      <Character opp active />
      <Card my def={AdamahsRedemption} />
    </State>,
  );

  await c.me.card(AdamahsRedemption, durin);

  c.expect($.my.combatStatus.def(DragonOfWhiteFlameInEffect)).toHaveVariable({
    usage: 4,
  });
  c.expect($.my.combatStatus.def(DragonOfDarkDecayInEffect)).toNotExist();
});

test("Adamah's Redemption: using the black burst creates Dragon of Dark Decay", async () => {
  // 规则集：红土之逆 附属角色使用【黑度法·如星阴燃】后：生成【黑蚀之龙（生效中）】
  const durin = ref();
  const c = setup(
    <State>
      <Character my active def={DurinBlack} energy={2} ref={durin} />
      <Character opp active />
      <Card my def={AdamahsRedemption} />
    </State>,
  );

  await c.me.card(AdamahsRedemption, durin);

  c.expect($.my.combatStatus.def(DragonOfDarkDecayInEffect)).toBeExist();
  c.expect($.my.combatStatus.def(DragonOfWhiteFlameInEffect)).toNotExist();
});

test("Adamah's Redemption: an equipped Durin using the white burst again creates Dragon of White Flame", async () => {
  // 规则集：红土之逆 附属角色使用【白化法·如光流变】后：生成【白焰之龙（生效中）】
  // 触发时机是「附属角色使用该技能后」，而非「打出此牌时」：已装备的杜林直接使用该爆发同样生成
  const c = setup(
    <State>
      <Character my active def={DurinWhite} energy={2}>
        <Equipment def={AdamahsRedemption} />
      </Character>
      <Character opp active />
    </State>,
  );

  await c.me.skill(PrincipleOfPurityAsTheLightShifts);

  c.expect($.my.combatStatus.def(DragonOfWhiteFlameInEffect)).toHaveVariable({
    usage: 4,
  });
});

test("Adamah's Redemption: an equipped Durin using the black burst again creates Dragon of Dark Decay", async () => {
  // 规则集：红土之逆 附属角色使用【黑度法·如星阴燃】后：生成【黑蚀之龙（生效中）】
  // 同上：触发于附属角色使用该爆发后，与是否本回合打出此牌无关
  const c = setup(
    <State>
      <Character my active def={DurinBlack} energy={2}>
        <Equipment def={AdamahsRedemption} />
      </Character>
      <Character opp active />
    </State>,
  );

  await c.me.skill(PrincipleOfDarknessAsTheStarsSmolder);

  c.expect($.my.combatStatus.def(DragonOfDarkDecayInEffect)).toBeExist();
  c.expect($.my.combatStatus.def(DragonOfWhiteFlameInEffect)).toNotExist();
});

test("Dragon of White Flame increases any damage we deal by 1", async () => {
  // 规则集：白焰之龙（生效中）我方造成伤害时：伤害+1 可用次数：4
  // 非杜林的角色（凯亚 2 点物理）同样 +1，且消耗 1 次可用次数
  const dragon = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character opp active ref={oppActive} />
      <CombatStatus
        my
        def={DragonOfWhiteFlameInEffect}
        usage={4}
        ref={dragon}
      />
    </State>,
  );

  await c.me.skill(CeremonialBladework);

  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect(dragon).toHaveVariable({ usage: 3 });
});

test("Dragon of Dark Decay increases Durin's damage by 2 but not other characters'", async () => {
  // 规则集：黑蚀之龙（生效中）我方杜林和黑度之否造成伤害时：伤害+2
  // 杜林普攻 2+2=4；凯亚普攻仍为 2
  const kaeya = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={DurinWhite} />
      <Character my def={Kaeya} ref={kaeya} />
      <Character opp active ref={oppActive} />
      <CombatStatus my def={DragonOfDarkDecayInEffect} />
      <DeclaredEnd opp />
    </State>,
  );

  await c.me.skill(RadiantWingslash);
  c.expect(oppActive).toHaveVariable({ health: 6 });

  await c.me.switch(kaeya);
  await c.me.skill(CeremonialBladework);
  c.expect(oppActive).toHaveVariable({ health: 4 });
});

test("Dragon of Dark Decay increases Denial of Darkness damage by 2", async () => {
  // 规则集：黑蚀之龙（生效中）我方杜林和黑度之否造成伤害时：伤害+2
  // 黑度之否于我方宣布结束时造成 3 点火伤，+2 后为 5
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character opp active ref={oppActive} />
      <CombatStatus my def={DragonOfDarkDecayInEffect} />
      <CombatStatus my def={DenialOfDarkness} usage={1} />
    </State>,
  );

  await c.me.end();

  c.expect(oppActive).toHaveVariable({ health: 5 });
});
