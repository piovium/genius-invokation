import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import type { Deck } from "@gi-tcg/typings";

/**
 * Deletes a test's scratch directory, refusing any path that is not directly
 * inside the temporary directory or does not carry the test's own prefix, so a
 * mistake in a fixture cannot delete anything else.
 */
export async function removeScratchDirectory(folder: string, prefix: string) {
  if (
    dirname(resolve(folder)) !== resolve(tmpdir()) ||
    !basename(folder).startsWith(prefix)
  )
    throw new Error("Unexpected temporary test path");
  await rm(folder, { recursive: true, force: true });
}

/** A real, valid deck: three existing characters and 30 existing cards. */
export const testDeck: Deck = {
  characters: [1103, 1201, 1301],
  cards: [
    332001, 332001, 332002, 332002, 332003, 332003, 332004, 332004, 332005,
    332005, 332006, 332006, 333001, 333001, 333002, 333002, 333003, 333003,
    333004, 333004, 333005, 333005, 333006, 333006, 333007, 333007, 333008,
    333008, 333009, 333009,
  ],
};
