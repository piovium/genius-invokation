import type {
  GameConfig,
  GameData,
  Version,
  VersionBehavior,
} from "@gi-tcg/core";
import type { AssetsManagerOption } from "@gi-tcg/assets-manager";
import type { z } from "zod";
import type { modSchema, inlinePluginSchema, presetSchema } from "./schema";

export type ProfileGameConfig = Omit<
  GameConfig,
  "randomSeed" | "hostWho" | "hostRelatedExecution"
>;
export interface ModSource extends z.infer<typeof modSchema> {}
export interface PluginConfig extends z.output<typeof inlinePluginSchema> {}
export interface Preset extends z.output<typeof presetSchema> {}

export interface Profile {
  id: string;
  name: string;
  baseVersion: Version;
  officialDeckCompatible: boolean;
  gameConfig: ProfileGameConfig;
  versionBehavior: VersionBehavior;
  versionMap: Record<number, Version>;
  mods: ModSource[];
  assets: Pick<
    AssetsManagerOption,
    "version" | "customData" | "overrideData" | "officialDeckCompatible"
  >;
}
export interface ProfileSummary {
  id: string;
  name: string;
  baseVersion: Version;
  profileHash: string;
  officialDeckCompatible: boolean;
}
export interface CompiledProfile {
  profile: Profile;
  summary: ProfileSummary;
  data: GameData;
}
