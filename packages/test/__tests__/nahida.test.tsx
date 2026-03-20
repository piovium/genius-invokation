// Copyright (C) 2025 Guyutongxue
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


import { ref, setup, Character, State, Status, Card, Equipment } from "#test";
import { test } from "bun:test";
import { Aura } from "@gi-tcg/typings";
import { Nahida, SeedOfSkandha } from "@gi-tcg/data/internal/characters/dendro/nahida";
import { Kaboom, Klee } from "@gi-tcg/data/internal/characters/pyro/klee";
import { SweepingFervor, Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan";
import { Chasca, ShiningShadowhuntShellPyro } from "@gi-tcg/data/internal/characters/anemo/chasca";

test("seed of skandha: common scenario", async () => {
  const target = ref();
  const next = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Dendro} ref={target}>
        <Status def={SeedOfSkandha} />
      </Character>
      <Character opp health={10} ref={next}>
        <Status def={SeedOfSkandha} />
      </Character>
      <Character my def={Nahida} />
      <Character my active def={Klee} />
    </State>,
  );
  await c.me.skill(Kaboom);
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(next).toHaveVariable({ health: 9 });
});

test("seed of skandha: trigger on critical damage", async () => {
  const next = ref();
  const c = setup(
    <State>
      <Character opp active health={2} aura={Aura.Dendro}>
        <Status def={SeedOfSkandha} />
      </Character>
      <Character opp health={10} ref={next}>
        <Status def={SeedOfSkandha} />
      </Character>
      <Character my def={Nahida} />
      <Character my active def={Klee} />
    </State>,
  );
  await c.me.skill(Kaboom);
  await c.opp.chooseActive(next);
  c.expect(next).toHaveVariable({ health: 9 });
});

test("seed of skandha: won't trigger on early death", async () => {
  const next = ref();
  const c = setup(
    <State>
      <Character opp active health={4} aura={Aura.Dendro}>
        <Status def={SeedOfSkandha} />
      </Character>
      <Character opp health={10} ref={next}>
        <Status def={SeedOfSkandha} />
      </Character>
      <Character my def={Nahida} />
      <Character my active def={Xinyan} />
      <Character my def={Chasca} />
      <Card my def={ShiningShadowhuntShellPyro} />
    </State>,
  );
  await c.me.skill(SweepingFervor);
  await c.opp.chooseActive(next);
  c.expect(next).toHaveVariable({ health: 10 });
});
