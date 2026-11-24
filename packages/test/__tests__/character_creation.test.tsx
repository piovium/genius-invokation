// Copyright (C) 2026 Piovium Labs
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { $, Card, Character, DeclaredEnd, State, ref, setup } from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  CryoCrystalCore,
  CryoHypostasis,
} from "@gi-tcg/data/internal/characters/cryo/cryo_hypostasis.gts";
import {
  FurinaOusia,
  FurinaPneuma,
  SeatsSacredAndSecular,
  SoloistsSolicitation,
  SoloistsSolicitationOusia,
} from "@gi-tcg/data/internal/characters/hydro/furina.gts";
import {
  RangedStance,
  Tartaglia,
} from "@gi-tcg/data/internal/characters/hydro/tartaglia.gts";
import { test } from "vitest";

test("reviving Tartaglia restores his stance without entering other characters", async () => {
  const revived = ref();
  const teammate = ref();
  const opponent = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character my def={Tartaglia} ref={revived} alive={0} health={0} />
      <Character my def={Tartaglia} ref={teammate} />
      <Character opp active def={Tartaglia} ref={opponent} />
      <Card my def={TeyvatFriedEgg} />
    </State>,
  );

  await c.me.card(TeyvatFriedEgg, revived);
  c.expect(revived).toHaveVariable({ alive: 1, health: 1 });
  c.expect($.typeStatus.def(RangedStance).at($.id(revived.id))).toBeUnique();
  c.expect($.typeStatus.def(RangedStance).at($.id(teammate.id))).toNotExist();
  c.expect($.typeStatus.def(RangedStance).at($.id(opponent.id))).toNotExist();
});

test("reviving Cryo Hypostasis does not restore its consumed initial crystal core", async () => {
  const revived = ref();
  const c = setup(
    <State>
      <Character my active />
      <Character
        my
        def={CryoHypostasis}
        ref={revived}
        alive={0}
        health={0}
        v={{ cryoCrystalCoreInitialUsage: 0 }}
      />
      <Character opp active />
      <Card my def={TeyvatFriedEgg} />
    </State>,
  );

  await c.me.card(TeyvatFriedEgg, revived);
  c.expect(revived).toHaveVariable({
    alive: 1,
    health: 1,
    cryoCrystalCoreInitialUsage: 0,
  });
  c.expect($.typeStatus.def(CryoCrystalCore).at($.id(revived.id))).toNotExist();
});

test("transforming Furina runs the destination selfEnter without entering the opposing Furina", async () => {
  const furina = ref();
  const opponent = ref();
  // Starting in action leaves the initial passive unused, making its execution observable.
  const c = setup(
    <State>
      <Character my active def={FurinaPneuma} ref={furina} />
      <Character opp active def={FurinaPneuma} ref={opponent} />
      <Card my def={SeatsSacredAndSecular} />
    </State>,
  );

  await c.me.card(SeatsSacredAndSecular);
  c.expect(furina).toBeDefinition(FurinaOusia);
  c.expect(furina).toHaveVariable({
    arkheSeatsSacredAndSecularInitialUsage: 0,
  });
  c.expect($.my.hand.def(SeatsSacredAndSecular)).toBeUnique();
  c.expect(opponent).toHaveVariable({
    arkheSeatsSacredAndSecularInitialUsage: 1,
  });
  c.expect($.opp.hand.def(SeatsSacredAndSecular)).toNotExist();

  await c.me.card(SeatsSacredAndSecular);
  c.expect(furina).toBeDefinition(FurinaPneuma);
  c.expect($.my.hand.def(SeatsSacredAndSecular)).toNotExist();
});

test.each([
  [FurinaPneuma, FurinaOusia, SoloistsSolicitation, SoloistsSolicitationOusia],
  [FurinaOusia, FurinaPneuma, SoloistsSolicitationOusia, SoloistsSolicitation],
] as const)(
  "Furina %s preserves initial and per-round counters through both form changes",
  async (initial, destination, normal, otherNormal) => {
    const furina = ref();
    const c = setup(
      <State phase="roll">
        <DeclaredEnd opp />
        <Character my active def={initial} ref={furina} health={7} />
        <Character opp active />
      </State>,
    );

    await c.stepToNextAction();
    c.expect($.my.hand.def(SeatsSacredAndSecular)).toBeUnique();
    await c.me.card(SeatsSacredAndSecular);
    c.expect(furina).toBeDefinition(destination);
    c.expect(furina).toHaveVariable({
      health: 7,
      energy: 0,
      usagePerRound1: 1,
      arkheSeatsSacredAndSecularInitialUsage: 0,
    });
    c.expect($.my.hand.def(SeatsSacredAndSecular)).toNotExist();

    await c.me.skill(otherNormal);
    c.expect($.my.hand.def(SeatsSacredAndSecular)).toBeUnique();
    c.expect(furina).toHaveVariable({ energy: 1, usagePerRound1: 0 });

    await c.me.card(SeatsSacredAndSecular);
    c.expect(furina).toBeDefinition(initial);
    c.expect(furina).toHaveVariable({
      health: 7,
      energy: 1,
      usagePerRound1: 0,
      arkheSeatsSacredAndSecularInitialUsage: 0,
    });
    c.expect($.my.hand.def(SeatsSacredAndSecular)).toNotExist();

    await c.me.skill(normal);
    c.expect($.my.hand.def(SeatsSacredAndSecular)).toNotExist();
  },
);
