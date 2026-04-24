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

import { Card, Character, DeclaredEnd, Equipment, ref, setup, State, Status, $ } from "#test";
import { test } from "bun:test";
import { Aura, SkillHandle } from "@gi-tcg/core/builder";
import { Keqing, StellarRestoration } from "@gi-tcg/data/internal/characters/electro/keqing";
import { HydroHilichurlRogue, MistBubbleSlime, SlashOfSurgingTides } from "@gi-tcg/data/internal/characters/hydro/hydro_hilichurl_rogue";

test("MistBubbleLockdown: normal", async () => {
  const active = ref();
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} />
      <Character my active ref={active}>
        <Equipment def={MistBubbleSlime} v={{ usage: 1 }} />
      </Character>
      <Character my def={HydroHilichurlRogue} />
    </State>,
  );
  await c.me.skill(1220511 as SkillHandle);
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toNotExist();
});

test("MistBubbleLockdown: switched during preparing", async () => {
  const active = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} def={Keqing} />
      <Character my active ref={active} aura={Aura.Pyro}>
        <Equipment def={MistBubbleSlime} v={{ usage: 1 }} />
      </Character>
      <Character my def={HydroHilichurlRogue} />
    </State>,
  );
  await c.me.skill(1220511 as SkillHandle);
  await c.opp.skill(StellarRestoration);
  c.expect($.my.prev).toBe(active);
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toNotExist();
});

test("SlashOfSurgingTides gain energy on critical damage", async () => {
  const active = ref();
  const c = setup(
    <State>
      <Character opp active health={2} aura={Aura.Cryo} />
      <Character my active ref={active} def={HydroHilichurlRogue} energy={0} />
    </State>
  );
  await c.me.skill(SlashOfSurgingTides);
  c.expect($.opp.active).toNotExist(); // 被击倒
  c.expect(active).toHaveVariable({ energy: 2 });
});
