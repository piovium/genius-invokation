import { CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import { resolve } from "node:path";
import { loadPreset, officialProfile } from "./compiler";
import { configBase } from "./reference";
import type { CompiledProfile } from "./types";
import { NotFoundException } from "../errors";

export class ProfilesService {
  readonly defaultProfileId = "official/latest";
  private profiles = new Map<string, CompiledProfile>();

  async onModuleInit() {
    const profiles = new Map<string, CompiledProfile>();
    for (const version of VERSIONS) {
      const compiled = officialProfile(version);
      profiles.set(compiled.profile.id, compiled);
    }
    profiles.set(
      this.defaultProfileId,
      officialProfile(CURRENT_VERSION, this.defaultProfileId),
    );
    for (const name of ["moyu-s7", "lianyu-s1"]) {
      const compiled = await loadPreset(
        `./${name}/preset.json`,
        new URL("../../presets/config.json", import.meta.url),
      );
      profiles.set(compiled.profile.id, compiled);
    }
    const references: unknown = JSON.parse(process.env.ROOM_PRESETS ?? "[]");
    if (
      !Array.isArray(references) ||
      references.some((v) => typeof v !== "string")
    )
      throw new Error("ROOM_PRESETS must be a JSON array of Preset references");
    const parent = configBase(
      process.env.SERVER_CONFIG_DIR ?? resolve(import.meta.dirname, "../.."),
    );
    // Registration is process-global: Mod evaluation must remain sequential.
    for (const reference of references) {
      const compiled = await loadPreset(reference, parent);
      if (profiles.has(compiled.profile.id))
        throw new Error(`Duplicate Profile ID: ${compiled.profile.id}`);
      profiles.set(compiled.profile.id, compiled);
    }
    this.profiles = profiles;
  }

  get(id = this.defaultProfileId) {
    const profile = this.profiles.get(id);
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }
  list() {
    return {
      defaultProfileId: this.defaultProfileId,
      profiles: [...this.profiles.values()].map(({ summary }) => summary),
    };
  }
}
