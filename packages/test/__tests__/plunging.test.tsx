// Copyright (C) 2024-2025 Guyutongxue
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

import { ref, setup, State, Card, Support, Character, Equipment, Summon, DeclaredEnd, Status, $ } from "#test";
import { SkillHandle } from "@gi-tcg/core/data";
import { PlungingStrike, UltimateSurfingBuddy } from "@gi-tcg/data/internal/cards/event/other.gts";
import { FontemerWaterBlades, XenochromaticHuntersRay } from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import { BringerOfBlessing, Gaming, StellarRend, WushouArts } from "@gi-tcg/data/internal/characters/pyro/gaming.gts";
import { WhirlwindThrust, Xiao, YakshasMask } from "@gi-tcg/data/internal/characters/anemo/xiao.gts";
import { Keqing, YunlaiSwordsmanship } from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { AbiogenesisSolarIsotoma, Albedo, DescentOfDivinity, FavoniusBladeworkWeiss, RiteOfProgenitureTectonicTide, SolarIsotoma } from "@gi-tcg/data/internal/characters/geo/albedo.gts";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import { BiteyShark, Mualani } from "@gi-tcg/data/internal/characters/hydro/mualani.gts";
import { test } from "vitest";

test("plunging : negative test", async () => {
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
    </State>,
  );
  await c.me.switch(Albedo);
  await c.me.skill(AbiogenesisSolarIsotoma);
  await c.me.skill(FavoniusBladeworkWeiss);
  // 由于不是切人后的第一个快速行动，所以不触发下落攻击
  await c.expect(target).toHaveVariable({ health: 8 });
});

test("plunging triggered by a in-skill-switch to Albedo", async () => {
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />

      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Character my active def={Mualani}>
        <Equipment def={BiteyShark} />
      </Character>

      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.me.skill(1121422 as SkillHandle);
  c.expect($.my.active).toBe(albedo);
  await c.me.skill(FavoniusBladeworkWeiss);
  // 阿贝多天赋：阳华在场时下落攻击伤害+1
  c.expect(target).toHaveVariable({ health: 7 });
});

test("plunging triggered by post-defeated switching", async () => {
  const target = ref();
  const xiao = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp def={Keqing} ref={target} />
      <Character my def={Xiao} ref={xiao}>
        <Status def={YakshasMask} />
      </Character>
      <Character my active health={1} def={Mona} />
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(xiao);
  await c.me.skill(WhirlwindThrust)
  // 普攻2，夜叉傩面下落攻击+3
  c.expect(target).toHaveVariable({ health: 5 });
});

test("plunging: normal attack right after a switch action", async () => {
  // 规则集：角色切换到出战角色后，附属【下落中】；【下落中】：普通攻击视为下落攻击
  // 阿贝多天赋：阳华在场时我方下落攻击伤害+1，故普攻 2 点物理 +1
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.me.switch(albedo);
  await c.me.skill(FavoniusBladeworkWeiss);
  c.expect(target).toHaveVariable({ health: 7 });
});

test("plunging: normal attack forced by PlungingStrike card", async () => {
  // 规则集：角色切换到出战角色后，附属【下落中】；【下落中】：普通攻击视为下落攻击
  // 【下落斩】先切换到目标角色再由其普通攻击，该普攻应为下落攻击
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
      <Card my def={PlungingStrike} />
    </State>,
  );
  await c.me.card(PlungingStrike, albedo);
  c.expect(target).toHaveVariable({ health: 7 });
});

test("plunging: using a technique does not remove plunging", async () => {
  // 规则集：注：使用事件（战斗行动）或特技不会移除【下落中】
  // 切换到阿贝多后先用特技【原海水刃】（2 点物理），随后普攻仍应为下落攻击（2+1）
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
        <Equipment def={XenochromaticHuntersRay} />
      </Character>
      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.me.switch(albedo);
  await c.me.skill(FontemerWaterBlades);
  await c.me.skill(FavoniusBladeworkWeiss);
  c.expect(target).toHaveVariable({ health: 5 });
});

test("plunging: using a combat action event card does not remove plunging", async () => {
  // 规则集：注：使用事件（战斗行动）或特技不会移除【下落中】
  // 【强劲冲浪拍档！】是战斗行动事件牌；双方各 1 个阳华使随机触发的目标唯一
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
      <Summon opp def={SolarIsotoma} />
      <Card my def={UltimateSurfingBuddy} />
    </State>,
  );
  await c.me.switch(albedo);
  await c.me.card(UltimateSurfingBuddy);
  await c.me.skill(FavoniusBladeworkWeiss);
  // 我方阳华结束阶段 1 点岩伤 + 下落普攻 2+1
  c.expect(target).toHaveVariable({ health: 6 });
});

test("plunging: using a hidden skill removes plunging", async () => {
  // 规则集：角色使用技能后（包括隐藏技能）或切换到后台后：移除【下落中】
  // 切换到嘉明后，【舞兽之法】在我方选择行动前使用隐藏技能【踏云献瑞】（强制下落攻击，2 火 +1 天赋）
  // 该隐藏技能移除【下落中】，之后的普通攻击只造成 2 点物理伤害
  const target = ref();
  const gaming = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Gaming} ref={gaming}>
        <Equipment def={BringerOfBlessing} />
        <Status def={WushouArts} />
      </Character>
    </State>,
  );
  await c.me.switch(gaming);
  await c.me.skill(StellarRend);
  c.expect(target).toHaveVariable({ health: 5 });
});

test("plunging: an elemental burst right after a switch is not a plunging attack", async () => {
  // 规则集：下落中（角色状态）：普通攻击视为下落攻击
  // 只有普通攻击才视为下落攻击，切人后直接使用元素爆发不应吃到阿贝多天赋的下落攻击+1
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo} energy={2}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.me.switch(albedo);
  // 阳华在场，大地之潮造成 6 点岩元素伤害；若被误判为下落攻击则为 7 点
  await c.me.skill(RiteOfProgenitureTectonicTide);
  c.expect(target).toHaveVariable({ health: 4 });
});

test.fails("plunging: plunging state survives the end of the round", async () => {
  // 规则集：【下落中】的移除条件只有「角色使用技能后（包括隐藏技能）或切换到后台后」，且未标注持续回合，
  // 而「回合结束时：所有持续回合-1，弃置持续回合为0的状态」不涉及【下落中】，故切人后不使用技能直接结束回合，
  // 下回合的普通攻击仍应是下落攻击（2+1）。
  // 当前引擎：结束阶段无条件清除 canPlunging（packages/core/src/game.ts:968），下回合普攻只有 2 点（实测 health 7）。
  // 注：引擎依据的官方描述含「本回合内」一句（packages/core/src/skill_executor.ts:114），规则集此处未写该限制。
  const target = ref();
  const albedo = ref();
  const c = setup(
    <State>
      <Character opp ref={target} />
      <Character my active />
      <Character my def={Albedo} ref={albedo}>
        <Equipment def={DescentOfDivinity} />
      </Character>
      <Summon my def={SolarIsotoma} />
    </State>,
  );
  await c.me.switch(albedo);
  await c.me.end();
  await c.opp.end();
  // 结束阶段阳华造成 1 点岩元素伤害（10 → 9），我方先宣布结束故下回合先手
  await c.me.skill(FavoniusBladeworkWeiss);
  c.expect(target).toHaveVariable({ health: 6 });
});
