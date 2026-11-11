import { beforeAll, expect, test } from "vitest";
import physicalVersion from "@gi-tcg/shining-soul/profiles/physical_version";
import { compilePreset } from "../../server/src/profiles/compiler";
import { presetSchema } from "../../server/src/profiles/schema";
import { createOfficialVersionResolver, type GameData } from "@gi-tcg/core";
import { analyzeResult } from "../../data-code-analyzer/src/index";
import {
  cardVersions,
  dependencyVersions,
} from "@gi-tcg/shining-soul/version_maps/physical_version";
import {
  Card,
  Character,
  Equipment,
  Support,
  CombatStatus,
  DiceCount,
  State,
  setup,
  ref,
  $,
} from "#test";
import {
  DiceType,
  type CardHandle,
  type CharacterHandle,
  type EquipmentHandle,
  type SupportHandle,
  type SkillHandle,
  type CombatStatusHandle,
} from "@gi-tcg/core/data";

let data: GameData;
beforeAll(async () => {
  const preset = presetSchema.parse(await physicalVersion());
  const compiled = await compilePreset(preset, new URL(import.meta.url));
  data = compiled.data;
  expect(compiled.summary.officialDeckCompatible).toBe(true);
  expect(preset.deck?.whitelist).toHaveLength(327);
  expect(
    preset.deck?.whitelist?.filter((id) => data.characters.has(id)),
  ).toHaveLength(72);
  expect(preset.deck?.whitelist).not.toContain(322023);
}, 30000);

test("physical profile resolves its full card pool", async () => {
  const preset = await physicalVersion();
  for (const id of preset.deck.whitelist) {
    expect(data.characters.has(id) || data.entities.has(id), String(id)).toBe(
      true,
    );
  }
});

test("every explicit dependency version is necessary to resolve a propagation conflict", () => {
  for (const id of Object.keys(dependencyVersions)) {
    const versions = Object.fromEntries(
      Object.entries({ ...cardVersions, ...dependencyVersions }).filter(
        ([key]) => key !== id,
      ),
    );
    expect(() =>
      createOfficialVersionResolver("v7.2.0", versions, analyzeResult),
    ).toThrow(`Entity ${id} has conflicting propagated versions`);
  }
});

test.each([332015, 332016])(
  "%i lets the opponent choose from the declared pair",
  async (id) => {
    const c = setup(
      <State data={data}>
        <Card my def={id as CardHandle} />
      </State>,
    );
    await c.me.card(id as CardHandle);
    await c.me.selectOption(0); // Ice / Water
    await c.opp.selectOption(1);
    c.expect(id === 332015 ? $.my.summon : $.opp.combatStatus).toBeCount(1);
    expect(
      (id === 332015
        ? c.state.players[0].summons
        : c.state.players[1].combatStatuses)[0].definition.id,
    ).toBe(id === 332015 ? 303212 : 303217);
  },
);

test.each([0, 1])(
  "Cathedral full-health choice %i consumes only on confirmation",
  async (choice) => {
    const cathedral = ref();
    const c = setup(
      <State data={data} phase="end">
        <Support my def={321006 as SupportHandle} ref={cathedral} />
      </State>,
    );
    await c.stepToNextAction();
    await c.me.selectOption(choice);
    c.expect(cathedral).toHaveVariable({ usage: choice ? 1 : 2 });
  },
);

test.each([
  {
    collected: 0,
    choices: [0],
    expected: 0,
    dice: [DiceType.Pyro, DiceType.Omni],
    left: [DiceType.Pyro, DiceType.Omni],
  },
  {
    collected: 0,
    choices: [1, 1],
    expected: 2,
    dice: [DiceType.Pyro, DiceType.Omni],
    left: [],
  },
  {
    collected: 2,
    choices: [1],
    expected: 3,
    dice: [DiceType.Pyro, DiceType.Omni],
    left: [DiceType.Omni],
  },
  {
    collected: 0,
    choices: [1, 0],
    expected: 1,
    dice: [DiceType.Omni, DiceType.Omni],
    left: [DiceType.Omni],
  },
  {
    collected: 0,
    choices: [1, 1],
    expected: 2,
    dice: [DiceType.Omni, DiceType.Omni],
    left: [],
  },
  {
    collected: 0,
    choices: [1, 1, 1],
    expected: 3,
    dice: [DiceType.Omni, DiceType.Omni, DiceType.Omni, DiceType.Omni],
    left: [DiceType.Omni],
  },
  {
    collected: 0,
    choices: [1, 1, 1],
    expected: 3,
    dice: [DiceType.Pyro, DiceType.Pyro, DiceType.Omni, DiceType.Omni],
    left: [DiceType.Pyro],
  },
  {
    collected: 0,
    choices: [1],
    expected: 1,
    dice: [DiceType.Pyro, DiceType.Pyro],
    left: [DiceType.Pyro],
  },
  {
    collected: 0,
    choices: [],
    expected: 0,
    dice: [],
    left: [],
  },
])(
  "Liben chooses $choices from $dice with $collected previously collected",
  async ({ collected, choices, expected, dice, left }) => {
    const liben = ref();
    const c = setup(
      <State data={data}>
        <Support
          my
          def={322008 as SupportHandle}
          ref={liben}
          v={{ collected }}
        />
        <Support my def={321006 as SupportHandle} />
      </State>,
    );
    c.game.mutate({ type: "resetDice", who: 0, value: dice, reason: "absorb" });
    await c.me.end();
    await c.opp.end();
    for (const [index, choice] of choices.entries()) {
      await c.me.selectOption(choice);
      c.expect(liben).toHaveVariable({
        collected: collected + index + Number(choice !== 0),
      });
    }
    c.expect(liben).toHaveVariable({ collected: expected });
    expect([...c.state.players[0].dice].sort()).toEqual([...left].sort());
  },
);

test("two Liben instances consume only their own choices", async () => {
  const first = ref(),
    second = ref();
  const c = setup(
    <State data={data} phase="end">
      <DiceCount my type={DiceType.Pyro} count={2} />
      <Support my def={322008 as SupportHandle} ref={first} />
      <Support my def={322008 as SupportHandle} ref={second} />
      <Support my def={321006 as SupportHandle} />
    </State>,
  );
  await c.stepToNextAction();
  await c.me.selectOption(1);
  c.expect(first).toHaveVariable({ collected: 1 });
  c.expect(second).toHaveVariable({ collected: 0 });
  await c.me.selectOption(1);
  c.expect(second).toHaveVariable({ collected: 1 });
  expect(c.state.players[0].dice).toEqual([]);
});

test("Liben can collect the same element again next round", async () => {
  const liben = ref();
  const c = setup(
    <State data={data}>
      <Support my def={322008 as SupportHandle} ref={liben} />
      <Support my def={321006 as SupportHandle} />
    </State>,
  );
  for (const collected of [1, 2]) {
    c.game.mutate({
      type: "resetDice",
      who: 0,
      value: [DiceType.Pyro, DiceType.Pyro],
      reason: "absorb",
    });
    await c.me.end();
    await c.opp.end();
    await c.me.selectOption(1);
    c.expect(liben).toHaveVariable({ collected });
    expect(c.state.players[0].dice).toEqual([DiceType.Pyro]);
    await c.me.selectOption(0); // Skip Cathedral and start the next round.
  }
});

test.each([312015, 312016])(
  "%i consumes foam remainders on damage",
  async (id) => {
    const artifact = ref();
    const c = setup(
      <State data={data}>
        <Character my active def={1301 as CharacterHandle}>
          <Equipment
            def={id as EquipmentHandle}
            ref={artifact}
            v={{ bubble: 5 }}
          />
        </Character>
      </State>,
    );
    await c.me.skill(13011 as SkillHandle);
    c.expect($.opp.active).toHaveVariable({ health: 7 });
    c.expect(artifact).toHaveVariable({ bubble: 0 });
  },
);

test("Clam heals three, counts actual healing and includes standby characters", async () => {
  const wearer = ref(),
    other = ref();
  const c = setup(
    <State data={data}>
      <Character
        my
        active
        def={1301 as CharacterHandle}
        ref={wearer}
        health={9}
      />
      <Character my def={1103 as CharacterHandle} ref={other} health={6} />
      <Card my def={312016 as CardHandle} />
      <Card my def={333005 as CardHandle} />
    </State>,
  );
  await c.me.card(312016 as CardHandle, wearer);
  c.expect(wearer).toHaveVariable({ health: 10 });
  c.expect($.my.equipped.def(312016 as EquipmentHandle)).toHaveVariable({
    bubble: 1,
  });
  await c.me.card(333005 as CardHandle, other);
  c.expect($.my.equipped.def(312016 as EquipmentHandle)).toHaveVariable({
    bubble: 2,
  });
});

test.each([322003, 322004])(
  "%i draws only after its first successful free equipment",
  async (id) => {
    const support = ref(),
      wearer = ref();
    const equipment = (id === 322003 ? 312015 : 311301) as CardHandle;
    const c = setup(
      <State data={data}>
        <Character my active def={1301 as CharacterHandle} ref={wearer} />
        <Support my def={id as SupportHandle} ref={support} />
        <Card my def={equipment} />
        <Card my def={332004 as CardHandle} pile />
      </State>,
    );
    await c.stepToNextAction();
    c.expect($.my.hand).toBeCount(1); // Previews must not draw.
    await c.me.card(equipment, wearer);
    c.expect($.my.hand).toBeDefinition(332004);
    c.expect(support).toHaveVariable({
      drawn: 1,
      material: id === 322003 ? 1 : 0,
    });
    expect(c.state.players[0].dice).toHaveLength(8);
  },
);

test("Narukami produces an omni only after an odd remaining dice count", async () => {
  const c = setup(
    <State data={data}>
      <Character my active def={1301 as CharacterHandle} />
      <Support my def={321008 as SupportHandle} />
    </State>,
  );
  await c.me.skill(13011 as SkillHandle);
  expect(c.state.players[0].dice).toHaveLength(6);
});

test.each([false, true])(
  "Elegy shared buff requires any equipped Elegy: %s",
  async (equipped) => {
    const c = setup(
      <State data={data}>
        <Character my active def={1301 as CharacterHandle} />
        <Character my def={1401 as CharacterHandle}>
          {equipped ? <Equipment def={311205 as EquipmentHandle} /> : []}
        </Character>
        <CombatStatus my def={301102 as CombatStatusHandle} />
      </State>,
    );
    await c.me.skill(13011 as SkillHandle);
    c.expect($.opp.active).toHaveVariable({ health: equipped ? 7 : 8 });
    c.expect($.my.combatStatus.def(301102 as CombatStatusHandle)).toBeExist();
  },
);

test("Reed Sea permits two triggers of the same condition per round", async () => {
  const weapon = ref();
  const c = setup(
    <State data={data}>
      <DiceCount my count={16} />
      <Character my active def={1301 as CharacterHandle}>
        <Equipment def={311306 as EquipmentHandle} ref={weapon} />
      </Character>
      <Character opp active maxHealth={30} health={30} />
    </State>,
  );
  await c.me.skill(13012 as SkillHandle);
  await c.opp.end();
  await c.me.skill(13012 as SkillHandle);
  c.expect(weapon).toHaveVariable({ triggers: 0 });
  await c.me.skill(13011 as SkillHandle);
  c.expect($.opp.active).toHaveVariable({ health: 17 }); // 4 + 5 + 4
});

test("Bell shields are independent and unequipping removes only its pool", async () => {
  const first = ref(),
    second = ref();
  const c = setup(
    <State data={data}>
      <DiceCount my count={16} />
      <Character my active ref={first} def={1301 as CharacterHandle}>
        <Equipment def={311305 as EquipmentHandle} />
      </Character>
      <Character my ref={second} def={1306 as CharacterHandle}>
        <Equipment def={311305 as EquipmentHandle} />
      </Character>
      <Character opp active health={30} maxHealth={30} />
      <Card my def={311301 as CardHandle} />
    </State>,
  );
  await c.me.skill(13011 as SkillHandle);
  await c.opp.end();
  await c.me.switch(second);
  await c.me.skill(13061 as SkillHandle);
  c.expect($.my.combatStatus.tag("shield")).toBeCount(2);
  await c.me.card(311301 as CardHandle, first);
  c.expect($.my.combatStatus.tag("shield")).toBeCount(1);
  expect(c.state.players[0].combatStatuses[0].variables.ownerId).toBe(
    second.id,
  );
});

test.each(["tune", "discard"] as const)(
  "Yun Jin only counts tuning, not %s",
  async (method) => {
    const yunJin = ref();
    const c = setup(
      <State data={data}>
        <Character my active def={1607 as CharacterHandle} ref={yunJin} />
        <Card my def={332004 as CardHandle} />
        {method === "discard" ? (
          <Card my def={124051 as CardHandle} />
        ) : (
          <Card my def={333005 as CardHandle} />
        )}
      </State>,
    );
    if (method === "tune") {
      await c.me.tune(332004 as CardHandle);
    } else {
      await c.me.card(124051 as CardHandle);
    }
    c.expect(yunJin).toHaveVariable({
      discardOrTuneCardCount: method === "tune" ? 1 : 0,
    });
    await c.me.skill(16072 as SkillHandle);
    await c.opp.end();
    c.expect($.opp.active).toHaveVariable({
      health: method === "tune" ? 7 : 8,
    });
  },
);

test("Electro Cicin Mage requires three energy for her burst", async () => {
  const caster = ref();
  const c = setup(
    <State data={data}>
      <Character
        my
        active
        def={2404 as CharacterHandle}
        energy={3}
        ref={caster}
      />
    </State>,
  );
  c.expect(caster).toHaveVariable({ maxEnergy: 3 });
  await c.me.skill(24043 as SkillHandle);
  c.expect(caster).toHaveVariable({ energy: 0 });
  c.expect($.opp.active).toHaveVariable({ health: 9 });
});

test.each([
  [2205, 10],
  [2601, 8],
])("%i uses physical HP %i", async (id, hp) => {
  const c = setup(
    <State data={data}>
      <Character my active def={id as CharacterHandle} />
    </State>,
  );
  c.expect($.my.active).toHaveVariable({ health: hp, maxHealth: hp });
});

test("Bell's normal combat shield accepts Geo resonance above its own cap", async () => {
  const c = setup(
    <State data={data}>
      <DiceCount my count={16} />
      <Character my active def={1602 as CharacterHandle} energy={2}>
        <Equipment def={311305 as EquipmentHandle} />
      </Character>
      <Character opp active health={30} maxHealth={30} />
      <Card my def={331602 as CardHandle} />
    </State>,
  );
  await c.me.skill(16021 as SkillHandle);
  await c.opp.end();
  await c.me.card(331602 as CardHandle);
  await c.me.skill(16023 as SkillHandle);
  c.expect($.my.combatStatus.tag("shield")).toHaveVariable({ shield: 4 });
  await c.me.end();
  await c.opp.end();
  await c.me.skill(16021 as SkillHandle);
  c.expect($.my.combatStatus.tag("shield")).toHaveVariable({ shield: 4 });
});

test("Bell shield disappears when its owner is defeated", async () => {
  const c = setup(
    <State data={data}>
      <Character my active def={1301 as CharacterHandle} health={1}>
        <Equipment def={311305 as EquipmentHandle} />
      </Character>
      <Character my def={1103 as CharacterHandle} />
      <Character opp active def={1301 as CharacterHandle} />
    </State>,
  );
  await c.me.skill(13011 as SkillHandle);
  await c.opp.skill(13012 as SkillHandle);
  c.expect($.my.combatStatus.tag("shield")).toNotExist();
});

test("two Cathedrals resolve their choices independently", async () => {
  const a = ref(),
    b = ref();
  const c = setup(
    <State data={data} phase="end">
      <Support my def={321006 as SupportHandle} ref={a} />
      <Support my def={321006 as SupportHandle} ref={b} />
    </State>,
  );
  await c.stepToNextAction();
  await c.me.selectOption(1);
  c.expect(a).toHaveVariable({ usage: 1 });
  c.expect(b).toHaveVariable({ usage: 2 });
  await c.me.selectOption(0);
  c.expect(b).toHaveVariable({ usage: 2 });
});

test("Liben pays out after choosing three distinct dice", async () => {
  const liben = ref();
  const c = setup(
    <State data={data}>
      <Support my def={322008 as SupportHandle} ref={liben} />
      <Card my def={332004 as CardHandle} pile />
      <Card my def={332004 as CardHandle} pile />
      <Card my def={332004 as CardHandle} pile />
      <Card my def={332004 as CardHandle} pile />
    </State>,
  );
  c.game.mutate({
    type: "resetDice",
    who: 0,
    value: [DiceType.Cryo, DiceType.Pyro, DiceType.Omni],
    reason: "absorb",
  });
  await c.me.end();
  await c.opp.end();
  await c.me.selectOption(1);
  await c.me.selectOption(1);
  await c.me.selectOption(1);
  c.expect(liben).toNotExist();
  c.expect($.my.hand).toBeCount(4); // Two round draw + two from Liben.
  expect(c.state.players[0].dice).toHaveLength(10);
});

test("earliest equivalent Lithic Spear still counts defeated Liyue characters", async () => {
  const wearer = ref();
  const c = setup(
    <State data={data}>
      <Character my active def={1603 as CharacterHandle} ref={wearer} />
      <Character my def={1103 as CharacterHandle} />
      <Character my def={1607 as CharacterHandle} alive={0} health={0} />
      <Card my def={311402 as CardHandle} />
    </State>,
  );
  await c.me.card(311402 as CardHandle, wearer);
  c.expect($.my.status.tag("shield")).toHaveVariable({ shield: 2 });
});
