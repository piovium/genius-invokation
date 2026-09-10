import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Category } from "@gi-tcg/assets-manager";

const serverRoot = path.resolve(import.meta.dirname, "..");
const assetsRoot = path.resolve(serverRoot, "../assets-manager");
const SOURCE_DATA_DIRECTORY = "src/data";
const DIST_DATA_DIRECTORY = "dist/data";
const MANIFEST_FORMAT_VERSION = 1;
/** Manifest file name: written here, and copied into the build output by build.ts. */
export const MANIFEST_FILE_NAME = "deck-metadata-manifest.json";
const categories = [
  "action_cards",
  "characters",
  "entities",
  "keywords",
] as const satisfies readonly Category[];
const metadataFields = [
  "id",
  "shareId",
  "tags",
  "sinceVersion",
  "relatedCharacterId",
  "relatedCharacterTags",
] as const satisfies readonly (keyof DeckMetadata)[];
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

/** Shape emitted into the generated index; mirrors the `DeckMetadata` fields. */
const METADATA_TYPE =
  "Record<string, { id: number; shareId?: number; tags?: string[]; sinceVersion?: string; relatedCharacterId?: number | null; relatedCharacterTags?: string[] }>";

/** Prefer the built snapshot, unless FROM_SOURCE demands the raw workspace data. */
async function resolveDataDirectory(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const fromSource = Boolean(process.env.FROM_SOURCE);
  const preferred = path.join(
    assetsRoot,
    fromSource ? SOURCE_DATA_DIRECTORY : DIST_DATA_DIRECTORY,
  );
  try {
    await access(preferred);
    return preferred;
  } catch {
    if (fromSource)
      throw new Error(
        "Build assets-manager source data before generating server deck metadata",
      );
    return path.join(assetsRoot, SOURCE_DATA_DIRECTORY);
  }
}

/** Keep only the fields the deck verifier and the sharing codec read. */
function projectMetadata(record: Record<string, unknown>): DeckMetadata {
  const projected: Record<string, unknown> = {};
  for (const field of metadataFields)
    if (Object.hasOwn(record, field)) projected[field] = record[field];
  return projected as unknown as DeckMetadata;
}

/**
 * Read assets-manager's local snapshot and write the generated metadata module,
 * a copy of its sharing codec, and the manifest, without requesting or caching
 * CDN data.
 */
export async function generateDeckMetadata({
  dataDirectory: requestedDataDirectory,
  outputDirectory = path.join(serverRoot, "generated"),
}: { dataDirectory?: string; outputDirectory?: string } = {}) {
  const dataDirectory = await resolveDataDirectory(requestedDataDirectory);
  // A null prototype keeps a raw id such as "__proto__" from colliding with
  // inherited object keys.
  const metadataById: Record<string, DeckMetadata> = Object.create(null);
  const categoryCounts: Record<string, number> = {};
  const duplicateIds: { id: number; ignoredCategory: string }[] = [];
  const sourceHashes: Record<string, string> = {};
  const idsByShareId = new Map<number, number>();
  for (const category of categories) {
    const relative = `CHS/${category}.json`;
    const text = await readFile(path.join(dataDirectory, relative), "utf8");
    sourceHashes[relative] = hash(text);
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed))
      throw new Error(`${relative} must contain an array`);
    const records = parsed as Record<string, unknown>[];
    categoryCounts[category] = records.length;
    for (const raw of records) {
      if (!Number.isSafeInteger(raw.id))
        throw new Error(`${relative} contains an invalid id`);
      const entry = projectMetadata(raw);
      // Manager's category cache keeps the first record for each ID. Some
      // unobtainable action records also occur in entities with fewer fields.
      // Follow ALL_CATEGORIES order, preserving the action record's version.
      if (Object.hasOwn(metadataById, entry.id))
        duplicateIds.push({ id: entry.id, ignoredCategory: category });
      else metadataById[entry.id] = entry;
      if (typeof entry.shareId === "number") {
        const previousId = idsByShareId.get(entry.shareId);
        if (previousId !== undefined && previousId !== entry.id)
          throw new Error(`Duplicate shareId ${entry.shareId}`);
        idsByShareId.set(entry.shareId, entry.id);
      }
    }
  }
  const shareSource = await readFile(
    path.join(dataDirectory, "share_id.json"),
    "utf8",
  );
  const shareMap: Record<string, number> = JSON.parse(shareSource);
  sourceHashes["share_id.json"] = hash(shareSource);
  for (const [shareId, id] of idsByShareId) {
    if (shareMap[shareId] !== id)
      throw new Error(`share_id.json disagrees with raw record ${id}`);
  }
  for (const [shareId, id] of Object.entries(shareMap)) {
    // The original generator also writes an "undefined" key for unobtainable
    // records. It stays in the codec's input, so skip it when cross-checking.
    if (shareId === "undefined") continue;
    if (idsByShareId.get(Number(shareId)) !== id)
      throw new Error(`Missing metadata for shareId ${shareId}`);
  }
  const codecSource = await readFile(
    path.join(assetsRoot, "src/sharing.ts"),
    "utf8",
  );
  sourceHashes["sharing.ts"] = hash(codecSource);
  const metadataJson = JSON.stringify(metadataById);
  const manifest = {
    formatVersion: MANIFEST_FORMAT_VERSION,
    sourceDirectory: path
      .relative(assetsRoot, dataDirectory)
      .replaceAll(path.sep, "/"),
    sourceHashes,
    categoryCounts,
    duplicateIds,
    recordCount: Object.keys(metadataById).length,
    metadataSha256: hash(metadataJson),
    metadataBytes: Buffer.byteLength(metadataJson),
    shareIdCount: idsByShareId.size,
  };
  await mkdir(path.join(outputDirectory, "data"), { recursive: true });
  await writeFile(
    path.join(outputDirectory, "deck-metadata.ts"),
    `// Generated from assets-manager's raw snapshot; see ${MANIFEST_FILE_NAME}.\nconst metadata: ${METADATA_TYPE} = ${metadataJson};\nexport default metadata;\n`,
  );
  // Keep the existing codec byte-for-byte. Its sole runtime data import now
  // resolves to this same snapshot's share map, without initializing Manager.
  await writeFile(path.join(outputDirectory, "sharing.ts"), codecSource);
  await writeFile(
    path.join(outputDirectory, "data/share_id.json"),
    shareSource,
  );
  await writeFile(
    path.join(outputDirectory, MANIFEST_FILE_NAME),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return { index: metadataById, manifest, dataDirectory, outputDirectory };
}

// Run the generator only when this file is the process entry point.
if (import.meta.main) {
  const { manifest } = await generateDeckMetadata();
  console.log(
    `Generated ${manifest.recordCount} deck metadata records (${manifest.metadataBytes} bytes) from ${manifest.sourceDirectory}`,
  );
}
