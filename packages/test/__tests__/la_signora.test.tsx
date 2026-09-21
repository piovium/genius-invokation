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

import {
  $,
  Card,
  Character,
  DeclaredEnd,
  Ref,
  ref,
  setup,
  State,
  Status,
} from "#test";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";
import {
  Frostgnaw,
  Kaeya,
} from "@gi-tcg/data/internal/characters/cryo/kaeya.gts";
import {
  IcesealedCrimsonWitchOfEmbers,
  LaSignora,
} from "@gi-tcg/data/internal/characters/cryo/la_signora.gts";
import {
  Chevreuse,
  RingOfBurstingGrenades,
} from "@gi-tcg/data/internal/characters/pyro/chevreuse.gts";
import { CrimsonWitchOfEmbers } from "@gi-tcg/data/internal/characters/pyro/crimson_witch_of_embers.gts";
import { Aura, createRpcResponse } from "@gi-tcg/typings";
import { test } from "vitest";

/** 从 initActives 阶段开始：双方按 ref 选择出战角色，然后推进到第一个行动阶段 */
async function startBattle(
  c: ReturnType<typeof setup>,
  myActive: Ref,
  oppActive: Ref,
) {
  for (const who of [0, 1] as const) {
    const orig = c.game.players[who].io.rpc;
    const chosen = who === 0 ? myActive : oppActive;
    c.game.players[who].io.rpc = async (request) => {
      if (request.request?.$case === "chooseActive") {
        return createRpcResponse("chooseActive", {
          activeCharacterId: chosen.id,
        });
      }
      return orig(request);
    };
  }
  await c.stepToNextAction();
}

test("la signora: death in cryo state", async () => {
  const laSignora = ref();
  const otherOpp = ref();
  const c = setup(
    <State>
      <Card opp def={TeyvatFriedEgg} />
      <Character
        opp
        active
        def={LaSignora}
        ref={laSignora}
        health={1}
        aura={Aura.Electro}
      >
        <Status def={IcesealedCrimsonWitchOfEmbers} />
      </Character>
      <Character opp aura={Aura.Electro} ref={otherOpp} />
      <Character opp alive={0} />
      <Character my active def={Chevreuse} energy={2} />
    </State>,
  );
  // 火伤打雷底，触发超载，女士免于被击倒
  // 超载触发“二重毁伤弹”火伤，再触发超载，再切回女士
  // 再触发一次火伤，将女士以冰形态击倒
  await c.me.skill(RingOfBurstingGrenades);

  // 死了
  c.expect(laSignora).toHaveVariable({ alive: 0 });
  // 复活甲没了
  c.expect($.opp.typeStatus.def(IcesealedCrimsonWitchOfEmbers)).toNotExist();
  // 仍然是冰形态
  c.expect($.opp.onlyDefeated.id(laSignora.id)).toBeDefinition(LaSignora);

  await c.opp.chooseActive(otherOpp);
  await c.opp.card(TeyvatFriedEgg, laSignora);

  c.expect(laSignora).toHaveVariable({ alive: 1, health: 1 });
  // 复活后带着复活甲
  c.expect($.opp.typeStatus.def(IcesealedCrimsonWitchOfEmbers)).toBeExist();
});

test("la signora: might of delusion attaches ice-sealed crimson witch at battle begin", async () => {
  // 规则集：邪眼之威 入场时，附属【冰封的炽炎魔女】
  // 断言：战斗开始（initActives 结束）后女士身上就带有【冰封的炽炎魔女】
  const laSignora = ref();
  const oppActive = ref();
  // 首位角色会成为默认出战角色，而默认出战角色不在「选择出战角色」的候选里
  const c = setup(
    <State phase="initActives" currentTurn="my">
      <Character my />
      <Character my def={LaSignora} ref={laSignora} />
      <Character opp />
      <Character opp ref={oppActive} />
    </State>,
  );

  await startBattle(c, laSignora, oppActive);

  // 复活甲必须附在女士身上，而不是随便某个我方角色
  c.expect(
    $.my.character.has($.typeStatus.def(IcesealedCrimsonWitchOfEmbers)),
  ).toBe(laSignora);
});

test("la signora: ice-sealed form is removed at action phase start when health is at most 4", async () => {
  // 规则集：冰封的炽炎魔女①行动阶段开始时:如果所附属角色生命值不多于4, 则移除此效果。
  // 规则集：③此效果被移除时:所附属角色转换为「焚尽的炽炎魔女」形态。
  // 断言：4 点生命值时下个行动阶段开始即移除并转换形态；5 点生命值时保留且不转换
  const low = setup(
    <State>
      <Character opp active />
      <Character my active def={LaSignora} health={4}>
        <Status def={IcesealedCrimsonWitchOfEmbers} />
      </Character>
    </State>,
  );
  await low.me.end();
  await low.opp.end();

  low.expect($.my.typeStatus.def(IcesealedCrimsonWitchOfEmbers)).toNotExist();
  low.expect($.my.active).toBeDefinition(CrimsonWitchOfEmbers);

  const high = setup(
    <State>
      <Character opp active />
      <Character my active def={LaSignora} health={5}>
        <Status def={IcesealedCrimsonWitchOfEmbers} />
      </Character>
    </State>,
  );
  await high.me.end();
  await high.opp.end();

  high.expect($.my.typeStatus.def(IcesealedCrimsonWitchOfEmbers)).toBeExist();
  high.expect($.my.active).toBeDefinition(LaSignora);
});

test("la signora: ice-sealed form saves her from defeat, heals her to 1 and transforms", async () => {
  // 规则集：②所附属角色被击倒时:移除此效果,使角色免于被击倒,并治疗该角色到1点生命值。
  // 规则集：③此效果被移除时:所附属角色转换为「焚尽的炽炎魔女」形态。
  // 断言：3 点生命值挨下 3 点冰伤，女士存活于 1 点生命值，复活甲消失并转换为焚尽形态
  const laSignora = ref();
  const c = setup(
    <State>
      <Character opp active def={LaSignora} ref={laSignora} health={3}>
        <Status def={IcesealedCrimsonWitchOfEmbers} />
      </Character>
      <Character my active def={Kaeya} />
    </State>,
  );

  await c.me.skill(Frostgnaw);

  c.expect(laSignora).toHaveVariable({ alive: 1, health: 1 });
  c.expect($.opp.typeStatus.def(IcesealedCrimsonWitchOfEmbers)).toNotExist();
  c.expect($.opp.active).toBeDefinition(CrimsonWitchOfEmbers);
});
