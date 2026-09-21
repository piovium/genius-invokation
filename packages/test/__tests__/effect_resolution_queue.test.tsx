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

import { ref, setup, Card, Character, CombatStatus, Equipment, State, Status, Support, $ } from "#test";
import {
  GamblersEarrings,
  HeartOfKhvarenasBrilliance,
  ShimenawasReminiscence,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { SnareHook } from "@gi-tcg/data/internal/cards/equipment/weapon/bow.gts";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import { RainbowMacaronsInEffect } from "@gi-tcg/data/internal/cards/event/food.gts";
import { Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { AquabreezeBlessingWaterburst } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import { TheMausoleumOfKingDeshret } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  AstableAnemohypostasisCreation6308,
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  FlowingEddies,
  Freminet,
  SubnauticalHunterMode,
  SubnauticalShield,
} from "@gi-tcg/data/internal/characters/cryo/freminet.gts";
import { Icicle, Kaeya } from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import { Baizhu } from "@gi-tcg/data/internal/characters/dendro/baizhu.gts";
import {
  AbyssLectorVioletLightning,
  ChainLightningCascadeCombatStatus,
} from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning.gts";
import {
  ElectroCrystalCore,
  ElectroHypostasis,
} from "@gi-tcg/data/internal/characters/electro/electro_hypostasis.gts";
import { Fischl, Nightrider } from "@gi-tcg/data/internal/characters/electro/fischl.gts";
import { FavonianFavor } from "@gi-tcg/data/internal/characters/hydro/dahlia.gts";
import {
  AbyssLectorFathomlessFlames,
  AegisOfAbyssalFlame,
  EmbersRekindled,
  FieryRebirthStatus,
} from "@gi-tcg/data/internal/characters/pyro/abyss_lector_fathomless_flames.gts";
import {
  OverchargedBall,
  SecondaryExplosiveShells,
  VerticalForceCoordination,
} from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import { SpiritOfOmenPyroScorpion } from "@gi-tcg/data/internal/characters/pyro/eremite_scorching_loremaster.gts";
import { BestialAscent, Gaming, SuanniManChai } from "@gi-tcg/data/internal/characters/pyro/gaming.gts";
import { SweepingFervor, Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { Shield } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("EmbersRekindled: fires on the 'triggered this effect' timing of FieryRebirth", async () => {
  // 规则集：生成【触发此效果时】（如：烬火重燃）
  // 扩散火将后台渊火击至 0，效果结束时火之新生触发，烬火重燃随之立刻生效（弃置天赋、附属渊火加护）；
  // 之后结算【切换角色后】（二重毁伤弹对切换到的渊火造成 1 火伤）时护盾已存在
  const oppActive = ref();
  const lector = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Pyro} ref={oppActive} />
      <Character opp />
      <Character opp def={AbyssLectorFathomlessFlames} health={1} ref={lector}>
        <Status def={FieryRebirthStatus} />
        <Equipment def={EmbersRekindled} />
      </Character>
      <CombatStatus opp def={SecondaryExplosiveShells} usage={2} />
      <Character my active def={Sucrose} />
    </State>,
  );
  await c.me.skill(AstableAnemohypostasisCreation6308);
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect($.opp.active).toBe(lector);
  c.expect(lector).toHaveVariable({ health: 4, alive: 1 });
  c.expect($.opp.typeEquipment.def(EmbersRekindled)).toNotExist();
  c.expect($.opp.typeStatus.def(FieryRebirthStatus)).toNotExist();
  // 二重毁伤弹的 1 点火伤已被渊火加护（2 点）抵消
  c.expect($.opp.typeStatus.def(AegisOfAbyssalFlame)).toHaveVariable({ shield: 1 });
});

test("instant timing executes at once; the delayed timing it triggers joins the effect's queue", async () => {
  // 规则集：操作触发的【瞬发时机】会直接生效（执行其操作），其操作触发的【延迟时机】不会立刻结算，而是按触发顺序加入原效果的【时机队列】
  // 猊兽·文仔在「造成伤害时」立刻对嘉明造成 1 点穿透；嘉明「受到伤害后」（灵光明烁之心抓牌）在技能内切人之后才结算，
  // 此时嘉明已不是出战角色，因此不抓牌
  const oppActive = ref();
  const gaming = ref();
  const manchai = ref();
  const myNext = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={oppActive} />
      <Character my active def={Gaming} health={10} ref={gaming}>
        <Status def={SuanniManChai} usage={2} ref={manchai} />
        <Equipment def={HeartOfKhvarenasBrilliance} />
      </Character>
      <Character my ref={myNext} />
      <Card my pile notInitial def={Paimon} />
    </State>,
  );
  await c.me.skill(BestialAscent);
  // 1 火伤 + 文仔 +1
  c.expect(oppActive).toHaveVariable({ health: 8 });
  // 瞬发时机内的穿透已生效，且生命≥5 时不消耗可用次数
  c.expect(gaming).toHaveVariable({ health: 9 });
  c.expect(manchai).toHaveVariable({ usage: 2 });
  c.expect($.my.active).toBe(myNext);
  // 受到伤害后在切人之后结算：嘉明不在出战位，不抓牌
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
  expect(c.state.players[0].pile).toBeArrayOfSize(1);
});

test("energy: not yet gained while the skill's damage is being dealt", async () => {
  // 规则集：效果结束时②：若该效果为非元素爆发技能，角色获得充能
  // 追忆之注连在「造成伤害时」检查充能≥2；充能在效果结束时才获得，因此本次伤害不 +1
  const oppActive = ref();
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={oppActive} />
      <Character my active def={Sucrose} energy={1} ref={sucrose}>
        <Equipment def={ShimenawasReminiscence} />
      </Character>
    </State>,
  );
  await c.me.skill(AstableAnemohypostasisCreation6308);
  c.expect(oppActive).toHaveVariable({ health: 7 });
  c.expect(sucrose).toHaveVariable({ energy: 2 });
});

test("energy: already gained when the queued (delayed) timings resolve", async () => {
  // 规则集：效果结束时②：若该效果为非元素爆发技能，角色获得充能（在按顺序结算【时机队列】之前）
  // 陷阱钩「引发反应后」检查充能是否未满；结算队列时菲谢尔已获得充能（3/3），因此不消耗「轻捷」
  const oppActive = ref();
  const fischl = ref();
  const hook = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Cryo} ref={oppActive} />
      <Character my active def={Fischl} energy={2} ref={fischl}>
        <Equipment def={SnareHook} v={{ agile: 1 }} ref={hook} />
      </Character>
    </State>,
  );
  await c.me.skill(Nightrider);
  // 1 雷伤 + 超导 1
  c.expect(oppActive).toHaveVariable({ health: 8 });
  c.expect(fischl).toHaveVariable({ energy: 3 });
  c.expect(hook).toHaveVariable({ agile: 2 });
});

test("game ends at effect end: queued timings are not resolved afterwards", async () => {
  // 规则集：胜负结算检测：若一方所有角色生命值为0，判负，结束游戏。
  // 击倒对方最后一名角色后游戏立即结束，队列中的「敌方角色被击倒后」（赌徒的耳环）不再结算
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp health={0} alive={0} />
      <Character opp health={0} alive={0} />
      <Character my active def={Sucrose} energy={0}>
        <Equipment def={GamblersEarrings} />
      </Character>
    </State>,
  );
  await c.me.skill(WindSpiritCreation);
  expect(c.state.phase).toBe("gameEnd");
  expect(c.state.winner).toBe(0);
  // 8 - 3（普攻费用），赌徒的耳环未生成 2 个万能骰
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
});

test.fails("energy is gained before the game-end check", async () => {
  // 规则集：效果结束时②：若该效果为非元素爆发技能，角色获得充能 → 胜负结算检测：若一方所有角色生命值为0，判负，结束游戏。
  // 当前引擎：胜负判定在技能操作内完成（skill_context.ts preprocessEvent 置 gameEnd），
  // finalizeSkill 随后 `if (this.ended()) return;` 先于「增加充能」块，角色不再获得充能
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active health={1} />
      <Character opp health={0} alive={0} />
      <Character opp health={0} alive={0} />
      <Character my active def={Sucrose} energy={0} ref={sucrose} />
    </State>,
  );
  await c.me.skill(WindSpiritCreation);
  expect(c.state.phase).toBe("gameEnd");
  c.expect(sucrose).toHaveVariable({ energy: 1 });
});

test("hand-inserted timing is removed when the card has already left the hand", async () => {
  // 规则集：时机移除：对于【进入手牌后】，若被移动卡牌已不在手牌区，移除此时机
  // 便携动力锯在造成伤害时抓 1 张牌，随后热情拂扫在同一效果内舍弃该牌；对方赤王陵不计入抓牌
  const mausoleum = ref();
  const c = setup(
    <State>
      <Support opp def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Character my active def={Xinyan}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 1 }} />
      </Character>
      <Card my pile notInitial def={Paimon} />
    </State>,
  );
  await c.me.skill(SweepingFervor);
  // 牌确实被抓出（牌库空），随后被舍弃（手牌空）
  expect(c.state.players[0].pile).toBeArrayOfSize(0);
  expect(c.state.players[0].hands).toBeArrayOfSize(0);
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 0 });
});

test("hand overflow (爆牌) still counts as a draw: the timing is not removed", async () => {
  // 规则集：时机移除：对于【进入手牌后】，若被移动卡牌已不在手牌区，移除此时机
  // 但「抓1张牌后 等价于 一个实体移动后，若（方式为抓牌且实体在你的手牌）或（方式为爆牌）」，
  // 因超过手牌上限而被舍弃的抓牌（爆牌）仍触发【抓牌后】
  const mausoleum = ref();
  const c = setup(
    <State>
      <Support opp def={TheMausoleumOfKingDeshret} ref={mausoleum} />
      <Character my active def={Sucrose} />
      <Card my def={Strategize} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
      <Card my pile notInitial def={Paimon} />
      <Card my pile notInitial def={Paimon} />
    </State>,
  );
  // 打出后手牌 9 张，抓 2 张：第 1 张进入手牌（10 张），第 2 张因超过上限被舍弃（爆牌），对方赤王陵仍计 2 张
  await c.me.card(Strategize);
  expect(c.state.players[0].hands).toBeArrayOfSize(10);
  c.expect(mausoleum).toHaveVariable({ drawnCardCount: 2 });
});

test("other timings resolve before damaged-after: hand order shows the order", async () => {
  // 规则集：（受到伤害后，进入手牌后）以外的时机 > 进入手牌后 > 未击倒角色受到伤害后>已击倒角色被击倒后
  // 对方【切换角色后】（寒冰之棱打到砂糖 → 灵光明烁之心抓派蒙）先于对方角色【受到伤害后】（纵阵武力统筹生成超量装药弹头）
  const oppActive = ref();
  const oppElectro = ref();
  const oppLast = ref();
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Pyro} ref={oppActive} />
      <Character opp health={10} aura={Aura.Electro} ref={oppElectro} />
      <Character opp health={10} ref={oppLast} />
      <CombatStatus opp def={Icicle} />
      <Character my active def={Sucrose} ref={sucrose}>
        <Status def={VerticalForceCoordination} />
        <Equipment def={HeartOfKhvarenasBrilliance} />
      </Character>
      <Card my pile notInitial def={Paimon} />
    </State>,
  );
  await c.me.skill(AstableAnemohypostasisCreation6308);
  // 扩散火：后台雷附着角色超载 1+2
  c.expect(oppElectro).toHaveVariable({ health: 7 });
  c.expect($.opp.active).toBe(oppLast);
  // 寒冰之棱已结算
  c.expect(sucrose).toHaveVariable({ health: 8, aura: Aura.Cryo });
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([Paimon, OverchargedBall]);
});

test("hand-inserted timing resolves before damaged-after: shield is up when the counter-damage lands", async () => {
  // 规则集：（受到伤害后，进入手牌后）以外的时机 > 进入手牌后 > 未击倒角色受到伤害后
  // 便携动力锯在造成伤害时抓 1 张牌，【抓牌后】潜猎模式（已累积 2 张）生成 1 点潜猎护盾；
  // 之后才结算对方【受到伤害后】：马卡龙治疗 → 水风祝佑对菲米尼造成 2 风伤，被护盾抵消 1 点
  const oppActive = ref();
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active health={10} ref={oppActive}>
        <Status def={RainbowMacaronsInEffect} usage={3} />
      </Character>
      <Support opp def={AquabreezeBlessingWaterburst} />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={SubnauticalHunterMode} v={{ drawnCard: 2 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 1, usagePerRound: 0 }} />
      </Character>
      <Card my pile notInitial def={Paimon} />
    </State>,
  );
  await c.me.skill(FlowingEddies);
  // 2 物理 + 坚忍标记 1，之后马卡龙治疗 1
  c.expect(oppActive).toHaveVariable({ health: 8 });
  // 护盾生成于水风祝佑伤害之前：10 - (2 - 1)，护盾耗尽
  c.expect(freminet).toHaveVariable({ health: 9 });
  c.expect($.my.typeStatus.def(SubnauticalShield)).toNotExist();
});

test("damaged-after of surviving characters resolves before defeated-after of defeated ones", async () => {
  // 规则集：未击倒角色受到伤害后>已击倒角色被击倒后
  // 白术【受到伤害后】→ 马卡龙治疗 → 对方水风祝佑对砂糖造成 2 风伤，此时砂糖仍有 1 点充能，厄灵·炎之魔蝎消耗充能抵消 1 点；
  // 之后才结算紫电【被击倒后】（侵雷重闪出战状态夺取砂糖充能）。若顺序相反，砂糖将受到 2 点伤害
  const violet = ref();
  const baizhu = ref();
  const kaeya = ref();
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active def={AbyssLectorVioletLightning} health={3} aura={Aura.Cryo} ref={violet} />
      <Character opp def={Baizhu} ref={baizhu}>
        <Status def={RainbowMacaronsInEffect} usage={3} />
      </Character>
      <Character opp def={Kaeya} ref={kaeya} />
      <CombatStatus opp def={ChainLightningCascadeCombatStatus} />
      <Support opp def={AquabreezeBlessingWaterburst} />
      <Character my active def={Sucrose} energy={0} ref={sucrose}>
        <Equipment def={SpiritOfOmenPyroScorpion} />
      </Character>
    </State>,
  );
  await c.me.skill(AstableAnemohypostasisCreation6308);
  c.expect(violet).toHaveVariable({ alive: 0 });
  c.expect(baizhu).toHaveVariable({ health: 11 });
  c.expect(kaeya).toHaveVariable({ health: 9 });
  c.expect($.opp.active).toBe(kaeya);
  c.expect(sucrose).toHaveVariable({ health: 9, energy: 0 });
  c.expect($.opp.combatStatus.def(ChainLightningCascadeCombatStatus)).toNotExist();
});

test("choose new active only after the whole queue has been resolved", async () => {
  // 规则集：若【时机队列】结算过【出战角色被击倒后】，出战角色生命值为0的所有玩家同时【选择新的出战角色】
  // 对方选人时，白术的【受到伤害后】（马卡龙治疗）与砂糖的充能均已结算完毕
  const oppActive = ref();
  const baizhu = ref();
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active health={1} aura={Aura.Cryo} ref={oppActive} />
      <Character opp def={Baizhu} ref={baizhu}>
        <Status def={RainbowMacaronsInEffect} usage={3} />
      </Character>
      <Character opp />
      <Character my active def={Sucrose} energy={0} ref={sucrose} />
    </State>,
  );
  await c.me.skill(WindSpiritCreation);
  c.expect(oppActive).toHaveVariable({ alive: 0 });
  // 扩散冰 1 伤后已被马卡龙治疗
  c.expect(baizhu).toHaveVariable({ health: 11 });
  c.expect(sucrose).toHaveVariable({ energy: 1 });
  await c.opp.chooseActive(baizhu);
  c.expect($.opp.active).toBe(baizhu);
});

test("example: Sucrose E vs Hypostasis/Baizhu/Kaeya with Icicle", async () => {
  // 规则集：结算【切换角色后】，发动【冰凌】 → 结算【无相之雷获得治疗后】 → 依次结算【无相之雷受到伤害后】，【白术受到伤害后】，【凯亚受到伤害后】
  // 寒冰之棱先对砂糖造成 2 冰伤（附着冰），其【造成伤害后】按插入结算原则先结算（西风之眷生成护盾），
  // 之后无相之雷【获得治疗后】触发水风祝佑：2 风伤扩散冰到我方后台，并被护盾抵消 1 点
  const hypostasis = ref();
  const baizhu = ref();
  const kaeya = ref();
  const sucrose = ref();
  const standby1 = ref();
  const standby2 = ref();
  const c = setup(
    <State>
      <Character opp active def={ElectroHypostasis} health={3} aura={Aura.Cryo} ref={hypostasis}>
        <Status def={ElectroCrystalCore} />
      </Character>
      <Character opp def={Baizhu} ref={baizhu} />
      <Character opp def={Kaeya} ref={kaeya} />
      <CombatStatus opp def={Icicle} />
      <Support opp def={AquabreezeBlessingWaterburst} />
      <Character my active def={Sucrose} energy={0} ref={sucrose} />
      <Character my health={10} ref={standby1} />
      <Character my health={10} ref={standby2} />
      <CombatStatus my def={FavonianFavor} usage={2} />
    </State>,
  );
  await c.me.skill(AstableAnemohypostasisCreation6308);
  // 无相之雷免于击倒并治疗至 1；白术、凯亚受到扩散冰伤
  c.expect(hypostasis).toHaveVariable({ health: 1, alive: 1 });
  c.expect($.opp.typeStatus.def(ElectroCrystalCore)).toNotExist();
  c.expect(baizhu).toHaveVariable({ health: 10 });
  c.expect(kaeya).toHaveVariable({ health: 9 });
  c.expect($.opp.active).toBe(kaeya);
  // 砂糖在队列结算前已获得充能
  c.expect(sucrose).toHaveVariable({ energy: 1 });
  // 冰凌 2 冰伤（护盾生成于其后）→ 水风祝佑 2 风伤扩散冰（-1 护盾）→ 10-2-1
  c.expect(sucrose).toHaveVariable({ health: 7, aura: Aura.None });
  c.expect(standby1).toHaveVariable({ health: 9, aura: Aura.Cryo });
  c.expect(standby2).toHaveVariable({ health: 9, aura: Aura.Cryo });
  // 第 1 层护盾已被消耗，第 2 层护盾生成于水风祝佑伤害之后
  c.expect($.my.combatStatus.def(Shield)).toHaveVariable({ shield: 1 });
});
