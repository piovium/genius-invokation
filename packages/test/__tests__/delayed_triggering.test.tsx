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

import { ref, setup, State, Character, Support, CombatStatus, Equipment, Status, $ } from "#test";
import { InstructorsCap } from "@gi-tcg/data/internal/cards/equipment/artifacts";
import { ChangTheNinth } from "@gi-tcg/data/internal/cards/support/ally";
import { ParametricTransformer } from "@gi-tcg/data/internal/cards/support/item";
import { GaleBlade, Jean } from "@gi-tcg/data/internal/characters/anemo/jean";
import { DriftcloudWave, Xianyun } from "@gi-tcg/data/internal/characters/anemo/xianyun";
import { ChonghuaFrostField, Chongyun } from "@gi-tcg/data/internal/characters/cryo/chongyun";
import { Beidou, Oceanborne, ThunderbeastsTarge } from "@gi-tcg/data/internal/characters/electro/beidou";
import { GrassRingOfSanctification, KukiShinobu } from "@gi-tcg/data/internal/characters/electro/kuki_shinobu";
import { AncientRiteTheThunderingSands, Sethos, ThunderConvergence } from "@gi-tcg/data/internal/characters/electro/sethos";
import { Barbara, WhisperOfWater } from "@gi-tcg/data/internal/characters/hydro/barbara";
import { AurousBlaze, Yoimiya } from "@gi-tcg/data/internal/characters/pyro/yoimiya";
import { Aura } from "@gi-tcg/typings";
import { expect, test } from "bun:test";

test("chang & transformer: triggered on useSkill status", async () => {
  const chang = ref();
  const transformer1 = ref();
  const transformer2 = ref();
  const c = setup(
    <State>
      <Character my active def={Barbara} />
      <Character my def={Yoimiya} />
      <CombatStatus my def={AurousBlaze} />
      <Support my def={ChangTheNinth} v={{ inspiration: 0 }} ref={chang} />
      <Support my def={ParametricTransformer} v={{ progress: 0 }} ref={transformer1} />
      <Support my def={ParametricTransformer} v={{ progress: 0 }} ref={transformer2} />
    </State>
  );
  await c.me.skill(WhisperOfWater);
  c.expect(chang).toHaveVariable({ inspiration: 1 });
  c.expect(transformer1).toHaveVariable({ progress: 1 });
  c.expect(transformer2).toHaveVariable({ progress: 1 });
});

test("transformer: dealing with reaction & multiple damages", async () => {
  const chang = ref();
  const transformer = ref();
  const c = setup(
    <State>
      <Support opp def={ChangTheNinth} v={{ inspiration: 0 }} ref={chang} />
      <Support opp def={ParametricTransformer} v={{ progress: 0 }} ref={transformer} />
      <Character my active def={Beidou} />
      <Character my def={Chongyun} />
      <CombatStatus my def={ChonghuaFrostField} />
      <CombatStatus my def={ThunderbeastsTarge} />
    </State>
  );
  await c.me.skill(Oceanborne);
  c.expect(transformer).toHaveVariable({ progress: 1 });
  c.expect(chang).toHaveVariable({ inspiration: 1 });
});

test("instructor: do not trigger on useSkill status", async () => {
  const instructor = ref();
  const c = setup(
    <State>
      <Character my active def={Barbara}>
        <Equipment def={InstructorsCap} ref={instructor} />
      </Character>
      <Character my def={Yoimiya} />
      <CombatStatus my def={AurousBlaze} />
    </State>
  );
  await c.me.skill(WhisperOfWater);
  // 未触发
  expect(c.state.players[0].dice).toBeArrayOfSize(5);
  c.expect(instructor).toHaveVariable({ usagePerRound: 3 });
});

test("sethos and xianyun", async () => {
  const sethos = ref();
  const c = setup(
    <State>
      <Character my active def={Sethos} ref={sethos} energy={0} />
      <Character my def={Xianyun} >
        <Status def={DriftcloudWave} />
      </Character>
    </State>
  );
  await c.me.skill(AncientRiteTheThunderingSands);
  // 赛索斯：附着雷+附着增伤状态+技能内切人
  // 切到闲云：触发冲击波
  // 冲击波扩散雷
  c.expect($.opp.prev).toHaveVariable({ health: 9 });
  // 赛索斯充能+1（使用技能+1、效果+1）
  c.expect(sethos).toHaveVariable({ energy: 2 });
});

test("sethos and opp useSkill", async () => {
  const sethos = ref();
  const c = setup(
    <State>
      <Character opp active def={KukiShinobu} />
      <CombatStatus opp def={GrassRingOfSanctification} />
      <Character my def={Sethos} ref={sethos} energy={0}>
        <Status def={ThunderConvergence} />
      </Character>
      <Character my active def={Jean} aura={Aura.Cryo} health={10} />
    </State>
  );
  await c.me.skill(GaleBlade);
  // 风压剑：对方切人
  // 触发越祓草轮，对琴1点雷伤，超导到2
  c.expect($.my.active).toHaveVariable({ health: 8 });
  // 对方实体造成的元素反应 **不触发** 赛索斯
  c.expect(sethos).toHaveVariable({ energy: 0 });
});
