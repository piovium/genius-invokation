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

import { ref, setup, Character, State, Status, Card, Equipment, $, Summon, Attachment, DeclaredEnd } from "#test";
import { QuickKnit } from "@gi-tcg/data/internal/cards/event/other.gts";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Ineffa } from "@gi-tcg/data/internal/characters/electro/ineffa.gts";
import { Conductive, Thundercloud } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { test } from "vitest";

test("thundercloud: trigger on gainUsage", async () => {
  const oppHand = ref();
  const thundercloud = ref();
  const c = setup(
    <State>
      <Card opp def={Paimon} ref={oppHand} />
      <Character my def={Ineffa} />
      <Summon my def={Thundercloud} ref={thundercloud} />
      <Card my def={QuickKnit} />
    </State>
  );
  c.expect(thundercloud).toHaveVariable({ usage: 1 });
  await c.me.card(QuickKnit, thundercloud);
  c.expect(thundercloud).toHaveVariable({ usage: 2 });
  c.expect($.attachment.def(Conductive).on($.id(oppHand.id))).toBeExist();
});

test("conductive: endPhase deals piercing damage to my max-health character", async () => {
  const active = ref();
  const standby = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character my active def={Ineffa} health={9} ref={active} />
      <Character my health={10} ref={standby} />
      <Character my alive={0} health={0} />
      <Card my def={Paimon}>
        <Attachment def={Conductive} v={{ layer: 1 }} />
      </Card>
      <Card my def={QuickKnit}>
        <Attachment def={Conductive} v={{ layer: 3 }} />
      </Card>
      <Card my pile def={Paimon}>
        <Attachment def={Conductive} v={{ layer: 1 }} />
      </Card>
    </State>
  );
  await c.me.end();
  // 第1张手牌的1层电击攻击生命值最高的后台角色：10 -> 9
  c.expect(standby).toHaveVariable({ health: 9 });
  // 第2张手牌的3层电击在生命值相同时攻击出战角色：9 -> 6
  c.expect(active).toHaveVariable({ health: 6 });
});
