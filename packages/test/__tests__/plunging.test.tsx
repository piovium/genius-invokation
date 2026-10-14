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

import {
  ref,
  setup,
  State,
  Card,
  Support,
  Character,
  Equipment,
  Summon,
  DeclaredEnd,
  Status,
  CombatStatus,
  DiceCount,
  $,
} from "#test";
import { PlungingStatus } from "@gi-tcg/core";
import { SkillHandle } from "@gi-tcg/core/data";
import { WhenTheCraneReturnedInEffect, WindAndFreedomInEffect } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  WhirlwindThrust,
  Xiao,
  YakshasMask,
} from "@gi-tcg/data/internal/characters/anemo/xiao.gts";
import {
  Keqing,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import {
  AbiogenesisSolarIsotoma,
  Albedo,
  DescentOfDivinity,
  FavoniusBladeworkWeiss,
  SilverIsotoma,
  SolarIsotoma,
} from "@gi-tcg/data/internal/characters/geo/albedo.gts";
import { Mona } from "@gi-tcg/data/internal/characters/hydro/mona.gts";
import {
  BiteyShark,
  Mualani,
} from "@gi-tcg/data/internal/characters/hydro/mualani.gts";
import { ExperimentalFieldGenerator, LowGravityBackground } from "@gi-tcg/data/internal/characters/geo/experimental_field_generator.gts";
import { expect, test } from "vitest";

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
  await c.me.skill(WhirlwindThrust);
  // 普攻2，夜叉傩面下落攻击+3
  c.expect(target).toHaveVariable({ health: 5 });
});

test("switching three times after a plunging attack defers its detection", async () => {
  const albedo = ref();
  const oppStandby = ref();
  const silver = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active />
      <Character opp ref={oppStandby} />
      <Character my ref={albedo} def={Albedo} />
      <Character my def={ExperimentalFieldGenerator} />
      <Character my active />
      {/* 下面三个状态导致三次技能后切人 */}
      <CombatStatus my def={LowGravityBackground} />
      <CombatStatus my def={WhenTheCraneReturnedInEffect} />
      <CombatStatus my def={WindAndFreedomInEffect} />
      {/* 瑰银切人后响应 */}
      <CombatStatus my def={SilverIsotoma} ref={silver} />
    </State>,
  );
  await c.me.switch(albedo);
  await c.me.skill(FavoniusBladeworkWeiss);
  c.expect($.my.active).toBeDefinition(Albedo);
  c.expect(oppStandby).toHaveVariable({ health: 10 });
  c.expect(silver).toHaveVariable({ usage: 2 });
});
