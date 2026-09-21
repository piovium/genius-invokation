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
import { OceanhuedClam } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import {
  GlitteringGemstones,
  MondstadtHashBrown,
  TeyvatFriedEgg,
} from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  DetailedDiagnosisThoroughTreatmentStatus,
  Sigewinne,
} from "@gi-tcg/data/internal/characters/hydro/sigewinne.gts";
import {
  Diluc,
  SearingOnslaught,
  TemperedSword,
} from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { DamageType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

/** 记录我方收到的治疗通知（来源 / 目标 / 数值） */
function recordHeals(c: ReturnType<typeof setup>) {
  const heals: {
    sourceId: number;
    sourceDefinitionId: number;
    targetId: number;
    value: number;
  }[] = [];
  c.game.players[0].io.notify = ({ mutation }) => {
    for (const { mutation: m } of mutation) {
      if (m?.$case === "damage" && m.value.damageType === DamageType.Heal) {
        heals.push({
          sourceId: m.value.sourceId,
          sourceDefinitionId: m.value.sourceDefinitionId,
          targetId: m.value.targetId,
          value: m.value.value,
        });
      }
    }
  };
  return heals;
}

test("max health: gaining max health heals 1 point from the same source", async () => {
  // 规则集：一名角色获得最大生命值后，获得1点相同来源的治疗
  // 断言：满血角色食用宝石闪闪后 11/11（治疗发生在最大生命值提高之后），且该治疗来源就是宝石闪闪本身
  const target = ref();
  const gem = ref();
  const c = setup(
    <State>
      <Character my active ref={target} health={10} />
      <Card my def={GlitteringGemstones} ref={gem} />
    </State>,
  );
  const heals = recordHeals(c);
  await c.me.card(gem, target);
  c.expect(target).toHaveVariable({ maxHealth: 11, health: 11 });
  expect(heals).toEqual([
    {
      sourceId: gem.id,
      sourceDefinitionId: GlitteringGemstones,
      targetId: target.id,
      value: 1,
    },
  ]);
});

test("max health: gained max health is kept when the character is defeated", async () => {
  // 规则集：一名角色获得的最大生命值不会随角色被击倒而移除
  // 断言：获得 1 点最大生命值的角色被击倒后，最大生命值仍为 11
  const target = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active def={Diluc} />
      <Character my active ref={target} health={1} />
      <Character my ref={next} />
      <Card my def={GlitteringGemstones} />
    </State>,
  );
  await c.me.card(GlitteringGemstones, target);
  c.expect(target).toHaveVariable({ maxHealth: 11, health: 2 });
  // 食用料理是快速行动，先宣布结束把行动权交给对方
  await c.me.end();
  await c.opp.skill(TemperedSword);
  await c.me.chooseActive(next);
  c.expect(target).toHaveVariable({ alive: 0, health: 0, maxHealth: 11 });
});

test("max health: heal beyond max health is not recorded by Ocean-Hued Clam", async () => {
  // 规则集：超出最大生命值的治疗量不会被部分能力记录，如 海染砗磲
  // 断言：9/10 的角色受到 2 点治疗，海染砗磲只累计实际治疗的 1 点（1+1=2，不足 3 不产生泡沫）
  const target = ref();
  const c = setup(
    <State>
      <Character my active ref={target} health={9}>
        <Equipment def={OceanhuedClam} v={{ healedPts: 1 }} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, target);
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.typeEquipment.def(OceanhuedClam)).toHaveVariable({
    healedPts: 2,
    bubble: 0,
  });
});

test("max health: max health from Sigewinne's passive is inherited after revive", async () => {
  // 规则集：最大生命值是永久角色值修改，不是角色状态或出战状态，击倒再复苏能继承已获得的最大生命值
  // 断言：生命之契被弃置触发细致入微的诊疗（最大生命值 11），角色被击倒再由提瓦特煎蛋复苏后最大生命值仍为 11
  const target = ref();
  const sigewinne = ref();
  const c = setup(
    <State>
      <Character opp active def={Diluc} />
      <Character my active ref={target} health={1}>
        <Status def={DetailedDiagnosisThoroughTreatmentStatus} />
        <Status def={BondOfLife} usage={1} />
      </Character>
      <Character my def={Sigewinne} ref={sigewinne} />
      <Card my def={MondstadtHashBrown} />
      <Card my def={TeyvatFriedEgg} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, target);
  // 治疗 2 点：1 点被生命之契抵消后生命之契弃置 → 最大生命值 +1 并治疗 1 点
  c.expect(target).toHaveVariable({ maxHealth: 11, health: 3 });
  await c.me.end();
  await c.opp.skill(SearingOnslaught);
  await c.me.chooseActive(sigewinne);
  c.expect(target).toHaveVariable({ alive: 0, maxHealth: 11 });
  // 我方本回合已宣布结束，等对方也结束，下一回合再打出提瓦特煎蛋复苏
  await c.opp.end();
  await c.me.card(TeyvatFriedEgg, target);
  c.expect(target).toHaveVariable({ alive: 1, health: 1, maxHealth: 11 });
});
