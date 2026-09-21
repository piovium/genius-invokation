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
import { test } from "vitest";
import { Aura } from "@gi-tcg/typings";
import { Nahida, SeedOfSkandha } from "@gi-tcg/data/internal/characters/dendro/nahida.gts";
import { Kaboom, Klee } from "@gi-tcg/data/internal/characters/pyro/klee.gts";
import { SweepingFervor, Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { Chasca, ShiningShadowhuntShellPyro } from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { TeyvatFriedEgg } from "@gi-tcg/data/internal/cards/event/food.gts";

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

test("seed of skandha: three seeds fire as three separate effects, one layer each", async () => {
  // 规则集：注：每次3人蕴种印发动是3个效果。①对受伤角色 1 穿透并移除一层；②其他两名角色各 1 穿透并各移除一层
  // 断言：受伤者 2（燃烧）+1 穿透，其余两名各 1 穿透，三枚蕴种印各减 1 层
  const target = ref();
  const next = ref();
  const third = ref();
  const seed1 = ref();
  const seed2 = ref();
  const seed3 = ref();
  const c = setup(
    <State>
      <Character opp active health={10} aura={Aura.Dendro} ref={target}>
        <Status def={SeedOfSkandha} usage={2} ref={seed1} />
      </Character>
      <Character opp health={10} ref={next}>
        <Status def={SeedOfSkandha} usage={2} ref={seed2} />
      </Character>
      <Character opp health={10} ref={third}>
        <Status def={SeedOfSkandha} usage={2} ref={seed3} />
      </Character>
      <Character my def={Nahida} />
      <Character my active def={Klee} />
    </State>,
  );
  await c.me.skill(Kaboom);
  c.expect(target).toHaveVariable({ health: 7 });
  c.expect(next).toHaveVariable({ health: 9 });
  c.expect(third).toHaveVariable({ health: 9 });
  c.expect(seed1).toHaveVariable({ usage: 1 });
  c.expect(seed2).toHaveVariable({ usage: 1 });
  c.expect(seed3).toHaveVariable({ usage: 1 });
});

test.fails("seed of skandha: not disposed when the character is defeated", async () => {
  // 规则集：蕴种印（被击倒时不弃置）；①（被击倒后可发动）；当前引擎：角色被击倒时蕴种印随其他状态一并弃置（用 selfDispose 模拟 ①），复苏后蕴种印不存在
  // 断言：因反应伤害被击倒后，蕴种印仍附属于该角色（复苏后仍存在且已减一层）
  const target = ref();
  const next = ref();
  const seed = ref();
  const c = setup(
    <State>
      <Character opp active health={2} aura={Aura.Dendro} ref={target}>
        <Status def={SeedOfSkandha} usage={2} ref={seed} />
      </Character>
      <Character opp health={10} ref={next}>
        <Status def={SeedOfSkandha} usage={2} />
      </Character>
      <Card opp def={TeyvatFriedEgg} />
      <Character my def={Nahida} />
      <Character my active def={Klee} />
    </State>,
  );
  await c.me.skill(Kaboom);
  await c.opp.chooseActive(next);
  c.expect(next).toHaveVariable({ health: 9 });
  await c.opp.card(TeyvatFriedEgg, target);
  c.expect(target).toHaveVariable({ alive: 1 });
  c.expect(seed).toBeExist();
  c.expect(seed).toHaveVariable({ usage: 1 });
});
