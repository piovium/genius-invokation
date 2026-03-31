import {
  type AttachmentDefinition,
  type AttachmentState,
  type CharacterDefinition,
  type CharacterState,
  type EntityDefinition,
  type EntityState,
  type EntityType,
  type GameState,
  type InitiativeSkillDefinition,
} from "@gi-tcg/core";
import type {
  AssetOption,
  EditorCatalog,
  InitiativeSkillOption,
} from "../types";
import { ENTITY_TYPE_LABELS, SPECIAL_ENERGY_LABELS } from "../constants";
import { getSafeName, buildSearch } from "./assets";

function sortOptions<T>(options: AssetOption<T>[]) {
  return [...options].sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name, "zh-Hans-CN");
    return nameCompare === 0 ? left.id - right.id : nameCompare;
  });
}

function isSixDigitId(id: number) {
  return id >= 100000 && id <= 999999;
}

function getEntitySortPriority(
  id: number,
  characterDefinitionIds: Set<number>,
) {
  if ((id >= 100 && id <= 999) || id === 303300) {
    return 0;
  }
  if (isSixDigitId(id)) {
    const idText = String(id);
    const prefix = idText[0];
    if (prefix === "1" || prefix === "2") {
      const relatedCharacterId = Number(idText.slice(1, 5));
      if (characterDefinitionIds.has(relatedCharacterId)) {
        return prefix === "1" ? 1 : 2;
      }
      return 4;
    }
    if (prefix === "3") {
      return 3;
    }
  }
  return 4;
}

function sortEntityOptions(
  options: AssetOption<EntityDefinition>[],
  characterDefinitionIds: Set<number>,
) {
  return [...options].sort((left, right) => {
    const priorityCompare =
      getEntitySortPriority(left.id, characterDefinitionIds) -
      getEntitySortPriority(right.id, characterDefinitionIds);
    if (priorityCompare !== 0) {
      return priorityCompare;
    }
    const nameCompare = left.name.localeCompare(right.name, "zh-Hans-CN");
    return nameCompare === 0 ? left.id - right.id : nameCompare;
  });
}

export function getDefinitionName(definition: { id: number } | undefined) {
  return definition ? getSafeName(definition.id) : "未知";
}

export function getDefinitionTypeLabel(definition: { type: string }) {
  if (definition.type === "character") {
    return "角色";
  }
  if (definition.type === "attachment") {
    return "附着";
  }
  return ENTITY_TYPE_LABELS[definition.type as EntityType] ?? definition.type;
}

export function getEntityVisibleVarBadges(
  entity: EntityState | AttachmentState,
) {
  return entity.definition.visibleVarName
    ? [
        `${entity.definition.visibleVarName} = ${entity.variables[entity.definition.visibleVarName]}`,
      ]
    : [];
}

export function getEntityItemDescription(
  entity: EntityState | AttachmentState,
) {
  return `ID: ${entity.id} / DefID: ${entity.definition.id}`;
}

export function getCharacterEnergyLabel(character: CharacterState) {
  return (
    SPECIAL_ENERGY_LABELS[
      character.definition.specialEnergy?.variableName ?? ""
    ] ?? "能量"
  );
}

export function getCharacterMaxEnergyLabel(character: CharacterState) {
  return `最大${getCharacterEnergyLabel(character)}`;
}

export function buildEditorCatalog(state: GameState): EditorCatalog {
  const data = state.data;
  const characterDefinitionIds = new Set(
    state.players.flatMap((player) =>
      player.characters
        .filter(Boolean)
        .map((character) => character.definition.id),
    ),
  );
  const characterOptions: AssetOption<CharacterDefinition>[] = [];
  const attachmentOptions: AssetOption<AttachmentDefinition>[] = [];
  const entityOptionsByType: Record<
    EntityType,
    AssetOption<EntityDefinition>[]
  > = {
    combatStatus: [],
    status: [],
    equipment: [],
    support: [],
    summon: [],
    eventCard: [],
  };
  for (const definition of Array.from(
    data.characters.values(),
  ) as CharacterDefinition[]) {
    const name = getSafeName(definition.id);
    characterOptions.push({
      id: definition.id,
      name,
      search: buildSearch(name, definition.id),
      definition,
    });
  }
  for (const definition of Array.from(
    data.entities.values(),
  ) as EntityDefinition[]) {
    const name = getSafeName(definition.id);
    entityOptionsByType[definition.type].push({
      id: definition.id,
      name,
      search: buildSearch(
        `${name} ${ENTITY_TYPE_LABELS[definition.type]}`,
        definition.id,
      ),
      definition,
    });
  }
  for (const definition of Array.from(data.attachments.values())) {
    const name = getSafeName(definition.id);
    attachmentOptions.push({
      id: definition.id,
      name,
      search: buildSearch(name, definition.id),
      definition,
    });
  }
  const initiativeSkillsByCharacterId = new Map<
    number,
    InitiativeSkillOption[]
  >();
  const allInitiativeSkills: InitiativeSkillOption[] = [];
  for (const definition of Array.from(
    data.characters.values(),
  ) as CharacterDefinition[]) {
    const skills = definition.skills
      .filter(
        (skill): skill is InitiativeSkillDefinition =>
          "triggerOn" in skill && skill.triggerOn === "initiative",
      )
      .map((skill) => {
        const name = getSafeName(skill.id);
        return {
          id: skill.id,
          name,
          search: buildSearch(name, skill.id),
          definition,
        };
      });
    initiativeSkillsByCharacterId.set(
      definition.id,
      [...skills].sort((left, right) =>
        left.name.localeCompare(right.name, "zh-Hans-CN"),
      ),
    );
    allInitiativeSkills.push(...skills);
  }
  allInitiativeSkills.sort((left, right) => {
    const nameCompare = left.name.localeCompare(right.name, "zh-Hans-CN");
    return nameCompare === 0 ? left.id - right.id : nameCompare;
  });
  return {
    characters: sortOptions(characterOptions),
    attachments: sortOptions(attachmentOptions),
    entitiesByType: {
      combatStatus: sortEntityOptions(
        entityOptionsByType.combatStatus,
        characterDefinitionIds,
      ),
      status: sortEntityOptions(
        entityOptionsByType.status,
        characterDefinitionIds,
      ),
      equipment: sortEntityOptions(
        entityOptionsByType.equipment,
        characterDefinitionIds,
      ),
      support: sortEntityOptions(
        entityOptionsByType.support,
        characterDefinitionIds,
      ),
      summon: sortEntityOptions(
        entityOptionsByType.summon,
        characterDefinitionIds,
      ),
      eventCard: sortEntityOptions(
        entityOptionsByType.eventCard,
        characterDefinitionIds,
      ),
      cardEntities: sortEntityOptions(
        [
          ...entityOptionsByType.support,
          ...entityOptionsByType.equipment,
          ...entityOptionsByType.eventCard,
        ],
        characterDefinitionIds,
      ),
      characterEntities: sortEntityOptions(
        [...entityOptionsByType.status, ...entityOptionsByType.equipment],
        characterDefinitionIds,
      ),
    },
    initiativeSkillsByCharacterId,
    allInitiativeSkills,
  };
}
