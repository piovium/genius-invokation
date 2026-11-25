import { readFile } from "node:fs/promises";
import { CustomDataLoader } from "@gi-tcg/custom-data-loader";
import {
  Aura,
  DiceType,
  type CardHandle,
  type CharacterHandle,
  type EquipmentHandle,
  type SkillHandle,
  type SupportHandle,
} from "@gi-tcg/core/data";
import {
  $,
  Card,
  Character,
  DiceCount,
  Equipment,
  State,
  Support,
  ref,
  setup,
} from "#test";
import { expect, test } from "vitest";

const [data] = (
  await new CustomDataLoader().loadMod(
    await readFile(
      new URL("../../shining-soul-data/src/mods/level5.gts", import.meta.url),
      "utf8",
    ),
  )
).done();

const Xinyan = 1312 as CharacterHandle;
const SweepingFervor = 13122 as SkillHandle;
const NormalAttack = 13011 as SkillHandle;
const Sucrose = 1501 as CharacterHandle;
const WindSpiritCreation = 15011 as SkillHandle;
const Paimon = 322001 as CardHandle;
const Hat = 312030 as EquipmentHandle;
const Kusava = 323008 as SupportHandle;
const Qucusaurus = 313006 as EquipmentHandle;
const PowerSaw = 311309 as EquipmentHandle;
const Laboratory = 321021 as SupportHandle;
const shield = $.my.combatStatus.def(113121);

test("Xinyan creates her shield before asking which duplicate to discard", async () => {
  const first = ref();
  const second = ref();
  const lab = ref();
  const c = setup(
    <State data={data}>
      <Character my active def={Xinyan} />
      <Card my def={Paimon} ref={first} />
      <Card my def={Paimon} ref={second} />
      <Support my def={Laboratory} ref={lab} />
    </State>,
  );
  await c.me.skill(SweepingFervor);
  c.expect(shield).toHaveVariable({ shield: 2 });
  c.expect($.my.hand).toBeCount(2);
  c.expect(lab).toHaveVariable({ progress: 0 });
  await c.me.selectOption(1);
  c.expect($.my.hand).toBe(first);
  c.expect(shield).toHaveVariable({ shield: 2 });
  c.expect(lab).toHaveVariable({ progress: 1 });
  c.expect($.my.combatStatus).toBeCount(1);
  await c.opp.end();
});

test("Xinyan creates a shield without prompting when her hand is empty", async () => {
  const c = setup(
    <State data={data}>
      <Character my active def={Xinyan} />
    </State>,
  );
  await c.me.skill(SweepingFervor);
  c.expect(shield).toHaveVariable({ shield: 2 });
  c.expect($.my.combatStatus).toBeCount(1);
  await c.opp.end();
});

test("Hat converts dice and grants its wearer a discount before the queued discard", async () => {
  const wearer = ref();
  const other = ref();
  const first = ref();
  const c = setup(
    <State data={data}>
      <Character my active ref={other}>
        <Equipment def={Hat} />
      </Character>
      <Character my ref={wearer}>
        <Equipment def={Hat} />
      </Character>
      <DiceCount my count={4} type={DiceType.Cryo} />
      <Card my def={Paimon} ref={first} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.switch(wearer);
  expect(c.state.players[0].activeCharacterId).toBe(wearer.id);
  expect(
    c.state.players[0].dice.filter((die) => die === DiceType.Omni),
  ).toHaveLength(2);
  c.expect($.my.status.def(301204)).toBeCount(1);
  c.expect($.my.hand).toBeCount(2);
  await c.me.selectOption(1);
  c.expect($.my.hand).toBe(first);
  expect(
    c.state.players[0].dice.filter((die) => die === DiceType.Omni),
  ).toHaveLength(2);
  expect(c.state.players[0].dice).toHaveLength(3);
  c.expect($.my.status.def(301204)).toBeCount(1);
  expect(
    c.state.players[0].characters
      .find(({ id }) => id === wearer.id)
      ?.entities.some(({ definition }) => definition.id === 301204),
  ).toBe(true);
  expect(
    c.state.players[0].characters
      .find(({ id }) => id === other.id)
      ?.entities.some(({ definition }) => definition.id === 301204),
  ).toBe(false);
  c.expect($.my.combatStatus).toNotExist();
  await c.opp.end();
});

test("Kusava counts immediately and its discard usage decreases after each selected card", async () => {
  const first = ref();
  const second = ref();
  const third = ref();
  const kusava = ref();
  const lab = ref();
  const c = setup(
    <State data={data} phase="roll">
      <Support my def={Kusava} ref={kusava} />
      <Support my def={Laboratory} ref={lab} />
      <Card my def={Paimon} ref={first} />
      <Card my def={Paimon} ref={second} />
      <Card my def={Paimon} ref={third} />
    </State>,
  );
  await c.stepToNextAction();
  c.expect(kusava).toHaveVariable({ memory: 2 });
  c.expect($.my.combatStatus).toHaveVariable({ usage: 2 });
  await c.me.selectOption(1);
  expect(c.state.players[0].hands.map(({ id }) => id)).toEqual([
    first.id,
    third.id,
  ]);
  c.expect(lab).toHaveVariable({ progress: 1 });
  c.expect($.my.combatStatus).toHaveVariable({ usage: 1 });
  await c.me.selectOption(1);
  c.expect($.my.hand).toBe(first);
  c.expect(kusava).toHaveVariable({ memory: 2 });
  c.expect(lab).toHaveVariable({ progress: 2 });
  c.expect($.my.combatStatus).toNotExist();
  await c.me.end();
});

test("Kusava has no stop option and requires both discards", async () => {
  const kusava = ref();
  const c = setup(
    <State data={data} phase="roll">
      <Support my def={Kusava} ref={kusava} />
      <Card my def={Paimon} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.stepToNextAction();
  await expect(c.me.selectOption(2)).rejects.toThrow("Cannot select option 2");
  await c.me.selectOption(1);
  c.expect($.my.hand).toBeCount(1);
  await expect(c.me.selectOption(1)).rejects.toThrow("Cannot select option 1");
  await c.me.selectOption(0);
  c.expect($.my.hand).toNotExist();
  c.expect(kusava).toHaveVariable({ memory: 2 });
  c.expect($.my.combatStatus).toNotExist();
  await c.me.end();
});

test.each([
  { memory: 0, hands: 0, choices: 0 },
  { memory: 0, hands: 1, choices: 1 },
  { memory: 0, hands: 2, choices: 2 },
  { memory: 2, hands: 2, choices: 0 },
  { memory: 1, hands: 3, choices: 1 },
])(
  "Kusava limits choices to remaining memory ($memory memory, $hands cards)",
  async ({ memory, hands, choices }) => {
    const kusava = ref();
    const c = setup(
      <State data={data} phase="roll">
        {[
          <Support my def={Kusava} ref={kusava} v={{ memory }} />,
          ...Array.from({ length: hands }, () => <Card my def={Paimon} />),
        ]}
      </State>,
    );
    await c.stepToNextAction();
    c.expect(kusava).toHaveVariable({ memory: memory + choices });
    for (let i = 0; i < choices; i++) {
      await c.me.selectOption(0);
    }
    c.expect(kusava).toHaveVariable({ memory: memory + choices });
    c.expect($.my.hand).toBeCount(hands - choices);
    c.expect($.my.combatStatus).toNotExist();
    await c.me.end();
  },
);

test("Qucusaurus asks before switching and paying, then switches for zero dice as a fast action", async () => {
  const active = ref();
  const wearer = ref();
  const first = ref();
  const c = setup(
    <State data={data}>
      <Character my active ref={active} />
      <Character my ref={wearer}>
        <Equipment def={Qucusaurus} />
      </Character>
      <DiceCount my count={1} />
      <Card my def={Paimon} ref={first} />
      <Card my def={Paimon} />
    </State>,
  );
  await c.me.switch(wearer);
  expect(c.state.players[0].activeCharacterId).toBe(active.id);
  expect(c.state.players[0].dice).toHaveLength(1);
  c.expect($.my.hand).toBeCount(2);
  await c.me.selectOption(1);
  c.expect($.my.hand).toBe(first);
  expect(c.state.players[0].activeCharacterId).toBe(wearer.id);
  expect(c.state.players[0].dice).toHaveLength(1);
  c.expect($.my.combatStatus).toNotExist();
  await c.me.end();
});

test("Qucusaurus with no hand neither prompts nor discounts nor makes the switch fast", async () => {
  const wearer = ref();
  const c = setup(
    <State data={data}>
      <Character my active />
      <Character my ref={wearer}>
        <Equipment def={Qucusaurus} />
      </Character>
      <DiceCount my count={1} />
    </State>,
  );
  await c.me.switch(wearer);
  expect(c.state.players[0].activeCharacterId).toBe(wearer.id);
  expect(c.state.players[0].dice).toHaveLength(0);
  c.expect($.my.combatStatus).toNotExist();
  await c.opp.end();
});

test("Power Saw asks the defender, discards the exact card, and reduces damage only once per round", async () => {
  const wearer = ref();
  const saw = ref();
  const first = ref();
  const lab = ref();
  const c = setup(
    <State data={data} currentTurn="opp">
      <Character my active ref={wearer}>
        <Equipment def={PowerSaw} ref={saw} />
      </Character>
      <Card my def={Paimon} ref={first} />
      <Card my def={Paimon} />
      <Support my def={Laboratory} ref={lab} />
    </State>,
  );
  await c.opp.skill(NormalAttack);
  c.expect(lab).toHaveVariable({ progress: 0 });
  await c.me.selectOption(1);
  c.expect($.my.hand).toBe(first);
  c.expect(wearer).toHaveVariable({ health: 9 });
  c.expect(saw).toHaveVariable({ stoic: 1 });
  c.expect(lab).toHaveVariable({ progress: 1 });
  c.expect($.my.combatStatus).toNotExist();
  await c.me.end();
  await c.opp.skill(NormalAttack);
  c.expect(wearer).toHaveVariable({ health: 7 });
  c.expect(saw).toHaveVariable({ stoic: 1 });
  c.expect(lab).toHaveVariable({ progress: 1 });
  c.expect($.my.hand).toBe(first);
});

test("Power Saw with an empty hand neither prompts nor reduces damage nor gains a mark", async () => {
  const wearer = ref();
  const saw = ref();
  const c = setup(
    <State data={data} currentTurn="opp">
      <Character my active ref={wearer}>
        <Equipment def={PowerSaw} ref={saw} />
      </Character>
    </State>,
  );
  await c.opp.skill(NormalAttack);
  c.expect(wearer).toHaveVariable({ health: 8 });
  c.expect(saw).toHaveVariable({ stoic: 0 });
  c.expect($.my.combatStatus).toNotExist();
  await c.me.end();
});

test.each([1, 2])(
  "two Power Saws hit by Swirl reserve only available cards (%i in hand)",
  async (hands) => {
    const active = ref();
    const standby = ref();
    const unarmed = ref();
    const activeSaw = ref();
    const standbySaw = ref();
    const first = ref();
    const lab = ref();
    const c = setup(
      <State data={data} currentTurn="opp">
        {[
          <Character opp active def={Sucrose} />,
          <Character my active def={Xinyan} ref={active} aura={Aura.Pyro}>
            <Equipment def={PowerSaw} ref={activeSaw} />
          </Character>,
          <Character my ref={standby}>
            <Equipment def={PowerSaw} ref={standbySaw} />
          </Character>,
          <Character my ref={unarmed} />,
          <Support my def={Laboratory} ref={lab} />,
          <Card my def={Paimon} ref={first} />,
          ...Array.from({ length: hands - 1 }, () => <Card my def={Paimon} />),
        ]}
      </State>,
    );
    await c.opp.skill(WindSpiritCreation);
    c.expect($.my.hand).toBeCount(hands);
    c.expect($.my.combatStatus).toHaveVariable({ usage: hands });
    c.expect(lab).toHaveVariable({ progress: 0 });
    await c.me.selectOption(hands - 1);
    if (hands === 2) {
      c.expect($.my.hand).toBe(first);
      c.expect(lab).toHaveVariable({ progress: 1 });
      c.expect($.my.combatStatus).toBeCount(1);
      c.expect($.my.combatStatus).toHaveVariable({ usage: 1 });
      await c.me.selectOption(0);
    }
    c.expect($.my.hand).toNotExist();
    c.expect(lab).toHaveVariable({ progress: hands });
    c.expect(unarmed).toHaveVariable({ health: 9 });
    // Do not depend on which damage target reserves the only card first.
    const saws = c.query($.my.equipment.def(PowerSaw));
    expect(saws.map(({ variables }) => variables.stoic).sort()).toEqual(
      hands === 1 ? [0, 1] : [1, 1],
    );
    for (const [wearer, saw] of [
      [active, activeSaw],
      [standby, standbySaw],
    ]) {
      const { stoic } = c.query($.my.id(saw.id))[0].variables;
      c.expect(wearer).toHaveVariable({ health: 9 + stoic });
      c.expect(saw).toHaveVariable({ usagePerRound: 1 - stoic });
    }
    c.expect($.my.combatStatus).toNotExist();
    await c.me.end();
  },
);

test("opposing Xinyan and Power Saw resolve both owners' inline discard requests independently", async () => {
  const wearer = ref();
  const saw = ref();
  const mine = ref();
  const theirs = ref();
  const myLab = ref();
  const oppLab = ref();
  const c = setup(
    <State data={data} currentTurn="opp">
      <Character opp active def={Xinyan} />
      <Character my active ref={wearer}>
        <Equipment def={PowerSaw} ref={saw} />
      </Character>
      <Card my def={Paimon} ref={mine} />
      <Card my def={Paimon} />
      <Card opp def={Paimon} />
      <Card opp def={Paimon} ref={theirs} />
      <Support my def={Laboratory} ref={myLab} />
      <Support opp def={Laboratory} ref={oppLab} />
    </State>,
  );
  await c.opp.skill(SweepingFervor);
  await c.me.selectOption(1);
  c.expect($.my.hand).toBe(mine);
  c.expect($.opp.hand).toBeCount(2);
  c.expect($.opp.combatStatus.def(113121)).toHaveVariable({ shield: 2 });
  await c.opp.selectOption(0);
  c.expect($.opp.hand).toBe(theirs);
  c.expect(wearer).toHaveVariable({ health: 9 });
  c.expect(saw).toHaveVariable({ stoic: 1 });
  c.expect(myLab).toHaveVariable({ progress: 1 });
  c.expect(oppLab).toHaveVariable({ progress: 1 });
  c.expect($.opp.combatStatus.def(113121)).toHaveVariable({ shield: 2 });
  c.expect($.my.combatStatus).toNotExist();
  c.expect($.opp.combatStatus).toBeCount(1);
  await c.me.end();
});
