import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

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
