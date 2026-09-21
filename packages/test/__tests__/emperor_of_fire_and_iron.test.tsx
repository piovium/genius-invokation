// Copyright (C) 2026 Guyutongxue
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
  Ref,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { Crystallize } from "@gi-tcg/data/internal/commons.gts";
import {
  ArmoredCrabCarapace,
  EmperorOfFireAndIron,
  ShatterclampStrike,
} from "@gi-tcg/data/internal/characters/pyro/emperor_of_fire_and_iron.gts";
import {
  Candace,
  HeronShield,
} from "@gi-tcg/data/internal/characters/hydro/candace.gts";
import { Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { TemperedSword } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { createRpcResponse } from "@gi-tcg/typings";
import { test } from "vitest";

test("Emperor of Fire and Iron absorbs another character's shield after acting", async () => {
  const emperor = ref();
  const heronShield = ref();
  const c = setup(
    <State>
      <Character my active def={EmperorOfFireAndIron} ref={emperor} />
      <Character my def={Candace}>
        <Status def={HeronShield} ref={heronShield} />
      </Character>
      <Character opp active />
    </State>,
  );

  await c.me.skill(ShatterclampStrike);

  c.expect(heronShield).toNotExist();
  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toHaveVariable({ shield: 2 });
});

/** 从 initActives 阶段开始：双方按 ref 选择出战角色，然后推进到第一个行动阶段 */
async function startBattle(
  c: ReturnType<typeof setup>,
  myActive: Ref,
  oppActive: Ref,
) {
  for (const who of [0, 1] as const) {
    const orig = c.game.players[who].io.rpc;
    const chosen = who === 0 ? myActive : oppActive;
    c.game.players[who].io.rpc = async (request) => {
      if (request.request?.$case === "chooseActive") {
        return createRpcResponse("chooseActive", {
          activeCharacterId: chosen.id,
        });
      }
      return orig(request);
    };
  }
  await c.stepToNextAction();
}

test("Imperial Panoply: attaches 5 layers of Armored Crab Carapace at battle begin", async () => {
  // 规则集：帝王甲胄 ①战斗开始时：附属5层【重甲蟹壳】
  const emperor = ref();
  const oppActive = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={Kaeya} />
      <Character my def={EmperorOfFireAndIron} ref={emperor} />
      <Character opp def={Candace} />
      <Character opp def={Kaeya} ref={oppActive} />
    </State>,
  );

  await startBattle(c, emperor, oppActive);

  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toHaveVariable({
    shield: 5,
  });
});

test("Imperial Panoply: re-attached carapace has X + 2Y layers", async () => {
  // 规则集：帝王甲胄 ②...使角色附属X+2Y层【重甲蟹壳】（X为移除前【重甲蟹壳】数量，Y为其他护盾状态数量）
  // X=3（重甲蟹壳层数），Y=2（苍鹭护盾 2 点 + 结晶 1 点，各计 2）→ 3+2*2=7
  const heronShield = ref();
  const crystallize = ref();
  const c = setup(
    <State>
      <Character my active def={EmperorOfFireAndIron}>
        <Status def={ArmoredCrabCarapace} shield={3} />
      </Character>
      <Character my def={Candace}>
        <Status def={HeronShield} ref={heronShield} />
      </Character>
      <Character opp active />
      <CombatStatus my def={Crystallize} ref={crystallize} />
    </State>,
  );

  await c.me.skill(ShatterclampStrike);

  c.expect(heronShield).toNotExist();
  c.expect(crystallize).toNotExist();
  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toHaveVariable({
    shield: 7,
  });
});

test("Imperial Panoply: the old carapace is removed and a new one is attached", async () => {
  // 规则集：注：②会移除所有【重甲蟹壳】，再重新附属
  // 原有的重甲蟹壳实体被移除（而非直接加层），随后附属一个新的 3+2=5 层实体
  const carapace = ref();
  const c = setup(
    <State>
      <Character my active def={EmperorOfFireAndIron}>
        <Status def={ArmoredCrabCarapace} shield={3} ref={carapace} />
      </Character>
      <Character my def={Candace}>
        <Status def={HeronShield} />
      </Character>
      <Character opp active />
    </State>,
  );

  await c.me.skill(ShatterclampStrike);

  c.expect(carapace).toNotExist();
  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toBeCount(1);
  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toHaveVariable({
    shield: 5,
  });
});

test("Imperial Panoply: does not trigger when only opponent has other shields", async () => {
  // 规则集：帝王甲胄 ②我方行动后：如果我方场上存在【重甲蟹壳】以外的护盾状态或护盾出战状态，则...
  // 敌方的护盾不属于「我方场上」，故不触发：重甲蟹壳实体保持不变
  const carapace = ref();
  const oppShield = ref();
  const c = setup(
    <State>
      <Character my active def={EmperorOfFireAndIron}>
        <Status def={ArmoredCrabCarapace} shield={3} ref={carapace} />
      </Character>
      <Character opp active />
      <Character opp def={Candace}>
        <Status def={HeronShield} ref={oppShield} />
      </Character>
    </State>,
  );

  await c.me.skill(ShatterclampStrike);

  c.expect(carapace).toHaveVariable({ shield: 3 });
  c.expect(oppShield).toBeExist();
});

test("Imperial Panoply: only our own action triggers the absorption", async () => {
  // 规则集：帝王甲胄 ②我方行动后：...
  // 对方行动后不触发；直到我方行动后才移除苍鹭护盾并重新附属 1+2=3 层重甲蟹壳
  const carapace = ref();
  const heronShield = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={EmperorOfFireAndIron}>
        <Status def={ArmoredCrabCarapace} shield={3} ref={carapace} />
      </Character>
      <Character my def={Candace}>
        <Status def={HeronShield} ref={heronShield} />
      </Character>
      <Character opp active />
    </State>,
  );

  await c.opp.skill(TemperedSword);
  c.expect(heronShield).toBeExist();
  c.expect(carapace).toHaveVariable({ shield: 1 });

  await c.me.skill(ShatterclampStrike);
  c.expect(heronShield).toNotExist();
  c.expect($.my.typeStatus.def(ArmoredCrabCarapace)).toHaveVariable({
    shield: 3,
  });
});
