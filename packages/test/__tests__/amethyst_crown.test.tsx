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


import { ref, setup, Character, State, CombatStatus, Equipment, DiceCount, DeclaredEnd, $ } from "#test";
import { AmethystCrown, AmethystCrownInEffect } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { Collei, SupplicantsBowmanship, FloralBrush } from "@gi-tcg/data/internal/characters/dendro/collei.gts";
import { Diluc, SearingOnslaught, TemperedSword } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("amethyst crown: dendro damage accumulates crystal up to 2", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} />
      <Character my active def={Collei}>
        <Equipment def={AmethystCrown} />
      </Character>
      <DiceCount my count={12} />
    </State>,
  );
  // 规则集：①对方受到伤害后：若为草元素伤害或引发了草元素相关反应，累积1层【花冠水晶】（上限2层）
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 1 });
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 2 });
  // 上限 2 层
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 2 });
});

test("amethyst crown: dendro-related reaction by non-dendro damage counts, physical damage does not", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} aura={Aura.Dendro} />
      <Character my active def={Diluc}>
        <Equipment def={AmethystCrown} />
      </Character>
    </State>,
  );
  // 规则集：若为草元素伤害或引发了草元素相关反应，累积1层；火伤引发燃烧属于草相关反应
  await c.me.skill(SearingOnslaught);
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 1 });
  // 物理伤害不累积
  await c.me.skill(TemperedSword);
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 1 });
});

test("amethyst crown: action phase generates in-effect combat status only with 2 crystals", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} />
      <Character my active def={Collei}>
        <Equipment def={AmethystCrown} v={{ crystal: 1 }} />
      </Character>
    </State>,
  );
  // 规则集：②行动阶段开始时：若此牌有2层【花冠水晶】，生成【紫晶的花冠】（生效中）
  // 仅 1 层：下回合行动阶段不生成
  await c.me.end();
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toNotExist();
  await c.opp.end();
  await c.me.skill(FloralBrush);
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 2 });
  // 2 层：下回合行动阶段生成，持续回合 1，可用次数 1
  await c.me.end();
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toBeExist();
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toHaveVariable({ usage: 1, duration: 1 });
});

test("amethyst crown in effect: +2 only on my reaction damage, once", async () => {
  const oppActive = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={oppActive} health={20} />
      <Character my active def={Collei} />
      <Character my def={Diluc} />
      <CombatStatus my def={AmethystCrownInEffect} />
    </State>,
  );
  // 规则集：我方造成元素反应伤害后：伤害+2；可用次数：1
  // 无反应的草伤 3：不加伤、不消耗
  await c.me.skill(FloralBrush);
  c.expect(oppActive).toHaveVariable({ health: 17 });
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toBeExist();
  // 火伤 3 引发燃烧 +1，再 +2 = 6；状态消耗
  await c.me.switch(Diluc);
  await c.me.skill(SearingOnslaught);
  c.expect(oppActive).toHaveVariable({ health: 11 });
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toNotExist();
});

test("amethyst crown in effect: lasts 1 round", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} />
      <Character my active def={Collei} />
      <CombatStatus my def={AmethystCrownInEffect} />
    </State>,
  );
  // 规则集：持续回合：1
  await c.me.end();
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toNotExist();
});

test("amethyst crown: multiple artifacts do not stack the in-effect status", async () => {
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={20} />
      <Character my active def={Collei}>
        <Equipment def={AmethystCrown} v={{ crystal: 2 }} />
      </Character>
      <Character my def={Diluc}>
        <Equipment def={AmethystCrown} v={{ crystal: 2 }} />
      </Character>
    </State>,
  );
  // 规则集：注：多个圣遗物不可叠加
  // 两件均满 2 层：行动阶段开始只存在 1 个生效中，可用次数仍为 1
  await c.me.end();
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toBeCount(1);
  c.expect($.my.combatStatus.def(AmethystCrownInEffect)).toHaveVariable({ usage: 1 });
});

test("amethyst crown: damage taken by my own characters does not accumulate", async () => {
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Collei} />
      <Character my active def={Diluc} health={10} aura={Aura.Pyro}>
        <Equipment def={AmethystCrown} />
      </Character>
    </State>,
  );
  // 规则集：①对方受到伤害后……；我方受到草伤并引发燃烧，不累积
  await c.opp.skill(FloralBrush);
  c.expect($.my.active).toHaveVariable({ health: 6 });
  c.expect($.my.typeEquipment.def(AmethystCrown)).toHaveVariable({ crystal: 0 });
});
