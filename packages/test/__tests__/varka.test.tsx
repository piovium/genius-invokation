import { Card, Character, State, Status, Support, $, setup } from "#test";
import { PuffPopsInEffect } from "@gi-tcg/data/internal/cards/event/food.gts";
import { FlowerfeatherClan } from "@gi-tcg/data/internal/cards/support/place.gts";
import {
  AzureDevourInEffect,
  AzureDevourStatus,
  FourWindsAscensionInEffect,
  FourWindsAscensionStatus,
  Varka,
  WindboundExecution,
} from "@gi-tcg/data/internal/characters/anemo/varka.gts";
import { test } from "vitest";

test.each([
  [FourWindsAscensionStatus, FourWindsAscensionInEffect],
  [AzureDevourStatus, AzureDevourInEffect],
])("Windbound Execution selection enters hand and takes effect", async (card, status) => {
  const c = setup(
    <State>
      <Character my active def={Varka} health={8}>
        <Status def={PuffPopsInEffect} />
      </Character>
      <Support my def={FlowerfeatherClan} />
      <Card my def={WindboundExecution} />
    </State>,
  );
  await c.me.card(WindboundExecution);
  await c.me.selectCard(card);
  c.expect($.my.active).toHaveVariable({ health: 9 });
  c.expect($.my.typeStatus.def(status)).toBeExist();
  c.expect($.my.hand).toBeCount(0);
  c.expect($.my.typeSupport.def(FlowerfeatherClan)).toHaveVariable({ disposedCardCount: 0 });
});
