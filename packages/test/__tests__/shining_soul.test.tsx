import {
  Card,
  Character,
  DeclaredEnd,
  State,
  Support,
  ref,
  setup,
} from "#test";
import { createOfficialVersionResolver } from "@gi-tcg/core";
import { CustomDataLoader } from "@gi-tcg/custom-data-loader";
import {
  AbyssalSummons,
  CalxsArts,
  FatuiAmbusherMirrorMaiden,
  FatuiConspiracy,
  HydroSamachurl,
} from "@gi-tcg/data/internal/cards/event/other.gts";
import { IronTongueTian } from "@gi-tcg/data/internal/cards/support/ally.gts";
import { Diluc } from "@gi-tcg/data/internal/characters/pyro/diluc.gts";
import physicalPreset from "@gi-tcg/shining-soul-data/presets/physical";
import { expect, test } from "vitest";

const preset = await physicalPreset();
const loader = new CustomDataLoader().setVersion(
  createOfficialVersionResolver(
    preset.version,
    preset.plugins[0].version_maps[0],
  ),
);
await loader.loadMod(...preset.plugins[0].mods.map((mod) => mod.content));
const [data] = loader.done();

test.each([AbyssalSummons, FatuiConspiracy])(
  "physical element declaration handles the opponent's choice with listenTo myself: %i",
  async (card) => {
    const c = setup(
      <State data={data}>
        <Card my def={card} />
      </State>,
    );
    await c.me.card(card);
    await c.me.selectOption(0);
    await c.opp.selectOption(1);
    expect(c.state.players[0].combatStatuses).toHaveLength(0);
    if (card === AbyssalSummons) {
      expect(c.state.players[0].summons).toMatchObject([
        { definition: { id: HydroSamachurl }, variables: { usage: 2 } },
      ]);
      expect(c.state.players[1].summons).toHaveLength(0);
    } else {
      expect(c.state.players[1].combatStatuses).toMatchObject([
        {
          definition: { id: FatuiAmbusherMirrorMaiden },
          variables: { usage: 2 },
        },
      ]);
    }
  },
);

test("physical Tian's choice only triggers the requesting support", async () => {
  const first = ref();
  const second = ref();
  const target = ref();
  const c = setup(
    <State data={data}>
      <DeclaredEnd opp />
      <Support my def={IronTongueTian} ref={first} />
      <Support my def={IronTongueTian} ref={second} />
      <Character my active energy={3} />
      <Character my energy={0} ref={target} />
      <Character my energy={0} />
    </State>,
  );
  await c.me.end();
  await c.me.selectOption(0);
  c.expect(first).toHaveVariable({ usage: 1 });
  c.expect(second).toHaveVariable({ usage: 2 });
  c.expect(target).toHaveVariable({ energy: 1 });
  await c.me.selectOption(0);
  c.expect(first).toHaveVariable({ usage: 1 });
  c.expect(second).toHaveVariable({ usage: 1 });
  c.expect(target).toHaveVariable({ energy: 2 });
});

test("physical Tian prioritizes the active character", async () => {
  const active = ref();
  const standby = ref();
  const support = ref();
  const c = setup(
    <State data={data}>
      <DeclaredEnd opp />
      <Support my def={IronTongueTian} ref={support} />
      <Character my active energy={1} ref={active} />
      <Character my energy={0} ref={standby} />
    </State>,
  );
  await c.me.end();
  c.expect(active).toHaveVariable({ energy: 2 });
  c.expect(standby).toHaveVariable({ energy: 0 });
  c.expect(support).toHaveVariable({ usage: 1 });
});

test("physical Tian lets the owner choose a standby and disposes after its last use", async () => {
  const first = ref();
  const second = ref();
  const support = ref();
  const c = setup(
    <State data={data}>
      <DeclaredEnd opp />
      <Support my def={IronTongueTian} ref={support} usage={1} />
      <Character my active energy={3} />
      <Character my energy={0} ref={first} />
      <Character my energy={0} ref={second} />
    </State>,
  );
  await c.me.end();
  c.expect(support).toHaveVariable({ usage: 1 });
  await c.me.selectOption(1);
  c.expect(first).toHaveVariable({ energy: 0 });
  c.expect(second).toHaveVariable({ energy: 1 });
  c.expect(support).toNotExist();
});

test.each([
  { energy: 2, alive: 1 as const },
  { energy: 0, alive: 0 as const },
])(
  "physical Tian excludes an ineligible standby: %j",
  async ({ energy, alive }) => {
    const excluded = ref();
    const target = ref();
    const c = setup(
      <State data={data}>
        <DeclaredEnd opp />
        <Support my def={IronTongueTian} />
        <Character my active energy={3} />
        <Character my energy={energy} alive={alive} ref={excluded} />
        <Character my energy={0} ref={target} />
      </State>,
    );
    await c.me.end();
    await c.me.selectOption(0);
    c.expect(excluded).toHaveVariable({ energy });
    c.expect(target).toHaveVariable({ energy: 1 });
  },
);

test("physical Tian preserves usage when all characters have full energy", async () => {
  const support = ref();
  const c = setup(
    <State data={data}>
      <DeclaredEnd opp />
      <Support my def={IronTongueTian} ref={support} />
      <Character my active energy={3} />
      <Character my energy={2} />
      <Character my energy={2} />
    </State>,
  );
  await c.me.end();
  c.expect(support).toHaveVariable({ usage: 2 });
});

test.each([
  { answers: [1, 1], intermediate: [0, 1, 2], expected: [0, 1, 2] },
  { answers: [0, 1], intermediate: [1, 0, 2], expected: [1, 0, 2] },
  { answers: [0, 0], intermediate: [1, 0, 2], expected: [2, 0, 1] },
  { answers: [1, 0], intermediate: [0, 1, 2], expected: [1, 1, 1] },
])(
  "physical Calx asks each eligible standby in order: %j",
  async ({ answers, intermediate, expected }) => {
    const c = setup(
      <State data={data}>
        <Card my def={CalxsArts} />
        <Character my active energy={0} />
        <Character my energy={1} />
        <Character my energy={2} />
      </State>,
    );
    await c.me.card(CalxsArts);
    expect(
      c.state.players[0].characters.map((ch) => ch.variables.energy),
    ).toEqual([0, 1, 2]);
    await c.me.selectOption(answers[0]);
    expect(
      c.state.players[0].characters.map((ch) => ch.variables.energy),
    ).toEqual(intermediate);
    await c.me.selectOption(answers[1]);
    expect(
      c.state.players[0].characters.map((ch) => ch.variables.energy),
    ).toEqual(expected);
    expect(c.state.players[0].combatStatuses).toHaveLength(0);
    expect(c.state.players[0].hands).toHaveLength(0);
    expect(c.state.players[0].dice).toHaveLength(7);
    expect(
      c.state.players[0].characters.flatMap((ch) => ch.entities),
    ).toHaveLength(0);
  },
);

test.each([
  { energy: 0, alive: 1 as const },
  { energy: 1, alive: 0 as const },
])(
  "physical Calx excludes an ineligible standby: %j",
  async ({ energy, alive }) => {
    const c = setup(
      <State data={data}>
        <Card my def={CalxsArts} />
        <Character my active energy={0} />
        <Character my energy={energy} alive={alive} />
        <Character my energy={2} />
      </State>,
    );
    await c.me.card(CalxsArts);
    await c.me.selectOption(0);
    expect(
      c.state.players[0].characters.map((ch) => ch.variables.energy),
    ).toEqual([1, energy, 1]);
    expect(c.state.players[0].combatStatuses).toHaveLength(0);
    expect(
      c.state.players[0].characters.flatMap((ch) => ch.entities),
    ).toHaveLength(0);
  },
);

test("physical Calx retains overflow when transferring from two characters", async () => {
  const c = setup(
    <State data={data}>
      <Card my def={CalxsArts} />
      <Character my active energy={2} />
      <Character my energy={1} />
      <Character my energy={2} />
    </State>,
  );
  await c.me.card(CalxsArts);
  await c.me.selectOption(0);
  await c.me.selectOption(0);
  expect(
    c.state.players[0].characters.map((ch) => ch.variables.energy),
  ).toEqual([3, 0, 1]);
});

test.each([
  { answers: [0, 0], expected: [2, 1, 1, 2] },
  { answers: [1, 0, 0], expected: [2, 2, 1, 1] },
  { answers: [1, 1, 1], expected: [0, 2, 2, 2] },
])(
  "physical Calx stops after two yes answers or exhausting candidates: %j",
  async ({ answers, expected }) => {
    const c = setup(
      <State data={data}>
        <Card my def={CalxsArts} />
        <Character my active energy={0} />
        <Character my energy={2} />
        <Character my energy={2} />
        <Character my def={Diluc} energy={2} />
      </State>,
    );
    await c.me.card(CalxsArts);
    for (const answer of answers) {
      await c.me.selectOption(answer);
    }
    expect(
      c.state.players[0].characters.map((ch) => ch.variables.energy),
    ).toEqual(expected);
    expect(c.state.players[0].combatStatuses).toHaveLength(0);
    expect(
      c.state.players[0].characters.flatMap((ch) => ch.entities),
    ).toHaveLength(0);
  },
);

test.each([
  [3, 1, 2],
  [0, 0, 0],
])(
  "physical Calx retains its play condition: %j",
  async (active, first, second) => {
    const c = setup(
      <State data={data}>
        <Card my def={CalxsArts} />
        <Character my active energy={active} />
        <Character my energy={first} />
        <Character my energy={second} />
      </State>,
    );
    await expect(c.me.card(CalxsArts)).rejects.toThrow("You cannot play card");
    expect(c.state.players[0].hands).toHaveLength(1);
  },
);
