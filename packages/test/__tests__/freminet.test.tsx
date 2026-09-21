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

import { Card, Character, Equipment, ref, setup, State, Status, $ } from "#test";
import { PortablePowerSaw } from "@gi-tcg/data/internal/cards/equipment/weapon/claymore.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import {
  Freminet,
  MomentOfWakingAndResolve,
  PersTimer,
  PressurizedFloe,
} from "@gi-tcg/data/internal/characters/cryo/freminet.gts";
import { expect, test } from "vitest";

test("Freminet: level 2 Pers Timer does not reduce talent card cost", async () => {
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={PersTimer} v={{ level: 2 }} />
      </Character>
      <Card my def={MomentOfWakingAndResolve} />
      <Card my pile def={Paimon} />
    </State>,
  );
  const initialDice = c.state.players[0].dice.length;

  await c.me.card(MomentOfWakingAndResolve, freminet);

  expect(c.state.players[0].dice).toHaveLength(initialDice - 3);
});

test("Freminet: level 2 Pers Timer is disposed after playing talent card", async () => {
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={PersTimer} v={{ level: 2 }} />
      </Character>
      <Card my def={MomentOfWakingAndResolve} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.card(MomentOfWakingAndResolve, freminet);

  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: level 1 Pers Timer remains after playing talent card", async () => {
  const freminet = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet} ref={freminet}>
        <Status def={PersTimer} v={{ level: 1 }} />
      </Character>
      <Card my def={MomentOfWakingAndResolve} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.card(MomentOfWakingAndResolve, freminet);

  c.expect($.opp.active).toHaveVariable({ health: 8 });
  c.expect($.my.hand).toBeCount(1);
  c.expect($.my.typeStatus.def(PersTimer)).toHaveVariable({ level: 2 });
});

test("Freminet: newly created Pers Timer don't trigger onUseSkill", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Equipment def={PortablePowerSaw} v={{ stoic: 4 }} />
      </Character>
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.hand).toBeCount(4);
  c.expect($.my.typeStatus.def(PersTimer)).toHaveVariable({ level: 4 });
});

test("Freminet: existing Pers Timer is disposed at level 2", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 0 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 2 }} />
      </Character>
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 7 });
  c.expect($.my.hand).toBeCount(2);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});

test("Freminet: existing Pers Timer deals Physical DMG and is disposed at level 4", async () => {
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Freminet}>
        <Status def={PersTimer} v={{ level: 0 }} />
        <Equipment def={PortablePowerSaw} v={{ stoic: 4 }} />
      </Character>
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
      <Card my pile def={Paimon} />
    </State>,
  );

  await c.me.skill(PressurizedFloe);

  c.expect($.opp.active).toHaveVariable({ health: 4 });
  c.expect($.my.hand).toBeCount(4);
  c.expect($.my.typeStatus.def(PersTimer)).toNotExist();
});
