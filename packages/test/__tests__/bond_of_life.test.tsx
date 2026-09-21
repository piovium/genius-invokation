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
  Character,
  State,
  Status,
  Card,
  Equipment,
  CombatStatus,
  Support,
  $,
} from "#test";
import { Aura } from "@gi-tcg/core/data";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { MondstadtHashBrown } from "@gi-tcg/data/internal/cards/event/food.gts";
import { VourukashasGlow } from "@gi-tcg/data/internal/cards/equipment/artifacts.gts";
import { BloomBlessingOvergrow } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import {
  FrostOperative,
  OnslaughtStance,
} from "@gi-tcg/data/internal/characters/cryo/frost_operative.gts";
import {
  Arlecchino,
  BlooddebtDirective,
  InvitationToABeheading,
} from "@gi-tcg/data/internal/characters/pyro/arlecchino.gts";
import { test } from "vitest";

test("bond of life decrease the heal", async () => {
  const active = ref();
  const c = setup(
    <State>
      <Character my health={5} maxHealth={6} ref={active}>
        <Status def={BondOfLife} usage={2} />
      </Character>
      <Card my def={MondstadtHashBrown} />
    </State>,
  );
  await c.me.card(MondstadtHashBrown, active);
  c.expect($.my.active).toHaveVariable({ health: 5 });
});

// https://github.com/piovium/genius-invokation/issues/544#issuecomment-5652483208
test("bond of life & FrostOperative", async () => {
  const active = ref();
  const bond = ref();
  const c = setup(
    <State currentTurn="opp">
      <Character opp active def={FrostOperative}>
        <Status def={OnslaughtStance} />
      </Character>
      <Character my active ref={active} health={10}>
        {/* 花海先附属，生命之契后附属，以此顺序响应结束阶段 */}
        <Equipment def={VourukashasGlow} />
        <Status def={BondOfLife} usage={2} ref={bond} />
      </Character>
    </State>,
  );
  await c.opp.end();
  await c.me.end();

  // 花海响应时尚未受伤，不应治疗或消耗生命之契
  c.expect(active).toHaveVariable({ health: 9 });
  c.expect(bond).toHaveVariable({ usage: 2 });
});

// https://github.com/piovium/genius-invokation/issues/544#issuecomment-5653003291
test("bond of life & Arlecchino", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} health={10} aura={Aura.Hydro}>
        <Status def={BondOfLife} usage={1} />
      </Character>
      <CombatStatus opp def={BlooddebtDirective} usage={2} />
      <Support my def={BloomBlessingOvergrow} />
      <Character my active def={Arlecchino}>
        <Status def={BondOfLife} usage={1} />
      </Character>
    </State>,
  );
  await c.me.skill(InvitationToABeheading);

  // 普攻 2 + 生命之契增伤 1 + 蒸发 2； 蔓生水伤 1
  c.expect(target).toHaveVariable({ health: 4 });
  c.expect($.opp.combatStatus.def(BlooddebtDirective)).toNotExist();
  // 伤害后：
  // +-- 蔓生：1水伤
  // |   伤害后：
  // |    \-- 血偿：契数 1 → 3
  // +-- 契：契数 3 → 0
  // \-- 血偿：契数 0 → 2
  c.expect($.typeStatus.def(BondOfLife).at($.opp.active)).toHaveVariable({ usage: 2 });
});
