// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import type { CharacterDefinition } from "../base/character";
import type { EntityDefinition, VariableConfig } from "../base/entity";
import type { ExtensionDefinition } from "../base/extension";
import type { InitiativeSkillDefinition, SkillDefinition } from "../base/skill";
import { GiTcgDataError } from "../error";
import { type VersionInfo } from "../base/version";
import { freeze } from "immer";
import type { AttachmentDefinition } from "../base/attachment";

export type VersionResolver = <T extends DefinitionMap[RegisterCategory]>(
  items: T[],
) => T | null;
export type OnResolvedCallback = (
  entry: DefinitionMap[RegisterCategory],
) => void;

export class Registry {
  private readonly dataStore: DataStore;
  private freezed = false;

  constructor() {
    this.dataStore = {
      characters: new Map(),
      entities: new Map(),
      initiativeSkills: new Map(),
      passiveSkills: new Map(),
      extensions: new Map(),
      attachments: new Map(),
    };
  }

  clone() {
    const newRegistry = new Registry();
    for (const [category, store] of Object.entries(this.dataStore)) {
      const newStore = new Map<number, DefinitionMap[RegisterCategory][]>();
      for (const [id, defs] of store) {
        newStore.set(id, [...defs]);
      }
      (newRegistry.dataStore as Record<string, Map<number, unknown[]>>)[
        category
      ] = newStore;
    }
    return newRegistry;
  }

  freeze() {
    this.freezed = true;
    freeze(this.dataStore);
  }

  begin(): IRegistrationScope {
    if (this.freezed) {
      throw new GiTcgDataError("Registry is frozen");
    }
    return new RegistrationScope(this.dataStore);
  }

  resolve(...resolvers: VersionResolver[]): GameData {
    const applyResolvers = <C extends RegisterCategory, R = DefinitionMap[C]>(
      category: C,
      transformFn?: (value: DefinitionMap[C]) => R,
    ): Map<number, R> => {
      const source = this.dataStore[category];
      const result = new Map<number, R>();
      for (const [id, defs] of source) {
        let chosen: DefinitionMap[C] | null = null;
        for (const resolver of resolvers) {
          chosen = resolver(defs);
          if (chosen) {
            break;
          }
        }
        if (!chosen) {
          continue;
        }
        result.set(id, transformFn?.(chosen) ?? (chosen as R));
      }
      return result;
    };
    const extensions = applyResolvers("extensions");
    const initiativeSkills = applyResolvers("initiativeSkills");
    const passiveSkills = applyResolvers("passiveSkills");
    const entities = applyResolvers("entities");
    const attachments = applyResolvers("attachments");
    const characters = applyResolvers(
      "characters",
      (chEntry): CharacterDefinition => {
        const skills: SkillDefinition[] = [];
        let varConfigs = { ...chEntry.varConfigs };
        for (const skillId of chEntry.skillIds) {
          const initiativeSkill = initiativeSkills.get(skillId);
          if (initiativeSkill) {
            skills.push(initiativeSkill.skill);
            continue;
          }
          const passiveSkill = passiveSkills.get(skillId);
          if (passiveSkill) {
            varConfigs = combineObject(varConfigs, passiveSkill.varConfigs);
            skills.push(...passiveSkill.skills);
          }
        }
        const nightsoulsId = chEntry.associatedNightsoulsBlessingId;
        const associatedNightsoulsBlessing = nightsoulsId
          ? entities.get(nightsoulsId) ?? null
          : null;
        return {
          ...chEntry,
          varConfigs,
          skills,
          associatedNightsoulsBlessing,
        };
      },
    );
    return freeze<GameData>({
      extensions,
      entities,
      characters,
      attachments,
    });
  }
}

export interface IRegistrationScope {
  begin: () => void;
  end: () => void;
  [Symbol.dispose]: () => void;
}

class RegistrationScope implements IRegistrationScope {
  private static current: RegistrationScope | null = null;

  constructor(private readonly dataStore: DataStore) {
    this.begin();
  }

  static register<C extends RegisterCategory>(
    type: C,
    value: DefinitionMap[C],
  ) {
    if (RegistrationScope.current === null) {
      throw new GiTcgDataError("Not in registration");
    }
    const store = RegistrationScope.current.dataStore[type];
    if (!store.has(value.id)) {
      store.set(value.id, []);
    }
    store.get(value.id)!.push(value);
  }

  begin() {
    if (
      RegistrationScope.current !== null &&
      RegistrationScope.current !== this
    ) {
      throw new GiTcgDataError("Already in registration");
    }
    RegistrationScope.current = this;
  }

  end() {
    if (RegistrationScope.current !== this) {
      throw new GiTcgDataError("Not in this registration");
    }
    RegistrationScope.current = null;
  }

  [Symbol.dispose]() {
    this.end();
  }
}

/**
 * @internal
 * 用于检查构造完数据后是否存在泄漏的（被引用的）builder
 */
export const builderWeakRefs = new Set<WeakRef<any>>();

function combineObject<T extends {}, U extends {}>(a: T, b: U): T & U {
  const combined = { ...a, ...b };
  const overlappingKeys = Object.keys(a).filter((key) => key in b);
  if (overlappingKeys.length > 0) {
    throw new Error(`Properties ${overlappingKeys.join(", ")} are overlapping`);
  }
  return combined;
}

interface CharacterEntry
  extends Omit<CharacterDefinition, "skills" | "associatedNightsoulsBlessing"> {
  skillIds: readonly number[];
  associatedNightsoulsBlessingId: number | null;
}

// interface EntityEntry extends Omit<EntityDefinition, "initiativeSkills"> {
//   initiativeSkillIds: readonly number[];
// }

interface CharacterPassiveSkillEntry {
  __definition: "passiveSkills";
  id: number;
  type: "passiveSkill";
  version: VersionInfo;
  varConfigs: Record<string, VariableConfig>;
  skills: readonly SkillDefinition[];
}

interface CharacterInitiativeSkillEntry {
  __definition: "initiativeSkills";
  id: number;
  type: "initiativeSkill";
  version: VersionInfo;
  skill: InitiativeSkillDefinition;
}

type DefinitionMap = {
  characters: CharacterEntry;
  entities: EntityDefinition;
  extensions: ExtensionDefinition;
  initiativeSkills: CharacterInitiativeSkillEntry;
  passiveSkills: CharacterPassiveSkillEntry;
  attachments: AttachmentDefinition;
};

type RegisterCategory = keyof DefinitionMap;

export type DataStore = {
  [K in RegisterCategory]: Map<number, DefinitionMap[K][]>;
};

export interface GameData {
  readonly extensions: ReadonlyMap<number, ExtensionDefinition>;
  readonly characters: ReadonlyMap<number, CharacterDefinition>;
  readonly entities: ReadonlyMap<number, EntityDefinition>;
  readonly attachments: ReadonlyMap<number, AttachmentDefinition>;
}

export function registerCharacter(value: CharacterEntry) {
  RegistrationScope.register("characters", value);
}
export function registerEntity(value: EntityDefinition) {
  RegistrationScope.register("entities", value);
}
export function registerAttachment(value: AttachmentDefinition) {
  RegistrationScope.register("attachments", value);
}
export function registerPassiveSkill(value: CharacterPassiveSkillEntry) {
  RegistrationScope.register("passiveSkills", value);
}
export function registerInitiativeSkill(value: CharacterInitiativeSkillEntry) {
  RegistrationScope.register("initiativeSkills", value);
}
export function registerExtension(value: ExtensionDefinition) {
  RegistrationScope.register("extensions", value);
}
