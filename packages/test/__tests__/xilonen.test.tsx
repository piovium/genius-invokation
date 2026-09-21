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
  Character,
  CombatStatus,
  DeclaredEnd,
  Ref,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  CryoDMGBonus,
  ElectroDMGBonus,
  GeoDMGBonus,
  HydroDMGBonus,
  NightsoulsBlessing,
  PyroDMGBonus,
  SourceSampleCryo,
  SourceSampleElectro,
  SourceSampleGeo,
  SourceSampleHydro,
  SourceSamplePyro,
  Xilonen,
} from "@gi-tcg/data/internal/characters/geo/xilonen.gts";
import {
  Breastplate,
  FavoniusBladeworkMaid,
  Noelle,
} from "@gi-tcg/data/internal/characters/geo/noelle.gts";
import { Sucrose } from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Xiangling } from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import { Frostgnaw, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { createRpcResponse } from "@gi-tcg/typings";
import { expect, test } from "vitest";

/** 返回某角色身上的实体定义 id 列表 */
function entitiesOf(c: ReturnType<typeof setup>, who: 0 | 1, id: number) {
  return c.state.players[who].characters
    .find((ch) => ch.id === id)!
    .entities.map((e) => e.definition.id);
}

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

test("xilonen source sample: battle begin attaches 3 layers of geo sample when no pyro/hydro/cryo/electro teammate", async () => {
  // 规则集：战斗开始时，附属3层【源音采样·岩】，然后我方每存在一种火、水、冰、雷的角色，移除一层【源音采样·岩】，附属对应属性的【源音采样】
  // 队伍 希诺宁（岩）+诺艾尔（岩）+砂糖（风）：没有火水冰雷角色，故保持 3 层岩
  const xilonen = ref();
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={Xilonen} ref={xilonen} />
      <Character my def={Noelle} ref={myActive} />
      <Character my def={Sucrose} />
      <Character opp def={Kaeya} />
      <Character opp def={Noelle} ref={oppActive} />
    </State>,
  );
  await startBattle(c, myActive, oppActive);
  c.expect($.my.typeStatus.def(SourceSampleGeo)).toHaveVariable({ layer: 3 });
  c.expect($.my.typeStatus.def(SourceSamplePyro)).toNotExist();
  c.expect($.my.typeStatus.def(SourceSampleHydro)).toNotExist();
  c.expect($.my.typeStatus.def(SourceSampleCryo)).toNotExist();
  c.expect($.my.typeStatus.def(SourceSampleElectro)).toNotExist();
  // 「附属」：源音采样是希诺宁自身的角色状态
  expect(entitiesOf(c, 0, xilonen.id)).toContain(SourceSampleGeo as number);
});

test("xilonen source sample: each of pyro/hydro/cryo/electro present converts one geo layer", async () => {
  // 规则集：我方每存在一种火、水、冰、雷的角色，移除一层【源音采样·岩】，附属对应属性的【源音采样】
  // 队伍 希诺宁+迪卢克（火）+凯亚（冰）：3 - 2 = 1 层岩，另有 1 层火、1 层冰
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={Xilonen} />
      <Character my def={Diluc} ref={myActive} />
      <Character my def={Kaeya} />
      <Character opp def={Kaeya} />
      <Character opp def={Noelle} ref={oppActive} />
    </State>,
  );
  await startBattle(c, myActive, oppActive);
  c.expect($.my.typeStatus.def(SourceSampleGeo)).toHaveVariable({ layer: 1 });
  c.expect($.my.typeStatus.def(SourceSamplePyro)).toHaveVariable({ layer: 1 });
  c.expect($.my.typeStatus.def(SourceSampleCryo)).toHaveVariable({ layer: 1 });
  c.expect($.my.typeStatus.def(SourceSampleHydro)).toNotExist();
  c.expect($.my.typeStatus.def(SourceSampleElectro)).toNotExist();
});

test("xilonen source sample: duplicated element counts only once", async () => {
  // 规则集：我方每存在一「种」火、水、冰、雷的角色，移除一层【源音采样·岩】
  // 队伍 希诺宁+迪卢克（火）+香菱（火）：火只算一种，故 3 - 1 = 2 层岩 + 1 层火
  const myActive = ref();
  const oppActive = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={Xilonen} />
      <Character my def={Diluc} ref={myActive} />
      <Character my def={Xiangling} />
      <Character opp def={Kaeya} />
      <Character opp def={Noelle} ref={oppActive} />
    </State>,
  );
  await startBattle(c, myActive, oppActive);
  c.expect($.my.typeStatus.def(SourceSampleGeo)).toHaveVariable({ layer: 2 });
  c.expect($.my.typeStatus.def(SourceSamplePyro)).toHaveVariable({ layer: 1 });
  c.expect($.my.typeStatus.def(SourceSampleCryo)).toNotExist();
});

test.fails("xilonen source sample: not removed when the attached character is defeated", async () => {
  // 规则集：源音采样·岩/火/水/冰/雷（角色状态）- 被击倒时不移除；
  // 当前引擎：EntityModel.getSkills() 无条件为 status/equipment 追加「被击倒后弃置」技能，
  // gts 的 noDefaultDispose（只设置从未被读取的 disposeOnMasterDefeated）不生效，希诺宁被击倒后源音采样被弃置
  const xilonen = ref();
  const noelle = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Xilonen} ref={xilonen} health={1}>
        <Status def={SourceSampleGeo} v={{ layer: 3 }} />
      </Character>
      <Character my def={Noelle} ref={noelle} />
      <Character opp active def={Kaeya} />
    </State>,
  );
  await c.opp.skill(Frostgnaw).manual();
  await c.me.chooseActive(noelle);
  const defeated = c.state.players[0].characters.find(
    (ch) => ch.id === xilonen.id,
  )!;
  expect(defeated.variables.alive).toBe(0);
  expect(entitiesOf(c, 0, xilonen.id)).toContain(SourceSampleGeo as number);
});

test("xilonen source sample: round start with 2 nightsoul generates the damage bonus on the opponent's field and consumes 2 nightsoul", async () => {
  // 规则集：回合开始时：若所附属角色拥有2点夜魂，在对方场上生成【受到的岩元素伤害增加】，然后若其他源音采样本回合均已发动，消耗2点夜魂
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Xilonen}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
        <Status def={SourceSampleGeo} v={{ layer: 3 }} />
      </Character>
      <Character opp active def={Noelle} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.opp.combatStatus.def(GeoDMGBonus)).toBeExist();
  // 持续回合：1
  c.expect($.opp.combatStatus.def(GeoDMGBonus)).toHaveVariable({ duration: 1 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 0,
  });
});

test("xilonen source sample: round start with fewer than 2 nightsoul does nothing", async () => {
  // 规则集：回合开始时：「若所附属角色拥有2点夜魂」，在对方场上生成【受到的岩元素伤害增加】……消耗2点夜魂
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Xilonen}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
        <Status def={SourceSampleGeo} v={{ layer: 3 }} />
      </Character>
      <Character opp active def={Noelle} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.opp.combatStatus.def(GeoDMGBonus)).toNotExist();
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
});

test("xilonen source sample: every attached sample generates its own elemental damage bonus", async () => {
  // 规则集：附属对应属性的【源音采样】……回合开始时……在对方场上生成【受到的（对应元素）伤害增加】
  const c = setup(
    <State phase="action" prevPhase="roll">
      <Character my active def={Xilonen}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
        <Status def={SourceSampleGeo} v={{ layer: 1 }} />
        <Status def={SourceSamplePyro} v={{ layer: 1 }} />
        <Status def={SourceSampleCryo} v={{ layer: 1 }} />
      </Character>
      <Character opp active def={Noelle} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect($.opp.combatStatus.def(GeoDMGBonus)).toBeExist();
  c.expect($.opp.combatStatus.def(PyroDMGBonus)).toBeExist();
  c.expect($.opp.combatStatus.def(CryoDMGBonus)).toBeExist();
  c.expect($.opp.combatStatus.def(HydroDMGBonus)).toNotExist();
  c.expect($.opp.combatStatus.def(ElectroDMGBonus)).toNotExist();
  // 「然后……消耗2点夜魂」：全部发动后只消耗一次
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 0,
  });
});

test("geo damage bonus: increases only geo damage taken by its own side by 1", async () => {
  // 规则集：受到的岩元素伤害增加 - 我方受到的岩元素伤害+1
  // 诺艾尔护心铠 1 点岩伤 -> 2 点；西风剑术·女仆 2 点物理伤害不受影响
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Noelle} />
      <Character opp active def={Xilonen} ref={oppActive} health={10} />
      <CombatStatus opp def={GeoDMGBonus} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.skill(Breastplate);
  c.expect(oppActive).toHaveVariable({ health: 8 });
  await c.me.skill(FavoniusBladeworkMaid);
  c.expect(oppActive).toHaveVariable({ health: 6 });
});

test("geo damage bonus: does not increase the geo damage taken by the other side", async () => {
  // 规则集：受到的岩元素伤害增加 -「我方」受到的岩元素伤害+1
  // 断言：该出战状态在对方场上时，我方角色受到的岩元素伤害不增加（对方诺艾尔护心铠 1 点岩伤）
  const myActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Kaeya} ref={myActive} health={10} />
      <Character opp active def={Noelle} />
      <CombatStatus opp def={GeoDMGBonus} />
    </State>,
  );
  await c.opp.skill(Breastplate);
  c.expect(myActive).toHaveVariable({ health: 9 });
});
