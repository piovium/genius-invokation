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
  Attachment,
  Card,
  Character,
  ref,
  setup,
  State,
  Support,
} from "#test";
import { Strategize } from "@gi-tcg/data/internal/cards/event/other.gts";
import { CentralLaboratoryRuins } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  ShadowhuntShell,
  ShiningShadowhuntShellPyro,
} from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { OverchargedBall } from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import {
  RiffRevolution,
  Xinyan,
} from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { CostReduction } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "vitest";

test("riff revolution: discards the most expensive hand card first", async () => {
  // 规则集：舍弃多张手牌，按照当前元素骰费用，从费用最高|先入手 的优先级顺序舍弃
  // 追影弹（3 费，风元素伤害）比超量装药弹头（2 费，火元素伤害）先舍弃：
  // 风伤打在无附着的出战角色上不扩散，随后火伤才附着火元素
  const target = ref();
  const standby = ref();
  const c = setup(
    <State random={0}>
      <Character opp active ref={target} />
      <Character opp ref={standby} />
      <Character my active def={Xinyan} energy={2} />
      <Card my def={OverchargedBall} />
      <Card my def={ShadowhuntShell} />
    </State>,
  );
  await c.me.skill(RiffRevolution);
  // 3 点物理 + 1 点风（无扩散） + 1 点火
  c.expect(target).toHaveVariable({ health: 5, aura: Aura.Pyro });
  // 后台只受到叛逆刮弦的 2 点穿透，没有扩散伤害
  c.expect(standby).toHaveVariable({ health: 8, aura: Aura.None });
  c.expect($.my.hand).toNotExist();
});

test("riff revolution: equal cost cards are discarded in hand order", async () => {
  // 规则集：舍弃多张手牌，按照当前元素骰费用，从费用最高|先入手 的优先级顺序舍弃
  // 两张追影弹同为 3 费，先入手的火元素追影弹先舍弃并附着火元素，
  // 随后的风元素追影弹才能扩散
  const target = ref();
  const standby = ref();
  const c = setup(
    <State random={0}>
      <Character opp active ref={target} />
      <Character opp ref={standby} />
      <Character my active def={Xinyan} energy={2} />
      <Card my def={ShiningShadowhuntShellPyro} />
      <Card my def={ShadowhuntShell} />
    </State>,
  );
  await c.me.skill(RiffRevolution);
  // 3 点物理 + 1 点火（附着） + 1 点风（扩散火，消耗附着）
  c.expect(target).toHaveVariable({ health: 5, aura: Aura.None });
  // 后台：2 点穿透 + 1 点扩散火
  c.expect(standby).toHaveVariable({ health: 7, aura: Aura.Pyro });
});

test("riff revolution: each discarded card emits its own discard timing", async () => {
  // 规则集：……生成多个【舍弃后】的时机
  // 中央实验室遗址每次「舍弃或调和1张牌后」累积 1 点实验进展；
  // 一次舍弃 3 张手牌应累积 3 点（而非 1 点），并在达到 3 点时生成 1 个万能骰
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Xinyan} energy={2} />
      <Support my def={CentralLaboratoryRuins} v={{ progress: 0 }} />
      <Card my def={Strategize} />
      <Card my def={Strategize} />
      <Card my def={Strategize} />
    </State>,
  );
  await c.me.skill(RiffRevolution);
  c.expect($.my.support.def(CentralLaboratoryRuins)).toHaveVariable({
    progress: 3,
  });
  // 8 - 3（叛逆刮弦） + 1（实验进展达到 3 点）
  expect(c.state.players[0].dice).toBeArrayOfSize(6);
});

test("riff revolution: discard order follows the current dice cost", async () => {
  // 规则集：舍弃多张手牌，按照当前元素骰费用，从费用最高|先入手 的优先级顺序舍弃
  // 追影弹原本 3 费，附属 2 层「费用降低」后当前费用为 1，低于超量装药弹头的 2 费，
  // 因此先舍弃弹头（附着火元素），随后追影弹的风元素伤害才能扩散
  const target = ref();
  const standby = ref();
  const c = setup(
    <State random={0}>
      <Character opp active ref={target} />
      <Character opp ref={standby} />
      <Character my active def={Xinyan} energy={2} />
      <Card my def={ShadowhuntShell}>
        <Attachment def={CostReduction} layer={2} />
      </Card>
      <Card my def={OverchargedBall} />
    </State>,
  );
  await c.me.skill(RiffRevolution);
  // 3 点物理 + 1 点火（附着） + 1 点风（扩散火，消耗附着）
  c.expect(target).toHaveVariable({ health: 5, aura: Aura.None });
  // 后台：2 点穿透 + 1 点扩散火
  c.expect(standby).toHaveVariable({ health: 7, aura: Aura.Pyro });
});
