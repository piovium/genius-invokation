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
  DeclaredEnd,
  Equipment,
  Ref,
  ref,
  setup,
  State,
  Status,
  Summon,
  Support,
} from "#test";
import { BurningFlame, Crystallize } from "@gi-tcg/data/internal/commons.gts";
import {
  AdventurersBandana,
  FlowingRings,
  LuckyDogsSilverCirclet,
  UnmovableMountain,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  AquilaFavonia,
  SacrificialSword,
} from "@gi-tcg/data/internal/cards/equipment/weapon/sword.gts";
import {
  WhenTheCraneReturned,
  WindAndFreedomInEffect,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { ChangTheNinth } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  DistantStorm,
  WangshuInn,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  CatclawShield,
  Diona,
  IcyPaws,
} from "@gi-tcg/data/internal/characters/cryo/diona.gts";
import {
  ColdbloodedStrike,
  Frostgnaw,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  Ganyu,
  SacredCryoPearl,
} from "@gi-tcg/data/internal/characters/cryo/ganyu.gts";
import {
  IncandescentFrostPermeating,
  LaSignora,
  SheerCold,
} from "@gi-tcg/data/internal/characters/cryo/la_signora.gts";
import {
  ChillingPenalty,
  ForcefulFistsOfFrost,
  Wriothesley,
} from "@gi-tcg/data/internal/characters/cryo/wriothesley.gts";
import { PressurizedCollapse } from "@gi-tcg/data/internal/characters/anemo/faruzan.gts";
import {
  Chihayaburu,
  KaedeharaKazuha,
} from "@gi-tcg/data/internal/characters/anemo/kaedehara_kazuha.gts";
import {
  Jahoda,
  PurrloinedTreasureFlask,
} from "@gi-tcg/data/internal/characters/anemo/jahoda.gts";
import {
  RoyalReedArchery,
  Sethos,
} from "@gi-tcg/data/internal/characters/electro/sethos.gts";
import { TheWolfWithin } from "@gi-tcg/data/internal/characters/electro/razor.gts";
import {
  Barbara,
  MelodyLoop,
  WhisperOfWater,
} from "@gi-tcg/data/internal/characters/hydro/barbara.gts";
import {
  FurinaPneuma,
  Revelry,
  SeatsSacredAndSecular,
  SoloistsSolicitation,
  UniversalRevelry,
} from "@gi-tcg/data/internal/characters/hydro/furina.gts";
import {
  MirrorReflectionOfDoom,
  Mona,
  Reflection,
} from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import { OceanicMimicFrog } from "@gi-tcg/data/internal/characters/hydro/rhodeia_of_loch.gts";
import { SparksNSplashStatus } from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import {
  Guoba,
  PyronadoStatus,
} from "@gi-tcg/data/internal/characters/pyro/xiangling.gts";
import {
  AurousBlaze,
  NiwabiFiredance,
  Yoimiya,
} from "@gi-tcg/data/internal/characters/pyro/yoimiya.gts";
import { Aura, createRpcResponse } from "@gi-tcg/typings";
import { expect, test } from "vitest";

// ---------------------------------------------------------------------------
// 当前轮次玩家 > 对方
// ---------------------------------------------------------------------------

test("current-turn player's abilities trigger before opponent's (my turn)", async () => {
  // 规则集：同时机触发式能力结算顺序：当前轮次玩家>对方
  // 我方旋火轮先打 2 点，之后对方风鹰剑才治疗 1 点 → 9；若风鹰剑先发动则满血治疗溢出 → 8
  const oppActive = ref();
  const c = setup(
    <State currentTurn="my">
      <Character my active def={Yoimiya} />
      <CombatStatus my def={PyronadoStatus} />
      <Character opp active def={Kaeya} ref={oppActive} health={10}>
        <Equipment def={AquilaFavonia} />
      </Character>
    </State>,
  );
  await c.me.skill(NiwabiFiredance);
  c.expect(oppActive).toHaveVariable({ health: 9 });
});

test("current-turn player's abilities trigger before opponent's (opp turn)", async () => {
  // 规则集：同时机触发式能力结算顺序：当前轮次玩家>对方
  // 对方回合：对方旋火轮先打 2 点，之后我方风鹰剑才治疗 1 点 → 9（而非以玩家编号为序）
  const myActive = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Yoimiya} />
      <CombatStatus opp def={PyronadoStatus} />
      <Character my active def={Kaeya} ref={myActive} health={10}>
        <Equipment def={AquilaFavonia} />
      </Character>
    </State>,
  );
  await c.opp.skill(NiwabiFiredance);
  c.expect(myActive).toHaveVariable({ health: 9 });
});

// ---------------------------------------------------------------------------
// 同玩家：出战角色区>出战状态区>其他角色区>召唤物区>支援区
// ---------------------------------------------------------------------------

test("active character area triggers before combat status area", async () => {
  // 规则集：同玩家：出战角色区>出战状态区
  // 冷血之剑（装备，满血治疗溢出）先于轰轰火花（出战状态，2 点火伤）→ 8；反之为 10
  const kaeya = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={kaeya} health={10}>
        <Equipment def={ColdbloodedStrike} />
      </Character>
      <CombatStatus my def={SparksNSplashStatus} />
    </State>,
  );
  await c.me.skill(Frostgnaw);
  c.expect(kaeya).toHaveVariable({ health: 8 });
});

test("combat status area triggers before standby character area", async () => {
  // 规则集：同玩家：出战状态区>其他角色区
  // 结束阶段：寒炽弥漫（出战状态）先给当时的出战角色 A 附属严寒，之后后台 B 的风压坍陷才把 B 切换上场
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={a} />
      <Character my def={Barbara} ref={b}>
        <Status def={PressurizedCollapse} />
      </Character>
      <CombatStatus my def={IncandescentFrostPermeating} />
      <Character opp active def={LaSignora} energy={1} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect($.my.active).toBe(b);
  c.expect($.my.character.has($.typeStatus.def(SheerCold))).toBe(a);
});

test("standby character area triggers before summon area", async () => {
  // 规则集：同玩家：其他角色区>召唤物区
  // 结束阶段：后台 B 的风压坍陷先把 B 切换上场，歌声之环随后才对“出战角色”附着水 → 水附着在 B 上
  const a = ref();
  const b = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={a} />
      <Character my def={Barbara} ref={b}>
        <Status def={PressurizedCollapse} />
      </Character>
      <Summon my def={MelodyLoop} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect($.my.active).toBe(b);
  c.expect(b).toHaveVariable({ aura: Aura.Hydro });
  c.expect(a).toHaveVariable({ aura: Aura.None });
});

test("summon area triggers before support area", async () => {
  // 规则集：同玩家：召唤物区>支援区
  // 结束阶段：歌声之环先把后台角色治疗至满血，望舒客栈随后没有受伤的后台角色可治疗 → 可用次数不消耗
  const inn = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character my def={Barbara} health={9} maxHealth={10} />
      <Summon my def={MelodyLoop} />
      <Support my def={WangshuInn} ref={inn} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(inn).toHaveVariable({ usage: 2 });
});

test("standby character area triggers before support area", async () => {
  // 规则集：同玩家：其他角色区>支援区
  // 结束阶段：后台 B 的悠远雷暴先对 B 造成 2 点穿透，望舒客栈随后才有受伤后台角色可治疗 → 可用次数消耗 1
  const inn = ref();
  const b = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character my def={Barbara} ref={b} health={10} maxHealth={10}>
        <Status def={DistantStorm} />
      </Character>
      <Support my def={WangshuInn} ref={inn} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(inn).toHaveVariable({ usage: 1 });
  c.expect(b).toHaveVariable({ health: 10 });
});

// ---------------------------------------------------------------------------
// 同区域：先入场>后入场
// ---------------------------------------------------------------------------

test("same area (combat status): earlier one triggers first - damage then switch", async () => {
  // 规则集：同区域：先入场>后入场
  // 轰轰火花先入场：先对当时的出战角色凯亚造成 2 点伤害，再由风与自由切换到下一个角色
  const kaeya = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={kaeya} health={10} />
      <Character my def={Barbara} ref={next} health={10} />
      <CombatStatus my def={SparksNSplashStatus} />
      <CombatStatus my def={WindAndFreedomInEffect} />
    </State>,
  );
  await c.me.skill(Frostgnaw);
  c.expect($.my.active).toBe(next);
  c.expect(kaeya).toHaveVariable({ health: 8 });
  c.expect(next).toHaveVariable({ health: 10 });
});

test("same area (combat status): earlier one triggers first - switch then damage", async () => {
  // 规则集：同区域：先入场>后入场
  // 风与自由先入场：先切换到下一个角色，轰轰火花随后对新的出战角色造成 2 点伤害
  const kaeya = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={kaeya} health={10} />
      <Character my def={Barbara} ref={next} health={10} />
      <CombatStatus my def={WindAndFreedomInEffect} />
      <CombatStatus my def={SparksNSplashStatus} />
    </State>,
  );
  await c.me.skill(Frostgnaw);
  c.expect($.my.active).toBe(next);
  c.expect(kaeya).toHaveVariable({ health: 10 });
  c.expect(next).toHaveVariable({ health: 8 });
});

test("same area (summon): earlier summon's damage reduction is consumed first", async () => {
  // 规则集：同区域：先入场>后入场
  // 虚影先入场：1 点伤害由虚影抵消，蛙的可用次数不消耗
  const reflection = ref();
  const frog = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Barbara} />
      <Character my active def={Kaeya} />
      <Summon my def={Reflection} ref={reflection} />
      <Summon my def={OceanicMimicFrog} ref={frog} />
    </State>,
  );
  await c.opp.skill(WhisperOfWater);
  c.expect(reflection).toHaveVariable({ usage: 0 });
  c.expect(frog).toHaveVariable({ usage: 1 });
});

test("same area (summon): earlier summon's damage reduction is consumed first (reversed)", async () => {
  // 规则集：同区域：先入场>后入场
  // 蛙先入场：1 点伤害由蛙抵消，虚影的可用次数不消耗
  const reflection = ref();
  const frog = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Barbara} />
      <Character my active def={Kaeya} />
      <Summon my def={OceanicMimicFrog} ref={frog} />
      <Summon my def={Reflection} ref={reflection} />
    </State>,
  );
  await c.opp.skill(WhisperOfWater);
  c.expect(frog).toHaveVariable({ usage: 0 });
  c.expect(reflection).toHaveVariable({ usage: 1 });
});

test("same area (support): earlier support triggers first", async () => {
  // 规则集：同区域：先入场>后入场
  // 两张望舒客栈：先入场者治疗唯一受伤的后台角色并消耗次数，后入场者无目标不消耗
  const inn1 = ref();
  const inn2 = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Character my def={Barbara} health={9} maxHealth={10} />
      <Support my def={WangshuInn} ref={inn1} />
      <Support my def={WangshuInn} ref={inn2} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(inn1).toHaveVariable({ usage: 1 });
  c.expect(inn2).toHaveVariable({ usage: 2 });
});

// ---------------------------------------------------------------------------
// 角色区：角色的被动技能、装备、角色状态
// ---------------------------------------------------------------------------

test("character area: passive skill triggers before equipment", async () => {
  // 规则集：角色区：角色的被动技能、装备、角色状态
  // 芙宁娜被动先生成手牌圣俗杂座，浮溯之珏随后才抓牌 → 手牌顺序 [圣俗杂座, 牌库顶的牌]
  const c = setup(
    <State>
      <Character my active def={FurinaPneuma}>
        <Equipment def={FlowingRings} />
      </Character>
      <Card my pile def={WangshuInn} />
    </State>,
  );
  await c.me.skill(SoloistsSolicitation);
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    SeatsSacredAndSecular,
    WangshuInn,
  ]);
});

test.fails("character area: equipment triggers before character status", async () => {
  // 规则集：角色区：角色的被动技能、装备、角色状态；
  // 当前引擎：角色区内装备与角色状态按入场顺序触发（core/src/base/mutation.ts createEntity 直接 push 到
  // character.entities，utils.ts getAllEntities 按该顺序遍历），不区分装备与状态
  // 寒烈的惩裁先入场，冒险家头带后装备：仍应头带先治疗 1 点（5→6），寒烈的惩裁随后判定生命≥6 → 穿透 1 → 5
  // 引擎按入场顺序：寒烈的惩裁先判定生命≤5 → 治疗 2 → 7，头带再治疗 1 → 8
  const w = ref();
  const c = setup(
    <State>
      <Character my active def={Wriothesley} ref={w} health={5}>
        <Status def={ChillingPenalty} />
      </Character>
      <Card my def={AdventurersBandana} />
    </State>,
  );
  await c.me.card(AdventurersBandana, w);
  await c.me.skill(ForcefulFistsOfFrost);
  c.expect(w).toHaveVariable({ health: 5 });
});

test("character area: passive skill triggers before character status", async () => {
  // 规则集：角色区：角色的被动技能、装备、角色状态
  // 赛索斯普攻 2 点物理后（对方出战 6→4）：被动黑鸢的密喻先发动，对当时生命最低的后台角色（3）造成 2 点穿透 → 1；
  // 雷狼随后才对出战角色造成 2 点雷伤 → 2。若雷狼先发动，出战角色会先降到 2 而成为被动的目标
  const oppActive = ref();
  const oppStandby = ref();
  const c = setup(
    <State>
      <Character my active def={Sethos} energy={1}>
        <Status def={TheWolfWithin} />
      </Character>
      <Character opp active def={Kaeya} ref={oppActive} health={6} />
      <Character opp def={Barbara} ref={oppStandby} health={3} />
    </State>,
  );
  await c.me.skill(RoyalReedArchery);
  c.expect(oppActive).toHaveVariable({ health: 2 });
  c.expect(oppStandby).toHaveVariable({ health: 1 });
});

test("passive skill of active character triggers before combat status", async () => {
  // 规则集：出战角色区>出战状态区；角色区：角色的被动技能、装备、角色状态
  // 万叶千早振后：被动先切换到下一个角色，轰轰火花随后才对“出战角色”造成 2 点伤害 → 下一个角色受伤
  const kazuha = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character my active def={KaedeharaKazuha} ref={kazuha} health={10} />
      <Character my def={Barbara} ref={next} health={10} />
      <CombatStatus my def={SparksNSplashStatus} />
    </State>,
  );
  await c.me.skill(Chihayaburu);
  c.expect($.my.active).toBe(next);
  c.expect(kazuha).toHaveVariable({ health: 10 });
  c.expect(next).toHaveVariable({ health: 8 });
});

// ---------------------------------------------------------------------------
// 规则集例子：霜袭
// ---------------------------------------------------------------------------

test("example: Frostgnaw triggers circlet/sacrificial/coldblooded, pyronado/aurous/sparks/crane, chang, then opp aquila/chang", async () => {
  // 规则集：我方使用【霜袭】后，依次发动 幸运儿银冠、祭礼剑、冷血之剑、再发动旋火轮、琉金火花、轰轰火花、鹤归之时、我方常九爷，最后发动对方的风鹰剑，常九爷
  // 可观测点：
  //  - 银冠/冷血之剑在满血时治疗溢出，之后轰轰火花才打 2 点 → 凯亚 8
  //  - 轰轰火花打的是当时的出战角色凯亚，之后鹤归之时才切人 → 下一个角色满血且成为出战角色
  //  - 对方风鹰剑最后才治疗：霜袭 4 点被对方护盾完全抵消（仍附着冰），旋火轮融化 4 + 琉金火光 1 → 5，再治疗 1 → 6；
  //    若风鹰剑先于我方状态发动，则满血治疗溢出 → 5
  const kaeya = ref();
  const next = ref();
  const oppKaeya = ref();
  const myChang = ref();
  const oppChang = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} ref={kaeya} health={10}>
        <Equipment def={LuckyDogsSilverCirclet} />
        <Equipment def={SacrificialSword} />
        <Equipment def={ColdbloodedStrike} />
      </Character>
      <Character my def={Barbara} ref={next} health={10} />
      <CombatStatus my def={PyronadoStatus} />
      <CombatStatus my def={AurousBlaze} />
      <CombatStatus my def={SparksNSplashStatus} />
      <Support my def={ChangTheNinth} ref={myChang} />
      <Card my def={WhenTheCraneReturned} />
      <Character opp active def={Kaeya} ref={oppKaeya} health={10}>
        <Equipment def={AquilaFavonia} />
        <Status def={UnmovableMountain} />
      </Character>
      <CombatStatus opp def={Crystallize} shield={2} />
      <Support opp def={ChangTheNinth} ref={oppChang} />
    </State>,
  );
  // 鹤归之时最后入场（出战状态区内最后一个）
  await c.me.card(WhenTheCraneReturned);
  await c.me.skill(Frostgnaw);
  c.expect(kaeya).toHaveVariable({ health: 8 });
  c.expect(next).toHaveVariable({ health: 10 });
  c.expect($.my.active).toBe(next);
  c.expect(oppKaeya).toHaveVariable({ health: 6 });
  // 祭礼剑生成 1 个冰骰：8 - 1（鹤归之时）- 3（霜袭）+ 1
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
  c.expect(myChang).toHaveVariable({ inspiration: 1 });
  c.expect(oppChang).toHaveVariable({ inspiration: 1 });
});

// ---------------------------------------------------------------------------
// 结束回合
// ---------------------------------------------------------------------------

test("end phase: player who declared end first triggers first (opp declared first)", async () => {
  // 规则集：回合结束时的能力发动顺序，先结束回合的玩家先发动
  // 对方先宣布结束：对方冰灵珠先对我方后台造成穿透，我方望舒客栈随后才有受伤后台角色可治疗 → 消耗 1 次
  const inn = ref();
  const c = setup(
    <State currentTurn="my">
      <Character my active def={Kaeya} />
      <Character my def={Barbara} health={10} maxHealth={10} />
      <Character my def={Yoimiya} health={10} />
      <Support my def={WangshuInn} ref={inn} />
      <Character opp active def={Ganyu} />
      <Summon opp def={SacredCryoPearl} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect(inn).toHaveVariable({ usage: 1 });
});

test("end phase: player who declared end first triggers first (I declared first)", async () => {
  // 规则集：回合结束时的能力发动顺序，先结束回合的玩家先发动
  // 我方先宣布结束：我方望舒客栈先结算时后台角色均满血 → 不消耗；对方冰灵珠随后才造成穿透
  const inn = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character my active def={Kaeya} />
      <Character my def={Barbara} health={10} maxHealth={10} />
      <Character my def={Yoimiya} health={10} />
      <Support my def={WangshuInn} ref={inn} />
      <Character opp active def={Ganyu} />
      <Summon opp def={SacredCryoPearl} />
      <DeclaredEnd my />
    </State>,
  );
  await c.opp.end();
  c.expect(inn).toHaveVariable({ usage: 2 });
});

// ---------------------------------------------------------------------------
// 注：莫娜的虚影、纯水精灵的蛙提供的减伤发动顺序属于召唤物
// ---------------------------------------------------------------------------

test("frog's damage reduction is ordered as a summon: combat status shield is consumed first", async () => {
  // 规则集：莫娜的虚影、纯水精灵的蛙提供的减伤虽然会显示在阵营出战状态，但发动顺序属于召唤物
  // 1 点伤害：结晶（出战状态区）先抵消，蛙（召唤物区）不消耗
  const frog = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Barbara} />
      <Character my active def={Kaeya} />
      <Summon my def={OceanicMimicFrog} ref={frog} />
      <CombatStatus my def={Crystallize} />
    </State>,
  );
  await c.opp.skill(WhisperOfWater);
  c.expect($.my.combatStatus.def(Crystallize)).toNotExist();
  c.expect(frog).toHaveVariable({ usage: 1 });
});

test("reflection's damage reduction is ordered as a summon: character status shield is consumed first", async () => {
  // 规则集：莫娜的虚影、纯水精灵的蛙提供的减伤虽然会显示在阵营出战状态，但发动顺序属于召唤物
  // 1 点伤害：重嶂不移（角色区）先抵消，虚影（召唤物区）不消耗
  const reflection = ref();
  const mountain = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Barbara} />
      <Summon my def={Reflection} ref={reflection} />
      <Character my active def={Kaeya}>
        <Status def={UnmovableMountain} ref={mountain} />
      </Character>
    </State>,
  );
  await c.opp.skill(WhisperOfWater);
  c.expect(mountain).toHaveVariable({ shield: 1 });
  c.expect(reflection).toHaveVariable({ usage: 1 });
});

test("reflection entered before a combat status still resolves after it (ordered as a summon)", async () => {
  // 规则集：莫娜的虚影、纯水精灵的蛙提供的减伤虽然会显示在阵营出战状态，但发动顺序属于召唤物
  // 虚影先入场（莫娜技能），猫爪护盾（出战状态）后入场；受到 1 点伤害时仍由猫爪护盾先抵消，虚影不消耗
  // 若虚影按出战状态区且先入场结算，则虚影先抵消而护盾保留
  const diona = ref();
  const oppBarbara = ref();
  const c = setup(
    <State>
      <Character my active def={Mona} />
      <Character my def={Diona} ref={diona} health={10} />
      <Character opp active def={Kaeya} />
      <Character opp def={Barbara} ref={oppBarbara} />
    </State>,
  );
  await c.me.skill(MirrorReflectionOfDoom);
  await c.opp.switch(oppBarbara);
  // 莫娜被动使本次切换为快速行动，随后仍是我方回合
  await c.me.switch(diona);
  await c.me.skill(IcyPaws);
  await c.opp.skill(WhisperOfWater);
  c.expect(diona).toHaveVariable({ health: 10 });
  c.expect($.my.combatStatus.def(CatclawShield)).toNotExist();
  c.expect($.my.summon.def(Reflection)).toHaveVariable({ usage: 1 });
});

// ---------------------------------------------------------------------------
// 特例：战斗开始时
// ---------------------------------------------------------------------------

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

test("battle begin: first player's characters trigger before second player's", async () => {
  // 规则集：战斗开始时的能力触发顺序，按照先手->后手
  // 双方芙宁娜都在战斗开始时生成圣俗杂座；实体 id 由引擎单调递减分配，先生成者 id 更大
  const myKaeya = ref();
  const oppKaeya = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={FurinaPneuma} />
      <Character my def={Kaeya} ref={myKaeya} />
      <Character opp def={FurinaPneuma} />
      <Character opp def={Kaeya} ref={oppKaeya} />
    </State>,
  );
  await startBattle(c, myKaeya, oppKaeya);
  const [myCard] = c.state.players[0].hands;
  const [oppCard] = c.state.players[1].hands;
  expect(myCard.definition.id).toBe(SeatsSacredAndSecular);
  expect(oppCard.definition.id).toBe(SeatsSacredAndSecular);
  expect(myCard.id).toBeGreaterThan(oppCard.id);
});

test("battle begin: first player's characters trigger before second player's (opp first)", async () => {
  // 规则集：战斗开始时的能力触发顺序，按照先手->后手
  const myKaeya = ref();
  const oppKaeya = ref();
  const c = setup(
    <State phase="initActives" currentTurn="opp">
      <Character my def={FurinaPneuma} />
      <Character my def={Kaeya} ref={myKaeya} />
      <Character opp def={FurinaPneuma} />
      <Character opp def={Kaeya} ref={oppKaeya} />
    </State>,
  );
  await startBattle(c, myKaeya, oppKaeya);
  const [myCard] = c.state.players[0].hands;
  const [oppCard] = c.state.players[1].hands;
  expect(oppCard.id).toBeGreaterThan(myCard.id);
});

test("battle begin: characters trigger from left to right (leftmost is active)", async () => {
  // 规则集：战斗开始时的能力触发顺序，角色从左到右触发
  // 芙宁娜（左）先生成圣俗杂座，雅珂达（右）再生成呼噜噜秘藏瓶
  const furina = ref();
  const oppKaeya = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={FurinaPneuma} ref={furina} />
      <Character my def={Jahoda} />
      {/* initActives 不能选择已是出战角色的角色，故先把默认出战角色放到凯亚上 */}
      <Character my active def={Kaeya} />
      <Character opp def={Barbara} />
      <Character opp def={Kaeya} ref={oppKaeya} />
    </State>,
  );
  await startBattle(c, furina, oppKaeya);
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    SeatsSacredAndSecular,
    PurrloinedTreasureFlask,
  ]);
});

test.fails("battle begin: characters trigger from left to right regardless of active character", async () => {
  // 规则集：战斗开始时（第一个行动阶段开始时）的能力触发顺序，按照先手->后手，角色从左到右触发 - 与出战角色无关；
  // 当前引擎：core/src/utils.ts getAllCharacters（hostRelatedExecution 关闭时）复用 getAllEntities 的顺序，
  // 出战角色先于其他角色触发（雅珂达出战时先生成呼噜噜秘藏瓶）
  // 出战角色为中间的雅珂达时，仍应是芙宁娜（左）先生成圣俗杂座
  const jahoda = ref();
  const oppKaeya = ref();
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my def={FurinaPneuma} />
      <Character my def={Jahoda} ref={jahoda} />
      <Character my def={Kaeya} />
      <Character opp def={Barbara} />
      <Character opp def={Kaeya} ref={oppKaeya} />
    </State>,
  );
  await startBattle(c, jahoda, oppKaeya);
  expect(c.state.players[0].hands.map((card) => card.definition.id)).toEqual([
    SeatsSacredAndSecular,
    PurrloinedTreasureFlask,
  ]);
});

// ---------------------------------------------------------------------------
// 队列结算（效果）
// ---------------------------------------------------------------------------

test("entities created while resolving a timing queue do not join it (Burning Flame)", async () => {
  // 规则集：队列结算时生成的实体效果不能加入队列，如燃烧烈焰
  // 结束阶段：锅巴 2 点火伤 + 燃烧 1 → 7，并生成燃烧烈焰；燃烧烈焰在本次结束阶段不发动 → 仍为 7
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Kaeya} />
      <Summon my def={Guoba} />
      <Character opp active def={Barbara} ref={oppActive} health={10} aura={Aura.Dendro} />
      <DeclaredEnd opp />
    </State>,
  );
  await c.me.end();
  c.expect($.my.summon.def(BurningFlame)).toHaveVariable({ usage: 1 });
  c.expect(oppActive).toHaveVariable({ health: 7 });
});

test("timings emitted by an effect resolve before the next effect in the queue", async () => {
  // 规则集：插入结算：每个效果结算时，生成的【时机队列】会在效果结束后结算，结算完成再执行下一个【效果队列】的效果
  // 轰轰火花对出战角色凯亚造成伤害后，其触发的“受到伤害后”时机（普世欢腾：出战角色受伤 → 狂欢值）
  // 在下一个效果（风与自由切人）之前结算，此时凯亚仍是出战角色 → 生成狂欢值
  const c = setup(
    <State>
      <Character my active def={Kaeya} health={10} />
      <Character my def={Barbara} />
      <CombatStatus my def={SparksNSplashStatus} />
      <CombatStatus my def={WindAndFreedomInEffect} />
      <CombatStatus my def={UniversalRevelry} />
    </State>,
  );
  await c.me.skill(Frostgnaw);
  c.expect($.my.combatStatus.def(Revelry)).toHaveVariable({ usage: 1 });
});
