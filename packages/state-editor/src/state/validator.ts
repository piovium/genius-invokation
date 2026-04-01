import type { GameState, EntityState } from "@gi-tcg/core";
import type { ExpressiveJSONSchema } from "ya-json-schema-types";
import { DICE_OPTIONS, AURA_OPTIONS } from "../constants";
import type { EditorCatalog } from "../types";

function collectEntityIds(entity: EntityState, ids: number[]) {
  ids.push(entity.id);
  for (const attachment of entity.attachments) {
    ids.push(attachment.id);
  }
}

function validateSafeInteger(value: number, label: string, errors: string[]) {
  if (!Number.isSafeInteger(value)) {
    errors.push(`${label} 不是安全整数`);
  }
}

function validateExtensionValue(
  schema: ExpressiveJSONSchema,
  value: unknown,
  label: string,
  errors: string[],
) {
  if (!schema || typeof schema !== "object") {
    return;
  }
  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors.push(`${label} 需要是对象`);
      return;
    }
    const properties = schema.properties as Record<string, unknown> | undefined;
    if (!properties) {
      return;
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      validateExtensionValue(
        childSchema as ExpressiveJSONSchema,
        (value as Record<string, unknown>)[key],
        `${label}.${key}`,
        errors,
      );
    }
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${label} 需要是数组`);
      return;
    }
    const prefixItems = Array.isArray(schema.prefixItems)
      ? schema.prefixItems
      : null;
    if (prefixItems) {
      for (const [index, childSchema] of prefixItems.entries()) {
        validateExtensionValue(
          childSchema,
          value[index],
          `${label}[${index}]`,
          errors,
        );
      }
      return;
    }
    const items = schema.items as ExpressiveJSONSchema;
    if (!items) {
      return;
    }
    value.forEach((child, index) => {
      validateExtensionValue(items, child, `${label}[${index}]`, errors);
    });
    return;
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${label} 需要是数字`);
    }
    return;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") {
    errors.push(`${label} 需要是布尔值`);
  }
}

export function validateGameState(state: GameState, catalog: EditorCatalog) {
  const errors: string[] = [];
  const validDiceTypes = new Set<number>(DICE_OPTIONS);
  validateSafeInteger(state.config.randomSeed, "随机种子", errors);
  validateSafeInteger(state.iterators.random, "随机迭代器", errors);
  validateSafeInteger(state.iterators.id, "下一个状态 ID", errors);
  validateSafeInteger(state.roundNumber, "回合数", errors);
  if (
    state.roundNumber <= 0 ||
    state.roundNumber >= state.config.maxRoundsCount
  ) {
    errors.push("回合数超出范围");
  }
  if (
    state.phase === "initActives" ||
    state.phase === "initHands" ||
    state.phase === "gameEnd"
  ) {
    errors.push(`不支持阶段 ${state.phase}`);
  }
  if (state.currentTurn !== 0 && state.currentTurn !== 1) {
    errors.push("当前行动方无效");
  }
  if (state.winner !== null) {
    errors.push("胜者必须为空");
  }
  const allIds: number[] = [];
  const validSkillIds = new Set(
    catalog.allInitiativeSkills.map((skill: { id: number }) => skill.id),
  );
  const validCharacterDefinitionIds = new Set(
    catalog.characters.map((character: { id: number }) => character.id),
  );
  for (const [playerIndex, player] of state.players.entries()) {
    const characters = player.characters.filter(Boolean);
    if (player.who !== playerIndex) {
      errors.push(`玩家 ${playerIndex} 的 who 不匹配`);
    }
    if (characters.length !== 3) {
      errors.push(`玩家 ${playerIndex} 角色数量不为3`);
    }
    if (
      !characters.some((character) => character.id === player.activeCharacterId)
    ) {
      errors.push(`玩家 ${playerIndex} 的出战角色不存在`);
    }
    if (player.hands.length > state.config.maxHandsCount) {
      errors.push(`玩家 ${playerIndex} 手牌超出上限`);
    }
    if (player.pile.length > state.config.maxPileCount) {
      errors.push(`玩家 ${playerIndex} 牌库超出上限`);
    }
    if (player.supports.length > state.config.maxSupportsCount) {
      errors.push(`玩家 ${playerIndex} 支援区超出上限`);
    }
    if (player.summons.length > state.config.maxSummonsCount) {
      errors.push(`玩家 ${playerIndex} 召唤区超出上限`);
    }
    if (player.dice.length > state.config.maxDiceCount) {
      errors.push(`玩家 ${playerIndex} 骰子超出上限`);
    }
    for (const dice of player.dice) {
      if (!validDiceTypes.has(dice)) {
        errors.push(`玩家 ${playerIndex} 存在无效骰子`);
      }
    }
    for (const [definitionId, skillIds] of player.roundSkillLog.entries()) {
      if (!validCharacterDefinitionIds.has(definitionId)) {
        errors.push(`玩家 ${playerIndex} 的回合技能记录角色定义不存在`);
      }
      for (const skillId of skillIds) {
        if (!validSkillIds.has(skillId)) {
          errors.push(`玩家 ${playerIndex} 的回合技能记录技能不存在`);
        }
      }
    }
    for (const character of characters) {
      allIds.push(character.id);
      for (const [key, value] of Object.entries(character.variables)) {
        validateSafeInteger(
          value,
          `玩家 ${playerIndex} 角色 ${character.definition.id}(#${character.id}) 变量 ${key}`,
          errors,
        );
      }
      if (!AURA_OPTIONS.includes(character.variables.aura)) {
        errors.push(
          `玩家 ${playerIndex} 角色 ${character.definition.id} 的附着无效`,
        );
      }
      for (const entity of character.entities) {
        collectEntityIds(entity, allIds);
        for (const [key, value] of Object.entries(entity.variables)) {
          validateSafeInteger(
            value,
            `玩家 ${playerIndex} 角色 ${character.definition.id}(#${character.id}) 实体 ${entity.definition.id}(#${entity.id}) 变量 ${key}`,
            errors,
          );
        }
      }
    }
    for (const entity of [
      ...player.combatStatuses,
      ...player.supports,
      ...player.summons,
      ...player.hands,
      ...player.pile,
    ]) {
      collectEntityIds(entity, allIds);
      for (const [key, value] of Object.entries(entity.variables)) {
        validateSafeInteger(
          value,
          `玩家 ${playerIndex} 实体 ${entity.definition.id}(#${entity.id}) 变量 ${key}`,
          errors,
        );
      }
    }
  }
  const uniqueIds = new Set(allIds);
  if (uniqueIds.size !== allIds.length) {
    errors.push("状态 ID 出现重复");
  }
  state.extensions.forEach((extension) => {
    validateExtensionValue(
      extension.definition.schema as ExpressiveJSONSchema,
      extension.state,
      `扩展 ${extension.definition.id}`,
      errors,
    );
  });
  return errors;
}
