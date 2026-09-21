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
import { test } from "vitest";
import { Aura, SkillHandle } from "@gi-tcg/core/data";
import { Keqing, StellarRestoration } from "@gi-tcg/data/internal/characters/electro/keqing.gts";
import { HydroHilichurlRogue, MistBubbleLockdownPreparing, MistBubbleSlime, SlashOfSurgingTides } from "@gi-tcg/data/internal/characters/hydro/hydro_hilichurl_rogue.gts";

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

// 规则集：水泡史莱姆「可用次数：2，耗尽时不弃置此牌」
//         水泡封锁「……若所附属角色的【水泡史莱姆】可用次数为0，弃置【水泡史莱姆】」
//         注「①水泡史莱姆在第二次准备特技结算完后才弃置」
test("MistBubbleSlime: kept after the first prepared skill, disposed after the second", async () => {
  const target = ref();
  const c = setup(
    <State>
      <DeclaredEnd opp />
      <Character opp active ref={target} />
      <Character my active>
        <Equipment def={MistBubbleSlime} />
      </Character>
      <Character my def={HydroHilichurlRogue} />
    </State>,
  );
  // 第一次：可用次数 2 -> 1，准备特技结算后仍不弃置
  await c.me.skill(1220511 as SkillHandle);
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toHaveVariable({
    usage: 1,
  });
  // 第二次：可用次数 1 -> 0，准备特技结算完后才弃置
  await c.me.skill(1220511 as SkillHandle);
  c.expect(target).toHaveVariable({ health: 8 });
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toNotExist();
});

// 规则集：水泡史莱姆「①所附属角色切换到后台后：若此牌可用次数为0->弃置此牌」
// 可用次数不为 0 时切换到后台：不弃置此牌（准备中状态则随切人移除）。
test("MistBubbleSlime: not disposed when switched to standby with usage remaining", async () => {
  const active = ref();
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} def={Keqing} />
      <Character my active ref={active} aura={Aura.Pyro}>
        <Equipment def={MistBubbleSlime} />
      </Character>
      <Character my def={HydroHilichurlRogue} />
    </State>,
  );
  await c.me.skill(1220511 as SkillHandle);
  // 超载使我方出战角色被强制切换到后台
  await c.opp.skill(StellarRestoration);
  c.expect($.my.prev).toBe(active);
  c.expect(target).toHaveVariable({ health: 10 });
  c.expect($.my.typeStatus.def(MistBubbleLockdownPreparing)).toNotExist();
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toHaveVariable({
    usage: 1,
  });
});

// 规则集：水泡史莱姆「可用次数：2，耗尽时不弃置此牌」
//         注「①水泡史莱姆在第二次准备特技结算完后才弃置」
// 第二次使用特技后可用次数已为 0，但准备特技尚未结算，此牌仍在场。
test("MistBubbleSlime: kept with 0 usages until the second prepared skill resolves", async () => {
  const target = ref();
  const c = setup(
    <State>
      <Character opp active ref={target} />
      <Character my active>
        <Equipment def={MistBubbleSlime} v={{ usage: 1 }} />
      </Character>
      <Character my def={HydroHilichurlRogue} />
    </State>,
  );
  // 使用特技后可用次数 1 -> 0，准备特技尚未结算：不弃置此牌
  await c.me.skill(1220511 as SkillHandle);
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toHaveVariable({
    usage: 0,
  });
  c.expect($.my.typeStatus.def(MistBubbleLockdownPreparing)).toBeExist();
  // 对方行动后轮到我方，准备特技结算（造成 1 点伤害），结算完才弃置
  await c.opp.end();
  c.expect(target).toHaveVariable({ health: 9 });
  c.expect($.my.typeEquipment.def(MistBubbleSlime)).toNotExist();
});
