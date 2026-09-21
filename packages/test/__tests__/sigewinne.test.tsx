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
  $,
  Card,
  Character,
  CombatStatus,
  Equipment,
  Ref,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import {
  MondstadtHashBrown,
  RainbowMacaronsInEffect,
  SingYourHeartOut,
  TeyvatFriedEgg,
} from "@gi-tcg/data/internal/cards/event/food.gts";
import { TheBestestTravelCompanion } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  Keqing,
  StellarRestoration,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import {
  DetailedDiagnosisThoroughTreatmentStatus,
  LargeBolsteringBubblebalm,
  ReboundHydrotherapy,
  Sigewinne,
} from "@gi-tcg/data/internal/characters/hydro/sigewinne.gts";
import { SweepingFervor, Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { BondOfLife, Satiated } from "@gi-tcg/data/internal/commons.gts";
import { Aura, createRpcResponse } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("sigwinne: passive triggered after defeated", async () => {
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active def={Sigewinne} health={1} aura={Aura.Cryo} />
      <Character opp health={10} ref={oppNext}>
        <Status def={DetailedDiagnosisThoroughTreatmentStatus} />
        <Status def={BondOfLife} usage={1} />
        <Status def={RainbowMacaronsInEffect} />
        <Status def={Satiated} />
      </Character>
      <Character my active def={Keqing} />
    </State>,
  );
  await c.me.skill(StellarRestoration);
  // 超导后台穿透，oppNext 扣 1 血
  // 马卡龙回 1 血但被生命之契吃掉（生命值 9）
  // 生命之契弃置，触发希格雯被动，最大生命值+1
  // 生命值 10，最大生命值 11
  c.expect(oppNext).toHaveVariable({ health: 10, maxHealth: 11 });
  c.expect($.opp.typeStatus.def(DetailedDiagnosisThoroughTreatmentStatus),
  ).toNotExist();
  await c.opp.chooseActive(oppNext);
  c.expect($.opp.active).toBe(oppNext);
});

test("sigwinne: bubble", async () => {
  const target = ref();
  const c = setup(
    <State dataVersion="v6.1.0">
      <Character my def={Sigewinne} />
      <Character my ref={target} health={1} />
      <Card pile my def={Paimon} />
      <Card pile my def={Paimon} />
      <Card pile my def={TheBestestTravelCompanion} />
      <Card my def={SingYourHeartOut} />
    </State>,
  );
  await c.me.skill(ReboundHydrotherapy);
  await c.opp.end();
  await c.me.switch(target);
  await c.me.card(SingYourHeartOut);
  // 抓三张，水泡自动弃置
  c.expect($.my.hand).toBeCount(2);
  c.expect(target).toHaveVariable({ health: 4 });
});

test("sigwinne bubble: disposed before HCI event", async () => {
  const myActive = ref();
  const c = setup(
    <State>
      <Character my active def={Xinyan} health={1} ref={myActive}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
      </Character>
      <Character my def={Sigewinne} />
      <Card my pile def={LargeBolsteringBubblebalm} /> 
    </State>
  );
  await c.me.skill(SweepingFervor);
  // 希格雯水泡抽上来且舍弃掉
  c.expect($.my.pile).toBeCount(0);
  // 但是不会触发效果
  c.expect($.opp.pile).toBeCount(0);
  c.expect(myActive).toHaveVariable({ health: 1 });
});

test.fails("sigewinne: DetailedDiagnosisThoroughTreatment is kept on a defeated character", async () => {
  // 规则集：细致入微的诊疗（角色状态）被击倒时不移除
  // 当前引擎：EntityModel.getSkills()（packages/core/src/gts/vm_impl/entity.ts:205）无条件给
  // status/equipment 追加「被击倒后弃置」技能，gts 的 noDefaultDispose 只写 disposeOnMasterDefeated
  // 而该字段无人读取，故被击倒角色身上的【细致入微的诊疗】仍被移除
  // 断言：希格雯未被击倒时，被击倒角色身上的【细致入微的诊疗】仍然保留
  const target = ref();
  const sigewinne = ref();
  const c = setup(
    <State>
      <Character opp active def={Keqing} />
      <Character my active ref={target} health={1}>
        <Status def={DetailedDiagnosisThoroughTreatmentStatus} />
      </Character>
      <Character my def={Sigewinne} ref={sigewinne} />
    </State>,
  );
  await c.me.end();
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(sigewinne);
  c.expect(target).toHaveVariable({ alive: 0, health: 0 });
  const entities = c.state.players[0].characters.find(
    (ch) => ch.id === target.id,
  )!.entities;
  expect(entities.map((e) => e.definition.id)).toContain(
    DetailedDiagnosisThoroughTreatmentStatus,
  );
});

test("sigewinne: no max health gain once Sigewinne herself is defeated", async () => {
  // 规则集：角色所附属的【生命之契】被弃置后：若角色和我方希格雯均未被击倒->最大生命值+1
  // 断言：希格雯被击倒后，我方角色的【生命之契】被弃置不再提供最大生命值（状态已移除）
  const target = ref();
  const sigewinne = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active ref={target} health={10} aura={Aura.Cryo}>
        <Status def={DetailedDiagnosisThoroughTreatmentStatus} />
        <Status def={BondOfLife} usage={1} />
      </Character>
      <Character my def={Sigewinne} ref={sigewinne} health={1} />
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  // 超导：出战角色受到 3+1 点伤害，后台的希格雯受到 1 点穿透伤害被击倒
  await c.opp.skill(StellarRestoration);
  c.expect(sigewinne).toHaveVariable({ alive: 0 });
  c.expect($.my.typeStatus.def(DetailedDiagnosisThoroughTreatmentStatus),
  ).toNotExist();
  // 治疗 2 点：1 点被生命之契抵消后生命之契被弃置，但不再触发最大生命值+1
  await c.me.card(MondstadtHashBrown, target);
  c.expect(target).toHaveVariable({ maxHealth: 10, health: 7 });
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

test("sigewinne: battle begin attaches the status to every ally with 3 uses", async () => {
  // 规则集：细致入微的诊疗（被动技能）战斗开始时，我方角色附属【细致入微的诊疗】（角色状态）
  // 规则集：角色所附属的【生命之契】被弃置后：……最大生命值+1（可用次数：3）
  // 断言：三名我方角色各附属一个【细致入微的诊疗】，初始可用次数为 3
  const sigewinne = ref();
  const oppActive = ref();
  // 首位角色会成为默认出战角色，而默认出战角色不在「选择出战角色」的候选里
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my />
      <Character my def={Sigewinne} ref={sigewinne} />
      <Character my def={Keqing} />
      <Character opp />
      <Character opp def={Keqing} ref={oppActive} />
    </State>,
  );
  await startBattle(c, sigewinne, oppActive);
  c.expect(
    $.my.typeStatus.def(DetailedDiagnosisThoroughTreatmentStatus),
  ).toBeCount(3);
  c.expect(
    $.my.typeStatus.def(DetailedDiagnosisThoroughTreatmentStatus),
  ).toHaveVariable({ usage: 3 });
});

test("sigewinne: gained max health survives defeat and revival", async () => {
  // 规则集：注：最大生命值是永久角色值修改，不是角色状态或出战状态，击倒再复苏能继承已获得的最大生命值
  // 断言：先靠【生命之契】被弃置拿到 +1 最大生命值，角色被击倒再用提瓦特煎蛋复苏后最大生命值仍为 11
  const target = ref();
  const sigewinne = ref();
  const c = setup(
    <State>
      <Character opp active def={Keqing} />
      <Character my active def={Keqing} ref={target} health={1}>
        <Status def={DetailedDiagnosisThoroughTreatmentStatus} />
        <Status def={BondOfLife} usage={1} />
      </Character>
      <Character my def={Sigewinne} ref={sigewinne} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={TeyvatFriedEgg} />
    </State>,
  );
  // 治疗 2 点：1 点被生命之契抵消，生命之契弃置后最大生命值 +1 并治疗 1 点
  await c.me.card(MondstadtHashBrown, target);
  c.expect(target).toHaveVariable({ maxHealth: 11, health: 3 });
  // 用一次战斗行动把行动权交给对方，随后被 3 点雷元素伤害击倒
  await c.me.skill(YunlaiSwordsmanship);
  await c.opp.skill(StellarRestoration);
  c.expect(target).toHaveVariable({ alive: 0 });
  await c.me.chooseActive(sigewinne);
  await c.me.card(TeyvatFriedEgg, target);
  c.expect(target).toHaveVariable({ alive: 1, maxHealth: 11, health: 1 });
});
