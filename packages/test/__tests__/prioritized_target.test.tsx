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
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  Chasca,
  ShadowhuntShell,
} from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import {
  Citlali,
  EdictOfEntwinedSplendor,
  Itzpapa,
  NightsoulsBlessing,
  OpalShield,
  ShadowstealingSpiritVessel,
} from "@gi-tcg/data/internal/characters/cryo/citlali.gts";
import {
  Keqing,
  YunlaiSwordsmanship,
} from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("prioritized: ShadowhuntShell damages next character when opp active health is 0", async () => {
  // 规则集：优先 —— 若对方出战角色生命值为0，改为对下一个角色造成伤害
  // 断言：出战角色排在第二位，伤害落到其「下一个角色」（第三位）而非队列首位的角色；
  // 出战角色 alive 仍为 1，说明该次伤害确实没有结算在它身上
  const oppFirst = ref();
  const oppActive = ref();
  const oppNext = ref();
  const card = ref();
  const c = setup(
    <State>
      <Character my active def={Chasca} />
      <Character opp ref={oppFirst} health={10} />
      <Character opp active ref={oppActive} health={0} />
      <Character opp ref={oppNext} health={10} />
      <Card my ref={card} def={ShadowhuntShell} />
    </State>,
  );
  await c.me.card(card);
  c.expect(oppActive).toHaveVariable({ health: 0, alive: 1 });
  c.expect(oppNext).toHaveVariable({ health: 9 });
  c.expect(oppFirst).toHaveVariable({ health: 10 });
});

test("prioritized: ShadowhuntShell damages opp active when its health is above 0", async () => {
  // 规则集：优先 —— 若对方出战角色生命值为0，改为对下一个角色造成伤害
  // 断言：条件不满足时仍按常规打出战角色，不会转移目标
  const oppActive = ref();
  const oppNext = ref();
  const card = ref();
  const c = setup(
    <State>
      <Character my active def={Chasca} />
      <Character opp active ref={oppActive} health={10} />
      <Character opp ref={oppNext} health={10} />
      <Card my ref={card} def={ShadowhuntShell} />
    </State>,
  );
  await c.me.card(card);
  c.expect(oppActive).toHaveVariable({ health: 9 });
  c.expect(oppNext).toHaveVariable({ health: 10 });
});

test("prioritized: ordinary damage keeps hitting the opp active whose health is 0", async () => {
  // 规则集：注：仅有新卡【伊兹帕帕】和【追影弹】有此机制。
  // 断言：不带「优先」的普通伤害（云来剑法）不转移目标，仍结算在生命值为0的出战角色上并将其击倒，
  // 相邻两名角色都不掉血
  const oppFirst = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character my active def={Keqing} />
      <Character opp ref={oppFirst} health={10} />
      <Character opp active ref={oppActive} health={0} />
      <Character opp ref={oppNext} health={10} />
    </State>,
  );
  await c.me.skill(YunlaiSwordsmanship);
  await c.opp.chooseActive(oppNext);
  c.expect(oppActive).toHaveVariable({ health: 0, alive: 0 });
  c.expect(oppFirst).toHaveVariable({ health: 10 });
  c.expect(oppNext).toHaveVariable({ health: 10 });
});

test("Itzpapa: consumes 1 nightsoul and creates OpalShield after my character is damaged", async () => {
  // 规则集：伊兹帕帕①我方角色受到伤害后，若我方茜特菈莉生命值大于0：消耗茜特菈莉1点夜魂值->生成1层白曜护盾
  // 断言：受伤后夜魂值 2->1，且生成 1 层白曜护盾
  const citlali = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active def={Citlali} ref={citlali} health={10}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <CombatStatus my def={Itzpapa} />
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  c.expect(citlali).toHaveVariable({ health: 8 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  c.expect($.my.combatStatus.def(OpalShield)).toHaveVariable({ shield: 1 });
});

test("Itzpapa: triggers when a non-Citlali character is damaged", async () => {
  // 规则集：伊兹帕帕①我方角色受到伤害后，若我方茜特菈莉生命值大于0：……
  // 断言：受伤的是我方出战角色而非茜特菈莉，后台茜特菈莉未掉血，仍扣夜魂值并生成护盾
  const citlali = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active />
      <Character my def={Citlali} ref={citlali} health={10}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <CombatStatus my def={Itzpapa} />
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  c.expect(citlali).toHaveVariable({ health: 10 });
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  c.expect($.my.combatStatus.def(OpalShield)).toHaveVariable({ shield: 1 });
});

test("Itzpapa: does not trigger when Citlali health drops to 0 by that damage", async () => {
  // 规则集：伊兹帕帕①我方角色受到伤害后，若我方茜特菈莉生命值大于0：……
  // 断言：茜特菈莉被该次伤害打到 0 点生命值时不满足「生命值大于0」，虽有 2 点夜魂值也不生成白曜护盾
  const citlali = ref();
  const myNext = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={Keqing} />
      <Character my active def={Citlali} ref={citlali} health={2}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 2 }} />
      </Character>
      <Character my ref={myNext} />
      <CombatStatus my def={Itzpapa} />
    </State>,
  );
  await c.opp.skill(YunlaiSwordsmanship);
  await c.me.chooseActive(myNext);
  c.expect(citlali).toHaveVariable({ health: 0, alive: 0 });
  c.expect($.my.combatStatus.def(OpalShield)).toNotExist();
});

test("Itzpapa: deals 1 cryo damage when Citlali gains nightsoul up to 2", async () => {
  // 规则集：伊兹帕帕②茜特菈莉获得夜魂值后，若夜魂值为2：优先对对方出战角色造成1点冰元素伤害
  // 断言：融化触发被动使夜魂值 1->2，额外对对方出战角色造成 1 点冰伤（3 点融化伤害 + 1 点冰伤）
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 1 }} />
      </Character>
      <CombatStatus my def={Itzpapa} />
      <Character opp active ref={oppActive} health={10} aura={Aura.Pyro} />
    </State>,
  );
  await c.me.skill(ShadowstealingSpiritVessel);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 2,
  });
  c.expect(oppActive).toHaveVariable({ health: 6 });
});

test("Itzpapa: does not deal damage when gained nightsoul is only 1", async () => {
  // 规则集：伊兹帕帕②茜特菈莉获得夜魂值后，若夜魂值为2：……
  // 断言：夜魂值 0->1 不满足条件，只有 3 点融化伤害，无额外冰伤
  const oppActive = ref();
  const c = setup(
    <State>
      <Character my active def={Citlali}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
      <CombatStatus my def={Itzpapa} />
      <Character opp active ref={oppActive} health={10} aura={Aura.Pyro} />
    </State>,
  );
  await c.me.skill(ShadowstealingSpiritVessel);
  c.expect($.my.typeStatus.def(NightsoulsBlessing)).toHaveVariable({
    nightsoul: 1,
  });
  c.expect(oppActive).toHaveVariable({ health: 7 });
});

test("Itzpapa: prioritized damage goes to next character when opp active was just killed", async () => {
  // 规则集：【优先对对方出战角色】，指若对方出战角色生命值为0，改为对下一个角色造成伤害
  // 断言：诸曜饬令击倒排在第二位的出战角色后（尚未选新出战角色），伊兹帕帕②的 1 点冰伤
  // 打在「下一个角色」（第三位，1 点穿透 + 1 点冰伤 = 2）而非队列首位的角色（仅 1 点穿透）
  const oppFirst = ref();
  const oppActive = ref();
  const oppNext = ref();
  const c = setup(
    <State>
      <Character my active def={Citlali} energy={2}>
        <Status def={NightsoulsBlessing} v={{ nightsoul: 0 }} />
      </Character>
      <CombatStatus my def={Itzpapa} />
      <Character opp ref={oppFirst} health={10} />
      <Character opp active ref={oppActive} health={2} />
      <Character opp ref={oppNext} health={10} />
    </State>,
  );
  await c.me.skill(EdictOfEntwinedSplendor);
  await c.opp.chooseActive(oppNext);
  c.expect(oppActive).toHaveVariable({ health: 0, alive: 0 });
  c.expect(oppNext).toHaveVariable({ health: 8 });
  c.expect(oppFirst).toHaveVariable({ health: 9 });
});
