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
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { LostLegaciesInTheSand } from "@gi-tcg/data/internal/cards/event/legend.gts";
import { DisperseTheCalamity } from "@gi-tcg/data/internal/cards/event/other.gts";
import {
  Citlali,
  MamaloacosFrigidRain,
  MamaloacosFrigidRainInEffect,
  NightsoulsBlessing,
  ShadowstealingSpiritVessel,
} from "@gi-tcg/data/internal/characters/cryo/citlali.gts";
import { SheerCold } from "@gi-tcg/data/internal/characters/cryo/la_signora.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("citlali songs of profound mystery: gains nightsoul after my reaction DMG, only while under nightsoul's blessing", async () => {
  // 规则集：奥秘传唱 我方造成元素反应伤害后/挑选后：若附属夜魂加持->获得1点夜魂值
  // 断言：附属夜魂加持时打出融化反应伤害获得 1 点夜魂值；未附属夜魂加持时什么都不获得
  const blessed = setup(
    <State>
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
    </State>,
  );

  await blessed.me.skill(ShadowstealingSpiritVessel);

  blessed.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });

  const unblessed = setup(
    <State>
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Citlali} />
    </State>,
  );

  await unblessed.me.skill(ShadowstealingSpiritVessel);

  unblessed.expect($.my.typeStatus.def(NightsoulsBlessing)).toNotExist();
});

test("citlali songs of profound mystery: gains nightsoul at most once per round", async () => {
  // 规则集：奥秘传唱 ...获得1点夜魂值（每回合1次）
  // 断言：本回合先靠普通攻击融化拿到 1 点，结束阶段严寒再次触发融化也不再累加
  const burned = ref();
  const c = setup(
    <State>
      <Character opp active aura={Aura.Pyro} />
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
      <Character my ref={burned} aura={Aura.Pyro}>
        <Status def={SheerCold} />
      </Character>
    </State>,
  );

  await c.me.skill(ShadowstealingSpiritVessel);

  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });

  await c.opp.end();
  await c.me.end();

  // 严寒 1 点冰伤 + 融化 2 点，确认第二次反应伤害确实发生了
  c.expect(burned).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
});

test("citlali songs of profound mystery: gains nightsoul after my select-card", async () => {
  // 规则集：奥秘传唱 我方造成元素反应伤害后/挑选后：若附属夜魂加持->获得1点夜魂值
  // 断言：打出「沙中遗事」进行挑选后获得 1 点夜魂值
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
      <Card my def={LostLegaciesInTheSand} />
    </State>,
  );

  await c.me.card(LostLegaciesInTheSand);
  await c.me.selectCard(DisperseTheCalamity);

  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
});

test("citlali songs of profound mystery: my own debuff dealing reaction DMG to my side triggers it", async () => {
  // 规则集：注：我方负面状态对我方造成的元素反应伤害也能发动。
  // 断言：我方角色身上的【严寒】在结束阶段对我方角色造成融化伤害，茜特菈莉获得 1 点夜魂值
  const burned = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
      <Character my ref={burned} aura={Aura.Pyro}>
        <Status def={SheerCold} />
      </Character>
    </State>,
  );

  await c.me.end();
  await c.opp.end();

  c.expect(burned).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
});

test("citlali songs of profound mystery: opponent's own debuff dealing reaction DMG to their side does not trigger it", async () => {
  // 规则集：注：...对方负面状态对对方造成的元素反应伤害不能发动
  // 断言：对方角色身上的【严寒】在结束阶段对对方角色造成融化伤害，茜特菈莉不获得夜魂值
  const burned = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character opp ref={burned} aura={Aura.Pyro}>
        <Status def={SheerCold} />
      </Character>
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
    </State>,
  );

  await c.me.end();
  await c.opp.end();

  c.expect(burned).toHaveVariable({ health: 7 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 0,
  });
});

test.fails(
  "mamaloaco's frigid rain: opponent's own debuff dealing melt DMG to their side does not trigger it",
  async () => {
    // 规则集：注：...对方负面状态对对方造成的元素反应伤害不能发动 （五重天的寒雨发动条件和被动相同）
    // 当前引擎：citlali.gts:218-227 的天赋用 `on damaged { when !:e.target.isMine() && 冻结|融化; listenTo all; }`，
    // damaged 事件按受伤目标过滤（core/src/runtime/skill.ts:513），故不限制伤害来源方；
    // 对比同文件被动的 `on dealDamage { listenTo samePlayer; }`（按伤害来源过滤，skill.ts:500）确实做了限制。
    // 因此对方自己的负面状态打出的融化反应也会生成【五重天的寒雨（生效中）】
    const burned = ref();
    const c = setup(
      <State>
        <Character opp active />
        <Character opp ref={burned} aura={Aura.Pyro}>
          <Status def={SheerCold} />
        </Character>
        <Character my active def={Citlali}>
          <Equipment def={MamaloacosFrigidRain} />
          <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
        </Character>
      </State>,
    );

    await c.me.end();
    await c.opp.end();

    c.expect(burned).toHaveVariable({ health: 7 });
    c.expect($.my.combatStatus.def(MamaloacosFrigidRainInEffect)).toNotExist();
  },
);
