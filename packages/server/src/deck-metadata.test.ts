import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import type { Deck } from "@gi-tcg/typings";
import type {
  ActionCardRawData,
  CharacterRawData,
} from "@gi-tcg/assets-manager";
import { generateDeckMetadata } from "../scripts/deck-metadata";
import metadata from "../generated/deck-metadata";

const root = path.resolve(import.meta.dirname, "..");
const assetsRoot = path.resolve(root, "../assets-manager");
const generated = path.join(root, "generated");
const manifest = JSON.parse(
  await readFile(path.join(generated, "deck-metadata-manifest.json"), "utf8"),
);
const source = path.resolve(assetsRoot, manifest.sourceDirectory);
const categories = [
  "action_cards",
  "characters",
  "entities",
  "keywords",
] as const;
const raw = Object.fromEntries(
  await Promise.all(
    categories.map(async (category) => [
      category,
      JSON.parse(
        await readFile(path.join(source, "CHS", `${category}.json`), "utf8"),
      ),
    ]),
  ),
) as Record<(typeof categories)[number], Record<string, unknown>[]>;
const cards = raw.action_cards as unknown as ActionCardRawData[];
const characters = raw.characters as unknown as CharacterRawData[];
const base: Deck = JSON.parse(
  await readFile(
    path.resolve(root, "../../scripts/server-harness/deck.json"),
    "utf8",
  ),
);
const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");

// Independent from the generator: changes to its projection must still be checked.
const expectedMetadataFields = [
  "id",
  "shareId",
  "tags",
  "sinceVersion",
  "relatedCharacterId",
  "relatedCharacterTags",
] as const;

test("all real raw metadata fields, record order, duplicates and source hashes match the generated index", async () => {
  const expected: Record<string, unknown> = {};
  const duplicates: { id: unknown; ignoredCategory: string }[] = [];
  for (const category of categories) {
    const bytes = await readFile(
      path.join(source, "CHS", `${category}.json`),
      "utf8",
    );
    assert.equal(digest(bytes), manifest.sourceHashes[`CHS/${category}.json`]);
    assert.equal(raw[category].length, manifest.categoryCounts[category]);
    for (const record of raw[category]) {
      const id = String(record.id);
      if (Object.hasOwn(expected, id)) {
        duplicates.push({ id: record.id, ignoredCategory: category });
        continue;
      }
      // Independent allowlist: these are all fields read by the original
      // verifier and minimum-version function, including missing properties.
      expected[id] = Object.fromEntries(
        Object.entries(record).filter(([key]) =>
          expectedMetadataFields.some((field) => field === key),
        ),
      );
    }
  }
  assert.deepEqual(metadata, expected);
  assert.deepEqual(manifest.duplicateIds, duplicates);
  assert.equal(Object.keys(metadata).length, manifest.recordCount);
  assert.equal(digest(JSON.stringify(metadata)), manifest.metadataSha256);
  assert.equal(
    Buffer.byteLength(JSON.stringify(metadata)),
    manifest.metadataBytes,
  );
  // Language must not alter deck legality. Compare all relevant EN values
  // against the raw CHS values from which the sharing map is generated.
  for (const category of categories) {
    const english: Record<string, unknown>[] = JSON.parse(
      await readFile(path.join(source, "EN", `${category}.json`), "utf8"),
    );
    const englishById = new Map(english.map((record) => [record.id, record]));
    for (const record of raw[category]) {
      const englishRecord = englishById.get(record.id);
      if (!englishRecord) {
        // The real snapshot has a few CHS-only unobtainable records. The
        // frontend sharing map is generated from CHS, so retain those too.
        assert.notEqual(
          typeof record.shareId,
          "number",
          `${category}/${record.id} obtainable metadata must exist in both languages`,
        );
        continue;
      }
      for (const key of expectedMetadataFields) {
        assert.deepEqual(
          englishRecord[key],
          record[key],
          `${category}/${record.id}/${key}`,
        );
        assert.equal(
          Object.hasOwn(englishRecord, key),
          Object.hasOwn(record, key),
        );
      }
    }
  }
});

test("source and dist generation agree and the original static codec/share map remain byte-for-byte", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "gi-deck-metadata-"));
  try {
    const fromSource = await generateDeckMetadata({
      dataDirectory: path.join(assetsRoot, "src/data"),
      outputDirectory: path.join(folder, "source"),
    });
    const fromDist = await generateDeckMetadata({
      dataDirectory: path.join(assetsRoot, "dist/data"),
      outputDirectory: path.join(folder, "dist"),
    });
    assert.deepEqual(fromSource.index, fromDist.index);
    assert.deepEqual(
      fromSource.manifest.sourceHashes,
      fromDist.manifest.sourceHashes,
    );
    assert.equal(fromSource.manifest.metadataSha256, manifest.metadataSha256);
    const codec = await readFile(
      path.join(assetsRoot, "src/sharing.ts"),
      "utf8",
    );
    assert.equal(
      await readFile(path.join(generated, "sharing.ts"), "utf8"),
      codec,
    );
    assert.equal(digest(codec), manifest.sourceHashes["sharing.ts"]);
    const share = await readFile(path.join(source, "share_id.json"), "utf8");
    assert.equal(
      await readFile(path.join(generated, "data/share_id.json"), "utf8"),
      share,
    );
    assert.equal(digest(share), manifest.sourceHashes["share_id.json"]);
    const shareMap: Record<string, number> = JSON.parse(share);
    const obtainable = [...characters, ...cards].filter(
      (record) => typeof record.shareId === "number",
    );
    assert.equal(obtainable.length, manifest.shareIdCount);
    for (const record of obtainable)
      assert.equal(shareMap[record.shareId!], record.id);
  } finally {
    if (
      path.dirname(path.resolve(folder)) !== path.resolve(tmpdir()) ||
      !path.basename(folder).startsWith("gi-deck-metadata-")
    )
      throw new Error("Unexpected generated test folder");
    await rm(folder, { recursive: true, force: true });
  }
});

test("original legal/illegal deck restrictions and every minimum version work with fetch forbidden", async () => {
  const originalFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = new Proxy(originalFetch, {
    apply() {
      fetches++;
      throw new Error("Deck verification must not use the network");
    },
  });
  try {
    // Import after denying fetch, checking initialization as well as requests.
    const { ASSETS_MANAGER, verifyDeck, minimumRequiredVersionOfDeck } =
      await import("./utils");
    const { DecksService } = await import("./decks/decks.service");
    assert.deepEqual(Object.keys(ASSETS_MANAGER).sort(), ["decode", "encode"]);
    assert.deepEqual(ASSETS_MANAGER.decode(ASSETS_MANAGER.encode(base)), base);
    // Real card 333009 (Tandoori Roast Chicken) was introduced in v3.7.0.
    assert.equal(await verifyDeck(base), "v3.7.0");
    const withCard = (
      id: number,
      count = 1,
      roster = base.characters,
    ): Deck => ({
      characters: [...roster],
      cards: [...Array(count).fill(id), ...base.cards.slice(count)],
    });
    const rejects = (deck: Deck, code: string) =>
      assert.rejects(verifyDeck(deck), { code });
    await rejects({ ...base, characters: [1103, 1103, 1301] }, "SizeError");
    await rejects({ ...base, cards: base.cards.slice(1) }, "SizeError");
    await rejects(withCard(base.cards[0]!, 3), "CountLimitError");
    await rejects(
      { ...base, characters: [99999999, 1201, 1301] },
      "NotFoundError",
    );
    await rejects(withCard(99999999), "NotFoundError");
    // This method does not touch its database; invoke the actual method to
    // preserve validation-error precedence over sharing-code encoding errors.
    await assert.rejects(
      DecksService.prototype.deckToCode({ characters: [99999999], cards: [] }),
      { message: "deck must contain 3 characters" },
    );
    await assert.rejects(
      DecksService.prototype.deckToCode(withCard(99999999)),
      {
        message: "card id 99999999 not found",
      },
    );
    const hiddenCharacter = characters.find(
      (record) => typeof record.shareId !== "number",
    );
    const hiddenCard = cards.find(
      (record) => typeof record.shareId !== "number",
    );
    assert.ok(
      hiddenCharacter && hiddenCard,
      "real unobtainable examples exist",
    );
    await rejects(
      { ...base, characters: [hiddenCharacter.id, 1201, 1301] },
      "NotFoundError",
    );
    await rejects(withCard(hiddenCard.id), "RelationError");

    for (const tag of ["GCG_TAG_LEGEND", "GCG_TAG_CARD_BLESSING"]) {
      const singleton = cards.find(
        (card) =>
          typeof card.shareId === "number" &&
          card.tags.includes(tag) &&
          card.relatedCharacterId === null &&
          card.relatedCharacterTags.length === 0,
      );
      assert.ok(singleton, `real ${tag} example exists`);
      await verifyDeck(withCard(singleton.id));
      await rejects(withCard(singleton.id, 2), "CountLimitError");
    }
    const talent = cards.find(
      (card) =>
        typeof card.shareId === "number" &&
        card.relatedCharacterId !== null &&
        characters.some(
          (character) =>
            character.id === card.relatedCharacterId &&
            typeof character.shareId === "number",
        ),
    );
    assert.ok(talent);
    const correctRoster = [
      talent.relatedCharacterId!,
      ...base.characters.filter((id) => id !== talent.relatedCharacterId),
    ].slice(0, 3);
    await verifyDeck(withCard(talent.id, 1, correctRoster));
    const incorrectRoster = characters
      .filter(
        (character) =>
          typeof character.shareId === "number" &&
          character.id !== talent.relatedCharacterId,
      )
      .slice(0, 3)
      .map((character) => character.id);
    await rejects(withCard(talent.id, 1, incorrectRoster), "RelationError");

    const resonance = cards.find(
      (card) =>
        typeof card.shareId === "number" &&
        card.relatedCharacterId === null &&
        card.relatedCharacterTags.length === 2 &&
        card.relatedCharacterTags[0] === card.relatedCharacterTags[1],
    );
    assert.ok(resonance, "real repeated-tag requirement exists");
    const requiredTag = resonance.relatedCharacterTags[0]!;
    const matching = characters.filter(
      (character) =>
        typeof character.shareId === "number" &&
        character.tags.includes(requiredTag),
    );
    const other = characters.filter(
      (character) =>
        typeof character.shareId === "number" &&
        !character.tags.includes(requiredTag),
    );
    assert.ok(matching.length >= 2 && other.length >= 2);
    await verifyDeck(
      withCard(resonance.id, 1, [
        matching[0]!.id,
        matching[1]!.id,
        other[0]!.id,
      ]),
    );
    await rejects(
      withCard(resonance.id, 1, [matching[0]!.id, other[0]!.id, other[1]!.id]),
      "RelationError",
    );

    for (const entry of Object.values(metadata)) {
      const expected = VERSIONS.includes(
        entry.sinceVersion as (typeof VERSIONS)[number],
      )
        ? entry.sinceVersion
        : CURRENT_VERSION;
      assert.equal(
        await minimumRequiredVersionOfDeck({
          characters: [entry.id],
          cards: [],
        }),
        expected,
        `minimum version of ${entry.id}`,
      );
    }
    assert.equal(
      await minimumRequiredVersionOfDeck({ characters: [99999999], cards: [] }),
      CURRENT_VERSION,
    );
    assert.equal(await minimumRequiredVersionOfDeck(base), "v3.7.0");
    assert.equal(fetches, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
