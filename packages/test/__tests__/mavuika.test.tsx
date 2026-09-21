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
  ref,
  setup,
  Character,
  State,
  Card,
  Status,
  CombatStatus,
  Equipment,
  Support,
  $,
} from "#test";
import { ScionsOfTheCanopy } from "@gi-tcg/data/internal/cards/support/place.gts";
import { LiuSu } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  AbundantPhlogistonInEffect,
  CalxsArts,
  ElementalResonanceHighVoltage,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { ScrollOfTheHeroOfCinderCity } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  FontemerWaterBlades,
  XenochromaticHuntersRay,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import {
  BlazingTrail,
  CrucibleOfDeathAndLife,
  FlamesWeaveLife,
  FlamestriderBlazingTrail,
  FlamestriderFullThrottle,
  FlamestriderFullThrottleInEffect,
  FlamestriderFullThrottleInEffectPrepareStatus,
  FlamestriderSoaringAscent,
  FullThrottle,
  Mavuika,
  NightsoulsBlessing,
  SoaringAscent,
  TheNamedMoment,
} from "@gi-tcg/data/internal/characters/pyro/mavuika.gts";
import {
  GrappleLink,
  GrapplePrepare,
  Kinich,
  NightsoulsBlessing as NightsoulsBlessingKinich,
} from "@gi-tcg/data/internal/characters/dendro/kinich.gts";
import {
  Kachina,
  NightsoulsBlessing as NightsoulsBlessingKachina,
  TurboTwirly,
  TwirlyTwirlyBamBam,
} from "@gi-tcg/data/internal/characters/geo/kachina.gts";
import {
  AbyssLectorVioletLightning,
  ShockOfTheEnigmaticAbyss,
} from "@gi-tcg/data/internal/characters/electro/abyss_lector_violet_lightning.gts";
import {
  SpiritOfOmenDendroSpiritserpent,
  VinyRazorscale,
} from "@gi-tcg/data/internal/characters/dendro/eremite_floral_ringdancer.gts";
import { TemperedSword } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("mavuika: play 'E' card trigger ScionsOfTheCanopy", async () => {
  const mavuika = ref();
  const c = setup(
    <State>
      <Character my active def={Mavuika} ref={mavuika} />
      <Card my def={ScionsOfTheCanopy} />
    </State>,
  );
  await c.me.skill(TheNamedMoment);
  await c.me.selectCard(FlamestriderBlazingTrail); // 涉渡
  await c.opp.end();
  await c.me.card(ScionsOfTheCanopy);
  await c.me.card(FlamestriderBlazingTrail, mavuika);
  // 初始1，打出后变2
  c.expect($.my.support.def(ScionsOfTheCanopy)).toHaveVariable({
    point: 2,
  });
  // 8 - 3(火神E) - 2(涉渡) + 1(悬木人生成) = 4
  expect(c.state.players[0].dice).toBeArrayOfSize(4);
  // 点涉渡
  await c.me.skill(BlazingTrail);
  c.expect($.my.prev).toBeDefinition(Mavuika);
  c.expect($.my.typeEquipment.def(FlamestriderBlazingTrail)).toHaveVariable({
    usage: 1,
  });
});

test("mavuika: technique consumes Crucible of Death and Life usage", async () => {
  const mavuika = ref();
  const c = setup(
    <State>
      <Character my active def={Mavuika} ref={mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
        <Status def={CrucibleOfDeathAndLife} />
      </Character>
      <Card my def={FlamestriderSoaringAscent} />
    </State>,
  );
  await c.me.card(FlamestriderSoaringAscent, mavuika);
  await c.me.skill(SoaringAscent);

  c.expect($.my.typeStatus.def(CrucibleOfDeathAndLife)).toHaveVariable({
    usage: 1,
  });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
});

// ===== 以下为《夜鹰规则集》玛薇卡分组 =====

test("crucible of death and life: one usage still stops the 2-point nightsoul consumption of grapple prepare", async () => {
  // 规则集：钩锁准备触发①的场合，会消耗全部死生之炉的次数（1次死生之炉也能终止2点夜魂消耗）
  // 断言：基尼奇夜魂 1→2 触发钩索准备的 2 点消耗被终止，夜魂仍为 2；仅 1 次的死生之炉被耗尽
  const kinich = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika}>
        <Status def={CrucibleOfDeathAndLife} usage={1} />
        <Equipment def={XenochromaticHuntersRay} />
      </Character>
      <Character my def={Kinich} ref={kinich}>
        <Status def={GrappleLink} />
        <Status def={NightsoulsBlessingKinich} v={{ nightsoul: 1 }} />
      </Character>
    </State>,
  );
  // 我方其他角色使用特技 → 基尼奇夜魂 +1 → 附属钩索准备并消耗 2 点夜魂
  await c.me.skill(FontemerWaterBlades);
  c.expect($.my.typeStatus.def(GrapplePrepare)).toBeExist();
  c.expect($.my.typeStatus.def(NightsoulsBlessingKinich)).toHaveVariable({
    nightsoul: 2,
  });
  c.expect($.my.typeStatus.def(CrucibleOfDeathAndLife)).toNotExist();
});

test("crucible of death and life: nightsoul consumption reduced to 0 does not trigger Abundant Phlogiston", async () => {
  // 规则集：夜魂消耗为0，不会触发【燃素充盈】
  // 断言：死生之炉把跃升的夜魂消耗改为 0 后，燃素充盈（生效中）未被触发、夜魂不变
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
        <Status def={CrucibleOfDeathAndLife} />
        <Equipment def={FlamestriderSoaringAscent} />
      </Character>
      <CombatStatus my def={AbundantPhlogistonInEffect} />
    </State>,
  );
  await c.me.skill(SoaringAscent);
  c.expect($.my.combatStatus.def(AbundantPhlogistonInEffect)).toBeExist();
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  c.expect($.my.typeStatus.def(CrucibleOfDeathAndLife)).toHaveVariable({
    usage: 1,
  });
});

test("crucible of death and life: any of my characters' normal attack deals +1 and consumes 1 usage", async () => {
  // 规则集：②我方角色普通攻击时：伤害+1。可用次数：2
  // 断言：后台玛薇卡附属死生之炉，出战角色（迪卢克）普攻 2+1=3，可用次数 2→1
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my def={Mavuika}>
        <Status def={CrucibleOfDeathAndLife} />
      </Character>
    </State>,
  );
  await c.me.skill(TemperedSword);
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(CrucibleOfDeathAndLife)).toHaveVariable({
    usage: 1,
  });
});

test("fighting spirit: using a normal attack grants 1 fighting spirit", async () => {
  // 规则集：①我方消耗夜魂后/使用【普通攻击】后->获得1点充能
  // 断言：玛薇卡自己普攻后战意 0→1
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} ref={mavuika} />
    </State>,
  );
  await c.me.skill(FlamesWeaveLife);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 1 });
});

test("fighting spirit: consuming nightsoul grants 1 fighting spirit", async () => {
  // 规则集：①我方消耗夜魂后/使用【普通攻击】后->获得1点充能
  // 断言：跃升消耗 1 点夜魂后战意 0→1
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} ref={mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
        <Equipment def={FlamestriderSoaringAscent} />
      </Character>
    </State>,
  );
  await c.me.skill(SoaringAscent);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 1 });
});

test("fighting spirit: another character consuming nightsoul also grants 1 fighting spirit", async () => {
  // 规则集：①我方消耗夜魂后/使用【普通攻击】后->获得1点充能
  // 断言：后台玛薇卡在卡齐娜（出战）特技消耗 1 点夜魂后战意 0→1
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Kachina}>
        <Equipment def={TurboTwirly} />
        <Status def={NightsoulsBlessingKachina} v={{ nightsoul: 2 }} />
      </Character>
      <Character my def={Mavuika} ref={mavuika} />
    </State>,
  );
  await c.me.skill(TwirlyTwirlyBamBam);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 1 });
});

test("fighting spirit: capped at 6", async () => {
  // 规则集：玛薇卡（充能上限6）
  // 断言：战意 6 时普攻不再增加
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character
        my
        active
        def={Mavuika}
        ref={mavuika}
        v={{ fightingSpirit: 6 }}
      />
    </State>,
  );
  await c.me.skill(FlamesWeaveLife);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 6 });
});

test("fighting spirit: energy from using an elemental skill is prevented", async () => {
  // 规则集：②因①以外的效果获得/失去充能前->防止充能变化
  // 断言：使用元素战技后战意仍为 0
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} ref={mavuika} />
    </State>,
  );
  await c.me.skill(TheNamedMoment);
  await c.me.selectCard(FlamestriderSoaringAscent);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 0 });
});

test("fighting spirit: Liu Su is consumed when switching to Mavuika with 0 spirit, but grants nothing", async () => {
  // 规则集：有刘苏，切换到0战意火神会消耗刘苏，不获得充能。
  // 断言：切换到 0 战意玛薇卡后刘苏可用次数 2→1，玛薇卡战意仍为 0
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my def={Mavuika} ref={mavuika} />
      <Support my def={LiuSu} />
    </State>,
  );
  await c.me.switch(mavuika);
  c.expect($.my.support.def(LiuSu)).toHaveVariable({ usage: 1 });
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 0 });
});

test.fails("fighting spirit: Abyss Lector's shock gains the stolen energy but does not reduce Mavuika's spirit", async () => {
  // 规则集：雷使徒对有战意的玛薇卡使用战技，雷使徒能获得充能但不减少玛薇卡的战意；当前引擎：玛薇卡 energy 变量恒为 0，夺取失败，紫电仅获得使用技能的 1 点充能（规则集预期 1+1=2）
  const lector = ref();
  const mavuika = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={AbyssLectorVioletLightning} ref={lector} />
      <Character
        my
        active
        def={Mavuika}
        ref={mavuika}
        aura={Aura.Electro}
        v={{ fightingSpirit: 3 }}
      />
    </State>,
  );
  await c.opp.skill(ShockOfTheEnigmaticAbyss);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 3 });
  // 使用技能 +1，夺取 +1
  c.expect(lector).toHaveVariable({ energy: 2 });
});

test("fighting spirit: High Voltage applies to active Mavuika with no effect", async () => {
  // 规则集：雷共鸣等在玛薇卡5点或以下战意时会对其生效但无效果。
  // 断言：出战玛薇卡战意不变，下一名充能未满角色获得 1 点
  const mavuika = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character
        my
        active
        def={Mavuika}
        ref={mavuika}
        v={{ fightingSpirit: 3 }}
      />
      <Character my ref={next} energy={0} />
      <Character my energy={0} />
      <Card my def={ElementalResonanceHighVoltage} />
    </State>,
  );
  await c.me.card(ElementalResonanceHighVoltage);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 3 });
  c.expect(next).toHaveVariable({ energy: 1 });
});

test.fails("fighting spirit: standby Mavuika with <=5 spirit is picked by High Voltage as 'energy not full' with no effect", async () => {
  // 规则集：雷共鸣等在玛薇卡5点或以下战意时会对其生效但无效果；当前引擎：玛薇卡 energy/maxEnergy 均为 0，不被视为「充能未满」，强能之雷跳过她而给再下一名角色充能
  // 断言：下一名「充能未满」角色是战意 5 的后台玛薇卡，对其生效但无效果，再下一名角色不获得充能
  const active = ref();
  const mavuika = ref();
  const last = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active ref={active} energy={0} />
      <Character my def={Mavuika} ref={mavuika} v={{ fightingSpirit: 5 }} />
      <Character my ref={last} energy={0} />
      <Card my def={ElementalResonanceHighVoltage} />
    </State>,
  );
  await c.me.card(ElementalResonanceHighVoltage);
  c.expect(active).toHaveVariable({ energy: 1 });
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 5 });
  c.expect(last).toHaveVariable({ energy: 0 });
});

test.fails("fighting spirit: Calx's Arts is playable with only a standby Mavuika's spirit, but moves nothing", async () => {
  // 规则集：白垩之术可以在后台有战意的场合使用，但不会减少战意，也不会获得充能；当前引擎：玛薇卡 energy 变量恒为 0，不满足「存在有充能的后台角色」，白垩之术不可打出
  const active = ref();
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active ref={active} energy={0} />
      <Character my def={Mavuika} ref={mavuika} v={{ fightingSpirit: 3 }} />
      <Character my energy={0} />
      <Card my def={CalxsArts} />
    </State>,
  );
  await c.me.card(CalxsArts);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 3 });
  c.expect(active).toHaveVariable({ energy: 0 });
});

test("fighting spirit: Calx's Arts does not take spirit from standby Mavuika", async () => {
  // 规则集：白垩之术……但不会减少战意，也不会获得充能
  // 断言：另一后台角色有 1 点充能使白垩之术可打出；玛薇卡战意不变，出战角色只获得来自另一角色的 1 点
  const active = ref();
  const mavuika = ref();
  const other = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active ref={active} energy={0} />
      <Character my def={Mavuika} ref={mavuika} v={{ fightingSpirit: 3 }} />
      <Character my ref={other} energy={1} />
      <Card my def={CalxsArts} />
    </State>,
  );
  await c.me.card(CalxsArts);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 3 });
  c.expect(other).toHaveVariable({ energy: 0 });
  c.expect(active).toHaveVariable({ energy: 1 });
});

test("fighting spirit: Eremite technique cannot be activated by consuming spirit", async () => {
  // 规则集：镀金旅团的特技不能消耗战意发动，没有效果
  // 断言：藤蔓锋鳞（需 1 点充能）对有战意的玛薇卡不可使用，战意与敌方生命均不变
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character
        my
        active
        def={Mavuika}
        ref={mavuika}
        v={{ fightingSpirit: 3 }}
      >
        <Equipment def={SpiritOfOmenDendroSpiritserpent} />
      </Character>
    </State>,
  );
  await expect(c.me.skill(VinyRazorscale)).rejects.toThrow(
    /cannot use skill/i,
  );
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 3 });
  c.expect($.opp.active).toHaveVariable({ health: 10 });
});

test("fighting spirit: Scroll of the Hero of Cinder City on Mavuika gives energy to the next character", async () => {
  // 规则集：玛薇卡使用 烬城勇者，会给下一个角色充能
  // 断言：玛薇卡消耗夜魂后，绘卷的 1 点充能（重复 1 次）都给下一个角色；玛薇卡只因①获得 1 点战意
  const mavuika = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} ref={mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
        <Equipment def={ScrollOfTheHeroOfCinderCity} />
        <Equipment def={FlamestriderSoaringAscent} />
      </Character>
      <Character my ref={next} energy={0} />
      <Character my energy={0} />
    </State>,
  );
  await c.me.skill(SoaringAscent);
  c.expect(next).toHaveVariable({ energy: 2 });
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 1 });
});

test("full throttle: consumes 1 nightsoul and prepares Flamestrider Full Throttle", async () => {
  // 规则集：疾驰（特技） 消耗1点夜魂值，准备：弛轮车·疾驰
  // 断言：夜魂 2→1，附属「驰轮车·疾驰（生效中）」准备状态
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} ref={mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Card my def={FlamestriderFullThrottle} />
    </State>,
  );
  await c.me.card(FlamestriderFullThrottle, mavuika);
  await c.me.skill(FullThrottle);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  c.expect(
    $.my.typeStatus.def(FlamestriderFullThrottleInEffectPrepareStatus),
  ).toBeExist();
});

test("flamestrider full throttle (prepared skill): creates the combat status on Mavuika's next action", async () => {
  // 规则集：弛轮车·疾驰（元素战技） 生成【弛轮车·疾驰（出战状态）】
  // 断言：对方行动后轮到我方，准备技能直接使用，生成出战状态，准备状态移除
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} ref={mavuika}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Card my def={FlamestriderFullThrottle} />
    </State>,
  );
  await c.me.card(FlamestriderFullThrottle, mavuika);
  await c.me.skill(FullThrottle);
  await c.opp.end();
  c.expect($.my.combatStatus.def(FlamestriderFullThrottleInEffect)).toBeExist();
  c.expect(
    $.my.typeStatus.def(FlamestriderFullThrottleInEffectPrepareStatus),
  ).toNotExist();
});

test("flamestrider full throttle (combat status): generates 2 omni dice at the start of the action phase, usage 1", async () => {
  // 规则集：弛轮车·疾驰（出战状态） 行动阶段开始时：生成2个万能元素骰。可用次数：1
  // 断言：下回合行动阶段开始骰子 8+2=10，出战状态用尽消失
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Mavuika} />
      <CombatStatus my def={FlamestriderFullThrottleInEffect} />
    </State>,
  );
  await c.me.end();
  await c.opp.end();
  expect(c.state.roundNumber).toBe(2);
  expect(c.state.players[0].dice).toBeArrayOfSize(10);
  c.expect($.my.combatStatus.def(FlamestriderFullThrottleInEffect)).toNotExist();
});

test("fighting spirit: another character's normal attack also grants 1 fighting spirit", async () => {
  // 规则集：①我方消耗夜魂后/使用【普通攻击】后->获得1点充能
  // 断言：出战角色（迪卢克）普攻后，后台玛薇卡战意 0→1
  const mavuika = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active />
      <Character my def={Mavuika} ref={mavuika} />
    </State>,
  );
  await c.me.skill(TemperedSword);
  c.expect(mavuika).toHaveVariable({ fightingSpirit: 1 });
});
