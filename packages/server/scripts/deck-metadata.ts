import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(import.meta.dirname, "..");
const assetsRoot = path.resolve(serverRoot, "../assets-manager");
const categories = [
  "action_cards",
  "characters",
  "entities",
  "keywords",
] as const;
const fields = [
  "id",
  "shareId",
  "tags",
  "sinceVersion",
  "relatedCharacterId",
  "relatedCharacterTags",
] as const;
const hash = (source: string) =>
  createHash("sha256").update(source).digest("hex");

export interface DeckMetadata {
  id: number;
  shareId?: number;
  tags?: string[];
  sinceVersion?: string;
  relatedCharacterId?: number | null;
  relatedCharacterTags?: string[];
}

/** Project the generated asset snapshot, without requesting or caching CDN data. */
export async function generateDeckMetadata({
  dataDirectory,
  outputDirectory = path.join(serverRoot, "generated"),
}: { dataDirectory?: string; outputDirectory?: string } = {}) {
  if (!dataDirectory) {
    const preferred = path.join(
      assetsRoot,
      process.env.FROM_SOURCE ? "src/data" : "dist/data",
    );
    try {
      await access(preferred);
      dataDirectory = preferred;
    } catch {
      if (process.env.FROM_SOURCE)
        throw new Error(
          "Build assets-manager source data before generating server deck metadata",
        );
      dataDirectory = path.join(assetsRoot, "src/data");
    }
  }
  const index: Record<string, DeckMetadata> = Object.create(null);
  const categoryCounts: Record<string, number> = {};
  const duplicateIds: { id: number; ignoredCategory: string }[] = [];
  const sourceHashes: Record<string, string> = {};
  const shareIds = new Map<number, number>();
  for (const category of categories) {
    const relative = `CHS/${category}.json`;
    const text = await readFile(path.join(dataDirectory, relative), "utf8");
    sourceHashes[relative] = hash(text);
    const records: Record<string, unknown>[] = JSON.parse(text);
    if (!Array.isArray(records))
      throw new Error(`${relative} must contain an array`);
    categoryCounts[category] = records.length;
    for (const raw of records) {
      if (!Number.isSafeInteger(raw.id))
        throw new Error(`${relative} contains an invalid id`);
      const projected: Record<string, unknown> = {};
      for (const field of fields)
        if (Object.hasOwn(raw, field)) projected[field] = raw[field];
      const entry = projected as unknown as DeckMetadata;
      // Manager's category cache keeps the first record for each ID. Some
      // unobtainable action records also occur in entities with fewer fields.
      // Follow ALL_CATEGORIES order, preserving the action record's version.
      if (Object.hasOwn(index, entry.id))
        duplicateIds.push({ id: entry.id, ignoredCategory: category });
      else index[entry.id] = entry;
      if (typeof entry.shareId === "number") {
        const previousId = shareIds.get(entry.shareId);
        if (previousId !== undefined && previousId !== entry.id)
          throw new Error(`Duplicate shareId ${entry.shareId}`);
        shareIds.set(entry.shareId, entry.id);
      }
    }
  }
  const shareSource = await readFile(
    path.join(dataDirectory, "share_id.json"),
    "utf8",
  );
  const shareMap: Record<string, number> = JSON.parse(shareSource);
  sourceHashes["share_id.json"] = hash(shareSource);
  for (const [shareId, id] of shareIds) {
    if (shareMap[shareId] !== id)
      throw new Error(`share_id.json disagrees with raw card ${id}`);
  }
  for (const [shareId, id] of Object.entries(shareMap)) {
    // The original generator also writes an "undefined" key for unobtainable
    // records. Preserve it in the unchanged sharing codec's input.
    if (shareId === "undefined") continue;
    if (shareIds.get(Number(shareId)) !== id)
      throw new Error(`Missing metadata for shareId ${shareId}`);
  }
  const codecSource = await readFile(
    path.join(assetsRoot, "src/sharing.ts"),
    "utf8",
  );
  sourceHashes["sharing.ts"] = hash(codecSource);
  const json = JSON.stringify(index);
  const manifest = {
    formatVersion: 1,
    sourceDirectory: path
      .relative(assetsRoot, dataDirectory)
      .replaceAll(path.sep, "/"),
    sourceHashes,
    categoryCounts,
    duplicateIds,
    recordCount: Object.keys(index).length,
    metadataSha256: hash(json),
    metadataBytes: Buffer.byteLength(json),
    shareIdCount: shareIds.size,
  };
  await mkdir(path.join(outputDirectory, "data"), { recursive: true });
  await writeFile(
    path.join(outputDirectory, "deck-metadata.ts"),
    `// Generated from assets-manager's raw snapshot; see deck-metadata-manifest.json.\n` +
      `const metadata: Record<string, { id: number; shareId?: number; tags?: string[]; sinceVersion?: string; relatedCharacterId?: number | null; relatedCharacterTags?: string[] }> = ${json};\nexport default metadata;\n`,
  );
  // Keep the existing codec byte-for-byte. Its sole runtime data import now
  // resolves to this same snapshot's share map, without initializing Manager.
  await writeFile(path.join(outputDirectory, "sharing.ts"), codecSource);
  await writeFile(
    path.join(outputDirectory, "data/share_id.json"),
    shareSource,
  );
  await writeFile(
    path.join(outputDirectory, "deck-metadata-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return { index, manifest, dataDirectory, outputDirectory };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { manifest } = await generateDeckMetadata();
  console.log(
    `Generated ${manifest.recordCount} deck metadata records (${manifest.metadataBytes} bytes) from ${manifest.sourceDirectory}`,
  );
}
