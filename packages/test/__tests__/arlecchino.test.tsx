import {
  ref,
  setup,
  Character,
  State,
  Status,
  Card,
  Equipment,
  Support,
  $,
} from "#test";
import { test } from "vitest";
import { BloomBlessingOvergrow } from "@gi-tcg/data/internal/cards/support/blessing.gts";
import { ShadowhuntShell, ShiningShadowhuntShellHydro } from "@gi-tcg/data/internal/characters/anemo/chasca.gts";
import { AllReprisalsAndArrearsMineToBear, Arlecchino } from "@gi-tcg/data/internal/characters/pyro/arlecchino.gts";
import { SweepingFervor, Xinyan } from "@gi-tcg/data/internal/characters/pyro/xinyan.gts";
import { BondOfLife } from "@gi-tcg/data/internal/commons.gts";
import { Aura } from "@gi-tcg/typings";

test("Arlecchino talent: bond of life still reduces damage triggered after a reaction", async () => {
  const target = ref();
  const bond = ref();
  const blessing = ref();
  const c = setup(
    <State>
      <Character my active def={Xinyan} />
      <Support my def={BloomBlessingOvergrow} ref={blessing} />
      <Character
        opp
        active
        def={Arlecchino}
        ref={target}
        health={10}
        aura={Aura.Hydro}
      >
        <Equipment def={AllReprisalsAndArrearsMineToBear} />
        <Status def={BondOfLife} usage={1} ref={bond} />
      </Character>
    </State>,
  );
  await c.me.skill(SweepingFervor);

  // 热情拂扫：2 火伤 + 蒸发 2 - 天赋减伤 1 = 3。
  // 反应后的蔓生先于扣契结算，1 水伤仍被同一层契减免为 0
  c.expect(target).toHaveVariable({ health: 7, aura: Aura.Hydro });
  c.expect(blessing).toHaveVariable({ usagePerRound: 0 });
  c.expect(bond).toNotExist();
});

test("Arlecchino talent: bond of life is consumed before damage triggered by discarding", async () => {
  const target = ref();
  const bond = ref();
  const c = setup(
    <State>
      <Character my active def={Xinyan} />
      <Card my def={ShiningShadowhuntShellHydro} />
      <Character
        opp
        active
        def={Arlecchino}
        ref={target}
        health={10}
        aura={Aura.Hydro}
      >
        <Equipment def={AllReprisalsAndArrearsMineToBear} />
        <Status def={BondOfLife} usage={1} ref={bond} />
      </Character>
    </State>,
  );
  await c.me.skill(SweepingFervor);

  // 热情拂扫：2 火伤 + 蒸发 2 - 天赋减伤 1 = 3
  // 扣契先于舍弃后的焕光追影弹结算，后续 1 水伤不减免
  c.expect(target).toHaveVariable({ health: 6, aura: Aura.Hydro });
  c.expect($.my.hand).toBeCount(0);
  c.expect($.my.pile).toBeDefinition(ShadowhuntShell);
  c.expect(bond).toNotExist();
});
