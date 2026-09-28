import { $, Card, Character, ref, setup, State, Summon } from "#test";
import { AutumnWhirlwind } from "@gi-tcg/data/internal/characters/anemo/kaedehara_kazuha.gts";
import {
  ShadowswordGallopingFrost,
  ShadowswordLoneGale,
} from "@gi-tcg/data/internal/characters/anemo/maguu_kenki.gts";
import {
  ChaoticEntropy,
  ForbiddenCreationIsomer75TypeIi,
  LargeWindSpirit,
  LargeWindSpirit01,
  Sucrose,
} from "@gi-tcg/data/internal/characters/anemo/sucrose.gts";
import { test } from "vitest";

test("sucrose talent: the new summon still enters when the summon zone is full", async () => {
  const sucrose = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Sucrose} energy={2} ref={sucrose} />
      <Summon my def={LargeWindSpirit} usage={1} />
      <Summon my def={ShadowswordLoneGale} />
      <Summon my def={ShadowswordGallopingFrost} />
      <Summon my def={AutumnWhirlwind} />
      <Summon opp def={LargeWindSpirit} usage={1} />
      <Card my def={ChaoticEntropy} />
    </State>,
  );

  await c.me.card(ChaoticEntropy, sucrose);

  c.expect($.my.summon).toBeCount(4);
  c.expect($.my.summon.def(LargeWindSpirit)).toNotExist();
  c.expect($.my.summon.def(LargeWindSpirit01)).toHaveVariable({ usage: 3 });
  c.expect($.opp.summon.def(LargeWindSpirit)).toHaveVariable({ usage: 1 });
});

test("conflictWith preserves the existing entity when refreshing the same definition", async () => {
  const summon = ref();
  const c = setup(
    <State>
      <Character opp active />
      <Character my active def={Sucrose} energy={2} />
      <Summon my def={LargeWindSpirit} usage={1} ref={summon} />
      <Summon my def={ShadowswordLoneGale} />
      <Summon my def={ShadowswordGallopingFrost} />
      <Summon my def={AutumnWhirlwind} />
    </State>,
  );

  await c.me.skill(ForbiddenCreationIsomer75TypeIi);

  c.expect($.my.summon).toBeCount(4);
  c.expect(summon).toHaveVariable({ usage: 3 });
});
