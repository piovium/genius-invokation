import { AssetsManager } from "@gi-tcg/assets-manager";
import { describe, expect, test } from "vitest";

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

describe("CustomDataLoader GTS", () => {
  test("registers generated definitions and their presentation metadata", async () => {
    const loader = await new CustomDataLoader().loadMod(customGts);
    const [gameData, customData] = loader.done();

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

  test("rejects imports outside the allowed GTS modules", async () => {
    const loader = new CustomDataLoader();
    await expect(loader.loadMod('import { x } from "mod";')).rejects.toThrow(
      "may only import",
    );
    await expect(loader.loadMod("export const x = 1;")).resolves.toBe(loader);
  });
});
