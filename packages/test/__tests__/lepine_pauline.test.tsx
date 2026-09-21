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
  Card,
  Character,
  CombatStatus,
  DiceCount,
  ref,
  setup,
  State,
  Support,
} from "#test";
import { StoneAndContracts } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  EnergyMechanismInvestmentGrandPlan,
  EnergyMechanismInvestmentMegaPlan,
  EnergyMechanismInvestmentSuperMegaPlan,
  GraphAdversarialTechnologyInvestmentGrandPlan,
  GraphAdversarialTechnologyInvestmentMegaPlan,
  GraphAdversarialTechnologyInvestmentSuperMegaPlan,
  LepinePauline,
  LepinepaulinesInvestmentInEnergyMechanism,
  LepinepaulinesInvestmentInGraphAdversarialTechnology,
  LepinepaulinesInvestmentInMedicalEquipment,
  MedicalEquipmentInvestmentGrandPlan,
  MedicalEquipmentInvestmentMegaPlan,
  MedicalEquipmentInvestmentSuperMegaPlan,
} from "@gi-tcg/data/internal/cards/support/ally.gts";
import { FlowerfeatherClan } from "@gi-tcg/data/internal/cards/support/place.gts";
import { Shield } from "@gi-tcg/data/internal/commons.gts";
import { DiceType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 引擎随机数为 minstd LCG，种子为 0 时永远不变，因此使用非 0 固定种子
const SEED = 12345;

const MEDICAL_PLANS: number[] = [
  MedicalEquipmentInvestmentGrandPlan,
  MedicalEquipmentInvestmentMegaPlan,
  MedicalEquipmentInvestmentSuperMegaPlan,
];
const GRAPH_PLANS: number[] = [
  GraphAdversarialTechnologyInvestmentGrandPlan,
  GraphAdversarialTechnologyInvestmentMegaPlan,
  GraphAdversarialTechnologyInvestmentSuperMegaPlan,
];
/** 基础元素骰：冰水火雷岩草风 */
const BASIC_ELEMENTS: number[] = [
  DiceType.Cryo,
  DiceType.Hydro,
  DiceType.Pyro,
  DiceType.Electro,
  DiceType.Anemo,
  DiceType.Geo,
  DiceType.Dendro,
];
const ENERGY_PLANS: number[] = [
  EnergyMechanismInvestmentGrandPlan,
  EnergyMechanismInvestmentMegaPlan,
  EnergyMechanismInvestmentSuperMegaPlan,
];

type Controller = ReturnType<typeof setup>;

/** 双方宣布结束，推进到下一回合行动阶段（先宣布结束者下回合先手，仍为我方） */
const nextRound = async (c: Controller) => {
  await c.me.end();
  await c.opp.end();
};

const supportDefIds = (c: Controller) =>
  c.state.players[0].supports.map((s) => s.definition.id);

test("LepinePauline: on staged, select one of the three investments", async () => {
  // 规则集：入场时：挑选：【乐平波琳的医疗器材投资、乐平波琳的图形对抗投资、乐平波琳的能量机关投资】
  // 断言：入场后引擎请求挑选，候选恰为三张投资牌
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Card my def={LepinePauline} />
    </State>,
  );
  await c.me.card(LepinePauline);
  const rpc = (
    c.me as unknown as {
      awaitingRpc: {
        request: { $case: string; value: { candidateDefinitionIds: number[] } };
      } | null;
    }
  ).awaitingRpc;
  expect(rpc?.request.$case).toBe("selectCard");
  expect(rpc?.request.value.candidateDefinitionIds).toIncludeSameMembers([
    LepinepaulinesInvestmentInMedicalEquipment,
    LepinepaulinesInvestmentInGraphAdversarialTechnology,
    LepinepaulinesInvestmentInEnergyMechanism,
  ]);
  await c.me.selectCard(LepinepaulinesInvestmentInMedicalEquipment);
});

test("LepinePauline: medical equipment investment deals 1 piercing damage and transforms", async () => {
  // 规则集：乐平波琳的医疗器材投资：对我方出战角色造成1点穿透伤害，此牌随机转化为
  //         【医疗器材投资·大计划/特大计划/超级大计划】之一
  // 断言：出战角色掉 1 血且护盾未被消耗（穿透），乐平波琳本体转化为三种医疗计划之一
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active health={10} />
      <CombatStatus my def={Shield} shield={2} />
      <Card my def={LepinePauline} />
    </State>,
  );
  await c.me.card(LepinePauline);
  await c.me.selectCard(LepinepaulinesInvestmentInMedicalEquipment);
  c.expect($.my.active).toHaveVariable({ health: 9 });
  c.expect($.my.combatStatus.def(Shield)).toHaveVariable({ shield: 2 });
  expect(supportDefIds(c)).toBeArrayOfSize(1);
  expect(MEDICAL_PLANS).toContain(supportDefIds(c)[0]);
});

test("MedicalEquipmentInvestmentGrandPlan: progress 1 heals most injured 2 and disposes", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到1->治疗我方受伤最多的角色2点，弃置此牌
  // 断言：下一回合行动阶段开始时进度达 1，受伤最多的后台角色被治疗 2 点，此牌弃置
  const injured = ref();
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active health={9} />
      <Character my ref={injured} health={3} />
      <Character my health={10} />
      <Support my def={MedicalEquipmentInvestmentGrandPlan} />
    </State>,
  );
  await nextRound(c);
  c.expect(injured).toHaveVariable({ health: 5 });
  c.expect($.my.active).toHaveVariable({ health: 9 });
  c.expect($.my.support.def(MedicalEquipmentInvestmentGrandPlan)).toNotExist();
});

test("MedicalEquipmentInvestmentMegaPlan: heals 4 only when progress reaches 2", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到2->治疗我方受伤最多的角色4点，弃置此牌
  // 断言：第一次行动阶段只累积进度不治疗，第二次进度达 2 才治疗 4 点并弃置
  const injured = ref();
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active health={9} />
      <Character my ref={injured} health={3} />
      <Character my health={10} />
      <Support my def={MedicalEquipmentInvestmentMegaPlan} />
    </State>,
  );
  await nextRound(c);
  c.expect(injured).toHaveVariable({ health: 3 });
  c.expect($.my.support.def(MedicalEquipmentInvestmentMegaPlan)).toHaveVariable({
    progress: 1,
  });
  await nextRound(c);
  c.expect(injured).toHaveVariable({ health: 7 });
  c.expect($.my.support.def(MedicalEquipmentInvestmentMegaPlan)).toNotExist();
});

test("MedicalEquipmentInvestmentSuperMegaPlan: heals 6 only when progress reaches 3", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到3->治疗我方受伤最多的角色6点，弃置此牌
  // 断言：前两次行动阶段只累积进度，第三次进度达 3 才治疗 6 点并弃置
  const injured = ref();
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active health={9} />
      <Character my ref={injured} health={3} />
      <Character my health={10} />
      <Support my def={MedicalEquipmentInvestmentSuperMegaPlan} />
    </State>,
  );
  await nextRound(c);
  await nextRound(c);
  c.expect(injured).toHaveVariable({ health: 3 });
  c.expect(
    $.my.support.def(MedicalEquipmentInvestmentSuperMegaPlan),
  ).toHaveVariable({ progress: 2 });
  await nextRound(c);
  c.expect(injured).toHaveVariable({ health: 9 });
  c.expect(
    $.my.support.def(MedicalEquipmentInvestmentSuperMegaPlan),
  ).toNotExist();
});

test("LepinePauline: graph adversarial investment discards (not disposes) 1 random hand card", async () => {
  // 规则集：乐平波琳的图形对抗投资：舍弃1张随机手牌，此牌随机转化为
  //         【图形对抗投资·大计划/特大计划/超级大计划】之一；注：是舍弃
  // 断言：手牌少 1 张，且「花羽会」的「我方舍弃卡牌后」被触发（证明是舍弃而非弃置），
  //       乐平波琳本体转化为三种图形对抗计划之一
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={FlowerfeatherClan} />
      <Card my def={LepinePauline} />
      <Card my def={StoneAndContracts} />
      <Card my def={StoneAndContracts} />
    </State>,
  );
  await c.me.card(LepinePauline);
  await c.me.selectCard(LepinepaulinesInvestmentInGraphAdversarialTechnology);
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.support.def(FlowerfeatherClan)).toHaveVariable({
    disposedCardCount: 1,
  });
  expect(supportDefIds(c)).toBeArrayOfSize(2);
  expect(GRAPH_PLANS).toContain(
    supportDefIds(c).find((id) => id !== FlowerfeatherClan),
  );
});

test("GraphAdversarialTechnologyInvestmentGrandPlan: progress 1 draws 2 and disposes", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到1->抓2张牌，弃置此牌
  // 断言：手牌 = 结束阶段固定抓的 2 张 + 计划抓的 2 张 = 4，此牌弃置
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={GraphAdversarialTechnologyInvestmentGrandPlan} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
    </State>,
  );
  await nextRound(c);
  c.expect($.my.hand).toBeCount(4);
  c.expect($.my.pile).toNotExist();
  c.expect(
    $.my.support.def(GraphAdversarialTechnologyInvestmentGrandPlan),
  ).toNotExist();
});

test("GraphAdversarialTechnologyInvestmentMegaPlan: draws 4 only when progress reaches 2", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到2->抓4张牌，弃置此牌
  // 断言：第一次行动阶段只累积进度（手牌仅有结束阶段抓的 2 张），
  //       第二次进度达 2 才抓 4 张（手牌 2+2+4=8）并弃置
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={GraphAdversarialTechnologyInvestmentMegaPlan} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
    </State>,
  );
  await nextRound(c);
  c.expect($.my.hand).toBeCount(2);
  c.expect(
    $.my.support.def(GraphAdversarialTechnologyInvestmentMegaPlan),
  ).toHaveVariable({ progress: 1 });
  await nextRound(c);
  c.expect($.my.hand).toBeCount(8);
  c.expect($.my.pile).toNotExist();
  c.expect(
    $.my.support.def(GraphAdversarialTechnologyInvestmentMegaPlan),
  ).toNotExist();
});

test("GraphAdversarialTechnologyInvestmentSuperMegaPlan: draws 6 only when progress reaches 3", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到3->抓6张牌，弃置此牌
  // 从进度 1 起手（从 0 起累积 3 轮共抓 12 张，会超过 10 张手牌上限干扰断言）
  // 断言：进度达 2 时不抓牌，进度达 3 才抓 6 张（手牌 2+2+6=10）并弃置
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support
        my
        def={GraphAdversarialTechnologyInvestmentSuperMegaPlan}
        v={{ progress: 1 }}
      />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
      <Card my pile def={StoneAndContracts} />
    </State>,
  );
  await nextRound(c);
  c.expect($.my.hand).toBeCount(2);
  c.expect(
    $.my.support.def(GraphAdversarialTechnologyInvestmentSuperMegaPlan),
  ).toHaveVariable({ progress: 2 });
  await nextRound(c);
  c.expect($.my.hand).toBeCount(10);
  c.expect($.my.pile).toBeCount(2);
  c.expect(
    $.my.support.def(GraphAdversarialTechnologyInvestmentSuperMegaPlan),
  ).toNotExist();
});

test("LepinePauline: energy mechanism investment removes 1 die, more numerous first", async () => {
  // 规则集：乐平波琳的能量机关投资：移除1个元素骰……注：遵循移除序
  // 移除序：数量多的骰子优先 → [万,冰,火,火] 中移除 1 个火
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <DiceCount
        my
        dice={[DiceType.Omni, DiceType.Cryo, DiceType.Pyro, DiceType.Pyro]}
      />
      <Card my def={LepinePauline} />
    </State>,
  );
  await c.me.card(LepinePauline);
  await c.me.selectCard(LepinepaulinesInvestmentInEnergyMechanism);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Omni,
    DiceType.Cryo,
    DiceType.Pyro,
  ]);
  expect(supportDefIds(c)).toBeArrayOfSize(1);
  expect(ENERGY_PLANS).toContain(supportDefIds(c)[0]);
});

test("LepinePauline: energy mechanism investment removes elemental die before omni", async () => {
  // 规则集：乐平波琳的能量机关投资：移除1个元素骰……注：遵循移除序
  // 移除序：元素骰优先于万能骰 → [万,万,冰] 中移除冰
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <DiceCount my dice={[DiceType.Omni, DiceType.Omni, DiceType.Cryo]} />
      <Card my def={LepinePauline} />
    </State>,
  );
  await c.me.card(LepinePauline);
  await c.me.selectCard(LepinepaulinesInvestmentInEnergyMechanism);
  expect(c.state.players[0].dice).toIncludeSameMembers([
    DiceType.Omni,
    DiceType.Omni,
  ]);
});

test("LepinePauline: energy mechanism investment removes lower element order when tied", async () => {
  // 规则集：乐平波琳的能量机关投资：移除1个元素骰……注：遵循移除序
  // 移除序：数量相同时按「冰水火雷岩草风」→ [火,冰] 中移除冰
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <DiceCount my dice={[DiceType.Pyro, DiceType.Cryo]} />
      <Card my def={LepinePauline} />
    </State>,
  );
  await c.me.card(LepinePauline);
  await c.me.selectCard(LepinepaulinesInvestmentInEnergyMechanism);
  expect(c.state.players[0].dice).toIncludeSameMembers([DiceType.Pyro]);
});

test("EnergyMechanismInvestmentGrandPlan: progress 1 generates 1 random die and disposes", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到1->获得1个随机元素骰，弃置此牌
  // 断言：投掷阶段 8 个万能骰之外多出 1 个基础元素骰
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={EnergyMechanismInvestmentGrandPlan} />
    </State>,
  );
  await nextRound(c);
  const dice = c.state.players[0].dice;
  expect(dice).toBeArrayOfSize(9);
  const generated = dice.filter((d) => d !== DiceType.Omni);
  expect(generated).toBeArrayOfSize(1);
  expect(BASIC_ELEMENTS).toIncludeAllMembers(generated);
  c.expect($.my.support.def(EnergyMechanismInvestmentGrandPlan)).toNotExist();
});

test("EnergyMechanismInvestmentMegaPlan: generates 2 random dice only when progress reaches 2", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到2->获得2个随机元素骰，弃置此牌
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={EnergyMechanismInvestmentMegaPlan} />
    </State>,
  );
  await nextRound(c);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect($.my.support.def(EnergyMechanismInvestmentMegaPlan)).toHaveVariable({
    progress: 1,
  });
  await nextRound(c);
  const dice = c.state.players[0].dice;
  expect(dice).toBeArrayOfSize(10);
  const generated = dice.filter((d) => d !== DiceType.Omni);
  expect(generated).toBeArrayOfSize(2);
  expect(BASIC_ELEMENTS).toIncludeAllMembers(generated);
  c.expect($.my.support.def(EnergyMechanismInvestmentMegaPlan)).toNotExist();
});

test("EnergyMechanismInvestmentSuperMegaPlan: generates 3 random dice only when progress reaches 3", async () => {
  // 规则集：行动阶段开始时：累积1点【进度】。然后若达到3->获得3个随机元素骰，弃置此牌
  const c = setup(
    <State random={SEED}>
      <Character opp active />
      <Character my active />
      <Support my def={EnergyMechanismInvestmentSuperMegaPlan} />
    </State>,
  );
  await nextRound(c);
  await nextRound(c);
  expect(c.state.players[0].dice).toBeArrayOfSize(8);
  c.expect(
    $.my.support.def(EnergyMechanismInvestmentSuperMegaPlan),
  ).toHaveVariable({ progress: 2 });
  await nextRound(c);
  const dice = c.state.players[0].dice;
  expect(dice).toBeArrayOfSize(11);
  const generated = dice.filter((d) => d !== DiceType.Omni);
  expect(generated).toBeArrayOfSize(3);
  expect(BASIC_ELEMENTS).toIncludeAllMembers(generated);
  c.expect(
    $.my.support.def(EnergyMechanismInvestmentSuperMegaPlan),
  ).toNotExist();
});
