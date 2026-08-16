import { AssetsManager } from "@gi-tcg/assets-manager";
import { describe, expect, test, vi } from "vitest";

import { CustomDataLoader } from "../src";

const customGts = `
import { DamageType, DiceType } from "@gi-tcg/core/data";

define attachment {
  name "Shield" as Shield;
  description "An attachment with custom metadata.";
  image "https://example.test/shield.png";
  tags artifact;
  addCost 1;
}

define skill {
  name "Strike" as Strike;
  description "Deal one physical damage.";
  skillType normal;
  cost DiceType.Cryo, 1;
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
  usage 1;
}

define card {
  name "Impact" as Impact;
  description "A custom event card.";
  cost DiceType.Omni, 1;
  :damage(DamageType.Piercing, 1);
}
`;

const overrideGts = `
import { DamageType, DiceType } from "@gi-tcg/core/data";

define status {
  id 100 as ResistantFormOverride;
  name "Custom Resistant Form";
  description "Custom status description.";
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
  cost DiceType.Omni, 1;
  :damage(DamageType.Piercing, 1);
}

define status {
  name "Auto ID Status" as AutoIdStatus;
  description "Still uses the first generated ID.";
  usage 1;
}
`;

describe("CustomDataLoader GTS", () => {
  test("registers generated definitions and their presentation metadata", async () => {
    const loader = await new CustomDataLoader().loadMod(customGts);
    const [gameData, customData] = loader.done();

    console.log(customData);

    expect(customData.attachments).toEqual([
      expect.objectContaining({
        id: 10_000_000,
        name: "Shield",
        rawDescription: "An attachment with custom metadata.",
        iconUrl: "https://example.test/shield.png",
        tags: ["artifact"],
      }),
    ]);
    expect(customData.characters).toEqual([
      expect.objectContaining({
        id: 10_000_002,
        name: "Tester",
        skills: [expect.objectContaining({ id: 10_000_001, name: "Strike" })],
      }),
    ]);
    expect(customData.entities).toContainEqual(
      expect.objectContaining({ id: 10_000_003, name: "Marked" }),
    );
    expect(customData.actionCards).toContainEqual(
      expect.objectContaining({ id: 10_000_004, name: "Impact" }),
    );
    expect(gameData.attachments.get(10_000_000)?.version.from).toBe(
      "customData",
    );
  });

  test("registers custom attachments with standard assets-manager lookup APIs", async () => {
    const [, customData] = (
      await new CustomDataLoader().loadMod(customGts)
    ).done();
    const assets = new AssetsManager({
      customData: [customData],
      concurrency: 0,
    });

    expect(assets.getNameSync(10_000_000)).toBe("Shield");
    expect(assets.getImageUrlSync(10_000_000)).toBe(
      "https://example.test/shield.png",
    );
    expect(assets.getDataSync(10_000_000)).toEqual(
      expect.objectContaining({
        category: "entities",
        type: "attachment",
        rawDescription: "An attachment with custom metadata.",
      }),
    );
  });

  test("explicit ids override official game data without consuming generated ids", async () => {
    const [gameData, customData] = (
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
    expect(customData.skills).toContainEqual(
      expect.objectContaining({
        id: 11011,
        name: "Custom Liutian Archery",
        rawDescription: "Custom skill description.",
        skillIconUrl: "https://example.test/skill.png",
      }),
    );
  });

  test("explicit-id metadata overrides official assets", async () => {
    const [, customData] = (
      await new CustomDataLoader().loadMod(overrideGts)
    ).done();
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        data: [
          { id: 100, rawDescription: "Official status description." },
          { id: 201, rawDescription: "Official attachment description." },
          { id: 11011, rawDescription: "Official skill description." },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const assets = new AssetsManager({
        customData: [customData],
        concurrency: 0,
      });

      await assets.prepareForSync();

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(assets.getNameSync(100)).toBe("Custom Resistant Form");
      expect(assets.getImageUrlSync(100)).toBe(
        "https://example.test/status.png",
      );
      expect(assets.getDataSync(100)).toEqual(
        expect.objectContaining({
          rawDescription: "Custom status description.",
        }),
      );

      expect(assets.getNameSync(201)).toBe("Custom Cost Increase");
      expect(assets.getImageUrlSync(201)).toBe(
        "https://example.test/attachment.png",
      );
      expect(assets.getDataSync(201)).toEqual(
        expect.objectContaining({
          rawDescription: "Custom attachment description.",
        }),
      );

      expect(assets.getNameSync(11011)).toBe("Custom Liutian Archery");
      expect(assets.getImageUrlSync(11011)).toBe(
        "https://example.test/skill.png",
      );
      expect(assets.getDataSync(11011)).toEqual(
        expect.objectContaining({
          rawDescription: "Custom skill description.",
        }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("rejects imports outside the allowed GTS modules", async () => {
    const loader = new CustomDataLoader();
    await expect(loader.loadMod('import { x } from "mod";')).rejects.toThrow(
      "may only import",
    );
    await expect(loader.loadMod("export const x = 1;")).resolves.toBe(loader);
  });
});
