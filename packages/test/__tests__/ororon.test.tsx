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

import { ref, setup, Character, State, Status, Equipment, $ } from "#test";
import {
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  Ororon,
  NightsSling,
  NightsoulsBlessing,
  TrailsAmidstTheForestFog,
} from "@gi-tcg/data/internal/characters/electro/ororon.gts";
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

// https://github.com/piovium/genius-invokation/issues/1087
test.each([
  [Aura.Electro, Aura.Hydro],
  [Aura.Hydro, Aura.Electro],
])(
  "ororon talent: swirl (%s into %s) boosts both simultaneous electro-charged reactions",
  async (activeAura, standbyAura) => {
    const oppActive = ref();
    const oppStandby1 = ref();
    const oppStandby2 = ref();
    const talent = ref();
    const c = setup(
      <State>
        <Character opp active ref={oppActive} aura={activeAura} />
        <Character opp ref={oppStandby1} aura={standbyAura} />
        <Character opp ref={oppStandby2} aura={standbyAura} />
        <Character my active def={Sucrose} />
        <Character my def={Ororon}>
          <Equipment def={TrailsAmidstTheForestFog} ref={talent} />
        </Character>
      </State>,
    );

    await c.me.skill(WindSpiritCreation);

    // Active: 1 Anemo + 2 * 2 piercing
    c.expect(oppActive).toHaveVariable({ health: 5, aura: Aura.None });
    // Standby: 1 swirl + 1 reaction bonus + 2 piercing
    c.expect(oppStandby1).toHaveVariable({ health: 6, aura: Aura.None });
    c.expect(oppStandby2).toHaveVariable({ health: 6, aura: Aura.None });
  },
);

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
