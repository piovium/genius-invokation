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
  ref,
  setup,
  Character,
  State,
  Status,
  CombatStatus,
  Support,
  Equipment,
  DeclaredEnd,
  $,
} from "#test";
import {
  Neuvillette,
  AsWaterSeeksEquilibrium,
  OTearsIShallRepay,
  EquitableJudgment,
  EquitableJudgmentStatus,
  SourcewaterDroplet,
} from "@gi-tcg/data/internal/characters/hydro/neuvillette.gts";
import {
  Tatankasaurus,
  SpiritedState,
  TatankasaurusStatus01,
  TatankasaurusStatus02,
} from "@gi-tcg/data/internal/cards/equipment/techniques.gts";
import {
  CollectiveOfPlenty,
  Exercise,
} from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  Bennett,
  InspirationField,
} from "@gi-tcg/data/internal/characters/pyro/bennett.gts";
import { AurousBlaze } from "@gi-tcg/data/internal/characters/pyro/yoimiya.gts";
import { TreasureseekingSeelie } from "@gi-tcg/data/internal/cards/support/item.gts";
import { Frozen } from "@gi-tcg/data/internal/commons.gts";
import { expect, test } from "vitest";

// ---------- 准备 / 衍生 ----------

test("prepare status: uses skill X on next action and is disposed", async () => {
  // 规则集：选择行动时：若可行动->使用技能【X】，弃置此状态
  // 那维莱特普攻后准备衡平推裁；对方已宣布结束，下次行动直接使用并弃置状态
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11} />
      <CombatStatus my def={SourcewaterDroplet} usage={1} />
    </State>,
  );
  await c.me.skill(AsWaterSeeksEquilibrium);
  // 普攻 1 + 衡平推裁 3（生命 >= 6）
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.def(EquitableJudgmentStatus)).toNotExist();
});

test("prepare status: kept while character cannot act, fires once it can", async () => {
  // 规则集：选择行动时：若可行动->使用技能【X】，弃置此状态
  // 冻结时不可行动：状态保留；下回合解冻后才使用技能
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11}>
        <Status def={EquitableJudgmentStatus} />
        <Status def={Frozen} />
      </Character>
    </State>,
  );
  await c.me.end();
  c.expect($.my.def(EquitableJudgmentStatus)).toBeExist();
  c.expect($.opp.active).toHaveVariable({ health: 10 });
  await c.opp.end();
  // 第 2 回合我方先手，冻结已移除，准备的技能发动
  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.def(EquitableJudgmentStatus)).toNotExist();
});

test("prepare status: disposed after switching to standby", async () => {
  // 规则集：切换到后台后：弃置此状态
  const other = ref();
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11}>
        <Status def={EquitableJudgmentStatus} />
        <Status def={Frozen} />
      </Character>
      <Character my ref={other} />
    </State>,
  );
  await c.me.switch(other);
  c.expect($.my.def(EquitableJudgmentStatus)).toNotExist();
  c.expect($.opp.active).toHaveVariable({ health: 10 });
});

test("derived skill: can only be used via prepare", async () => {
  // 规则集：【衍生技能】只能通过【准备】的方式使用
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11} />
    </State>,
  );
  // 衍生技能不在可用行动列表中（而非「Not your turn」等其它错误）
  await expect(c.me.skill(EquitableJudgment)).rejects.toThrow(
    /cannot use skill/,
  );
});

test("derived skill: does not gain energy", async () => {
  // 规则集：使用【衍生技能】不会获得充能
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11} energy={0} />
      <CombatStatus my def={SourcewaterDroplet} usage={1} />
    </State>,
  );
  await c.me.skill(AsWaterSeeksEquilibrium);
  // 衡平推裁已发动（10 - 1 - 3）
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  // 只有普攻获得 1 点充能
  c.expect($.my.active).toHaveVariable({ energy: 1 });
});

test("derived skill: does not trigger after-skill effects", async () => {
  // 规则集：【衍生技能】不能触发【使用技能后】
  // 衡平推裁为普通攻击类型但是衍生技能，不触发「角色使用普通攻击后」的源水之滴，
  // 也不触发寻宝仙灵的「我方角色使用技能后」
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11} />
      <CombatStatus my def={SourcewaterDroplet} usage={2} />
      <Support my def={TreasureseekingSeelie} />
    </State>,
  );
  await c.me.skill(AsWaterSeeksEquilibrium);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  // 只消耗了普攻那一层
  c.expect($.my.def(SourcewaterDroplet)).toHaveVariable({ usage: 1 });
  c.expect($.my.def(EquitableJudgmentStatus)).toNotExist();
  // 寻宝线索只计普攻一次
  c.expect($.my.def(TreasureseekingSeelie)).toHaveVariable({ clue: 1 });
});

test("note: Neuvillette with two droplets uses Spirited State: two normal attacks then one Equitable Judgment", async () => {
  // 规则集：具有两层源水之滴的那维莱特使用【昂扬状态】，会先使用两次【普通攻击】，再使用一次【横平推裁】，消耗2层水滴
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11}>
        <Equipment def={Tatankasaurus} />
      </Character>
      <CombatStatus my def={SourcewaterDroplet} usage={2} />
    </State>,
  );
  await c.me.skill(SpiritedState);
  // 普攻 1 + 普攻 1 + 衡平推裁 3
  c.expect($.opp.active).toHaveVariable({ health: 5 });
  // 衡平推裁只发动一次：自身只受 1 点穿透
  c.expect($.my.active).toHaveVariable({ health: 10 });
  c.expect($.my.def(SourcewaterDroplet)).toNotExist();
  c.expect($.my.def(EquitableJudgmentStatus)).toNotExist();
});

// ---------- 突角龙 ----------

test("Tatankasaurus: two prepares and two normal attacks in total", async () => {
  // 规则集：总共发动了2次准备和2次普通攻击技能
  // 对方以切人交替行动，逐步观察：准备①→普攻→准备②→普攻；每次普攻都占用我方一次行动
  const oppA = ref();
  const oppB = ref();
  const c = setup(
    <State>
      <Character opp active ref={oppA} health={10} />
      <Character opp ref={oppB} health={10} />
      <Character my active def={Bennett} health={10}>
        <Equipment def={Tatankasaurus} />
      </Character>
    </State>,
  );
  await c.me.skill(SpiritedState);
  c.expect($.my.def(TatankasaurusStatus01)).toBeExist();
  c.expect($.my.def(TatankasaurusStatus02)).toNotExist();
  c.expect(oppA).toHaveVariable({ health: 10 });
  await c.opp.switch(oppB);
  // 我方行动被替换为普攻（好运剑 2 物理），随后轮到对方
  c.expect(oppB).toHaveVariable({ health: 8 });
  c.expect($.my.def(TatankasaurusStatus01)).toNotExist();
  c.expect($.my.def(TatankasaurusStatus02)).toBeExist();
  expect(c.state.currentTurn).toBe(1);
  await c.opp.switch(oppA);
  c.expect(oppA).toHaveVariable({ health: 8 });
  c.expect($.my.def(TatankasaurusStatus02)).toNotExist();
  expect(c.state.currentTurn).toBe(1);
});

test.fails("Tatankasaurus with Collective of Plenty: exercise reaches 5 and both normal attacks are boosted", async () => {
  // 规则集：己方有沃陆之邦，使用昂扬状态，先准备：【突角龙（生效中）】获得3层锻炼，再准备：【普通攻击】，达到5层锻炼，2次普通攻击能得到增伤；
  // 当前引擎：第二次准备状态的进入事件（沃陆之邦 +3 锻炼）排在第一次普攻的 requestUseSkill 之后处理，
  // 首次普攻时锻炼仅 3 层不增伤，对方生命 5 而非 4
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Bennett} health={10}>
        <Equipment def={Tatankasaurus} />
      </Character>
      <Support my def={CollectiveOfPlenty} />
    </State>,
  );
  await c.me.skill(SpiritedState);
  c.expect($.my.def(Exercise)).toHaveVariable({ layer: 5 });
  // 两次普攻均为 2 + 1
  c.expect($.opp.active).toHaveVariable({ health: 4 });
});

test("Tatankasaurus: prepared normal attacks gain energy", async () => {
  // 规则集：普通攻击可以正常获得充能
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Bennett} health={10} energy={0}>
        <Equipment def={Tatankasaurus} />
      </Character>
    </State>,
  );
  await c.me.skill(SpiritedState);
  c.expect($.opp.active).toHaveVariable({ health: 6 });
  c.expect($.my.active).toHaveVariable({ energy: 2 });
});

test("Tatankasaurus: prepared normal attacks trigger after-skill effects (Aurous Blaze)", async () => {
  // 规则集：【突角龙②】准备的【普通攻击】是【原生技能】，可以触发【使用技能后】；触发仙灵、琉金火光等效果
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Bennett} health={10}>
        <Equipment def={Tatankasaurus} />
      </Character>
      <CombatStatus my def={AurousBlaze} />
      <Support my def={TreasureseekingSeelie} />
    </State>,
  );
  await c.me.skill(SpiritedState);
  // 物理 2 + 火 1 + 物理 2 + 火 1（火附着后再受火无反应）
  c.expect($.opp.active).toHaveVariable({ health: 4 });
  // 寻宝仙灵计到 2 次（昂扬状态本身是特技，不计）
  c.expect($.my.def(TreasureseekingSeelie)).toHaveVariable({ clue: 2 });
});

// ---------- 那维莱特 ----------

test("Neuvillette passive: after normal attack consumes a droplet, heals 2 and prepares Equitable Judgment", async () => {
  // 规则集：角色使用普通攻击后：消耗一层【源水之滴】->治疗角色2点，然后角色准备：横平推裁
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={5} />
      <CombatStatus my def={SourcewaterDroplet} usage={2} />
    </State>,
  );
  await c.me.skill(AsWaterSeeksEquilibrium);
  c.expect($.my.def(SourcewaterDroplet)).toHaveVariable({ usage: 1 });
  c.expect($.my.active).toHaveVariable({ health: 7 });
  c.expect($.my.def(EquitableJudgmentStatus)).toBeExist();
});

test("Sourcewater Droplet stacks up to 3", async () => {
  // 规则集：源水之滴（出战状态）最多叠加到3层
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={11} />
      <CombatStatus my def={SourcewaterDroplet} usage={2} />
    </State>,
  );
  await c.me.skill(OTearsIShallRepay);
  c.expect($.my.def(SourcewaterDroplet)).toHaveVariable({ usage: 3 });
  await c.me.skill(OTearsIShallRepay);
  c.expect($.my.def(SourcewaterDroplet)).toHaveVariable({ usage: 3 });
});

test("Neuvillette passive resolves before Inspiration Field", async () => {
  // 规则集：（诉论心证）是角色技能，早于【鼓舞领域】等出战状态发动
  // 生命 5：先源水之滴治疗到 7，再结算鼓舞领域（7 > 6 不治疗）；顺序反了会到 9
  const c = setup(
    <State>
      <Character opp active health={10} />
      <Character my active def={Neuvillette} health={5} />
      <CombatStatus my def={SourcewaterDroplet} usage={1} />
      <CombatStatus my def={InspirationField} />
    </State>,
  );
  await c.me.skill(AsWaterSeeksEquilibrium);
  c.expect($.my.active).toHaveVariable({ health: 7 });
});
