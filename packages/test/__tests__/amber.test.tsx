// Copyright (C) 2024-2025 Guyutongxue
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

import { ref, setup, Character, State, Status, Equipment, Summon, CombatStatus, DeclaredEnd, $ } from "#test";
import { WindAndFreedomInEffect } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Fischl, Oz } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { Mualani, NightRealmsGiftCrestsAndTroughs } from "@gi-tcg/data/internal/characters/hydro/mualani.gts";
import { Convalescence } from "@gi-tcg/data/internal/characters/hydro/sigewinne.gts";
import { Amber, BaronBunny, BunnyTriggered, ExplosivePuppet, FieryRain, Sharpshooter } from "@gi-tcg/data/internal/characters/pyro/amber.gts";
import { Diluc, SearingOnslaught } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("Amber talent triggered after WindAndFreedom", async () => {
  const opp1 = ref();
  const opp2 = ref();
  const c = setup(
    <State random={0}>
      <Character opp active ref={opp1} aura={Aura.Pyro} />
      <Character opp ref={opp2} />
      <Character my active def={Amber} >
        <Equipment def={BunnyTriggered} />
      </Character>
      <Character my def={Mualani} >
        <Equipment def={NightRealmsGiftCrestsAndTroughs} />
      </Character>
      <Character my def={Fischl} />
      <CombatStatus my def={WindAndFreedomInEffect} />
      <Summon my def={Oz} usage={1} />
      <Summon my def={BaronBunny} />
    </State>,
  );
  // 普攻 -2
  // 触发“风与自由”，切换到玛拉妮
  // 玛拉妮天赋触发奥兹，前台 -3 超载到敌方下个角色
  // 天赋“引爆兔兔伯爵”触发，当前对方前台 -4
  await c.me.skill(Sharpshooter);
  c.expect(opp1).toHaveVariable({ aura: Aura.None, health: 5 });
  c.expect(opp2).toHaveVariable({ aura: Aura.Pyro, health: 6 });
  c.expect($.my.summon).toNotExist();
});

test("baron bunny: decreases 2 damage on my active, not disposed when usage runs out", async () => {
  // 规则集：兔兔伯爵①我方出战角色受到伤害时：伤害-2。可用次数：1，耗尽时不弃置此牌
  const amber = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Diluc} />
      <Character my active def={Amber} ref={amber} />
      <Summon my def={BaronBunny} />
    </State>,
  );
  // 3 点火伤 -2 => 1 点
  await c.opp.skill(SearingOnslaught);
  c.expect(amber).toHaveVariable({ health: 11 });
  // 可用次数耗尽但不弃置
  c.expect($.my.summon.def(BaronBunny)).toHaveVariable({ usage: 0 });
});

test("baron bunny: only decreases damage on my active character", async () => {
  // 规则集：兔兔伯爵①我方出战角色受到伤害时：伤害-2
  // 后台角色受到穿透伤害时不减伤
  const standby = ref();
  const myActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Amber} energy={2} />
      <Character my active def={Diluc} ref={myActive} />
      <Character my ref={standby} />
      <Summon my def={BaronBunny} />
    </State>,
  );
  // 箭雨：对所有敌方后台角色造成 2 点穿透伤害，对出战角色造成 2 点火元素伤害
  await c.opp.skill(FieryRain);
  // 后台角色不享受减伤
  c.expect(standby).toHaveVariable({ health: 8 });
  // 出战角色的 2 点火伤被完全抵消
  c.expect(myActive).toHaveVariable({ health: 10 });
  c.expect($.my.summon.def(BaronBunny)).toHaveVariable({ usage: 0 });
});

test("baron bunny: end phase explodes for 2 pyro when usage exhausted", async () => {
  // 规则集：兔兔伯爵②结束阶段：若可用次数已耗尽->弃置此牌，造成2点火元素伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Amber} />
      <Summon my def={BaronBunny} usage={0} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(target).toHaveVariable({ health: 8 });
  c.expect($.my.summon.def(BaronBunny)).toNotExist();
});

test("baron bunny: end phase keeps it when usage remains", async () => {
  // 规则集：兔兔伯爵②结束阶段：若可用次数已耗尽->弃置此牌，造成2点火元素伤害
  // 可用次数未耗尽时，结束阶段既不弃置也不造成伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active def={Amber} />
      <Summon my def={BaronBunny} usage={1} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.summon.def(BaronBunny)).toHaveVariable({ usage: 1 });
});

test("baron bunny: exploded by Amber normal attack when talent equipped", async () => {
  // 规则集：兔兔伯爵③我方安柏普通攻击后：若我方安柏装备天赋->弃置此牌，造成4点火元素伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={30} maxHealth={30} />
      <Character my active def={Amber}>
        <Equipment def={BunnyTriggered} />
      </Character>
      <Summon my def={BaronBunny} />
    </State>,
  );
  // 神射手 2 点物理 + 引爆 4 点火
  await c.me.skill(Sharpshooter);
  c.expect(target).toHaveVariable({ health: 24 });
  c.expect($.my.summon.def(BaronBunny)).toNotExist();
});

test("baron bunny: not exploded when Amber has no talent", async () => {
  // 规则集：兔兔伯爵③我方安柏普通攻击后：若我方安柏装备天赋->弃置此牌，造成4点火元素伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={30} maxHealth={30} />
      <Character my active def={Amber} />
      <Summon my def={BaronBunny} />
    </State>,
  );
  await c.me.skill(Sharpshooter);
  c.expect(target).toHaveVariable({ health: 28 });
  c.expect($.my.summon.def(BaronBunny)).toBeExist();
});

test("baron bunny: not exploded by non-normal-attack skills", async () => {
  // 规则集：兔兔伯爵③我方安柏普通攻击后：……
  // 元素战技不是普通攻击，不引爆兔兔伯爵
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={30} maxHealth={30} />
      <Character my active def={Amber}>
        <Equipment def={BunnyTriggered} />
      </Character>
      <Summon my def={BaronBunny} />
    </State>,
  );
  await c.me.skill(ExplosivePuppet);
  c.expect(target).toHaveVariable({ health: 30 });
  c.expect($.my.summon.def(BaronBunny)).toBeExist();
});

test("baron bunny: opponent's Amber does not explode my bunny", async () => {
  // 规则集：兔兔伯爵③我方安柏普通攻击后：若我方安柏装备天赋->……
  // 「我方安柏」：对方的安柏普通攻击不引爆我方兔兔伯爵
  const myActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Amber}>
        <Equipment def={BunnyTriggered} />
      </Character>
      <Character my active ref={myActive} def={Diluc} />
      <Summon my def={BaronBunny} />
    </State>,
  );
  // 神射手 2 点物理 -2（兔兔伯爵抵消），兔兔伯爵不被引爆
  await c.opp.skill(Sharpshooter);
  c.expect(myActive).toHaveVariable({ health: 10 });
  c.expect($.my.summon.def(BaronBunny)).toBeExist();
});

test("baron bunny: explosion damage is dealt by the summon, not by the talent card", async () => {
  // 规则集：注：天赋是召唤物的效果而非天赋牌的效果
  // 静养「我方『元素战技』或召唤物造成的伤害+1」只对来源为召唤物的伤害生效：
  // 引爆的 4 点火伤被 +1，而普通攻击的 2 点物理伤害（来源为角色）不受影响
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={30} maxHealth={30} />
      <Character my active def={Amber}>
        <Equipment def={BunnyTriggered} />
      </Character>
      <Summon my def={BaronBunny} />
      <CombatStatus my def={Convalescence} usage={2} />
    </State>,
  );
  // 2 点物理 + 引爆 4+1 点火
  await c.me.skill(Sharpshooter);
  c.expect(target).toHaveVariable({ health: 23 });
  // 只消耗了 1 次可用次数，说明物理伤害没有被加伤
  c.expect($.my.combatStatus.def(Convalescence)).toHaveVariable({ usage: 1 });
});
