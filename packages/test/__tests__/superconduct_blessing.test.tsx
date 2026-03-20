import {
  Card,
  Character,
  DeclaredEnd,
  ref,
  setup,
  State,
  Summon,
  Support,
} from "#test";
import { EntityState } from "@gi-tcg/core";
import { ToyGuardSummon } from "@gi-tcg/data/internal/cards/event/other";
import { Paimon } from "@gi-tcg/data/internal/cards/support/ally";
import { SuperconductBlessingDeepFreeze } from "@gi-tcg/data/internal/cards/support/blessing";
import {
  Charlotte,
  CoolcolorCapture,
} from "@gi-tcg/data/internal/characters/cryo/charlotte";
import { Fischl, Oz } from "@gi-tcg/data/internal/characters/electro/fischl";
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
});
