import type {
  GameConfig,
  GameData,
  Version,
  VersionBehavior,
} from "@gi-tcg/core";
import type { AssetsManagerOption, OverrideData } from "@gi-tcg/assets-manager";

export type ProfileGameConfig = Omit<
  GameConfig,
  "randomSeed" | "hostWho" | "hostRelatedExecution"
>;
export interface ModSource {
  fileUri?: string;
  content: string;
}
export interface PluginConfig {
  $schema_version?: 1;
  name?: string;
  version_maps?: (string | Record<number, Version | "latest">)[];
  mods?: (string | ModSource)[];
  static_data_overrides?: (string | OverrideData | OverrideData[])[];
}
export interface Preset {
  $schema_version: 1;
  id: string;
  name?: string;
  version?: Version | "latest";
  version_behavior?: Partial<VersionBehavior> & { base?: Version | "latest" };
  config?: Partial<ProfileGameConfig>;
  plugins?: (string | PluginConfig)[];
}
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
