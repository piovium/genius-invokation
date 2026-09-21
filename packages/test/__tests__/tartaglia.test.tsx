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

import { ref, setup, Character, CombatStatus, Equipment, State, Status, $ } from "#test";
import {
  Keqing,
  StellarRestoration,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import {
  AbyssalMayhemHydrospout,
  CuttingTorrent,
  MeleeStance,
  Riptide,
  Riptide2,
  Tartaglia,
} from "@gi-tcg/data/internal/characters/hydro/tartaglia.gts";
import { Aura, DamageType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test.each(["v4.0.0", void 0] as const)(
  "riptide should propagate",
  async (version) => {
    const oppNext = ref();
    const c = setup(
      <State dataVersion={version}>
        <Character opp active health={1}>
          <Status def={Riptide} />
        </Character>
        <Character opp ref={oppNext} />
        <Character my active def={Keqing} />
        <Character my def={Tartaglia} />
      </State>,
    );
    await c.me.skill(YunlaiSwordsmanship);
    await c.opp.chooseActive(oppNext);
    c.expect($.typeStatus.def(Riptide).at($.id(oppNext.id))).toBeExist();
  },
);

/** 按 who 视角收到的通知，逐条记录伤害，数组顺序即引擎的结算顺序 */
function recordDamages(c: ReturnType<typeof setup>, who: 0 | 1) {
  const records: { damageType: DamageType; targetId: number; value: number }[] =
    [];
  c.game.players[who].io.notify = ({ mutation }) => {
    for (const { mutation: m } of mutation) {
      if (m?.$case === "damage") {
        records.push({
          damageType: m.value.damageType,
          targetId: m.value.targetId,
          value: m.value.value,
        });
      }
    }
  };
  return records;
}

test("cutting torrent in melee stance: piercing resolves before the main damage", async () => {
  // 规则集：断雨 若附属【近战状态】->对下一个对方后台角色造成1点穿透伤害，造成3点水元素伤害
  // 规则集：注：近战状态的穿透伤害早于原伤害
  // 断言：结算顺序是「后台1点穿透」在前、「出战3点水元素」在后
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10}>
        <Status def={Riptide} />
      </Character>
      <Character opp ref={oppNext} health={10} />
      <Character my active def={Tartaglia}>
        <Status def={MeleeStance} />
      </Character>
    </State>,
  );
  const records = recordDamages(c, 0);
  await c.me.skill(CuttingTorrent);
  expect(records).toEqual([
    { damageType: DamageType.Piercing, targetId: oppNext.id, value: 1 },
    { damageType: DamageType.Hydro, targetId: oppActive.id, value: 3 },
  ]);
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect(oppNext).toHaveVariable({ health: 9 });
});

test("riptide: attaches to the active character when a standby is defeated", async () => {
  // 规则集：断流①被击倒后：我方出战角色附属【断流】；若没有出战角色，生成【断流2】
  // 断言：出战角色仍存活时直接为其附属【断流】，不生成【断流2】
  const oppActive = ref();
  const oppStandby = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10} aura={Aura.Cryo} />
      <Character opp ref={oppStandby} health={1}>
        <Status def={Riptide} />
      </Character>
      <Character my active def={Keqing} />
    </State>,
  );
  // 超导：对方后台角色各受到1点穿透伤害，附属【断流】的后台角色被击倒
  await c.me.skill(StellarRestoration);
  c.expect(oppStandby).toHaveVariable({ alive: 0 });
  c.expect($.typeStatus.def(Riptide).at($.id(oppActive.id))).toBeExist();
  c.expect($.opp.combatStatus.def(Riptide2)).toNotExist();
});

test("riptide: talent's end phase piercing only hits the active character", async () => {
  // 规则集：断流②结束阶段：若角色为出战角色，且对方【达达利亚】装备天赋【深渊之灾·凝水盛放】->对角色造成1点穿透伤害
  // 断言：同样附属【断流】的后台角色不受伤
  const oppActive = ref();
  const oppStandby = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10}>
        <Status def={Riptide} />
      </Character>
      <Character opp ref={oppStandby} health={10}>
        <Status def={Riptide} />
      </Character>
      <Character my active def={Tartaglia}>
        <Equipment def={AbyssalMayhemHydrospout} />
      </Character>
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  c.expect(oppActive).toHaveVariable({ health: 9 });
  c.expect(oppStandby).toHaveVariable({ health: 10 });
});

test("riptide: creates Riptide2 when the active character is defeated", async () => {
  // 规则集：断流①被击倒后：我方出战角色附属【断流】；若没有出战角色，生成【断流2】
  // 断言：附属【断流】的出战角色被击倒、尚未选出新出战角色时，改为生成【断流2】
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={1}>
        <Status def={Riptide} />
      </Character>
      <Character opp ref={oppNext} health={10} />
      <Character my active def={Keqing} />
    </State>,
  );
  await c.me.skill(YunlaiSwordsmanship);
  c.expect(oppActive).toHaveVariable({ alive: 0 });
  c.expect($.opp.combatStatus.def(Riptide2)).toBeExist();
  // 没有出战角色，【断流】不会直接落到幸存的后台角色身上
  c.expect($.typeStatus.def(Riptide).at($.id(oppNext.id))).toNotExist();
});

test("riptide2: the new active gets Riptide after a switch, then it is disposed", async () => {
  // 规则集：断流2①切换角色后：我方出战角色附属【断流】，弃置此状态
  // 断言：切换后【断流】落在新出战角色而非原出战角色上，【断流2】随即消失
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active ref={oppActive} health={10} />
      <Character opp ref={oppNext} health={10} />
      <Character my active def={Keqing} />
      <CombatStatus opp def={Riptide2} />
    </State>,
  );
  await c.opp.switch(oppNext);
  c.expect($.typeStatus.def(Riptide).at($.id(oppNext.id))).toBeExist();
  c.expect($.typeStatus.def(Riptide).at($.id(oppActive.id))).toNotExist();
  c.expect($.opp.combatStatus.def(Riptide2)).toNotExist();
});
