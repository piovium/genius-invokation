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
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { AThousandFloatingDreams } from "@gi-tcg/data/internal/cards/equipment/weapon/catalyst.gts";
import { RainbowMacaronsInEffect } from "@gi-tcg/data/internal/cards/event/food.gts";
import { ElementalResonanceWovenWinds } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  SkywardSonnet,
  Stormzone,
  Venti,
} from "@gi-tcg/data/internal/characters/anemo/venti.gts";
import {
  FrostflakeArrow,
  Ganyu,
  IceLotus,
  LiutianArchery,
} from "@gi-tcg/data/internal/characters/cryo/ganyu.gts";
import {
  BurstScan,
  Kaveh,
} from "@gi-tcg/data/internal/characters/dendro/kaveh.gts";
import {
  AbyssLectorVioletLightning,
  ChainLightningCascade,
  ChainLightningCascadeCombatStatus,
  ElectricRebirth,
} from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning.gts";
import {
  ElectroCrystalCore,
  ElectroHypostasis,
} from "@gi-tcg/data/internal/characters/electro/electro_hypostasis.gts";
import {
  BoltsOfDownfall,
  Fischl,
  Nightrider,
} from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { ThunderManifestation } from "@gi-tcg/data/internal/characters/electro/thunder_manifestation.gts";
import {
  SpiritfoxSineater,
  YaeMiko,
} from "@gi-tcg/data/internal/characters/electro/yae_miko.gts";
import { JadeScreenStatus } from "@gi-tcg/data/internal/characters/geo/ningguang.gts";
import { FullPlate, Noelle } from "@gi-tcg/data/internal/characters/geo/noelle.gts";
import {
  MovoLawa,
  StonehideLawachurl,
} from "@gi-tcg/data/internal/characters/geo/stonehide_lawachurl.gts";
import {
  Barbara,
  ShiningMiracle,
} from "@gi-tcg/data/internal/characters/hydro/barbara.gts";
import {
  IllusoryBubble,
  Mona,
  RippleOfFate,
} from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import {
  CuttingTorrent,
  MeleeStance,
  Riptide,
  Tartaglia,
} from "@gi-tcg/data/internal/characters/hydro/tartaglia.gts";
import {
  AbyssLectorFathomlessFlames,
  FieryRebirthStatus,
} from "@gi-tcg/data/internal/characters/pyro/abyss_lector_fathomless_flames.gts";
import { BlooddebtDirective } from "@gi-tcg/data/internal/characters/pyro/arlecchino.gts";
import {
  Chevreuse,
  OverchargedBall,
} from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import {
  BondOfLife,
  Crystallize,
  DendroCore,
} from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// 本文件中用「血偿勒令」（我方角色受到伤害后：受伤角色附属生命之契，可用次数 N）
// 观测【受到伤害后】的生成顺序：只有最先生成的 N 名受伤者会获得生命之契。

test("damage queue: Frostflake Arrow resolves other characters before the target", async () => {
  // 规则集：如果因技能效果（霜华矢）对多名角色造成伤害，会按照其他角色-目标角色的顺序，放入伤害队列
  // 断言：血偿勒令仅剩 1 次，附属给最先受伤的后台角色，而不是目标（出战角色）
  const oppActive = ref();
  const oppNext = ref();
  const oppLast = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10} />
      <Character opp ref={oppNext} health={10} />
      <Character opp ref={oppLast} health={10} />
      <CombatStatus opp def={BlooddebtDirective} usage={1} />
      <Character my active def={Ganyu} />
    </State>,
  );
  await c.me.skill(FrostflakeArrow);
  c.expect(oppActive).toHaveVariable({ health: 8 });
  c.expect(oppNext).toHaveVariable({ health: 8 });
  c.expect(oppLast).toHaveVariable({ health: 8 });
  c.expect($.opp.character.has($.typeStatus.def(BondOfLife))).toBe(oppNext);
});

test("damage queue: Riptide piercing resolves the next character before the target", async () => {
  // 规则集：如果因其他效果（断流）对多名角色造成伤害，会按照其他角色-目标角色的顺序，放入伤害队列
  // 断言：近战状态对断流目标的穿透先结算，血偿勒令的唯一一次附属给下一个角色
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={10}>
        <Status def={Riptide} />
      </Character>
      <Character opp ref={oppNext} health={10} />
      <CombatStatus opp def={BlooddebtDirective} usage={1} />
      <Character my active def={Tartaglia}>
        <Status def={MeleeStance} />
      </Character>
    </State>,
  );
  await c.me.skill(CuttingTorrent);
  // 近战状态：物理转水，对断流目标 +1 → 3；对下一个角色 1 点穿透
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect(oppNext).toHaveVariable({ health: 9 });
  c.expect($.opp.character.has($.typeStatus.def(BondOfLife))).toBe(oppNext);
});

test("damage calc: elemental infusion is determined before reaction bonus", async () => {
  // 规则集：确定伤害元素属性：元素附魔 → 造成伤害时（加）：元素反应
  // 断言：近战状态把物理转为水，随后才按蒸发 +2：2 + 2 = 4
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Pyro} />
      <Character my active def={Tartaglia}>
        <Status def={MeleeStance} />
      </Character>
    </State>,
  );
  await c.me.skill(CuttingTorrent);
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.None });
});

test("damage calc: additions (reaction, A Thousand Floating Dreams) apply before Illusory Bubble multiplier", async () => {
  // 规则集：造成伤害时（加）：元素反应、千叶浮梦等 → 造成伤害时（乘）：泡影(倍率+2)
  // 断言：(1 + 蒸发 2 + 千夜浮梦 1 + 千夜浮梦反应 1) × 2 = 10
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} def={Noelle} health={12} aura={Aura.Pyro} />
      <Character my active def={Mona}>
        <Equipment def={AThousandFloatingDreams} />
      </Character>
      <CombatStatus my def={IllusoryBubble} />
    </State>,
  );
  await c.me.skill(RippleOfFate);
  c.expect(target).toHaveVariable({ health: 2 });
  c.expect($.my.combatStatus.def(IllusoryBubble)).toNotExist();
});

test("damage calc: multiply, then Full Plate halving, then shield reduction", async () => {
  // 规则集：造成伤害时（乘）→ 受到伤害时（除）：护体岩铠 → 受到伤害时（减）：护盾
  // 断言：3 物理 × 2 = 6 → 减半 3 → 护盾 2 抵消 → 1
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} />
      <CombatStatus opp def={FullPlate} />
      <Character my active def={StonehideLawachurl} />
      <CombatStatus my def={IllusoryBubble} />
    </State>,
  );
  await c.me.skill(MovoLawa);
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.opp.combatStatus.def(FullPlate)).toNotExist();
});

test("damage calc: Full Plate halving happens before Jade Screen checks its threshold", async () => {
  // 规则集：受到伤害时（除）：护体岩铠 → 受到伤害时（减）：护盾、璇玑屏等
  // 断言：2 物理减半为 1，璇玑屏（至少 2 点伤害）不触发，护盾抵消剩余 1 点
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} />
      <CombatStatus opp def={FullPlate} />
      <CombatStatus opp def={JadeScreenStatus} usage={2} />
      <Character my active def={Ganyu} />
    </State>,
  );
  await c.me.skill(LiutianArchery);
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.opp.combatStatus.def(JadeScreenStatus)).toHaveVariable({ usage: 2 });
  c.expect($.opp.combatStatus.def(FullPlate)).toHaveVariable({ shield: 1 });
});

test("damage calc: reduction stops once damage reaches 0", async () => {
  // 规则集：当伤害值在减少过程中减至0的场合，终止受到伤害时
  // 断言：结晶护盾先把 1 点伤害减为 0，之后的冰莲不再触发（可用次数不变）
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} />
      <CombatStatus opp def={Crystallize} />
      <CombatStatus opp def={IceLotus} usage={2} />
      <Character my active def={Mona} />
    </State>,
  );
  await c.me.skill(RippleOfFate);
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.opp.combatStatus.def(Crystallize)).toNotExist();
  c.expect($.opp.combatStatus.def(IceLotus)).toHaveVariable({ usage: 2 });
});

test("damage calc: 0 damage can still be increased", async () => {
  // 规则集：（0点伤害也能增加伤害）
  // 断言：迸发扫描舍弃 0 费牌造成 0 点草伤，绽放反应 +1 后仍造成 1 点伤害
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Hydro} />
      <Character my active def={Kaveh} />
      <CombatStatus my def={BurstScan} usage={1} />
      <CombatStatus my def={DendroCore} />
      <Card my pile def={ElementalResonanceWovenWinds} />
    </State>,
  );
  // 双方选择行动前触发迸发扫描
  await c.stepToNextAction();
  c.expect(target).toHaveVariable({ health: 9, aura: Aura.None });
});

test("swirl: target first, then other characters in character order (same damage queue)", async () => {
  // 规则集：元素反应（扩散）对其他角色的效果：依次按【角色顺序】对伤害目标外的角色执行伤害结算(以相同的伤害队列）
  // 断言：受伤队列为 目标 → 下一个角色 → 再下一个角色；血偿勒令 2 次只覆盖前两者
  const oppPrev = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp ref={oppPrev} health={10} />
      <Character opp active ref={oppActive} health={10} aura={Aura.Hydro} />
      <Character opp ref={oppNext} health={10} />
      <CombatStatus opp def={BlooddebtDirective} usage={2} />
      <Character my active def={Venti} />
    </State>,
  );
  await c.me.skill(SkywardSonnet);
  c.expect(oppActive).toHaveVariable({ health: 8, aura: Aura.None });
  c.expect(oppNext).toHaveVariable({ health: 9, aura: Aura.Hydro });
  c.expect(oppPrev).toHaveVariable({ health: 9, aura: Aura.Hydro });
  c.expect($.opp.typeStatus.def(BondOfLife).at($.id(oppActive.id))).toBeExist();
  c.expect($.opp.typeStatus.def(BondOfLife).at($.id(oppNext.id))).toBeExist();
  c.expect($.opp.typeStatus.def(BondOfLife).at($.id(oppPrev.id))).toNotExist();
});

test("electro-charged: target first, then other characters in character order (same damage queue)", async () => {
  // 规则集：元素反应（感电）对其他角色的效果：依次按【角色顺序】对伤害目标外的角色执行伤害结算(以相同的伤害队列）
  // 断言：受伤队列为 目标 → 下一个角色 → 再下一个角色；血偿勒令 2 次只覆盖前两者
  const oppPrev = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp ref={oppPrev} health={10} />
      <Character opp active ref={oppActive} health={10} aura={Aura.Hydro} />
      <Character opp ref={oppNext} health={10} />
      <CombatStatus opp def={BlooddebtDirective} usage={2} />
      <Character my active def={Fischl} />
    </State>,
  );
  await c.me.skill(Nightrider);
  c.expect(oppActive).toHaveVariable({ health: 8, aura: Aura.None });
  c.expect(oppNext).toHaveVariable({ health: 9 });
  c.expect(oppPrev).toHaveVariable({ health: 9 });
  c.expect($.opp.typeStatus.def(BondOfLife).at($.id(oppActive.id))).toBeExist();
  c.expect($.opp.typeStatus.def(BondOfLife).at($.id(oppNext.id))).toBeExist();
  c.expect($.opp.typeStatus.def(BondOfLife).at($.id(oppPrev.id))).toNotExist();
});

test.fails("damaged order: defeated characters generate 'after damaged' before surviving ones", async () => {
  // 规则集：重排：按以下顺序对每名受伤者生成【受到伤害后】：已击倒>未击倒；当前引擎：先处理未致命伤害事件再处理致命伤害事件（safeDamageEvents → criticalDamageEvents），存活的后台角色先触发血偿勒令并获得生命之契
  // 断言：血偿勒令唯一一次被已击倒的出战角色消耗（已倒下不附属），存活的后台角色不再获得
  const oppActive = ref();
  const oppNext = ref();
  const oppLast = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppActive} health={2} />
      <Character opp ref={oppNext} health={10} />
      <Character opp ref={oppLast} health={10} />
      <CombatStatus opp def={BlooddebtDirective} usage={1} />
      <Character my active def={Ganyu} />
    </State>,
  );
  await c.me.skill(FrostflakeArrow);
  await c.opp.chooseActive(oppNext);
  c.expect(oppActive).toHaveVariable({ alive: 0, health: 0 });
  c.expect($.opp.combatStatus.def(BlooddebtDirective)).toNotExist();
  c.expect($.opp.typeStatus.def(BondOfLife)).toNotExist();
});

test("damaged order: 'after damaged' abilities resolve after the damaging effect finishes", async () => {
  // 规则集：受到伤害后的能力，将在造成此伤害的效果结算完毕后，按【受伤队列】触发执行（温迪获得1点充能 → 高天之歌结算完毕 → 结算受到伤害后）
  // 断言：温迪先因使用技能获得 1 点充能，之后紫电被击倒的效果才夺取 1 点充能 → 0
  const venti = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character opp active def={AbyssLectorVioletLightning} health={2} />
      <Character opp ref={oppNext} />
      <CombatStatus opp def={ChainLightningCascadeCombatStatus} />
      <Character my active def={Venti} ref={venti} energy={0} />
    </State>,
  );
  await c.me.skill(SkywardSonnet);
  await c.opp.chooseActive(oppNext);
  c.expect(venti).toHaveVariable({ energy: 0 });
  c.expect($.opp.combatStatus.def(ChainLightningCascadeCombatStatus)).toNotExist();
});

test("defeated: energy reset, aura and statuses removed, health floors at 0, no longer healed", async () => {
  // 规则集：目标生命值变化，扣减等量伤害值。生命值最小为0；将角色标记为已击倒：充能值置为0、移除元素附着、不会受到伤害或治疗、移除角色状态
  const chev = ref();
  const barbara = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Chevreuse} ref={chev} health={1} energy={2} aura={Aura.Pyro}>
        <Status def={RainbowMacaronsInEffect} usage={3} />
      </Character>
      <Character my def={Barbara} ref={barbara} health={5} energy={3} />
      <Character opp active def={Fischl} health={10} />
    </State>,
  );
  // 2 点物理伤害击倒 1 血的谢瓦莱
  await c.opp.skill(BoltsOfDownfall);
  await c.me.chooseActive(barbara);
  c.expect(chev).toHaveVariable({ alive: 0, health: 0, energy: 0, aura: Aura.None });
  expect(c.state.players[0].characters[0].entities).toBeArrayOfSize(0);
  // 闪耀奇迹治疗所有我方角色 4 点：已击倒者不受治疗
  await c.me.skill(ShiningMiracle);
  c.expect(barbara).toHaveVariable({ health: 9 });
  c.expect(chev).toHaveVariable({ health: 0, alive: 0 });
});

test("defeated: passive skills leave the field", async () => {
  // 规则集：将角色标记为已击倒：角色被动技能离场
  // 断言：谢瓦莱在场时敌方受到超载后生成超量装药弹头；被穿透击倒后下回合再次超载不再生成
  const chev = ref();
  const ganyu = ref();
  const c = setup(
    <State>
      <Character my active def={YaeMiko} />
      <Character my def={Chevreuse} ref={chev} health={1} />
      <Character opp active health={10} aura={Aura.Pyro} />
      <Character opp def={Ganyu} ref={ganyu} health={10} aura={Aura.Pyro} />
    </State>,
  );
  // 1 点雷伤 → 超载，被动生成 1 张弹头，敌方被切换到甘雨
  await c.me.skill(SpiritfoxSineater);
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
  // 霜华矢穿透击倒后台 1 血的谢瓦莱
  await c.opp.skill(FrostflakeArrow);
  c.expect(chev).toHaveVariable({ alive: 0 });
  await c.me.end();
  await c.opp.end();
  // 下回合再次超载：被动已离场，不再生成弹头
  await c.me.skill(SpiritfoxSineater);
  c.expect(ganyu).toHaveVariable({ health: 7, aura: Aura.None });
  c.expect($.my.hand.def(OverchargedBall)).toBeCount(1);
});

test("example: Venti Skyward Sonnet vs Thunder Manifestation / Abyss Lector / Electro Hypostasis", async () => {
  // 规则集：对方雷音权现附着雷元素，生命值均为3的深渊咏者·渊火和无相之雷附着水元素，温迪对雷音权现使用【高天之歌】……
  //   先对雷音权现造成2点风伤 → 扩散对渊火和无相之雷造成2点雷伤（扩散 1 + 感电 1）→ 渊火感电穿透雷音权现和无相之雷（无相之雷加入击倒队列）
  //   → 无相之雷感电穿透雷音权现和渊火 → 生成风域 → 发动免于击倒 → 温迪获得 1 点充能
  // 注：原文「对温迪造成穿透」应为雷音权现（感电只穿透同阵营其他角色）
  const tm = ref();
  const lector = ref();
  const hypo = ref();
  const venti = ref();
  const c = setup(
    <State>
      <Character opp active def={ThunderManifestation} ref={tm} health={10} aura={Aura.Electro} />
      <Character opp def={AbyssLectorFathomlessFlames} ref={lector} health={3} aura={Aura.Hydro}>
        <Status def={FieryRebirthStatus} />
      </Character>
      <Character opp def={ElectroHypostasis} ref={hypo} health={3} aura={Aura.Hydro}>
        <Status def={ElectroCrystalCore} />
      </Character>
      <Character my active def={Venti} ref={venti} energy={0} />
    </State>,
  );
  await c.me.skill(SkywardSonnet);
  // 雷音权现：2 风 → 8，两次感电穿透各 1 → 6
  c.expect(tm).toHaveVariable({ health: 6, aura: Aura.None, alive: 1 });
  // 渊火：扩散雷 2（感电）→ 1，无相之雷感电穿透 1 → 0 → 火之新生免于击倒，治疗至 4
  c.expect(lector).toHaveVariable({ health: 4, aura: Aura.None, alive: 1 });
  c.expect($.opp.typeStatus.def(FieryRebirthStatus)).toNotExist();
  // 无相之雷：扩散雷 2（感电）→ 1，渊火感电穿透 1 → 0 → 雷晶核心免于击倒，治疗至 1
  c.expect(hypo).toHaveVariable({ health: 1, aura: Aura.None, alive: 1 });
  c.expect($.opp.typeStatus.def(ElectroCrystalCore)).toNotExist();
  c.expect($.my.combatStatus.def(Stormzone)).toBeExist();
  c.expect(venti).toHaveVariable({ energy: 1 });
});

test("example: immune-to-defeat effects resolve before the skill user gains energy", async () => {
  // 规则集：检测并发动【免于击倒】效果 → 温迪获得1点充能 → 【高天之歌】结算完毕
  // 断言：雷之新生（附侵雷重闪）在免于击倒时使温迪失去 1 点充能，此时温迪尚未获得技能充能（0 → 0），随后才获得 1 点 → 1
  const venti = ref();
  const lector = ref();
  const c = setup(
    <State>
      <Character opp active def={AbyssLectorVioletLightning} ref={lector} health={2}>
        <Status def={ElectricRebirth} />
        <Equipment def={ChainLightningCascade} />
      </Character>
      <Character my active def={Venti} ref={venti} energy={0} />
    </State>,
  );
  await c.me.skill(SkywardSonnet);
  c.expect(lector).toHaveVariable({ health: 4, alive: 1 });
  c.expect($.opp.typeEquipment.def(ChainLightningCascade)).toNotExist();
  c.expect(venti).toHaveVariable({ energy: 1 });
});
