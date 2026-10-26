import { z } from "zod";
import { CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import type { ProfileGameConfig } from "./types";
import type { VersionBehavior } from "@gi-tcg/core";

const versionSchema = z
  .union([z.enum(VERSIONS), z.literal("latest")])
  .transform((version) => (version === "latest" ? CURRENT_VERSION : version));
const nonnegativeInteger = z.number().int().safe().nonnegative();
const configSchema = z
  .object({
    initialHandsCount: nonnegativeInteger,
    maxHandsCount: nonnegativeInteger,
    maxPileCount: nonnegativeInteger,
    maxRoundsCount: nonnegativeInteger,
    maxSupportsCount: nonnegativeInteger,
    maxSummonsCount: nonnegativeInteger,
    adventureSpotCandidatesCount: nonnegativeInteger,
    initialDiceCount: nonnegativeInteger,
    maxDiceCount: nonnegativeInteger,
    unexpectedInsufficientDice: z.enum(["throw", "skipConsume", "skipAction"]),
  } satisfies Record<keyof ProfileGameConfig, z.ZodTypeAny>)
  .strict()
  .partial();
const behaviorSchema = z
  .object({
    defaultRecreateBehavior: z.enum(["overwrite", "takeMax"]),
    foodOmitInjuredOnly: z.boolean(),
    discardMaxCostHandsAbortPreview: z.boolean(),
    diceCostApplyAttachments: z.boolean(),
  } satisfies Record<keyof VersionBehavior, z.ZodTypeAny>)
  .extend({
    base: versionSchema,
  })
  .strict()
  .partial();

export const versionMapSchema = z.record(
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .refine((id) => Number.isSafeInteger(Number(id))),
  versionSchema,
);
export const modSchema = z
  .object({
    fileUri: z.string().optional(),
    content: z.string(),
  })
  .strict();
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonSchema),
    z.record(jsonSchema),
  ]),
);
// Static keyword IDs may be negative; arbitrary fields must remain JSON data.
export const overrideSchema = z
  .object({ id: z.number().int().safe() })
  .catchall(jsonSchema);
export const overridesSchema = z.union([
  z.array(overrideSchema),
  z
    .object({ overrides: z.array(overrideSchema) })
    .strict()
    .transform(({ overrides }) => overrides),
  overrideSchema.transform((override) => [override]),
]);
export const inlinePluginSchema = z
  .object({
    $schema_version: z.literal(1).optional(),
    name: z.string().optional(),
    version_maps: z.array(z.union([z.string(), versionMapSchema])).optional(),
    mods: z.array(z.union([z.string(), modSchema])).optional(),
    static_data_overrides: z
      .array(z.union([z.string(), overrideSchema, z.array(overrideSchema)]))
      .optional(),
  })
  .strict();
export const pluginSchema = inlinePluginSchema.extend({
  $schema_version: z.literal(1),
});
export const presetSchema = z
  .object({
    $schema_version: z.literal(1),
    id: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    name: z.string().optional(),
    version: versionSchema.optional(),
    version_behavior: behaviorSchema.optional(),
    config: configSchema.optional(),
    plugins: z.array(z.union([z.string(), inlinePluginSchema])).optional(),
  })
  .strict();
