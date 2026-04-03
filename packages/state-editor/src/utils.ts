import type { EntityDefinition, EntityState } from "@gi-tcg/core";
import { WEAPON_TAGS } from "./constants";
import type { Accessor } from "solid-js";

function getWeaponTag(tags: readonly string[]) {
  return WEAPON_TAGS.find((tag) => tags.includes(tag));
}

// 装备类型定义
export type EquipmentType =
  | "artifact"
  | "technique"
  | "weapon"
  | "talent"
  | "other";

// 获取装备的分类类型
export function getEquipmentType(definition: EntityDefinition): EquipmentType {
  if (definition.tags.includes("artifact")) return "artifact";
  if (definition.tags.includes("technique")) return "technique";
  if (definition.tags.includes("weapon")) return "weapon";
  if (definition.tags.includes("talent")) return "talent";
  return "other";
}

export function getEquipmentInvalidity(
  definition: { tags: readonly string[]; id: number },
  characterDefinition: { tags: readonly string[]; id: number },
): "weapon" | "talent" | null {
  const entityWeaponTag = getWeaponTag(definition.tags);
  const characterWeaponTag = getWeaponTag(characterDefinition.tags);
  if (entityWeaponTag && entityWeaponTag !== characterWeaponTag) {
    return "weapon";
  }
  if (definition.tags.includes("talent")) {
    const relatedCharacterId = Number(definition.id.toString().slice(1, -1));
    if (characterDefinition.id !== relatedCharacterId) {
      return "talent";
    }
  }
  return null;
}

export function filterValidCharacterEntities(
  entities: readonly EntityState[],
  characterDefinition: { tags: readonly string[]; id: number },
): EntityState[] {
  return entities.filter(
    (entity) => !getEquipmentInvalidity(entity.definition, characterDefinition),
  );
}
export function moveInArray<T>(
  items: readonly T[],
  index: number,
  delta: number,
) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [value] = next.splice(index, 1);
  next.splice(nextIndex, 0, value);
  return next;
}

export function shuffleList<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}

export function sortImportedCards<T extends EntityDefinition>(
  definitions: readonly T[],
): T[] {
  return [...definitions].sort((left, right) => {
    const leftScore = left.tags.includes("legend") ? 0 : 1;
    const rightScore = right.tags.includes("legend") ? 0 : 1;
    return leftScore - rightScore;
  });
}

export function guard<T, U extends T>(
  signal: Accessor<T>,
  predicate: (value: T) => value is U,
): U | undefined {
  const value = signal();
  return predicate(value) ? value : void 0;
}
