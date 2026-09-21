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
  Equipment,
  CombatStatus,
  Card,
  Status,$
} from "#test";
import { SkillHandle } from "@gi-tcg/core/data";
import { AbundantPhlogistonInEffect } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Collei, FloralBrush } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import {
  GrappleLink,
  GrapplePrepare,
  Kinich,
  NightsoulsBlessing as NightsoulsBlessingKinich,
} from "@gi-tcg/data/internal/characters/dendro/kinich.gts";
import { Kachina, NightsoulsBlessing as NightsoulsBlessingKachina, TurboTwirly, TurboTwirlyLetItRip, TwirlyTwirlyBamBam } from "@gi-tcg/data/internal/characters/geo/kachina.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("kinich's link handle event earlier then kachina's", async () => {
  const kinich = ref();
  const kachina = ref();
  const c = setup(
    <State>
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 1 }} />
      </Character>
      <Character my active def={Kachina} ref={kachina}>
        <Equipment def={TurboTwirly} />
        <Status def={NightsoulsBlessingKachina} v={{ nightsoul: 2 }} />
      </Character>
      <CombatStatus my def={AbundantPhlogistonInEffect} />
    </State>
  );
  // 转转冲击
  await c.me.skill(1161021 as SkillHandle);
  // 燃素充盈消耗
  c.expect($.combatStatus.def(AbundantPhlogistonInEffect)).toNotExist();
  // 钩锁准备
  c.expect($.typeStatus.def(GrapplePrepare)).toBeExist();
  // 1 -> 2 -> 0 -> 1
  c.expect($.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id))).toHaveVariable({ nightsoul: 1 });
  // 2 -> 1
  c.expect($.typeStatus.tag("nightsoulsBlessing").at($.id(kachina.id))).toHaveVariable({ nightsoul: 1 });
});

test("kinich: grapple link gains nightsoul when the opponent takes burning reaction damage", async () => {
  // 规则集：钩索链接 ①对方受到燃烧反应伤害/我方其他角色使用特技前：附属角色获得1点「夜魂值」。
  const kinich = ref();
  const c = setup(
    <State>
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Collei} />
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} />
      </Character>
    </State>,
  );
  // 柯莱造成草伤，对方出战角色受到燃烧反应伤害
  await c.me.skill(FloralBrush);
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id)),
  ).toHaveVariable({ nightsoul: 1 });
  // 夜魂值未到 2，不附属钩索准备
  c.expect($.typeStatus.def(GrapplePrepare)).toNotExist();
});

test("kinich: grapple link attaches grapple prepare when nightsoul reaches 2 on gaining", async () => {
  // 规则集：钩索链接 ②附属角色获得夜魂后：若夜魂值为2且角色未附属【钩锁准备】->附属角色附属【钩索准备】，消耗2点「夜魂值」。
  // 燃烧反应伤害击倒对方出战角色，引擎停在对方选择出战角色处；此刻尚未经过任何
  // 「选择行动前」，钩索准备已附属，故确为「获得夜魂后」这一分句触发
  const kinich = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={4} aura={Aura.Pyro} />
      <Character opp />
      <Character my active def={Collei} />
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 1 }} />
      </Character>
    </State>,
  );
  // 拂花偈叶 3 点草伤 + 燃烧反应 1 点 = 4 点，对方出战角色倒下
  await c.me.skill(FloralBrush);
  c.expect(oppActive).toHaveVariable({ alive: 0 });
  c.expect($.typeStatus.def(GrapplePrepare).at($.id(kinich.id))).toBeExist();
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id)),
  ).toHaveVariable({ nightsoul: 0 });
});

test("kinich: grapple link does not gain nightsoul when our own character takes burning damage", async () => {
  // 规则集：钩索链接 ①**对方**受到燃烧反应伤害……：附属角色获得1点「夜魂值」。
  // 我方角色受到燃烧反应伤害时不获得夜魂值
  const kinich = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active aura={Aura.Pyro} />
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 1 }} />
      </Character>
      <Character opp active def={Collei} />
    </State>,
  );
  await c.opp.skill(FloralBrush);
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id)),
  ).toHaveVariable({ nightsoul: 1 });
  c.expect($.typeStatus.def(GrapplePrepare)).toNotExist();
});

test("kinich: grapple link does not gain nightsoul from kinich's own technique", async () => {
  // 规则集：钩索链接 ①……/我方**其他**角色使用特技前：附属角色获得1点「夜魂值」。
  // 附属角色自己使用特技时不获得夜魂值（否则夜魂值将达到 2 并附属钩索准备）
  const kinich = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kinich} ref={kinich}>
        <Equipment def={TurboTwirly} />
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 1 }} />
      </Character>
    </State>,
  );
  await c.me.skill(TwirlyTwirlyBamBam);
  c.expect($.typeStatus.def(GrapplePrepare)).toNotExist();
});

test("kinich: grapple link attaches grapple prepare before the opponent's action", async () => {
  // 规则集：钩索链接 ②……/**双方**角色选择行动前：若夜魂值为2且角色未附属【钩锁准备】->附属【钩索准备】，消耗2点「夜魂值」。
  const kinich = ref();
  const oppActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={oppActive} />
      <Character my active />
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 2 }} />
      </Character>
    </State>,
  );
  await c.opp.end();
  c.expect($.typeStatus.def(GrapplePrepare).at($.id(kinich.id))).toBeExist();
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id)),
  ).toHaveVariable({ nightsoul: 0 });
  // 规则集：钩索准备 - 我方角色选择行动前：若附属角色为**出战角色**->造成3点草元素伤害
  // 基尼奇不是出战角色，我方行动前不发动
  c.expect(oppActive).toHaveVariable({ health: 10 });
});

test("kinich: grapple prepare damages the nearest opposing character", async () => {
  // 规则集：钩索准备 - 我方角色选择行动前：若附属角色为出战角色->对最近的对方角色造成3点草元素伤害。可用次数：1
  const kinich = ref();
  const oppFirst = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character opp ref={oppFirst} />
      <Character opp />
      <Character opp active ref={oppActive} />
      <Character my active def={Kinich} ref={kinich}>
        <Status def={GrapplePrepare} />
      </Character>
    </State>,
  );
  await c.me.end();
  // 基尼奇位于我方第 1 位，最近的对方角色是对方第 1 位（而非出战角色）
  c.expect(oppFirst).toHaveVariable({ health: 7 });
  c.expect(oppActive).toHaveVariable({ health: 10 });
  c.expect($.typeStatus.def(GrapplePrepare)).toNotExist();
});

test("kinich: grapple link lasts for 2 rounds", async () => {
  // 规则集：钩索链接 - 持续回合:2
  const kinich = ref();
  const link = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} ref={link} />
        <Status def={NightsoulsBlessingKinich} />
      </Character>
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect(link).toHaveVariable({ duration: 1 });
  await c.me.end();
  await c.opp.end();
  c.expect($.typeStatus.def(GrappleLink)).toNotExist();
});

test("kinich: grapple link gains nightsoul before our other character's technique", async () => {
  // 规则集：钩索链接 ①……/我方其他角色使用特技前：附属角色获得1点「夜魂值」。
  const kinich = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kachina}>
        <Equipment def={TurboTwirly} />
        <Status def={NightsoulsBlessingKachina} v={{ nightsoul: 2 }} />
      </Character>
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} />
      </Character>
    </State>,
  );
  // 卡齐娜使用特技「转转冲击」
  await c.me.skill(TwirlyTwirlyBamBam);
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id)),
  ).toHaveVariable({ nightsoul: 1 });
  // 夜魂值未到 2，不附属钩索准备
  c.expect($.typeStatus.def(GrapplePrepare)).toNotExist();
});

test("kinich: grapple link does not re-attach grapple prepare nor consume nightsoul when already attached", async () => {
  // 规则集：钩索链接 ②……若夜魂值为2且角色**未附属【钩锁准备】**->附属角色附属【钩索准备】，消耗2点「夜魂值」。
  const kinich = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active />
      <Character my active />
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={GrapplePrepare} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 2 }} />
      </Character>
    </State>,
  );
  await c.opp.end();
  // 已附属钩索准备，不再重复附属，也不消耗夜魂值
  c.expect($.typeStatus.def(GrapplePrepare)).toBeCount(1);
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(kinich.id)),
  ).toHaveVariable({ nightsoul: 2 });
});

test("kinich: grapple prepare does not trigger before the opponent's action", async () => {
  // 规则集：钩索准备 - **我方**角色选择行动前：若附属角色为出战角色->对最近的对方角色造成3点草元素伤害。
  const oppActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={oppActive} />
      <Character my active def={Kinich}>
        <Status def={GrapplePrepare} />
      </Character>
    </State>,
  );
  // manual：停在对方选择行动之处，不推进到我方选择行动
  await c.opp.end().manual();
  // 基尼奇虽为我方出战角色，但对方选择行动前不发动，可用次数也未消耗
  c.expect(oppActive).toHaveVariable({ health: 10 });
  c.expect($.typeStatus.def(GrapplePrepare)).toBeExist();
});
