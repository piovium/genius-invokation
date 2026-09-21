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

import { ref, setup, Card, Character, Equipment, State, Status } from "#test";
import {
  CrownOfWatatsumi,
  UnmovableMountain,
} from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { RainbowMacaronsInEffect } from "@gi-tcg/data/internal/cards/event/food.gts";
import { WaterAndJustice } from "@gi-tcg/data/internal/cards/event/other.gts";
import { DandelionBreeze, Jean } from "@gi-tcg/data/internal/characters/anemo/jean.gts";
import { CelestialShower, Ganyu } from "@gi-tcg/data/internal/characters/cryo/ganyu.gts";
import { DamageType } from "@gi-tcg/typings";
import { expect, test } from "vitest";

interface DamageRecord {
  damageType: DamageType;
  targetId: number;
  value: number;
}

/** 按 who 视角收到的通知，逐条记录伤害/治疗，数组顺序即引擎的结算顺序 */
function recordDamages(c: ReturnType<typeof setup>, who: 0 | 1) {
  const records: DamageRecord[] = [];
  c.game.players[who].io.notify = ({ mutation }) => {
    for (const { mutation: m } of mutation) {
      if (m?.$case === "damage") {
        records.push({
          damageType: m.value.damageType,
          targetId: m.value.targetId,
          value: m.value.value,
        });
      }
    }
  };
  return records;
}

/** 从记录中取出指定伤害类型的目标顺序 */
function targetsOf(records: DamageRecord[], damageType: DamageType) {
  return records
    .filter((r) => r.damageType === damageType)
    .map((r) => r.targetId);
}

test("multi-target damage: resolves next -> next (wraps around after the last character)", async () => {
  // 规则集：多目标效果按照 出战角色->下一个角色->下一个角色 的顺序依次结算
  // 断言：对方出战角色在中间位置时，后台穿透伤害先结算右侧「下一个」，再回绕到左侧角色
  const oppLeft = ref();
  const oppActive = ref();
  const oppRight = ref();
  const c = setup(
    <State>
      <Character opp ref={oppLeft} />
      <Character opp active ref={oppActive} />
      <Character opp ref={oppRight} />
      <Character my active def={Ganyu} energy={3} />
    </State>,
  );
  const records = recordDamages(c, 0);
  await c.me.skill(CelestialShower);
  expect(targetsOf(records, DamageType.Piercing)).toEqual([
    oppRight.id,
    oppLeft.id,
  ]);
});

test("multi-target heal: resolves active -> next -> next", async () => {
  // 规则集：多目标效果按照 出战角色->下一个角色->下一个角色 的顺序依次结算
  // 断言：琴的「蒲公英之风」治疗全体时，先出战角色，再右侧角色，最后回绕到左侧角色
  const myLeft = ref();
  const jean = ref();
  const myRight = ref();
  const c = setup(
    <State>
      <Character my ref={myLeft} health={5} />
      <Character my active def={Jean} ref={jean} health={5} energy={2} />
      <Character my ref={myRight} health={5} />
    </State>,
  );
  const records = recordDamages(c, 0);
  await c.me.skill(DandelionBreeze);
  expect(targetsOf(records, DamageType.Heal)).toEqual([
    jean.id,
    myRight.id,
    myLeft.id,
  ]);
});

test("WaterAndJustice: equalize health first, then heal every character by 1", async () => {
  // 规则集：平均分配我方未被击倒的角色的生命值，然后治疗所有我方角色1点
  // 断言：[10,10,4] 先平均为 [8,8,8]，再各治疗 1 点 → [9,9,9]（若先治疗再平均会得到 [9,8,8]）
  const a = ref();
  const b = ref();
  const d = ref();
  const c = setup(
    <State>
      <Character my active ref={a} health={10} />
      <Character my ref={b} health={10} />
      <Character my ref={d} health={4} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(a).toHaveVariable({ health: 9 });
  c.expect(b).toHaveVariable({ health: 9 });
  c.expect(d).toHaveVariable({ health: 9 });
});

test("WaterAndJustice: defeated characters are excluded from distribution", async () => {
  // 规则集：平均分配我方未被击倒的角色的生命值
  // 断言：已倒下角色不参与平均（也不计入人数），[9, 倒下, 3] → 存活两人各 6，再治疗 1 → 7
  const a = ref();
  const defeated = ref();
  const d = ref();
  const c = setup(
    <State>
      <Character my active ref={a} health={9} />
      <Character my ref={defeated} health={0} alive={0} />
      <Character my ref={d} health={3} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(a).toHaveVariable({ health: 7 });
  c.expect(d).toHaveVariable({ health: 7 });
  c.expect(defeated).toHaveVariable({ health: 0, alive: 0 });
});

test.each([
  // 总计 13，平均 4 余 1：余数给出战角色
  { left: 10, active: 1, right: 2, expected: { active: 6, right: 5, left: 5 } },
  // 总计 14，平均 4 余 2：余数依次给出战角色、下一个角色
  { left: 10, active: 1, right: 3, expected: { active: 6, right: 6, left: 5 } },
])(
  "WaterAndJustice: remainder goes to active first, then next ($left/$active/$right)",
  async ({ left, active, right, expected }) => {
    // 规则集：平均后有余数的场合，按照【多目标效果】顺序分配多余的生命值
    // 断言：出战角色在中间位置时，余数先给出战角色，再给其右侧角色，而不是按角色栏位从左到右
    const myLeft = ref();
    const myActive = ref();
    const myRight = ref();
    const c = setup(
      <State>
        <Character my ref={myLeft} health={left} />
        <Character my active ref={myActive} health={active} />
        <Character my ref={myRight} health={right} />
        <Card my def={WaterAndJustice} />
      </State>,
    );
    await c.me.card(WaterAndJustice);
    c.expect(myActive).toHaveVariable({ health: expected.active });
    c.expect(myRight).toHaveVariable({ health: expected.right });
    c.expect(myLeft).toHaveVariable({ health: expected.left });
  },
);

test("WaterAndJustice: remainder order wraps around when active is the last character", async () => {
  // 规则集：平均后有余数的场合，按照【多目标效果】顺序分配多余的生命值
  // 断言：出战角色在最右侧时，「下一个角色」回绕到最左侧：总计 14，平均 4 余 2 → 出战 5、最左 5、中间 4，再各治疗 1
  const myLeft = ref();
  const myMid = ref();
  const myActive = ref();
  const c = setup(
    <State>
      <Character my ref={myLeft} health={1} />
      <Character my ref={myMid} health={3} />
      <Character my active ref={myActive} health={10} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(myActive).toHaveVariable({ health: 6 });
  c.expect(myLeft).toHaveVariable({ health: 6 });
  c.expect(myMid).toHaveVariable({ health: 5 });
});

test("WaterAndJustice: remainder goes to active, not to the leftmost surviving character", async () => {
  // 规则集：平均分配我方未被击倒的角色的生命值；注：平均后有余数的场合，按照【多目标效果】顺序分配多余的生命值
  // 断言：中间角色已倒下、出战角色在最右侧时，存活两人总计 11、平均 5 余 1，
  //       余数给出战角色而非栏位更靠左的存活角色（按栏位分配会得到最左 7、出战 6）
  const myLeft = ref();
  const defeated = ref();
  const myActive = ref();
  const c = setup(
    <State>
      <Character my ref={myLeft} health={1} />
      <Character my ref={defeated} health={0} alive={0} />
      <Character my active ref={myActive} health={10} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(myActive).toHaveVariable({ health: 7 });
  c.expect(myLeft).toHaveVariable({ health: 6 });
  c.expect(defeated).toHaveVariable({ health: 0, alive: 0 });
});

test("WaterAndJustice: decrease is piercing damage (ignores shield) and triggers damaged effects", async () => {
  // 规则集：平均分配是指，根据目标生命值造成对应的穿透伤害或治疗，能触发对应受到伤害后效果
  // 断言：[10,4,4] 平均为 6，出战角色受到 4 点穿透伤害：护盾不减少；「缤纷马卡龙（生效中）」触发一次（可用次数 3→2）并治疗 1 点
  const a = ref();
  const b = ref();
  const d = ref();
  const shield = ref();
  const macarons = ref();
  const c = setup(
    <State>
      <Character my active ref={a} health={10}>
        <Status def={UnmovableMountain} ref={shield} />
        <Status def={RainbowMacaronsInEffect} ref={macarons} />
      </Character>
      <Character my ref={b} health={4} />
      <Character my ref={d} health={4} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(shield).toHaveVariable({ shield: 2 });
  c.expect(macarons).toHaveVariable({ usage: 2 });
  // 6（平均）+ 1（水与正义治疗）+ 1（马卡龙治疗）
  c.expect(a).toHaveVariable({ health: 8 });
  c.expect(b).toHaveVariable({ health: 7 });
  c.expect(d).toHaveVariable({ health: 7 });
});

test("WaterAndJustice: increase is heal and triggers healed effects", async () => {
  // 规则集：平均分配是指，根据目标生命值造成对应的穿透伤害或治疗，能触发对应治疗后效果
  // 断言：[7,4,4] 平均为 5，两名后台角色各受到 1 点治疗；「海祇之冠」累计治疗 1+1（分配）+1+1+1（结算后治疗）= 5 → 1 个泡沫、余 2 点
  const a = ref();
  const b = ref();
  const d = ref();
  const crown = ref();
  const c = setup(
    <State>
      <Character my active ref={a} health={7}>
        <Equipment def={CrownOfWatatsumi} ref={crown} />
      </Character>
      <Character my ref={b} health={4} />
      <Character my ref={d} health={4} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(a).toHaveVariable({ health: 6 });
  c.expect(b).toHaveVariable({ health: 6 });
  c.expect(d).toHaveVariable({ health: 6 });
  c.expect(crown).toHaveVariable({ bubble: 1, healedPts: 2 });
});

test("WaterAndJustice: character whose health is unchanged triggers no damaged effect", async () => {
  // 规则集：平均分配……能触发对应受到伤害后/治疗后效果（没有增减则无）
  // 断言：[9,5,1] 平均为 5，中间角色生命不变，其「缤纷马卡龙（生效中）」不触发（可用次数仍为 3）；出战角色受到伤害则触发（3→2）
  const a = ref();
  const b = ref();
  const d = ref();
  const macaronsA = ref();
  const macaronsB = ref();
  const c = setup(
    <State>
      <Character my active ref={a} health={9}>
        <Status def={RainbowMacaronsInEffect} ref={macaronsA} />
      </Character>
      <Character my ref={b} health={5}>
        <Status def={RainbowMacaronsInEffect} ref={macaronsB} />
      </Character>
      <Character my ref={d} health={1} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  await c.me.card(WaterAndJustice);
  c.expect(macaronsA).toHaveVariable({ usage: 2 });
  c.expect(macaronsB).toHaveVariable({ usage: 3 });
  c.expect(b).toHaveVariable({ health: 6 });
  c.expect(d).toHaveVariable({ health: 6 });
});

test("WaterAndJustice: distribution emits piercing/heal only for changed characters", async () => {
  // 规则集：平均分配是指，根据目标生命值造成对应的 穿透伤害 或 治疗，能触发对应受到伤害后/治疗后效果（没有增减则无）
  // 断言：[9,5,1] 平均为 5，逐目标结算依次为：出战角色 4 点穿透伤害、生命值恰等于平均值的角色无任何结算、
  //       第三名角色 4 点治疗；随后才是「治疗所有我方角色1点」（顺序为出战->下一个->下一个）
  const a = ref();
  const b = ref();
  const d = ref();
  const c = setup(
    <State>
      <Character my active ref={a} health={9} />
      <Character my ref={b} health={5} />
      <Character my ref={d} health={1} />
      <Card my def={WaterAndJustice} />
    </State>,
  );
  const records = recordDamages(c, 0);
  await c.me.card(WaterAndJustice);
  expect(records).toEqual([
    { damageType: DamageType.Piercing, targetId: a.id, value: 4 },
    { damageType: DamageType.Heal, targetId: d.id, value: 4 },
    { damageType: DamageType.Heal, targetId: a.id, value: 1 },
    { damageType: DamageType.Heal, targetId: b.id, value: 1 },
    { damageType: DamageType.Heal, targetId: d.id, value: 1 },
  ]);
});
