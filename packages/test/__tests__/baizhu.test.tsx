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

import { $, Character, CombatStatus, ref, setup, State } from "#test";
import {
  Baizhu,
  HolisticRevivification,
  SeamlessShield,
} from "@gi-tcg/data/internal/characters/dendro/baizhu";
import {
  Keqing,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing";
import { Aura } from "@gi-tcg/typings";
import { test } from "bun:test";

test("baizhu shield: onDispose", async () => {
  const baizhu = ref();
  const oppActive = ref();
  const c = setup(
    <State dataVersion="v5.6.0">
      <Character my active def={Baizhu} ref={baizhu} energy={2} />
      <Character opp active def={Keqing} ref={oppActive} />
    </State>,
  );
  await c.me.skill(HolisticRevivification);
  await c.opp.skill(YunlaiSwordsmanship);
  // 原本打2点伤害，1点护盾 -> 9血
  // 白术盾回1点 -> 10 血
  c.expect(baizhu).toHaveVariable({ health: 10 });
  // 白术盾反
  c.expect(oppActive).toHaveVariable({ health: 9 });
});

test("baizhu shield: onEnter override", async () => {
  const baizhu = ref();
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Baizhu} ref={baizhu} energy={2} health={5} />
      <CombatStatus my def={SeamlessShield} />
      <Character opp active def={Keqing} ref={oppActive} />
    </State>,
  );
  await c.me.skill(HolisticRevivification);
  // 白术盾回1点 -> 10 血
  c.expect(baizhu).toHaveVariable({ health: 6 });
  // 白术盾反
  c.expect(oppActive).toHaveVariable({ health: 9 });
});

test("baizhu shield: hit the death", async () => {
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active def={Baizhu} ref={oppActive} health={1} />
      <Character opp ref={oppNext} health={10} />
      <CombatStatus opp def={SeamlessShield} />
      <Character my active def={Keqing} health={10} />
      <Character my def={Baizhu} />
      <CombatStatus my def={SeamlessShield} />
    </State>,
  );
  await c.me.skill(YunlaiSwordsmanship);
  // 被刻晴普攻打死
  c.expect(oppActive).toHaveVariable({ alive: 0 });

  // 白术盾反，1点草伤；但被我方白术盾挡住
  c.expect($.my.active).toHaveVariable({
    health: 10,
    aura: Aura.Dendro,
  });

  // 我方白术盾打尸体，但不挂草
  c.expect(oppActive).toHaveVariable({ aura: Aura.None });
  c.expect($.my.combatStatus.def(SeamlessShield)).toNotExist();

  // 对方选人后没受伤
  await c.opp.chooseActive(oppNext);
  c.expect(oppNext).toHaveVariable({ health: 10 });
});
