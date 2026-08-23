import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { $ } from "execa";

const packagesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
);

function removeDevelopment(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) removeDevelopment(item);
  } else if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    delete record.development;
    for (const key of Object.keys(record)) {
      removeDevelopment(record[key]);
    }
  }
}

const entries = await readdir(packagesDir, { withFileTypes: true });
const originals = new Map<string, string>();
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const file = join(packagesDir, entry.name, "package.json");
  const content = await readFile(file, "utf-8").catch((error) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (content === null) continue;
  const json = JSON.parse(content) as Record<string, unknown>;
  if (json.exports === undefined) continue;
  removeDevelopment(json.exports);
  const stripped = `${JSON.stringify(json, null, 2)}\n`;
  if (stripped !== content) {
    originals.set(file, content);
    await writeFile(file, stripped);
  }
}

try {
  await $({
    stdio: "inherit",
  })`pnpm --recursive publish ${process.argv.slice(2)}`;
} finally {
  await Promise.all(
    [...originals].map(([file, content]) => writeFile(file, content)),
  );
}
