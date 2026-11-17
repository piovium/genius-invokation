import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  modSchema,
  overridesSchema,
  pluginSchema,
  presetSchema,
  versionMapSchema,
} from "../src/profiles/schema.ts";

const directory = resolve(import.meta.dirname, "../schemas");
await mkdir(directory, { recursive: true });
await Promise.all(
  Object.entries({
    preset: presetSchema,
    plugin: pluginSchema,
    "version-map": versionMapSchema,
    mod: modSchema,
    overrides: overridesSchema,
  }).map(([name, schema]) =>
    writeFile(
      resolve(directory, `${name}.json`),
      `${JSON.stringify(z.toJSONSchema(schema, { io: "input", target: "draft-07" }), null, 2)}\n`,
    ),
  ),
);
