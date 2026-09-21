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
  ref,
  setup,
  Card,
  Character,
  State,
  Status,
  Summon,
  Equipment,
  $,
} from "#test";
import {
  Ororon,
  NightsSling,
  NightsoulsBlessing,
  TrailsAmidstTheForestFog,
} from "@gi-tcg/data/internal/characters/electro/ororon.gts";
import { RavenBow } from "@gi-tcg/data/internal/cards/equipment/weapon/bow.gts";
import { Oz } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { BakeKurage } from "@gi-tcg/data/internal/characters/hydro/sangonomiya_kokomi.gts";
import {
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("ororon talent: first electro-charged deals 2 piercing damage", async () => {
  const oppActive = ref();
  const oppStandby = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} aura={Aura.Hydro} />
      <Character opp ref={oppStandby} />
      <Character my active def={Ororon}>
        <Equipment def={TrailsAmidstTheForestFog} />
      </Character>
    </State>,
  );

  await c.me.skill(NightsSling);

  c.expect(oppActive).toHaveVariable({ health: 7, aura: Aura.None });
  c.expect(oppStandby).toHaveVariable({ health: 8 });
});

test("ororon passive: electro-charged at 1 nightsoul does NOT trigger passive damage", async () => {
  // 欧洛仑1点夜魂值，对方出战角色附着水元素，欧洛仑使用E技能触发感电
  // 1. 不触发被动1雷伤(被动判定时夜魂值不为2)
  // 2. 触发被动+1夜魂

  const ororon = ref();
  const opp1 = ref();
  const opp2 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp2} health={10} />
      <Character my active def={Ororon} ref={ororon}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
    </State>,
  );
  await c.me.skill(NightsSling);
  // 对方出战：仅E打3(感电伤害+1)并消耗了水元素，被动不触发
  c.expect(opp1).toHaveVariable({ health: 7, aura: Aura.None });
  // 对方后台：感电1点穿透伤害（10 → 9）
  c.expect(opp2).toHaveVariable({ health: 9 });
  // 夜魂值+1，最终值为2
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(ororon.id)),
  ).toHaveVariable({ nightsoul: 2 });
});

test("ororon passive: electro-charged at 2 nightsoul triggers passive damage, then gains 1", async () => {
  // 欧洛仑2夜魂值，对方健康的出战角色附着水元素，欧洛仑使用E技能触发感电，
  // 1. 触发被动的伤害，打1雷伤，夜魂值-2
  // 2. 触发被动叠夜魂，夜魂值+1(最终为1)

  const ororon = ref();
  const opp1 = ref();
  const opp2 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp2} health={10} />
      <Character my active def={Ororon} ref={ororon}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
    </State>,
  );
  await c.me.skill(NightsSling);
  // 对方出战：E打3(感电伤害+1)并消耗了水元素，触发被动再打1雷伤，余6血
  c.expect(opp1).toHaveVariable({ health: 6, aura: Aura.Electro });
  // 对方后台：感电1点穿透伤害（10 → 9）
  c.expect(opp2).toHaveVariable({ health: 9 });
  // 夜魂值：先-2再+1，最终为 1
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(ororon.id)),
  ).toHaveVariable({ nightsoul: 1 });
});

test("ororon passive: passive damage hits next character if active is defeated", async () => {
  // “优先出战”测试
  // 欧洛仑2夜魂值，对方1血出战角色附着水元素，欧洛仑使用E技能触发感电并击倒
  // 1. 触发被动的伤害，打下一个后台1雷伤，夜魂值-2
  // 2. 触发被动叠夜魂，夜魂值+1(最终为1)

  const ororon = ref();
  const opp1 = ref();
  const opp2 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={1} aura={Aura.Hydro} />
      <Character opp ref={opp2} health={10} />
      <Character my active def={Ororon} ref={ororon}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
    </State>,
  );
  await c.me.skill(NightsSling);
  // 对方出战：凉了
  c.expect(opp1).toHaveVariable({ health: 0, alive: 0, aura: Aura.None });
  // 对方后台：感电1点穿透伤害 + 被动1点雷伤（10 → 8），附着雷元素
  c.expect(opp2).toHaveVariable({ health: 8, aura: Aura.Electro });
  // 夜魂值：先-2再+1，最终为 1
  c.expect(
    $.typeStatus.tag("nightsoulsBlessing").at($.id(ororon.id)),
  ).toHaveVariable({ nightsoul: 1 });
});

test("ororon passive: its damage can be increased by a weapon", async () => {
  // 规则集：注：被动技能造成的伤害也是角色造成的伤害，可以被武器等增伤
  // 断言：装备鸦羽弓（角色造成的伤害+1）后，被动的 1 点雷伤变成 2 点。
  const opp1 = ref();
  const opp2 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp2} health={10} />
      <Character my active def={Ororon}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
        <Equipment def={RavenBow} />
      </Character>
    </State>,
  );
  await c.me.skill(NightsSling);
  // E：2 + 武器 1 + 感电 1 = 4；随后被动：1 + 武器 1 = 2
  c.expect(opp1).toHaveVariable({ health: 4, aura: Aura.Electro });
  c.expect(opp2).toHaveVariable({ health: 9 });
});

test("ororon talent: only the first electro-charged of a round gets the bonus", async () => {
  // 规则集：③我方引发感电反应后：禁用此能力（每回合1次）
  // 断言：同一回合内第二次感电不再享受天赋，穿透伤害回到 1 点。
  const opp1 = ref();
  const opp2 = ref();
  const opp3 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp2} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp3} health={10} />
      <Character my active def={Ororon}>
        <Equipment def={TrailsAmidstTheForestFog} />
      </Character>
    </State>,
  );
  await c.me.skill(NightsSling);
  // 第一次感电：出战 2+1，后台各 2 点穿透
  c.expect(opp1).toHaveVariable({ health: 7 });
  c.expect(opp2).toHaveVariable({ health: 8 });
  c.expect(opp3).toHaveVariable({ health: 8 });
  await c.opp.switch(opp2);
  await c.me.skill(NightsSling);
  // 第二次感电：出战 2+1，后台各 1 点穿透
  c.expect(opp2).toHaveVariable({ health: 5 });
  c.expect(opp1).toHaveVariable({ health: 6 });
  c.expect(opp3).toHaveVariable({ health: 7 });
});

test("ororon talent: the bonus is enabled again on the next round", async () => {
  // 规则集：②入场后/行动阶段开始时：启用此能力
  // 断言：第 1 回合结束阶段用掉天赋后，第 2 回合结束阶段的感电重新享受 +1 穿透。
  const opp2 = ref();
  const opp3 = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character opp ref={opp2} health={10} />
      <Character opp ref={opp3} health={10} />
      <Character my active def={Ororon}>
        <Equipment def={TrailsAmidstTheForestFog} />
      </Character>
      <Summon my def={BakeKurage} />
      <Summon my def={Oz} />
    </State>,
  );
  // 结束阶段：化海月先附着水元素，奥兹再打雷元素造成感电
  await c.me.end();
  await c.opp.end();
  c.expect(opp2).toHaveVariable({ health: 8 });
  c.expect(opp3).toHaveVariable({ health: 8 });
  await c.me.end();
  await c.opp.end();
  c.expect(opp2).toHaveVariable({ health: 6 });
  c.expect(opp3).toHaveVariable({ health: 6 });
});

test.fails("ororon talent: both electro-charged of a double swirl get the bonus", async () => {
  // 规则集：注：1. 扩散双感电的场合，两次感电都能增加穿透伤害；
  // 当前引擎：天赋按「每回合 1 次」在第一次感电时就消耗掉，同一次扩散引发的第二次感电只有 1 点穿透（实测 6 / 7 / 6）
  // 断言：砂糖普攻扩散雷元素，使两名附着水元素的后台角色同时感电，两次感电的穿透伤害都应为 2。
  const opp1 = ref();
  const opp2 = ref();
  const opp3 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={10} aura={Aura.Electro} />
      <Character opp ref={opp2} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp3} health={10} aura={Aura.Hydro} />
      <Character my active def={Sucrose} />
      <Character my def={Ororon}>
        <Equipment def={TrailsAmidstTheForestFog} />
      </Character>
    </State>,
  );
  await c.me.skill(WindSpiritCreation);
  // 出战：1 点风伤 + 两次感电各 2 点穿透
  c.expect(opp1).toHaveVariable({ health: 5 });
  // 后台：扩散 1 + 感电 1，再吃另一次感电的 2 点穿透
  c.expect(opp2).toHaveVariable({ health: 6 });
  c.expect(opp3).toHaveVariable({ health: 6 });
});

test("ororon talent: a talent equipped after an electro-charged is still enabled", async () => {
  // 规则集：天赋②入场后/行动阶段开始时：启用此能力
  // 断言：本回合已引发过一次感电（当时未装备天赋，后台各吃 1 点穿透）后才装备天赋，
  //       下一次感电仍享受天赋①，后台穿透伤害为 2 点。
  const ororon = ref();
  const opp1 = ref();
  const opp2 = ref();
  const opp3 = ref();
  const c = setup(
    <State>
      <Character opp active ref={opp1} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp2} health={10} aura={Aura.Hydro} />
      <Character opp ref={opp3} health={10} />
      <Character my active def={Ororon} ref={ororon} />
      <Card my def={TrailsAmidstTheForestFog} />
    </State>,
  );
  await c.me.skill(NightsSling);
  // 无天赋的感电：出战 2+1，后台各 1 点穿透
  c.expect(opp1).toHaveVariable({ health: 7 });
  c.expect(opp2).toHaveVariable({ health: 9 });
  c.expect(opp3).toHaveVariable({ health: 9 });
  await c.opp.switch(opp2);
  await c.me.card(TrailsAmidstTheForestFog, ororon);
  await c.me.skill(NightsSling);
  // 装备后的感电：出战 2+1，后台各 2 点穿透
  c.expect(opp2).toHaveVariable({ health: 6 });
  c.expect(opp1).toHaveVariable({ health: 5 });
  c.expect(opp3).toHaveVariable({ health: 7 });
});
