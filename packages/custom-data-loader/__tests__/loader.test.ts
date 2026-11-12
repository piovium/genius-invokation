import {
  AssetsManager,
  type AssetsManagerOption,
} from "@gi-tcg/assets-manager";
import { Game, playSkillOfCard } from "@gi-tcg/core";
import { DiceType, SelectOptionUiType } from "@gi-tcg/typings";
import { describe, expect, test, vi } from "vitest";

import { CustomDataLoader } from "../src";

const customGts = `
import { DamageType, DiceType } from "#custom-data-loader";

define attachment {
  name "Shield" as Shield;
  description "An attachment with custom metadata.";
  playingDescription "Shield currently attached.";
  image "https://example.test/shield.png";
  tags artifact;
  addCost 1;
}

define skill {
  name "Strike" as Strike;
  description "Deal one physical damage.";
  skillType normal;
  cost DiceType.Cryo, 1;
  cost DiceType.Void, 2;
  :damage(DamageType.Physical, 1);
}

define character {
  name "Tester" as Tester;
  description "A custom character.";
  health 10;
  energy 2;
  skills Strike;
}

define status {
  name "Marked" as Marked;
  description "A custom status.";
  playingDescription "Marked is active.";
  usage 1;
}

define card {
  name "Impact" as Impact;
  description "A custom event card.";
  playingDescription "Impact is being played.";
  dynamicDescription "Impact has dynamic data.";
  cost DiceType.Omni, 1;
  :damage(DamageType.Piercing, 1);
}
`;

const overrideGts = `
import { DamageType, DiceType } from "#custom-data-loader";

define status {
  id 100 as ResistantFormOverride;
  name "Custom Resistant Form";
  description "Custom status description.";
  playingDescription "Custom playing status description.";
  image "https://example.test/status.png";
  usage 2;
}

define attachment {
  id 201 as CostIncreaseOverride;
  name "Custom Cost Increase";
  description "Custom attachment description.";
  image "https://example.test/attachment.png";
  tags artifact;
  addCost 2;
}

define skill {
  id 11011 as LiutianArcheryOverride;
  name "Custom Liutian Archery";
  description "Custom skill description.";
  image "https://example.test/skill.png";
  skillType burst;
  cost DiceType.Cryo, 2;
  :damage(DamageType.Cryo, 5);
}

define character {
  id 20000000 as ExplicitIdCharacter;
  name "Explicit ID Character";
  health 10;
  energy 2;
}

define card {
  id 20000001 as ExplicitIdCard;
  name "Explicit ID Card";
  dynamicDescription "Custom dynamic card description.";
  cost DiceType.Omni, 1;
  :damage(DamageType.Piercing, 1);
}

define status {
  name "Auto ID Status" as AutoIdStatus;
  description "Still uses the first generated ID.";
  usage 1;
}
`;

const conflictingCustomDataGts = `
define status {
  id 100 as ConflictingStatus;
  name "Conflicting Status";
  usage 1;
}
`;

describe("CustomDataLoader GTS", () => {
  test.each([
    {
      argument: ', { who: "my", uiType: "cardFace" }',
      uiType: SelectOptionUiType.CARD_FACE,
      who: 0,
    },
    {
      argument: ', { uiType: "icon" }',
      uiType: SelectOptionUiType.ICON,
      who: 0,
    },
    {
      argument: ', { who: "my", uiType: "none" }',
      uiType: SelectOptionUiType.NONE,
      who: 0,
    },
    { argument: "", uiType: SelectOptionUiType.NONE, who: 0 },
    { argument: ", {}", uiType: SelectOptionUiType.NONE, who: 0 },
    { argument: ', { who: "opp" }', uiType: SelectOptionUiType.NONE, who: 1 },
    {
      argument: ', { who: "opp", uiType: "icon" }',
      uiType: SelectOptionUiType.ICON,
      who: 1,
    },
  ])(
    "preserves option presentation with settings argument '$argument'",
    async ({ argument, uiType, who }) => {
      const [data] = (
        await new CustomDataLoader().loadMod(`
        define card {
          id 20000010;
          name "Question";
          :selectOption("Choose", [
            { key: "reference", text: "$[C1101]", image: "id://1101" },
            { key: "empty", title: "", text: "", image: "id://1102" },
            { key: "url", text: "URL", image: "https://example.com/card.png" },
            { key: "text", title: "Title", text: "Text" }
          ]${argument});
        }
      `)
      ).done();
      const state = Game.createInitialState({
        data,
        decks: [
          { characters: [], cards: [20000010] },
          { characters: [], cards: [] },
        ],
      });
      const caller = state.players[0].pile[0];
      const definition = playSkillOfCard(caller.definition)!;
      const [, result] = definition.action(
        state,
        {
          caller,
          definition,
          requestBy: null,
          prepared: false,
          environment: "normal",
          finalizeMode: "standard",
        },
        { targets: [] },
      );

      expect(result.error).toBeNull();
      expect(
        result.emittedEvents.filter(([name]) => name === "requestSelectOption"),
      ).toEqual([
        [
          "requestSelectOption",
          expect.objectContaining({
            who,
            prompt: "Choose",
            uiType,
            options: [
              { key: "reference", text: "$[C1101]", image: "id://1101" },
              { key: "empty", title: "", text: "", image: "id://1102" },
              {
                key: "url",
                text: "URL",
                image: "https://example.com/card.png",
              },
              { key: "text", title: "Title", text: "Text" },
            ],
          }),
        ],
      ]);
    },
  );

  test("loads text option selection and its result listener", async () => {
    const [data] = (
      await new CustomDataLoader().loadMod(`
      define card {
        id 20000010;
        name "Question";
        :selectOption("Choose", [{ key: "yes", text: "Yes" }]);
      }
      define combatStatus {
        id 20000011;
        name "Answer";
        variable answered, 0;
        on selectOption {
          when :(:e.selectedKey === "yes" && :e.selectedOption === "Yes");
          :variables.answered += 1;
        }
      }
    `)
    ).done();
    expect(data.entities.get(20000010)?.skills).toHaveLength(1);
    expect(data.entities.get(20000011)?.skills[0].triggerOn).toBe(
      "onSelectOption",
    );
  });

  test.each([
    { internalCharacter: true, internalCard: true, compatible: true },
    { internalCharacter: false, internalCard: true, compatible: false },
    { internalCharacter: true, internalCard: false, compatible: false },
    { internalCharacter: false, internalCard: false, compatible: false },
  ])(
    "checks deck compatibility with internal character=$internalCharacter and card=$internalCard",
    async ({ internalCharacter, internalCard, compatible }) => {
      const [gameData, options] = (
        await new CustomDataLoader().loadMod(
          customGts
            .replace(
              "define character {",
              `define character { ${internalCharacter ? "internal;" : ""}`,
            )
            .replace(
              "define card {",
              `define card { ${internalCard ? "internal;" : ""}`,
            ),
        )
      ).done();

      expect(options.officialDeckCompatible).toBe(compatible);
      expect(gameData.characters.has(10_000_002)).toBe(true);
      expect(gameData.entities.has(10_000_004)).toBe(true);
      expect(options.customData?.[0].characters).toEqual([
        expect.objectContaining({ id: 10_000_002, name: "Tester" }),
      ]);
      expect(options.customData?.[0].entities).toContainEqual(
        expect.objectContaining({ id: 10_000_004, name: "Impact" }),
      );
      const assets = new AssetsManager(options);
      expect(assets.getNameSync(10_000_002)).toBe("Tester");
      expect(assets.getNameSync(10_000_004)).toBe("Impact");
    },
  );

  test("registers generated definitions and their presentation metadata", async () => {
    const loader = await new CustomDataLoader().loadMod(customGts);
    const [gameData, { customData = [] }] = loader.done();
    expect(customData[0].attachments).toEqual([
      expect.objectContaining({
        id: 10_000_000,
        name: "Shield",
        rawDescription: "An attachment with custom metadata.",
        rawPlayingDescription: "Shield currently attached.",
        iconUrl: "https://example.test/shield.png",
        tags: ["artifact"],
      }),
    ]);
    expect(customData[0].characters).toEqual([
      expect.objectContaining({
        id: 10_000_002,
        name: "Tester",
        skills: [expect.objectContaining({ id: 10_000_001, name: "Strike" })],
      }),
    ]);
    expect(customData[0].characters[0]?.skills[0]?.playCost).toEqual([
      { type: DiceType.Cryo, count: 1 },
      { type: DiceType.Void, count: 2 },
    ]);
    expect(customData[0].entities).toContainEqual(
      expect.objectContaining({
        id: 10_000_003,
        name: "Marked",
        rawPlayingDescription: "Marked is active.",
      }),
    );
    expect(customData[0]).not.toHaveProperty("actionCards");
    expect(
      customData[0].entities.filter(({ id }) => id === 10_000_004),
    ).toHaveLength(1);
    expect(customData[0].entities).toContainEqual(
      expect.objectContaining({
        id: 10_000_004,
        name: "Impact",
        rawPlayingDescription: "Impact is being played.",
        rawDynamicDescription: "Impact has dynamic data.",
      }),
    );
    expect(
      customData[0].entities.find((entity) => entity.type === "eventCard")
        ?.playCost,
    ).toEqual([{ type: DiceType.Omni, count: 1 }]);
    expect(gameData.attachments.get(10_000_000)?.version.from).toBe(
      "customData",
    );
  });

  test("round-trips assets-manager options through JSON", async () => {
    const [, amOptions] = (
      await new CustomDataLoader().loadMod(customGts)
    ).done();
    const roundTrippedOptions = JSON.parse(
      JSON.stringify(amOptions),
    ) as Partial<AssetsManagerOption>;
    expect(roundTrippedOptions.officialDeckCompatible).toBe(false);
    const assets = new AssetsManager(roundTrippedOptions);

    expect(assets.getNameSync(10_000_000)).toBe("Shield");
    expect(assets.getImageUrlSync(10_000_000)).toBe(
      "https://example.test/shield.png",
    );
    expect(assets.getDataSync(10_000_000)).toEqual(
      expect.objectContaining({
        category: "entities",
        type: "attachment",
        rawDescription: "An attachment with custom metadata.",
        rawPlayingDescription: "Shield currently attached.",
      }),
    );
    expect(assets.getDataSync(10_000_001)).toEqual(
      expect.objectContaining({
        playCost: [
          { type: "GCG_COST_DICE_CRYO", count: 1 },
          { type: "GCG_COST_DICE_VOID", count: 2 },
        ],
      }),
    );
    expect(assets.getDataSync(10_000_004)).toEqual(
      expect.objectContaining({
        playCost: [{ type: "GCG_COST_DICE_ALIGNED", count: 1 }],
      }),
    );
  });

  test("explicit ids override official game data without consuming generated ids", async () => {
    const [gameData, { customData = [], overrideData }] = (
      await new CustomDataLoader().loadMod(overrideGts)
    ).done();

    expect(gameData.entities.get(100)?.version.from).toBe("customData");
    expect(gameData.attachments.get(201)?.version.from).toBe("customData");
    expect(gameData.characters.get(20_000_000)?.version.from).toBe(
      "customData",
    );
    expect(gameData.entities.get(20_000_001)?.version.from).toBe("customData");
    expect(gameData.entities.get(10_000_000)?.version.from).toBe("customData");
    expect(
      gameData.entities
        .get(20_000_001)
        ?.skills.find((skill) => skill.skillType === "playCard")?.id,
    ).toBeCloseTo(20_000_001.01);

    const overriddenSkill = gameData.characters
      .get(1101)
      ?.skills.find((skill) => skill.id === 11011);
    expect(overriddenSkill).toEqual(
      expect.objectContaining({
        id: 11011,
        skillType: "burst",
      }),
    );
    expect(customData[0].skills).not.toContainEqual(
      expect.objectContaining({
        id: 11011,
      }),
    );
    expect(customData[0].characters).not.toContainEqual(
      expect.objectContaining({ id: 20_000_000 }),
    );
    expect(customData[0].entities).not.toContainEqual(
      expect.objectContaining({ id: 20_000_001 }),
    );
    expect(overrideData).toEqual(
      expect.arrayContaining([
        {
          id: 100,
          name: "Custom Resistant Form",
          rawDescription: "Custom status description.",
          rawPlayingDescription: "Custom playing status description.",
        },
        {
          id: 11011,
          name: "Custom Liutian Archery",
          rawDescription: "Custom skill description.",
        },
        {
          id: 20_000_001,
          name: "Explicit ID Card",
          rawDynamicDescription: "Custom dynamic card description.",
        },
      ]),
    );
  });

  test("explicit-id metadata shallowly overrides official assets", async () => {
    const [, { customData, overrideData }] = (
      await new CustomDataLoader().loadMod(overrideGts)
    ).done();
    const fetchMock = vi.fn(async (url: string | URL) => {
      const id = Number(String(url).split("/").at(-1));
      return {
        json: async () => ({
          id,
          name: `Official ${id}`,
          rawDescription: `Official description ${id}`,
          rawPlayingDescription: `Official playing description ${id}`,
          rawDynamicDescription: `Official dynamic description ${id}`,
          officialOnly: true,
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const assets = new AssetsManager({
        customData,
        overrideData,
        concurrency: 0,
      });

      expect(assets.getNameSync(100)).toBe("Custom Resistant Form");
      expect(assets.getImageUrlSync(100)).not.toBe(
        "https://example.test/status.png",
      );
      await expect(assets.getData(100)).resolves.toEqual(
        expect.objectContaining({
          name: "Custom Resistant Form",
          rawDescription: "Custom status description.",
          rawPlayingDescription: "Custom playing status description.",
          rawDynamicDescription: "Official dynamic description 100",
          officialOnly: true,
        }),
      );

      expect(assets.getNameSync(201)).toBe("Custom Cost Increase");
      await expect(assets.getData(201)).resolves.toEqual(
        expect.objectContaining({
          rawDescription: "Custom attachment description.",
          rawPlayingDescription: "Official playing description 201",
          officialOnly: true,
        }),
      );

      expect(assets.getNameSync(11011)).toBe("Custom Liutian Archery");
      await expect(assets.getData(11011)).resolves.toEqual(
        expect.objectContaining({
          rawDescription: "Custom skill description.",
          officialOnly: true,
        }),
      );
      await expect(assets.getData(20_000_001)).resolves.toEqual(
        expect.objectContaining({
          name: "Explicit ID Card",
          rawDescription: "Official description 20000001",
          rawDynamicDescription: "Custom dynamic card description.",
          rawPlayingDescription: "Official playing description 20000001",
        }),
      );
      expect(fetchMock).toHaveBeenCalledTimes(4);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("rejects multiple custom data versions for the same id", async () => {
    const loader = await new CustomDataLoader().loadMod(
      conflictingCustomDataGts,
      conflictingCustomDataGts,
    );

    expect(() => loader.done()).toThrow(
      "Multiple custom data versions found for id 100",
    );
  });

  test("rejects imports outside the allowed GTS modules", async () => {
    const loader = new CustomDataLoader();
    await expect(loader.loadMod('import { x } from "mod";')).rejects.toThrow(
      "may only import",
    );
    await expect(loader.loadMod("export const x = 1;")).resolves.toBe(loader);
  });
});
