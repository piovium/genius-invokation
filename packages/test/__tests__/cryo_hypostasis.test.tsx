// Copyright (C) 2026 Piovium Labs
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.

import { Character, State, Status, ref, setup } from "#test";
import {
  Sucrose,
  WindSpiritCreation,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import {
  CryoCrystalCore,
  CryoHypostasis,
} from "@gi-tcg/data/internal/characters/cryo/cryo_hypostasis.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("cryo crystal core survives lethal anemo damage followed by swirl superconduct", async () => {
  const hypostasis = ref();
  const core = ref();
  const electroStandby = ref();
  const otherStandby = ref();
  const c = setup(
    <State>
      <Character my active def={Sucrose} />
      <Character
        opp
        active
        def={CryoHypostasis}
        health={1}
        aura={Aura.Cryo}
        ref={hypostasis}
      >
        <Status def={CryoCrystalCore} ref={core} />
      </Character>
      <Character opp health={10} aura={Aura.Electro} ref={electroStandby} />
      <Character opp health={10} ref={otherStandby} />
    </State>,
  );

  await c.me.skill(WindSpiritCreation);

  // “双扩”穿透命中 0 血无相之冰
  c.expect(electroStandby).toHaveVariable({ health: 8, aura: Aura.None });
  c.expect(otherStandby).toHaveVariable({ health: 8 });
  c.expect(core).toBeCount(0);
  // 两次伤害后正常免于被击倒
  c.expect(hypostasis).toHaveVariable({ health: 1, alive: 1 });
  expect(c.state.players[1].activeCharacterId).toBe(hypostasis.id);
});
