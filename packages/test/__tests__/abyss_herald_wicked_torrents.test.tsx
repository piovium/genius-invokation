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
  Equipment,
  ref,
  setup,
  State,
  Status,
} from "#test";
import {
  AbyssHeraldWickedTorrents,
  CurseOfTheUndercurrent,
  SurgingUndercurrent,
  SurgingUndercurrentCombatStatus,
  WateryRebirthHoned,
  WateryRebirthStatus,
} from "@gi-tcg/data/internal/characters/hydro/abyss_herald_wicked_torrents.gts";
import {
  Ningguang,
  SparklingScatter,
} from "@gi-tcg/data/internal/characters/geo/ningguang.gts";
import { test } from "vitest";

// 规则集：暗流涌动「①入场时：若角色未附属【水之新生】->在对方场上生成【暗流的诅咒】」
//         「②入场时：生成【暗流涌动（出战状态）】」
// 角色仍附属【水之新生】时，只生成出战状态，不生成【暗流的诅咒】。
test("surging undercurrent: entering while Watery Rebirth is attached only creates the combat status", async () => {
  const herald = ref();
  const c = setup(
    <State>
      <Character my active def={AbyssHeraldWickedTorrents} ref={herald}>
        <Status def={WateryRebirthStatus} />
      </Character>
      <Card my def={SurgingUndercurrent} />
      <Character opp active />
    </State>,
  );
  await c.me.card(SurgingUndercurrent, herald);
  c.expect($.my.combatStatus.def(SurgingUndercurrentCombatStatus)).toBeExist();
  c.expect($.opp.combatStatus.def(CurseOfTheUndercurrent)).toNotExist();
});

// 规则集：暗流涌动「①入场时：若角色未附属【水之新生】->在对方场上生成【暗流的诅咒】」
// 【水之新生】已触发而被移除（角色未附属）后再打出天赋牌：生成【暗流的诅咒】。
test("surging undercurrent: entering without Watery Rebirth creates the curse", async () => {
  const herald = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={AbyssHeraldWickedTorrents}
        ref={herald}
        health={1}
      >
        <Status def={WateryRebirthStatus} />
      </Character>
      <Card my def={SurgingUndercurrent} />
      <Character opp active def={Ningguang} />
    </State>,
  );
  // 先触发【水之新生】使其被移除（此时尚未装备天赋，不会生成诅咒）
  await c.opp.skill(SparklingScatter);
  c.expect(herald).toHaveVariable({ health: 4 });
  c.expect($.my.typeStatus.def(WateryRebirthStatus)).toNotExist();
  c.expect($.opp.combatStatus.def(CurseOfTheUndercurrent)).toNotExist();
  await c.me.card(SurgingUndercurrent, herald);
  c.expect($.opp.combatStatus.def(CurseOfTheUndercurrent)).toHaveVariable({
    usage: 2,
  });
  c.expect($.my.combatStatus.def(SurgingUndercurrentCombatStatus)).toBeExist();
});

// 规则集：暗流涌动「③角色附属的【水之新生】被移除后：在对方场上生成【暗流的诅咒】」
test("surging undercurrent: creates the curse when Watery Rebirth is removed", async () => {
  const herald = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={AbyssHeraldWickedTorrents}
        ref={herald}
        health={1}
      >
        <Status def={WateryRebirthStatus} />
        <Equipment def={SurgingUndercurrent} />
      </Character>
      <Character opp active def={Ningguang} />
    </State>,
  );
  await c.opp.skill(SparklingScatter);
  c.expect($.my.typeStatus.def(WateryRebirthStatus)).toNotExist();
  c.expect($.my.typeStatus.def(WateryRebirthHoned)).toBeExist();
  c.expect($.opp.combatStatus.def(CurseOfTheUndercurrent)).toHaveVariable({
    usage: 2,
  });
});

// 规则集：暗流涌动（出战状态）「我方深渊使徒·激流被击倒后：在对方场上生成【暗流的诅咒】，移除此效果」
test("surging undercurrent combat status: creates the curse and is removed when our herald is defeated", async () => {
  const herald = ref();
  const other = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character
        my
        active
        def={AbyssHeraldWickedTorrents}
        ref={herald}
        health={1}
      />
      <Character my ref={other} />
      <CombatStatus my def={SurgingUndercurrentCombatStatus} />
      <Character opp active def={Ningguang} />
    </State>,
  );
  await c.opp.skill(SparklingScatter);
  c.expect(herald).toHaveVariable({ alive: 0 });
  await c.me.chooseActive(other);
  c.expect($.opp.combatStatus.def(CurseOfTheUndercurrent)).toHaveVariable({
    usage: 2,
  });
  c.expect($.my.combatStatus.def(SurgingUndercurrentCombatStatus)).toNotExist();
});

// 规则集：暗流涌动（出战状态）「我方深渊使徒·激流被击倒后：……」
// 限定「我方」：对方的深渊使徒·激流被击倒不触发此出战状态。
test("surging undercurrent combat status: not triggered by the opponent's herald being defeated", async () => {
  const oppHerald = ref();
  const oppOther = ref();
  const c = setup(
    <State>
      <Character my active def={Ningguang} />
      <CombatStatus my def={SurgingUndercurrentCombatStatus} />
      <Character
        opp
        active
        def={AbyssHeraldWickedTorrents}
        ref={oppHerald}
        health={1}
      />
      <Character opp ref={oppOther} />
    </State>,
  );
  await c.me.skill(SparklingScatter);
  c.expect(oppHerald).toHaveVariable({ alive: 0 });
  await c.opp.chooseActive(oppOther);
  // 双方场上都不应出现【暗流的诅咒】
  c.expect($.combatStatus.def(CurseOfTheUndercurrent)).toNotExist();
  c.expect($.my.combatStatus.def(SurgingUndercurrentCombatStatus)).toBeExist();
});
