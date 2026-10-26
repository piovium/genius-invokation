import { CURRENT_VERSION, VERSIONS } from "@gi-tcg/core";
import { resolve } from "node:path";
import { loadPresets, officialProfile } from "./compiler";
import type { CompiledProfile } from "./types";
import { NotFoundException } from "../errors";

export class ProfilesService {
  readonly defaultProfileId = `official/${CURRENT_VERSION}`;
  private profiles = new Map<string, CompiledProfile>();

  async onModuleInit() {
    for (const version of VERSIONS) {
      const compiled = officialProfile(version);
      this.profiles.set(compiled.profile.id, compiled);
    }
    for (const compiled of await loadPresets(
      new URL("../../presets/", import.meta.url),
    )) {
      this.profiles.set(compiled.profile.id, compiled);
    }
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
