import {
  Card,
  Character,
  DeclaredEnd,
  ref,
  setup,
  State,
  Status,
  Summon,
  Support,
} from "#test";
import { EntityState } from "@gi-tcg/core";
import { ToyGuardSummon } from "@gi-tcg/data/internal/cards/event/other";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { SuperconductBlessingDeepFreeze } from "@gi-tcg/data/internal/cards/support/blessing";
import { ShikanoinHeizou, WindmusterIrisCryo } from "@gi-tcg/data/internal/characters/anemo/shikanoin_heizou";
import {
  Charlotte,
  CoolcolorCapture,
} from "@gi-tcg/data/internal/characters/cryo/charlotte";
import { Fischl, Oz } from "@gi-tcg/data/internal/characters/electro/fischl";
import { SpiritfoxSineater, YaeMiko } from "@gi-tcg/data/internal/characters/electro/yae_miko";
import {
  RiffRevolution,
  Xinyan,
} from "@gi-tcg/data/internal/characters/pyro/xinyan";
import { CostIncrease } from "@gi-tcg/data/internal/commons";
import { Aura } from "@gi-tcg/typings";
import { describe, expect, test } from "bun:test";

describe("superconduct blessing: deep freeze", () => {
  test("triggered for following piercing damage", async () => {
    const deepFreeze = ref();
    const c = setup(
      <State>
        <Character opp aura={Aura.Electro} />
        <Support my def={SuperconductBlessingDeepFreeze} ref={deepFreeze} />
        <Character my def={Charlotte} />
      </State>,
    );
    await c.me.skill(CoolcolorCapture);
    c.expect(deepFreeze).toHaveVariable({ usagePerRound: 0 });
  });

  test("triggered for previous piercing damage", async () => {
    const deepFreeze = ref();
    const c = setup(
      <State>
        <Support my def={SuperconductBlessingDeepFreeze} ref={deepFreeze} />
        <Character my def={Xinyan} energy={2} />
      </State>,
    );
    await c.me.skill(RiffRevolution);
    c.expect(deepFreeze).toHaveVariable({ usagePerRound: 0 });
  });

  test("triggered for all endPhase damages", async () => {
    const deepFreeze = ref();
    const c = setup(
      <State>
        <Card opp def={Paimon} />
        <DeclaredEnd opp />
        <Support my def={SuperconductBlessingDeepFreeze} ref={deepFreeze} />
        <Character my def={Fischl} />
        <Summon my def={ToyGuardSummon} />
        <Summon my def={Oz} />
      </State>,
    );
    await c.me.end();
    expect(
      (
        c.query(`opp hand with definition id ${Paimon}`)[0] as EntityState
      )?.attachments.find((a) => a.definition.id === CostIncrease)?.variables
        .layer,
    ).toBe(2);
  });

  test("heizou's onBeforeAction won't recorded for next action", async () => {
    const deepFreeze = ref();
    const myActive = ref();
    const c = setup(
      <State>
        <Character opp def={ShikanoinHeizou} />
        <Support my def={SuperconductBlessingDeepFreeze} ref={deepFreeze} />
        <Character my active def={YaeMiko} ref={myActive} health={10}>
          <Status def={WindmusterIrisCryo} />
        </Character>
      </State>
    );
    await c.me.skill(SpiritfoxSineater);
    c.expect(myActive).toHaveVariable({ health: 9, aura: Aura.Cryo });
    c.expect(deepFreeze).toHaveVariable({ usagePerRound: 2 });
  });
});
